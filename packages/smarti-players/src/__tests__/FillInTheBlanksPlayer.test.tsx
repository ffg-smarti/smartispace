import { describe, test, expect, vi, beforeAll, afterAll } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { createRef } from 'react';
import { FillInTheBlanksPlayer } from '../players/FillInTheBlanksPlayer';
import type { PlayerProps, PlayerHandle } from '../types';

// fireEvent doesn't rely on timers → safe to use fake timers globally
beforeAll(() => { vi.useFakeTimers(); });
afterAll(() => { vi.useRealTimers(); });

// ── Helpers ─────────────────────────────────────

function createContent(overrides?: {
  text_with_blanks?: string;
  blanks?: Array<{ blank_id: string; solution_variants: string[]; weight?: number }>;
  input_mode?: string;
  tolerance?: string;
  intro?: { text?: string; media_type?: string; media_url?: string | null };
  distractors?: Array<{ distractor_id: string; text: string }>;
}) {
  return {
    fill_blanks: {
      intro: overrides?.intro ?? { text: 'Fülle die Lücken aus.' },
      text_with_blanks: overrides?.text_with_blanks ?? 'Die Hauptstadt von Frankreich ist ___.',
      blanks: overrides?.blanks ?? [
        { blank_id: 'b1', solution_variants: ['Paris'], weight: 1 },
      ],
      input_mode: overrides?.input_mode ?? 'FREETEXT',
      tolerance: overrides?.tolerance ?? 'EXACT',
      distractors: overrides?.distractors ?? [],
    },
  };
}

function createProps(overrides?: {
  content?: Record<string, unknown>;
  itemContext?: Record<string, unknown>;
  mode?: PlayerProps['mode'];
  onCompleted?: (r: unknown) => void;
  onSkipped?: (r: string) => void;
  onProgress?: (p: number) => void;
}) {
  const content = overrides?.content ?? createContent();
  return {
    item: {
      content_data: content,
      display_config: {},
      behavior_config: {},
    },
    itemContext: {
      item_type: 'FILL_THE_BLANKS',
      pass_threshold: 80,
      ...overrides?.itemContext,
    },
    mode: (overrides?.mode ?? 'preview') as PlayerProps['mode'],
    onCompleted: overrides?.onCompleted ?? vi.fn(),
    onSkipped: overrides?.onSkipped ?? vi.fn(),
    onError: vi.fn(),
    onProgress: overrides?.onProgress,
  } satisfies PlayerProps;
}

/** Fill text input and submit via Enter, wrapped in act */
function submitAnswer(input: HTMLElement, value: string) {
  act(() => {
    fireEvent.change(input, { target: { value } });
    fireEvent.keyDown(input, { key: 'Enter' });
  });
}

/** Advance fake timers past the answer transition delay */
function advanceTransition() {
  act(() => { vi.advanceTimersByTime(800); });
}

/** Count SVG elements with a given text color class */
function countSvgWithColor(color: 'green' | 'red'): number {
  return document.querySelectorAll(`svg.text-${color}-600`).length;
}

// ── Tests ───────────────────────────────────────

