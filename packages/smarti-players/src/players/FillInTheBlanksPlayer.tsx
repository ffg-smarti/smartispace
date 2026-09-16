// @smarti/players — FillInTheBlanksPlayer
// REQ-CONTENT-FTB-001: Two-phase player (Intro → Text with Blanks)

import React, {
  useState,
  useRef,
  useCallback,
  useEffect,
  useMemo,
  forwardRef,
  useImperativeHandle,
} from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@smarti/ui';
import {
  CheckCircle,
  XCircle,
} from 'lucide-react';
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import type {
  PlayerProps,
  PlayerHandle,
  ItemResult,
  ItemContextResponse,
} from '../types';
import type {
  FillInTheBlanksBlankData as FillBlank,
  FillInTheBlanksFrontendData,
} from '@smarti/api';
import { validateItemData } from '../validation';
import { ItemValidationFallback, AudioPlayer } from '../components';

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

type FillInTheBlanksContent = FillInTheBlanksFrontendData;

type BlankStatus = 'pending' | 'correct' | 'incorrect';

interface BlankState {
  blank_id: string;
  user_answer: string;
  status: BlankStatus;
  start_time: number;
}

// ──────────────────────────────────────────────
// Parsing: ___ → segments
// ──────────────────────────────────────────────

// REQ-CONTENT-FTB-003: Text contains 1–6 blanks marked as ___ (cleaned markers)
const BLANK_MARKER_RE = /_{3,}/g;

interface TextSegment {
  type: 'text';
  content: string;
}

interface BlankSegment {
  type: 'blank';
  index: number;
  blank: FillBlank;
}

type Segment = TextSegment | BlankSegment;

function parseTextWithBlanks(
  textWithBlanks: string,
  blanks: FillBlank[],
): Segment[] {
  const segments: Segment[] = [];
  let lastIndex = 0;
  let blankIndex = 0;

  for (const match of textWithBlanks.matchAll(BLANK_MARKER_RE)) {
    const matchStart = match.index!;
    if (matchStart > lastIndex) {
      segments.push({ type: 'text', content: textWithBlanks.slice(lastIndex, matchStart) });
    }
    if (blankIndex < blanks.length) {
      segments.push({ type: 'blank', index: blankIndex, blank: blanks[blankIndex] });
      blankIndex++;
    }
    lastIndex = matchStart + match[0].length;
  }

  if (lastIndex < textWithBlanks.length) {
    segments.push({ type: 'text', content: textWithBlanks.slice(lastIndex) });
  }

  return segments;
}

// ──────────────────────────────────────────────
// Tolerance matching
// ──────────────────────────────────────────────

function matchesAnswer(
  userAnswer: string,
  correctAnswers: string[],
  tolerance: 'EXACT' | 'CASE_INSENSITIVE' | 'FUZZY',
): boolean {
  const trimmed = userAnswer.trim();
  if (!trimmed) return false;

  for (const correct of correctAnswers) {
    if (tolerance === 'EXACT') {
      if (trimmed === correct) return true;
    } else if (tolerance === 'CASE_INSENSITIVE') {
      if (trimmed.toLowerCase() === correct.toLowerCase()) return true;
    } else {
      // FUZZY: case-insensitive + Levenshtein ≤ 1
      if (trimmed.toLowerCase() === correct.toLowerCase()) return true;
      if (levenshtein(trimmed.toLowerCase(), correct.toLowerCase()) <= 1) return true;
    }
  }
  return false;
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      );
    }
  }
  return dp[m][n];
}

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

// Reads FillInTheBlanksContent from item.content_data.fill_blanks
// (Three-Concern-Modell, content-domain-spec §1.2.3.15).
// Backend sends { fill_blanks: FillInTheBlanksContent } as content_data.
function getFillBlanks(
  item: PlayerProps['item'],
): FillInTheBlanksContent | null {
  const raw = item.content_data?.fill_blanks as FillInTheBlanksContent | undefined;
  if (!raw?.text_with_blanks) return null;
  return raw;
}

function getPassThreshold(itemContext: ItemContextResponse): number {
  return (itemContext.pass_threshold as number) ?? 80;
}

function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// ──────────────────────────────────────────────
// Sub-components
// ──────────────────────────────────────────────

interface IntroSlideProps {
  content: FillInTheBlanksContent;
  onContinue: () => void;
  isPaused: boolean;
}

function IntroSlide({ content, onContinue, isPaused }: IntroSlideProps) {
  const intro = content.intro;
  const hasAudio = intro?.media_type === 'AUDIO' && intro?.media_url;

  return (
    <div
      className="flex flex-col items-center justify-center h-full px-6 py-8 text-center cursor-pointer"
      onClick={onContinue}
    >
      <p className="text-lg md:text-xl max-w-prose leading-relaxed whitespace-pre-wrap text-foreground">
        {intro?.text ?? ''}
      </p>
      {hasAudio && (
        <AudioPlayer
          mediaUrl={intro!.media_url!}
          isPaused={isPaused}
          className="mt-auto mb-4"
        />
      )}
      <p className="text-sm text-muted-foreground">
        Tippe irgendwo, um fortzufahren
      </p>
    </div>
  );
}

// ──────────────────────────────────────────────
// Freetext blank input
// ──────────────────────────────────────────────

interface FreetextBlankProps {
  blank: FillBlank;
  status: BlankStatus;
  userAnswer: string;
  isPaused: boolean;
  onSubmit: (blankId: string, answer: string) => void;
}

function FreetextBlank({
  blank,
  status,
  userAnswer,
  isPaused,
  onSubmit,
}: FreetextBlankProps) {
  const [value, setValue] = useState(userAnswer);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = useCallback(() => {
    if (value.trim()) {
      onSubmit(blank.blank_id, value);
    }
  }, [value, blank.blank_id, onSubmit]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  // REQ-CONTENT-FTB-007: Feedback styling
  const borderColor =
    status === 'correct'
      ? 'border-green-500 bg-green-50'
      : status === 'incorrect'
        ? 'border-red-500 bg-red-50'
        : 'border-border';

  return (
    <span className="inline-flex items-center gap-1 mx-0.5">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleSubmit}
        onKeyDown={handleKeyDown}
        disabled={isPaused || status !== 'pending'}
        maxLength={50}
        placeholder="..."
        className={`inline-block w-24 md:w-32 px-2 py-1 text-center rounded border-2 text-sm transition-colors ${borderColor}`}
        aria-label={`Lücke: ${blank.solution_variants[0]}`}
      />
      {status === 'correct' && (
        <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
      )}
      {status === 'incorrect' && (
        <XCircle className="h-4 w-4 text-red-600 shrink-0" />
      )}
    </span>
  );
}

// ──────────────────────────────────────────────
// Word bank (DRAG_DROP)
// ──────────────────────────────────────────────

interface WordBankProps {
  words: string[];
  usedWords: Set<string>;
  isPaused: boolean;
  selectedWord: string | null;
  onSelectWord: (word: string | null) => void;
}

function WordBank({ words, usedWords, isPaused, selectedWord, onSelectWord }: WordBankProps) {
  const availableWords = useMemo(
    () => words.filter((w) => !usedWords.has(w)),
    [words, usedWords],
  );

  if (availableWords.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 justify-center mt-4 px-4">
      {availableWords.map((word) => (
        <DraggableWord
          key={word}
          word={word}
          isSelected={word === selectedWord}
          isPaused={isPaused}
          onSelect={onSelectWord}
        />
      ))}
    </div>
  );
}

// ──────────────────────────────────────────────
// Draggable word for DRAG_DROP mode
// ──────────────────────────────────────────────

interface DraggableWordProps {
  word: string;
  isSelected: boolean;
  isPaused: boolean;
  onSelect: (word: string | null) => void;
}

function DraggableWord({ word, isSelected, isPaused, onSelect }: DraggableWordProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `word-${word}`,
    data: { type: 'word', word },
  });

  const style: React.CSSProperties = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : {};

  return (
    <button
      ref={setNodeRef}
      type="button"
      disabled={isPaused}
      onClick={() => onSelect(isSelected ? null : word)}
      className={`px-3 py-1.5 rounded-md border bg-card text-sm cursor-pointer select-none transition-all duration-150 touch-none ${
        isDragging ? 'opacity-50' : ''
      } ${
        isSelected
          ? 'ring-2 ring-primary scale-105'
          : 'hover:bg-accent hover:scale-105'
      }`}
      style={style}
      {...listeners}
      {...attributes}
    >
      {word}
    </button>
  );
}

// ──────────────────────────────────────────────
// Droppable blank for DRAG_DROP mode
// ──────────────────────────────────────────────