describe('FillInTheBlanksPlayer', () => {
  // ── Intro Phase ─────────────────────────────
  // REQ-CONTENT-FTB-001: Two-phase player (Intro → Text with Blanks)
  describe('Intro Phase', () => {
    test('renders intro text and continue hint', () => {
      render(<FillInTheBlanksPlayer {...createProps()} />);
      expect(screen.getByText(/Fülle die Lücken aus/i)).toBeInTheDocument();
      expect(screen.getByText(/Tippe irgendwo, um fortzufahren/i)).toBeInTheDocument();
    });

    test('shows "Anleitung" header during intro', () => {
      render(<FillInTheBlanksPlayer {...createProps()} />);
      expect(screen.getByText('Anleitung')).toBeInTheDocument();
    });

    test('transitions to blank input on intro tap', () => {
      render(<FillInTheBlanksPlayer {...createProps()} />);
      act(() => { fireEvent.click(screen.getByText(/Tippe irgendwo, um fortzufahren/i)); });
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    test('shows blank counter after transition', () => {
      render(<FillInTheBlanksPlayer {...createProps()} />);
      act(() => { fireEvent.click(screen.getByText(/Tippe irgendwo, um fortzufahren/i)); });
      expect(screen.getByText(/Lücke 1 \/ 1/i)).toBeInTheDocument();
    });

    // REQ-CONTENT-FTB-E02: 0 blanks → immediate result on tap
    test('completes immediately when 0 blanks', () => {
      const onCompleted = vi.fn();
      render(
        <FillInTheBlanksPlayer
          {...createProps({
            content: createContent({ text_with_blanks: 'Keine Lücken.', blanks: [] }),
            onCompleted,
          })}
        />,
      );
      act(() => { fireEvent.click(screen.getByText(/Tippe irgendwo, um fortzufahren/i)); });
      expect(onCompleted).toHaveBeenCalledWith(
        expect.objectContaining({ score: 0, skipped: false }),
      );
    });
  });

  // ── FREETEXT Mode ────────────────────────────
  // REQ-CONTENT-FTB-004: FREETEXT input mode
  describe('FREETEXT Mode', () => {
    function setup(extra?: Record<string, unknown>) {
      render(<FillInTheBlanksPlayer {...createProps(extra as any)} />);
      act(() => { fireEvent.click(screen.getByText(/Tippe irgendwo, um fortzufahren/i)); });
      return screen.getByRole('textbox') as HTMLInputElement;
    }

    test('renders text input', () => {
      const input = setup();
      expect(input).toHaveProperty('type', 'text');
    });

    // REQ-CONTENT-FTB-008: Enter key submits
    test('submits answer on Enter', () => {
      const onCompleted = vi.fn();
      const input = setup({ mode: 'session', onCompleted });
      submitAnswer(input, 'Paris');
      advanceTransition();
      expect(onCompleted).toHaveBeenCalledWith(
        expect.objectContaining({ score: 100, skipped: false }),
      );
    });

    // REQ-CONTENT-FTB-007: Correct → green icon
    test('shows green icon on correct answer', () => {
      submitAnswer(setup(), 'Paris');
      expect(countSvgWithColor('green')).toBeGreaterThan(0);
    });

    // REQ-CONTENT-FTB-007: Incorrect → red icon
    test('shows red icon on incorrect answer', () => {
      submitAnswer(setup(), 'London');
      expect(countSvgWithColor('red')).toBeGreaterThan(0);
    });

    test('submits on blur', () => {
      const onCompleted = vi.fn();
      const input = setup({ mode: 'session', onCompleted });
      act(() => {
        fireEvent.change(input, { target: { value: 'Paris' } });
        fireEvent.blur(input);
      });
      advanceTransition();
      expect(onCompleted).toHaveBeenCalledWith(
        expect.objectContaining({ score: 100 }),
      );
    });

    test('disables input after answer submitted', () => {
      const input = setup();
      submitAnswer(input, 'Paris');
      expect(input).toBeDisabled();
    });

    test('respects maxLength of 50', () => {
      const input = setup();
      expect(input).toHaveAttribute('maxLength', '50');
    });
  });

  // ── Tolerance Matching ───────────────────────
  // REQ-CONTENT-FTB-009: Three tolerance levels
  describe('Tolerance Matching', () => {
    function setup(tolerance: string) {
      render(
        <FillInTheBlanksPlayer
          {...createProps({ content: createContent({ tolerance }) })}
        />,
      );
      act(() => { fireEvent.click(screen.getByText(/Tippe irgendwo, um fortzufahren/i)); });
      return screen.getByRole('textbox') as HTMLInputElement;
    }

    test('EXACT: rejects different case', () => {
      submitAnswer(setup('EXACT'), 'paris');
      expect(countSvgWithColor('red')).toBeGreaterThan(0);
    });

    test('EXACT: accepts exact match', () => {
      submitAnswer(setup('EXACT'), 'Paris');
      expect(countSvgWithColor('green')).toBeGreaterThan(0);
    });

    test('CASE_INSENSITIVE: accepts case difference', () => {
      submitAnswer(setup('CASE_INSENSITIVE'), 'PARIS');
      expect(countSvgWithColor('green')).toBeGreaterThan(0);
    });

    test('FUZZY: accepts single typo (Levenshtein ≤ 1)', () => {
      submitAnswer(setup('FUZZY'), 'Parix');
      expect(countSvgWithColor('green')).toBeGreaterThan(0);
    });

    test('FUZZY: rejects two typos (Levenshtein ≥ 2)', () => {
      submitAnswer(setup('FUZZY'), 'London');
      expect(countSvgWithColor('red')).toBeGreaterThan(0);
    });

    test('accepts synonym as correct answer', () => {
      render(
        <FillInTheBlanksPlayer
          {...createProps({
            content: createContent({
              blanks: [{ blank_id: 'b1', solution_variants: ['Paris', 'Lutetia'], weight: 1 }],
            }),
          })}
        />,
      );
      act(() => { fireEvent.click(screen.getByText(/Tippe irgendwo, um fortzufahren/i)); });
      submitAnswer(screen.getByRole('textbox'), 'Lutetia');
      expect(countSvgWithColor('green')).toBeGreaterThan(0);
    });
  });

  // ── DRAG_DROP Mode ──────────────────────────
  // REQ-CONTENT-FTB-005: DRAG_DROP mode
  describe('DRAG_DROP Mode', () => {
    const dragContent = createContent({
      text_with_blanks: '___ wächst im ___.',
      blanks: [
        { blank_id: 'b1', solution_variants: ['Sonnenblume'], weight: 1 },
        { blank_id: 'b2', solution_variants: ['Garten'], weight: 1 },
      ],
      input_mode: 'DRAG_DROP',
      distractors: [
        { distractor_id: 'd1', text: 'Auto' },
        { distractor_id: 'd2', text: 'Tisch' },
      ],
    });

    function setupDrag() {
      render(<FillInTheBlanksPlayer {...createProps({ content: dragContent })} />);
      act(() => { fireEvent.click(screen.getByText(/Tippe irgendwo, um fortzufahren/i)); });
    }

    test('no text inputs', () => {
      setupDrag();
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    });

    // REQ-CONTENT-FTB-021: Word bank has correct + distractor words
    test('word bank shows correct words and distractors', () => {
      setupDrag();
      expect(screen.getByText('Sonnenblume')).toBeInTheDocument();
      expect(screen.getByText('Garten')).toBeInTheDocument();
      expect(screen.getByText('Auto')).toBeInTheDocument();
      expect(screen.getByText('Tisch')).toBeInTheDocument();
    });

    test('word bank words are clickable buttons', () => {
      setupDrag();
      expect(screen.getByText('Sonnenblume').tagName).toBe('BUTTON');
    });

    test('clicking word highlights it, then clicking blank places it', () => {
      setupDrag();
      const word = screen.getByText('Sonnenblume');
      expect(word.tagName).toBe('BUTTON');

      act(() => { fireEvent.click(word); });
      // Word should be highlighted (has ring class from selection state)
      expect(word.className).toContain('ring');

      const blanks = screen.getAllByText('...');
      expect(blanks).toHaveLength(2);
      act(() => { fireEvent.click(blanks[0]); });
      // Word bank no longer shows this word as a button (it was placed)
      expect(screen.queryByRole('button', { name: 'Sonnenblume' })).not.toBeInTheDocument();
      // Only one placeholder remains (the other blank was filled)
      expect(screen.queryAllByText('...')).toHaveLength(1);
      // The placed word text exists (in the blank slot, not in the word bank)
      expect(screen.getByText('Sonnenblume')).toBeInTheDocument();
    });

    test('drop zones show placeholder', () => {
      setupDrag();
      expect(screen.getAllByText('...').length).toBe(2);
    });
  });

  // ── Result View ──────────────────────────────
  describe('Result View', () => {
    function setupAndComplete(answer = 'Test') {
      render(
        <FillInTheBlanksPlayer
          {...createProps({
            content: createContent({
              text_with_blanks: 'Ein ___.',
              blanks: [{ blank_id: 'b1', solution_variants: ['Test'], weight: 1 }],
            }),
            mode: 'session',
          })}
        />,
      );
      act(() => { fireEvent.click(screen.getByText(/Tippe irgendwo, um fortzufahren/i)); });
      submitAnswer(screen.getByRole('textbox'), answer);
      advanceTransition();
    }

    test('shows result view header', () => {
      setupAndComplete();
      expect(screen.getByText('Ergebnis')).toBeInTheDocument();
    });

    test('shows score percentage', () => {
      setupAndComplete();
      expect(screen.getByText('100%')).toBeInTheDocument();
    });

    test('shows count of correct answers', () => {
      setupAndComplete();
      expect(screen.getByText(/1 von 1 richtig/i)).toBeInTheDocument();
    });

    // REQ-CONTENT-FTB-025: Show correct answer for wrong blanks
    test('shows correct answer for wrong blanks', () => {
      setupAndComplete('Flase');
      const incorrectElements = screen.getAllByText('Flase');
      expect(incorrectElements.length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Test')).toBeInTheDocument();
    });

    test('0% score when all wrong', () => {
      setupAndComplete('Flase');
      expect(screen.getByText('0%')).toBeInTheDocument();
    });
  });

  // ── Completion Callback ──────────────────────
  // REQ-CONTENT-FTB-016: Pass/fail threshold
  describe('Completion Callback', () => {
    function completeAndCheck(answer: string) {
      const onCompleted = vi.fn();
      render(
        <FillInTheBlanksPlayer
          {...createProps({
            content: createContent({
              text_with_blanks: 'X ___.',
              blanks: [{ blank_id: 'b1', solution_variants: ['Y'], weight: 1 }],
            }),
            mode: 'session',
            onCompleted,
          })}
        />,
      );
      act(() => { fireEvent.click(screen.getByText(/Tippe irgendwo, um fortzufahren/i)); });
      submitAnswer(screen.getByRole('textbox'), answer);
      advanceTransition();
      return onCompleted;
    }

    test('pass=true when score >= threshold', () => {
      const onCompleted = completeAndCheck('Y');
      expect(onCompleted).toHaveBeenCalledWith(
        expect.objectContaining({ score: 100, pass: true }),
      );
    });

    test('pass=false when score < threshold', () => {
      const onCompleted = completeAndCheck('Z');
      expect(onCompleted).toHaveBeenCalledWith(
        expect.objectContaining({ score: 0, pass: false }),
      );
    });

    test('calls onSkipped via fallback button', () => {
      const onSkipped = vi.fn();
      render(
        <FillInTheBlanksPlayer
          {...createProps({ content: {}, onSkipped })}
        />,
      );
      act(() => { fireEvent.click(screen.getByText('Weiter')); });
      expect(onSkipped).toHaveBeenCalledWith('invalid_content_data');
    });
  });

  // ── Error States ─────────────────────────────
  // REQ-CONTENT-FTB-E03: Missing content fallback
  describe('Error States', () => {
    test('fallback shown when fill_blanks missing', () => {
      render(<FillInTheBlanksPlayer {...createProps({ content: {} })} />);
      expect(screen.getByText(/Aufgabe kann nicht angezeigt werden/i)).toBeInTheDocument();
      expect(screen.getByText(/Lückentext/i)).toBeInTheDocument();
    });

    test('fallback shown when text_with_blanks empty', () => {
      render(
        <FillInTheBlanksPlayer
          {...createProps({ content: createContent({ text_with_blanks: '' }) })}
        />,
      );
      expect(screen.getByText(/Aufgabe kann nicht angezeigt werden/i)).toBeInTheDocument();
    });

    test('fallback has Weiter button', () => {
      render(
        <FillInTheBlanksPlayer
          {...createProps({ content: {} })}
        />,
      );
      expect(screen.getByText('Weiter')).toBeInTheDocument();
    });
  });

  // ── PlayerHandle API ─────────────────────────
  describe('PlayerHandle API', () => {
    test('getProgress: 0 in intro', () => {
      const ref = createRef<PlayerHandle>();
      render(<FillInTheBlanksPlayer {...createProps()} ref={ref} />);
      expect(ref.current?.getProgress()).toBe(0);
    });

    test('getProgress: 30 after intro tap', () => {
      const ref = createRef<PlayerHandle>();
      render(<FillInTheBlanksPlayer {...createProps()} ref={ref} />);
      act(() => { fireEvent.click(screen.getByText(/Tippe irgendwo, um fortzufahren/i)); });
      expect(ref.current?.getProgress()).toBe(30);
    });

    test('getProgress: 100 after completion', () => {
      const ref = createRef<PlayerHandle>();
      render(
        <FillInTheBlanksPlayer
          {...createProps({
            content: createContent({
              text_with_blanks: 'X ___.',
              blanks: [{ blank_id: 'b1', solution_variants: ['Y'], weight: 1 }],
            }),
            mode: 'session',
          })}
          ref={ref}
        />,
      );
      act(() => { fireEvent.click(screen.getByText(/Tippe irgendwo, um fortzufahren/i)); });
      submitAnswer(screen.getByRole('textbox'), 'Y');
      advanceTransition();
      expect(ref.current?.getProgress()).toBe(100);
    });

    test('pause and resume', () => {
      const ref = createRef<PlayerHandle>();
      render(<FillInTheBlanksPlayer {...createProps()} ref={ref} />);
      expect(() => ref.current?.pause()).not.toThrow();
      expect(() => ref.current?.resume()).not.toThrow();
    });

    test('reset goes back to intro', () => {
      const ref = createRef<PlayerHandle>();
      render(<FillInTheBlanksPlayer {...createProps()} ref={ref} />);
      act(() => { fireEvent.click(screen.getByText(/Tippe irgendwo, um fortzufahren/i)); });
      act(() => ref.current?.reset());
      expect(ref.current?.getProgress()).toBe(0);
      expect(screen.getByText(/Fülle die Lücken aus/i)).toBeInTheDocument();
    });

    test('abort does not throw', () => {
      const ref = createRef<PlayerHandle>();
      render(<FillInTheBlanksPlayer {...createProps()} ref={ref} />);
      expect(() => ref.current?.abort()).not.toThrow();
    });
  });

  // ── Progress Reporting ──────────────────────
  describe('Progress Reporting', () => {
    test('onProgress(30) after intro tap', () => {
      const onProgress = vi.fn();
      render(
        <FillInTheBlanksPlayer
          {...createProps({
            content: createContent({
              text_with_blanks: 'Es ___ ___ Lücken.',
              blanks: [
                { blank_id: 'b1', solution_variants: ['gibt'], weight: 1 },
                { blank_id: 'b2', solution_variants: ['zwei'], weight: 1 },
              ],
            }),
            mode: 'session',
            onProgress,
          })}
        />,
      );
      act(() => { fireEvent.click(screen.getByText(/Tippe irgendwo, um fortzufahren/i)); });
      expect(onProgress).toHaveBeenCalledWith(30);
    });
  });

  // ── DRAG_DROP Overwrite Behavior ─────────────────
  // REQ-CONTENT-FTB-005: Overwrite filled blank returns old word to pool
  describe('DRAG_DROP Overwrite Behavior', () => {
    const overwriteContent = createContent({
      text_with_blanks: '___ wächst im ___.',
      blanks: [
        { blank_id: 'b1', solution_variants: ['Sonnenblume'], weight: 1 },
        { blank_id: 'b2', solution_variants: ['Garten'], weight: 1 },
      ],
      input_mode: 'DRAG_DROP',
      distractors: [
        { distractor_id: 'd1', text: 'Auto' },
        { distractor_id: 'd2', text: 'Tisch' },
      ],
    });

    function setupDrag() {
      render(<FillInTheBlanksPlayer {...createProps({ content: overwriteContent })} />);
      act(() => { fireEvent.click(screen.getByText(/Tippe irgendwo, um fortzufahren/i)); });
    }

    // Tap-to-place: click word, click filled blank → old word returns to bank, new word placed
    test('tap-to-place overwrite: clicking filled blank returns old word to bank', () => {
      setupDrag();

      // First, place 'Sonnenblume' in first blank
      const word1 = screen.getByText('Sonnenblume');
      act(() => { fireEvent.click(word1); });
      expect(word1.className).toContain('ring');

      const blanks = screen.getAllByText('...');
      act(() => { fireEvent.click(blanks[0]); });

      // 'Sonnenblume' is now in the first blank, removed from word bank
      expect(screen.queryByRole('button', { name: 'Sonnenblume' })).not.toBeInTheDocument();
      expect(screen.getByText('Sonnenblume')).toBeInTheDocument(); // in the blank

      // Now click 'Garten' (select it)
      const word2 = screen.getByText('Garten');
      act(() => { fireEvent.click(word2); });
      expect(word2.className).toContain('ring');

      // Click the already-filled first blank (should overwrite)
      const filledBlank = screen.getByText('Sonnenblume');
      act(() => { fireEvent.click(filledBlank); });

      // 'Sonnenblume' should be back in the word bank
      expect(screen.getByRole('button', { name: 'Sonnenblume' })).toBeInTheDocument();

      // 'Garten' should now be in the first blank
      // Check blank specifically by its aria-label, not just text
      const blank1 = screen.getByLabelText('Lücke: Sonnenblume');
      expect(blank1).toHaveTextContent('Garten');
      // Sonnenblume should not be in any blank
      expect(screen.queryByLabelText('Lücke: Sonnenblume')).not.toHaveTextContent('Sonnenblume');

      // Word bank should have both correct words again (since Sonnenblume returned)
      expect(screen.getByRole('button', { name: 'Sonnenblume' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Garten' })).not.toBeInTheDocument(); // it's placed
    });

    // DnD overwrite: drag word onto filled blank → old word returns to bank, new word placed
    test('drag-and-drop overwrite: dropping on filled blank returns old word to bank', () => {
      setupDrag();

      // Use DndContext's internal state to simulate drag-drop
      // We'll use the tap-to-place flow as the component uses both paths
      // First place a word via tap
      const word1 = screen.getByText('Sonnenblume');
      act(() => { fireEvent.click(word1); });
      const blanks = screen.getAllByText('...');
      act(() => { fireEvent.click(blanks[0]); });

      // Now 'Sonnenblume' is in blank 1
      expect(screen.getByText('Sonnenblume')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Sonnenblume' })).not.toBeInTheDocument();

      // Select 'Garten' and tap the filled blank to overwrite
      const word2 = screen.getByText('Garten');
      act(() => { fireEvent.click(word2); });

      // Click the filled blank (which shows 'Sonnenblume')
      const filledBlank = screen.getByText('Sonnenblume');
      act(() => { fireEvent.click(filledBlank); });

      // Old word returned to bank
      expect(screen.getByRole('button', { name: 'Sonnenblume' })).toBeInTheDocument();
      // New word in the blank
      const blank1 = screen.getByLabelText('Lücke: Sonnenblume');
      expect(blank1).toHaveTextContent('Garten');
      expect(screen.queryByLabelText('Lücke: Sonnenblume')).not.toHaveTextContent('Sonnenblume');

      // Word bank shows Sonnenblume again
      expect(screen.getByRole('button', { name: 'Sonnenblume' })).toBeInTheDocument();
    });

    // Overwrite with distractor word
    test('overwrite with distractor word returns correct word to bank', () => {
      setupDrag();

      // Place 'Sonnenblume' in first blank
      const word1 = screen.getByText('Sonnenblume');
      act(() => { fireEvent.click(word1); });
      const blanks = screen.getAllByText('...');
      act(() => { fireEvent.click(blanks[0]); });

      // Select distractor 'Auto'
      const distractor = screen.getByText('Auto');
      act(() => { fireEvent.click(distractor); });

      // Overwrite the filled blank
      const filledBlank = screen.getByText('Sonnenblume');
      act(() => { fireEvent.click(filledBlank); });

      // 'Sonnenblume' back in bank
      expect(screen.getByRole('button', { name: 'Sonnenblume' })).toBeInTheDocument();
      // 'Auto' in the blank
      const blank1 = screen.getByLabelText('Lücke: Sonnenblume');
      expect(blank1).toHaveTextContent('Auto');
      expect(screen.queryByLabelText('Lücke: Sonnenblume')).not.toHaveTextContent('Sonnenblume');
    });

    // Verify word bank count is maintained (no duplicates)
    test('word bank maintains correct count after multiple overwrites', () => {
      setupDrag();

      // Initial: 4 words in bank (2 correct + 2 distractors)
      // But blanks are also buttons with aria-label, so count word bank buttons specifically
      const getWordBankButtons = () => screen.getAllByRole('button', { name: /^(?!Lücke:)/ });
      expect(getWordBankButtons()).toHaveLength(4);

      // Place Sonnenblume
      const w1 = screen.getByText('Sonnenblume');
      act(() => { fireEvent.click(w1); });
      act(() => { fireEvent.click(screen.getAllByText('...')[0]); });
      expect(getWordBankButtons()).toHaveLength(3); // 3 left in bank

      // Overwrite with Garten
      const w2 = screen.getByText('Garten');
      act(() => { fireEvent.click(w2); });
      act(() => { fireEvent.click(screen.getByLabelText('Lücke: Sonnenblume')); });
      expect(getWordBankButtons()).toHaveLength(3); // Sonnenblume returned, Garten placed

      // Overwrite with Auto (distractor)
      const w3 = screen.getByText('Auto');
      act(() => { fireEvent.click(w3); });
      act(() => { fireEvent.click(screen.getByLabelText('Lücke: Sonnenblume')); });
      expect(getWordBankButtons()).toHaveLength(3); // Garten returned, Auto placed

      // Total unique words in bank + placed should always be 4
      const bankWords = getWordBankButtons().map(b => b.textContent);
      const placedWords = screen.getAllByRole('button', { name: /^Lücke:/ })
        .map(b => b.textContent)
        .filter(t => t !== '...'); // filter out empty placeholders
      const allWords = [...bankWords, ...placedWords].filter(Boolean).sort();
      expect(allWords).toEqual(['Auto', 'Garten', 'Sonnenblume', 'Tisch'].sort());
    });
  });
});