interface DroppableBlankProps {
  blank: FillBlank;
  status: BlankStatus;
  userAnswer: string;
  isPaused: boolean;
  selectedWord: string | null;
  inputMode: 'FREETEXT' | 'DRAG_DROP';
  onDrop: (blankId: string, word: string) => void;
  onRemove: (blankId: string) => void;
}

function DroppableBlank({
  blank,
  status,
  userAnswer,
  isPaused,
  selectedWord,
  inputMode,
  onDrop,
  onRemove,
}: DroppableBlankProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `blank-${blank.blank_id}`,
    data: { type: 'blank', blankId: blank.blank_id },
  });

  // In DRAG_DROP mode, allow overwrite: if a word is selected, allow clicking filled blanks
  const canInteract = useMemo(() => {
    if (isPaused) return false;
    if (status === 'pending') return true;
    // DRAG_DROP: allow overwrite when a word is selected
    if (inputMode === 'DRAG_DROP' && selectedWord) return true;
    return false;
  }, [isPaused, status, selectedWord, inputMode]);

  const handleClick = useCallback(() => {
    if (!canInteract) return;
    if (userAnswer) {
      // In DRAG_DROP mode with selectedWord, this is an overwrite
      // In FREETEXT mode or without selectedWord, this is a remove
      if (inputMode === 'DRAG_DROP' && selectedWord) {
        onDrop(blank.blank_id, selectedWord);
      } else {
        onRemove(blank.blank_id);
      }
    } else if (selectedWord) {
      onDrop(blank.blank_id, selectedWord);
    }
  }, [canInteract, userAnswer, selectedWord, inputMode, blank.blank_id, onDrop, onRemove]);

  const isHighlighted = (selectedWord || isOver) && !userAnswer && status === 'pending';
  // Also highlight filled blank when overwrite is possible
  const isOverwriteHighlighted = inputMode === 'DRAG_DROP' && selectedWord && userAnswer && status !== 'pending';

  const borderColor =
    status === 'correct'
      ? 'border-green-500 bg-green-50'
      : status === 'incorrect'
        ? 'border-red-500 bg-red-50'
        : isOverwriteHighlighted
          ? 'border-primary bg-accent ring-2 ring-primary ring-offset-2'
          : isHighlighted
            ? 'border-primary bg-accent'
            : 'border-dashed border-border';

  // Disable pointer-events only when truly not interactive
  const isInteractive = canInteract || status === 'pending';

  return (
    <button
      ref={setNodeRef}
      type="button"
      className={`inline-flex items-center gap-1 mx-0.5 min-w-[80px] px-2 py-1 rounded border-2 text-sm text-center transition-all duration-150 cursor-pointer select-none touch-none ${
        !isInteractive ? 'pointer-events-none' : ''
      } ${borderColor}`}
      onClick={handleClick}
      disabled={isPaused || !isInteractive}
      aria-label={`Lücke: ${blank.solution_variants[0]}`}
    >
      {userAnswer ? (
        <span className={status === 'pending' || isOverwriteHighlighted ? 'hover:underline' : ''}>
          {userAnswer}
        </span>
      ) : (
        <span className="text-muted-foreground">...</span>
      )}
      {status === 'correct' && (
        <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
      )}
      {status === 'incorrect' && (
        <XCircle className="h-4 w-4 text-red-600 shrink-0" />
      )}
    </button>
  );
}

// ──────────────────────────────────────────────
// Result view
// ──────────────────────────────────────────────

interface ResultViewProps {
  segments: Segment[];
  blankStates: BlankState[];
  score: number;
  totalBlanks: number;
}

function ResultView({ segments, blankStates, score, totalBlanks }: ResultViewProps) {
  const correctCount = blankStates.filter((s) => s.status === 'correct').length;

  return (
    <div className="flex flex-col items-center justify-center h-full px-6 py-8 text-center">
      <div className="text-4xl font-bold mb-4 text-foreground">{score}%</div>
      <p className="text-lg mb-6 text-foreground">
        {correctCount} von {totalBlanks} richtig
      </p>

      <div className="text-left max-w-prose text-sm leading-relaxed mb-6">
        {segments.map((seg, i) => {
          if (seg.type === 'text') {
            return <span key={i}>{seg.content}</span>;
          }
          const state = blankStates[seg.index];
          const isCorrect = state?.status === 'correct';
          return (
            <span
              key={i}
              className={`inline-flex items-center gap-0.5 mx-0.5 px-1.5 py-0.5 rounded text-sm font-medium ${
                isCorrect
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {state?.user_answer || '...'}
              {isCorrect ? (
                <CheckCircle className="h-3.5 w-3.5 text-green-600" />
              ) : (
                <XCircle className="h-3.5 w-3.5 text-red-600" />
              )}
            </span>
          );
        })}
      </div>

      {/* REQ-CONTENT-FTB-025: Show correct answer for incorrect blanks */}
      {blankStates.some((s) => s.status === 'incorrect') && (
        <div className="text-sm text-muted-foreground mb-4">
          {blankStates
            .filter((s) => s.status === 'incorrect')
            .map((s, i) => {
              const blank = segments.find(
                (seg) => seg.type === 'blank' && seg.blank.blank_id === s.blank_id,
              );
              if (blank?.type !== 'blank') return null;
              return (
                <div key={i} className="mt-1">
                  <span className="text-red-600 line-through">{s.user_answer}</span>
                  {' → '}
                  <span className="text-green-600 font-medium">
                    {blank.blank.solution_variants[0]}
                  </span>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────
// Main Player Component
// ──────────────────────────────────────────────

type Phase = 'INTRO' | 'TEXT_WITH_BLANKS' | 'RESULT';

const FillInTheBlanksPlayerInner = forwardRef<PlayerHandle, PlayerProps>(
  function FillInTheBlanksPlayer({ item, itemContext, mode, onCompleted, onSkipped, onProgress }, ref) {
    const content = useMemo(() => getFillBlanks(item), [item]);

    const [phase, setPhase] = useState<Phase>('INTRO');
    const [isPaused, setIsPaused] = useState(false);
    const [blankStates, setBlankStates] = useState<BlankState[]>([]);
    const [currentBlankIndex, setCurrentBlankIndex] = useState(0);
    const [dragUsedWords, setDragUsedWords] = useState<Set<string>>(new Set());
    const [selectedWord, setSelectedWord] = useState<string | null>(null);
    const [activeWord, setActiveWord] = useState<string | null>(null);
    const completedRef = useRef(false);
    const startedAt = useRef<number>(Date.now());

    // Parsed segments
    const segments = useMemo(() => {
      if (!content) return [];
      return parseTextWithBlanks(content.text_with_blanks, content.blanks ?? []);
    }, [content]);

    const blanks = useMemo(() => content?.blanks ?? [], [content]);
    const totalBlanks = blanks.length;
    const inputMode = content?.input_mode ?? 'FREETEXT';
    const tolerance = content?.tolerance ?? 'CASE_INSENSITIVE';

    // Word bank for DRAG_DROP: correct answers + distractors, shuffled
    const wordBankWords = useMemo(() => {
      if (!content) return [];
      const correctWords = blanks.map((b) => b.solution_variants[0]);
      const distractorWords = (content.distractors ?? []).map((d) => d.text);
      return shuffle([...correctWords, ...distractorWords]);
    }, [content, blanks]);

    // Initialize blank states
    useEffect(() => {
      if (blanks.length > 0 && blankStates.length === 0) {
        setBlankStates(
          blanks.map((b) => ({
            blank_id: b.blank_id,
            user_answer: '',
            status: 'pending' as BlankStatus,
            start_time: Date.now(),
          })),
        );
      }
    }, [blanks, blankStates.length]);

    // PlayerHandle
    useImperativeHandle(ref, () => ({
      pause: () => setIsPaused(true),
      resume: () => setIsPaused(false),
      reset: () => {
        setPhase('INTRO');
        setIsPaused(false);
        setBlankStates([]);
        setCurrentBlankIndex(0);
        setDragUsedWords(new Set());
        setSelectedWord(null);
        completedRef.current = false;
        startedAt.current = Date.now();
      },
      abort: () => {
        setIsPaused(true);
        completedRef.current = true;
      },
      getProgress: () => {
        if (phase === 'INTRO') return 0;
        if (phase === 'RESULT') return 100;
        if (totalBlanks === 0) return 30;
        const filled = blankStates.filter((s) => s.status !== 'pending').length;
        return Math.round((filled / totalBlanks) * 70) + 30;
      },
    }));

    // ── Progress callback ──
    const reportProgress = useCallback(
      (filledCount: number) => {
        if (!onProgress || totalBlanks === 0) return;
        const percent = Math.round((filledCount / totalBlanks) * 70) + 30;
        onProgress(Math.min(percent, 100));
      },
      [onProgress, totalBlanks],
    );

    // ── Intro tap ──
    const handleIntroTap = useCallback(() => {
      if (isPaused) return;
      if (totalBlanks === 0) {
        // REQ-CONTENT-FTB-E02: 0 blanks → immediate result
        completedRef.current = true;
        const result: ItemResult = {
          score: 0,
          durationSeconds: Math.round((Date.now() - startedAt.current) / 1000),
          skipped: false,
        };
        onCompleted(result);
        return;
      }
      setPhase('TEXT_WITH_BLANKS');
      onProgress?.(30);
    }, [isPaused, totalBlanks, onCompleted, onProgress]);

    // ── Submit answer ──
    const submitAnswer = useCallback(
      (blankId: string, answer: string) => {
        const blank = blanks.find((b) => b.blank_id === blankId);
        if (!blank) return;

        const isCorrect = matchesAnswer(answer, blank.solution_variants, tolerance);

        // In DRAG_DROP mode, if overwriting, return old word to bank
        if (inputMode === 'DRAG_DROP') {
          const existingBlank = blankStates.find((s) => s.blank_id === blankId);
          const oldWord = existingBlank?.user_answer;
          if (oldWord && oldWord !== answer) {
            setDragUsedWords((prev) => {
              const next = new Set(prev);
              next.delete(oldWord);
              return next;
            });
          }
        }

        setBlankStates((prev) => {
          const next = [...prev];
          const idx = next.findIndex((s) => s.blank_id === blankId);
          if (idx >= 0) {
            next[idx] = {
              ...next[idx],
              user_answer: answer,
              status: isCorrect ? 'correct' : 'incorrect',
            };
          }
          return next;
        });

        const filledCount =
          blankStates.filter((s) => s.status !== 'pending').length + 1;
        reportProgress(filledCount);

        // Advance after feedback delay
        const delay = isCorrect ? 600 : 800;
        setTimeout(() => {
          const nextIndex = currentBlankIndex + 1;
          if (nextIndex >= totalBlanks) {
            // All blanks filled → result
            setPhase('RESULT');
            onProgress?.(100);
          } else {
            setCurrentBlankIndex(nextIndex);
          }
        }, delay);
      },
      [
        blanks,
        tolerance,
        inputMode,
        blankStates,
        currentBlankIndex,
        totalBlanks,
        reportProgress,
        onProgress,
      ],
    );

    // ── Drag-drop remove ──
    const handleDragRemove = useCallback(
      (blankId: string) => {
        setBlankStates((prev) => {
          const next = [...prev];
          const idx = next.findIndex((s) => s.blank_id === blankId);
          if (idx >= 0) {
            setDragUsedWords((prev2) => {
              const s = new Set(prev2);
              s.delete(next[idx].user_answer);
              return s;
            });
            next[idx] = { ...next[idx], user_answer: '', status: 'pending' };
          }
          return next;
        });
      },
      [],
    );

    // ── Drag-drop place (tap-to-place from word bank) ──
    const handleDragDrop = useCallback(
      (blankId: string, word: string) => {
        // Handle dragUsedWords: remove old word if overwriting, add new word
        setDragUsedWords((prev) => {
          const next = new Set(prev);
          // Find and remove old word in this blank
          const existingBlank = blankStates.find((s) => s.blank_id === blankId);
          if (existingBlank?.user_answer) {
            next.delete(existingBlank.user_answer);
          }
          next.add(word);
          return next;
        });
        submitAnswer(blankId, word);
        setSelectedWord(null);
      },
      [submitAnswer, blankStates],
    );

    // ── DnD sensors ──
    const sensors = useSensors(
      useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    );

    const handleDnDStart = useCallback(
      (event: DragStartEvent) => {
        const data = event.active.data.current as { type: string; word: string } | undefined;
        if (data?.word) setActiveWord(data.word);
      },
      [],
    );

    const handleDnDEnd = useCallback(
      (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveWord(null);
        if (!over) return;
        const wordData = active.data.current as { type: string; word: string } | undefined;
        const dropData = over.data.current as { type: string; blankId: string } | undefined;
        if (wordData?.type === 'word' && dropData?.type === 'blank') {
          handleDragDrop(dropData.blankId, wordData.word);
        }
      },
      [handleDragDrop],
    );

    // ── Completion ──
    useEffect(() => {
      if (phase !== 'RESULT') return;
      if (completedRef.current) return;
      completedRef.current = true;

      const correctCount = blankStates.filter((s) => s.status === 'correct').length;
      const score =
        totalBlanks > 0 ? Math.round((correctCount / totalBlanks) * 100) : 0;
      const pass = score >= getPassThreshold(itemContext);

      if (mode === 'session') {
        const durationSeconds = Math.round(
          (Date.now() - startedAt.current) / 1000,
        );
        const result: ItemResult = {
          score,
          durationSeconds,
          skipped: false,
          pass,
          progress: 100,
          completion: true,
        };
        onCompleted(result);
      }
    }, [phase, blankStates, totalBlanks, itemContext, mode, onCompleted]);

    // ── Error state ──
    if (!content) {
      const validation = validateItemData(item.content_data, [
        { field: 'fill_blanks.text_with_blanks', label: 'Lückentext' },
      ]);
      return (
        <ItemValidationFallback
          errors={validation.errors}
          onContinue={() => onSkipped?.('invalid_content_data')}
        />
      );
    }

    // ── Render ──
    return (
      <Card className="w-full max-w-2xl mx-auto h-[520px] flex flex-col overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between py-3 px-4 border-b">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {phase === 'INTRO' && 'Anleitung'}
            {phase === 'TEXT_WITH_BLANKS' &&
              `Lücke ${Math.min(currentBlankIndex + 1, totalBlanks)} / ${totalBlanks}`}
            {phase === 'RESULT' && 'Ergebnis'}
          </CardTitle>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto p-0">
          {phase === 'INTRO' && (
            <IntroSlide
              content={content}
              onContinue={handleIntroTap}
              isPaused={isPaused}
            />
          )}

          {phase === 'TEXT_WITH_BLANKS' && (
            <DndContext
              sensors={sensors}
              onDragStart={handleDnDStart}
              onDragEnd={handleDnDEnd}
            >
              <div className="flex flex-col h-full px-6 py-6">
                <div className="text-base leading-relaxed flex-1">
                  {segments.map((seg, i) => {
                    if (seg.type === 'text') {
                      return <span key={i}>{seg.content}</span>;
                    }
                    const state = blankStates[seg.index];
                    if (inputMode === 'DRAG_DROP') {
                      return (
                        <DroppableBlank
                          key={i}
                          blank={seg.blank}
                          status={state?.status ?? 'pending'}
                          userAnswer={state?.user_answer ?? ''}
                          isPaused={isPaused}
                          selectedWord={selectedWord}
                          onDrop={handleDragDrop}
                          onRemove={handleDragRemove}
                          inputMode={inputMode}
                        />
                      );
                    }
                    return (
                      <FreetextBlank
                        key={i}
                        blank={seg.blank}
                        status={state?.status ?? 'pending'}
                        userAnswer={state?.user_answer ?? ''}
                        isPaused={isPaused}
                        onSubmit={submitAnswer}
                      />
                    );
                  })}
                </div>

                {inputMode === 'DRAG_DROP' && (
                  <WordBank
                    words={wordBankWords}
                    usedWords={dragUsedWords}
                    isPaused={isPaused}
                    selectedWord={selectedWord}
                    onSelectWord={setSelectedWord}
                  />
                )}
              </div>

              <DragOverlay>
                {activeWord ? (
                  <div className="px-3 py-1.5 rounded-md border bg-card text-sm shadow-lg">
                    {activeWord}
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          )}

          {phase === 'RESULT' && (
            <ResultView
              segments={segments}
              blankStates={blankStates}
              score={
                totalBlanks > 0
                  ? Math.round(
                      (blankStates.filter((s) => s.status === 'correct').length /
                        totalBlanks) *
                        100,
                    )
                  : 0
              }
              totalBlanks={totalBlanks}
            />
          )}
        </CardContent>
      </Card>
    );
  },
);

// REQ-CONTENT-FTB-026: displayName for React DevTools
FillInTheBlanksPlayerInner.displayName = 'FillInTheBlanksPlayer';

export const FillInTheBlanksPlayer = FillInTheBlanksPlayerInner;
export default FillInTheBlanksPlayer;
