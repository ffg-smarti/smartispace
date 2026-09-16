/**
 * KurspraesentationPlayer — Slide-basierter Player mit 5 Fragetypen.
 *
 * Supports: SINGLE_CHOICE, MULTIPLE_CHOICE, TRUE_FALSE, DRAG_WORD, IMAGE_PAIRING
 * REQ-CONTENT-PRES-001: Intro → N Quiz-Folien → Ergebnis
 * REQ-CONTENT-PRES-002: Intro mit media_type/media_url (AUDIO/VIDEO)
 * REQ-CONTENT-PRES-003: question_type bestimmt Antwort-Modus
 * REQ-CONTENT-PRES-004: Sofortiges Feedback (SC/TF/DW/IP) oder nach [Prüfen] (MC)
 * REQ-CONTENT-PRES-007: ItemResult = { score, durationSeconds, skipped }
 * REQ-CONTENT-PRES-008: onProgress bei jedem Folienwechsel
 * REQ-CONTENT-PRES-027-035: DRAG_WORD + IMAGE_PAIRING Interaktion
 */
import React, { useState, useRef, useCallback, useEffect, forwardRef, useImperativeHandle, useMemo } from 'react';
import { PlayerProps, PlayerHandle, ItemResult, ItemContextResponse } from '../types';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@smarti/ui';
import { Check, X } from 'lucide-react';
import { resolveTheme, SlideColors } from '../theme-registry';
import { useDrag, DragItem, DragSlot } from '../hooks/useDrag';
import { validateItemData } from '../validation';
import { ItemValidationFallback, AudioPlayer } from '../components';

// --- Utility ---

function hsl(value: string): string {
  return `hsl(${value})`;
}

function hslWithAlpha(hslValue: string, alpha: number): string {
  return `hsla(${hslValue}, ${alpha})`;
}

// --- Types (match backend schema §4.3) ---

interface PresentationAnswer {
  answer_id: string;
  text: string;
}

interface DragWordConfig {
  words: Array<{ word_id: string; text: string }>;
  distractors?: Array<{ word_id: string; text: string }>;
  shuffle?: boolean;
}

interface ImagePair {
  pair_id: string;
  image_url: string;
  word: string;
}

interface ImagePairingConfig {
  pairs: ImagePair[];
  shuffle?: boolean;
}

interface PresentationQuestion {
  question_id: string;
  question_type: string;
  question: string;
  // SC/MC/TF:
  answers?: PresentationAnswer[];
  correct_answer_ids?: string[];
  // DRAG_WORD:
  drag_words?: DragWordConfig;
  correct_word_ids?: string[];
  scoring?: string;
  // IMAGE_PAIRING:
  image_pairs?: ImagePairingConfig;
  // General:
  weight?: number;
}

interface PresentationIntro {
  text: string;
  media_type?: string;
  media_url?: string | null;
  // Legacy fallback:
  audio_url?: string | null;
}

interface PresentationContent {
  intro: PresentationIntro;
  questions: PresentationQuestion[];
  appearance?: { theme?: string };
}

interface RawPresentation {
  intro?: { text?: string; media_type?: string; media_url?: string | null; audio_url?: string | null };
  questions?: unknown[];
  appearance?: { theme?: string };
}

// Reads PresentationContent from item.content_data (Three-Concern-Modell,
// content-domain-spec §1.2.3.15). Backend sends
// { course_presentation: PresentationContent } as content_data for
// COURSE_PRESENTATION items.
function getPresentation(item: PlayerProps['item']): PresentationContent | null {
  const raw = (item.content_data?.course_presentation ?? item.content_data) as RawPresentation | undefined;
  if (!raw?.intro) return null;

  const introRaw = raw.intro ?? {};
  // Legacy: if media_type not set but audio_url exists, treat as AUDIO
  const mediaType = introRaw.media_type ?? (introRaw.audio_url ? 'AUDIO' : 'NONE');

  return {
    intro: {
      text: introRaw.text ?? '',
      media_type: mediaType,
      media_url: introRaw.media_url ?? introRaw.audio_url ?? null,
    },
    questions: Array.isArray(raw.questions) ? (raw.questions as PresentationQuestion[]) : [],
    appearance: raw.appearance,
  };
}

function getPassThreshold(itemContext: ItemContextResponse): number {
  return itemContext.pass_threshold ?? 80;
}

// --- Score Calculation (spec §2 Score-Berechnung) ---

function calcQuestionScore(q: PresentationQuestion, isCorrect: boolean, partialScore?: number): number {
  switch (q.question_type) {
    case 'MULTIPLE_CHOICE':
      return partialScore ?? (isCorrect ? 100 : 0);
    case 'DRAG_WORD':
      if (q.scoring === 'ALL_OR_NOTHING') return isCorrect ? 100 : 0;
      return partialScore ?? (isCorrect ? 100 : 0);
    case 'IMAGE_PAIRING':
      return partialScore ?? (isCorrect ? 100 : 0);
    default: // SC, TF
      return isCorrect ? 100 : 0;
  }
}

// --- Shuffle helper ---

function shuffleArray<T>(arr: T[], enabled: boolean): T[] {
  if (!enabled) return [...arr];
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// --- Feedback Styles ---

function getFeedbackStyle(
  state: 'idle' | 'correct' | 'wrong' | 'unselected',
  colors: SlideColors,
): React.CSSProperties {
  switch (state) {
    case 'correct':
      return {
        backgroundColor: hsl(colors.successBg),
        border: `2px solid ${hsl(colors.success)}`,
        color: hsl(colors.success),
        transform: 'scale(1.03)',
        boxShadow: `0 0 12px ${hslWithAlpha(colors.success, 0.3)}`,
      };
    case 'wrong':
      return {
        backgroundColor: hsl(colors.destructiveBg),
        border: `2px solid ${hsl(colors.destructive)}`,
        color: hsl(colors.destructive),
        animation: 'pulse 1s ease-in-out',
        boxShadow: `0 0 12px ${hslWithAlpha(colors.destructive, 0.3)}`,
      };
    case 'unselected':
      return { opacity: 0.4, transform: 'scale(0.98)' };
    default:
      return {};
  }
}

function getFeedbackClass(state: 'idle' | 'correct' | 'wrong' | 'unselected'): string {
  switch (state) {
    case 'correct':
    case 'wrong':
      return 'border-0';
    case 'unselected':
      return 'bg-card border border-border text-muted-foreground';
    default:
      return 'bg-card hover:bg-accent text-foreground border border-border';
  }
}

// --- IntroSlide (REQ-CONTENT-PRES-002) ---

interface IntroSlideProps {
  presentation: PresentationContent;
  onContinue: () => void;
  isPaused: boolean;
  colors: SlideColors;
}

function IntroSlide({ presentation, onContinue, isPaused, colors }: IntroSlideProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const mediaType = presentation.intro.media_type ?? 'NONE';
  const mediaUrl = presentation.intro.media_url;

  // Video cleanup on unmount
  useEffect(() => {
    return () => {
      videoRef.current?.pause();
      videoRef.current = null;
    };
  }, []);

  // Pause video when parent pauses
  useEffect(() => {
    if (isPaused) {
      videoRef.current?.pause();
    }
  }, [isPaused]);

  // Video autoplay on mount
  useEffect(() => {
    if (mediaType === 'VIDEO' && videoRef.current) {
      videoRef.current.play().catch(() => undefined);
    }
  }, [mediaType]);

  return (
    <div
      className="flex flex-col items-center justify-center h-full px-6 py-8 text-center"
      style={{ backgroundColor: hsl(colors.background) }}
      onClick={onContinue}
    >
      {mediaType === 'VIDEO' && mediaUrl && (
        <video
          ref={videoRef}
          src={mediaUrl}
          className="max-h-48 mb-6 rounded-lg"
          muted
          loop
          playsInline
          onClick={(e) => e.stopPropagation()}
        />
      )}
      <p
        className="text-lg md:text-xl max-w-prose leading-relaxed whitespace-pre-wrap"
        style={{ color: hsl(colors.foreground) }}
      >
        {presentation.intro.text}
      </p>
      {mediaType === 'AUDIO' && mediaUrl && (
        <AudioPlayer
          mediaUrl={mediaUrl}
          isPaused={isPaused}
          color={{
            foreground: hsl(colors.foreground),
            borderColor: hsl(colors.foreground),
          }}
          className="mt-auto mb-4"
        />
      )}
      <p className="text-sm text-muted-foreground">Tippe irgendwo, um fortzufahren</p>
    </div>
  );
}

// --- SingleChoiceSlide (REQ-CONTENT-PRES-003 SC, REQ-CONTENT-PRES-004) ---

interface QuestionSlideBaseProps {
  question: PresentationQuestion;
  questionIndex: number;
  totalQuestions: number;
  isPaused: boolean;
  feedbackDelayCorrectMs: number;
  feedbackDelayWrongMs: number;
  colors: SlideColors;
}

interface SCQuestionSlideProps extends QuestionSlideBaseProps {
  onAnswer: (questionId: string, correct: boolean, score: number) => void;
}

function SingleChoiceSlide({
  question, questionIndex, totalQuestions, onAnswer,
  isPaused, feedbackDelayCorrectMs, feedbackDelayWrongMs, colors,
}: SCQuestionSlideProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [feedbackPhase, setFeedbackPhase] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); }, []);

  const correctIds = useMemo(
    () => new Set(question.correct_answer_ids ?? []),
    [question.correct_answer_ids],
  );

  const answers = useMemo(
    () => shuffleArray(question.answers ?? [], true),
    [question.answers],
  );

  const handleSelect = useCallback((answerId: string) => {
    if (selectedId !== null || isPaused) return;
    const correct = correctIds.has(answerId);
    setSelectedId(answerId);
    setFeedbackPhase(true);
    const delay = correct ? feedbackDelayCorrectMs : feedbackDelayWrongMs;
    timeoutRef.current = setTimeout(() => {
      onAnswer(question.question_id, correct, calcQuestionScore(question, correct));
    }, delay);
  }, [selectedId, isPaused, correctIds, question, onAnswer, feedbackDelayCorrectMs, feedbackDelayWrongMs]);

  const getState = (answerId: string): 'idle' | 'correct' | 'wrong' | 'unselected' => {
    if (selectedId === null) return 'idle';
    if (correctIds.has(answerId)) return 'correct';
    if (answerId === selectedId) return 'wrong';
    return 'unselected';
  };

  return (
    <div className="flex flex-col h-full px-6 py-6" style={{ backgroundColor: hsl(colors.background) }}>
      <div className="flex items-center justify-between mb-6">
        <span className="text-sm font-medium text-muted-foreground">
          Frage {questionIndex + 1} / {totalQuestions}
        </span>
      </div>
      <p className="text-lg md:text-xl font-medium mb-8 whitespace-pre-wrap" style={{ color: hsl(colors.foreground) }}>
        {question.question}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-auto">
        {answers.map((answer) => {
          const state = getState(answer.answer_id);
          return (
            <Button
              key={answer.answer_id}
              variant="outline"
              className={`h-auto py-4 px-4 text-left justify-start whitespace-normal transition-all duration-200 ${getFeedbackClass(state)}`}
              style={getFeedbackStyle(state, colors)}
              onClick={() => handleSelect(answer.answer_id)}
              disabled={feedbackPhase || isPaused}
            >
              {state === 'correct' && <Check className="h-4 w-4 mr-2 inline" />}
              {state === 'wrong' && <X className="h-4 w-4 mr-2 inline" />}
              {answer.text}
            </Button>
          );
        })}
      </div>
    </div>
  );
}

// --- MultipleChoiceSlide (REQ-CONTENT-PRES-003 MC, REQ-CONTENT-PRES-019, REQ-CONTENT-PRES-020) ---

interface MCQuestionSlideProps extends QuestionSlideBaseProps {
  onAnswer: (questionId: string, correct: boolean, score: number) => void;
}

function MultipleChoiceSlide({
  question, questionIndex, totalQuestions, onAnswer,
  isPaused, feedbackDelayCorrectMs, feedbackDelayWrongMs, colors,
}: MCQuestionSlideProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [feedbackPhase, setFeedbackPhase] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); }, []);

  const correctIds = useMemo(
    () => new Set(question.correct_answer_ids ?? []),
    [question.correct_answer_ids],
  );

  const answers = useMemo(
    () => shuffleArray(question.answers ?? [], true),
    [question.answers],
  );

  const toggleAnswer = useCallback((answerId: string) => {
    if (feedbackPhase || isPaused) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(answerId)) next.delete(answerId);
      else next.add(answerId);
      return next;
    });
  }, [feedbackPhase, isPaused]);

  const handleCheck = useCallback(() => {
    if (selectedIds.size === 0 || isPaused) return;
    setFeedbackPhase(true);
    setShowFeedback(true);

    // REQ-CONTENT-PRES-020: partial score
    const correctlyChosen = [...selectedIds].filter((id) => correctIds.has(id)).length;
    const totalCorrect = correctIds.size;
    const partialScore = totalCorrect > 0 ? Math.round((correctlyChosen / totalCorrect) * 100) : 0;
    const allCorrect = partialScore === 100;

    const delay = allCorrect ? feedbackDelayCorrectMs : feedbackDelayWrongMs;
    timeoutRef.current = setTimeout(() => {
      onAnswer(question.question_id, allCorrect, partialScore);
    }, delay);
  }, [selectedIds, correctIds, isPaused, question, onAnswer, feedbackDelayCorrectMs, feedbackDelayWrongMs]);

  const getState = (answerId: string): 'idle' | 'correct' | 'wrong' | 'unselected' => {
    if (!showFeedback) return 'idle';
    if (correctIds.has(answerId)) return 'correct';
    if (selectedIds.has(answerId)) return 'wrong';
    return 'unselected';
  };

  return (
    <div className="flex flex-col h-full px-6 py-6" style={{ backgroundColor: hsl(colors.background) }}>
      <div className="flex items-center justify-between mb-6">
        <span className="text-sm font-medium text-muted-foreground">
          Frage {questionIndex + 1} / {totalQuestions}
        </span>
        <span className="text-xs text-muted-foreground">Mehrfachauswahl</span>
      </div>
      <p className="text-lg md:text-xl font-medium mb-8 whitespace-pre-wrap" style={{ color: hsl(colors.foreground) }}>
        {question.question}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        {answers.map((answer) => {
          const state = getState(answer.answer_id);
          const isSelected = selectedIds.has(answer.answer_id);
          return (
            <Button
              key={answer.answer_id}
              variant="outline"
              className={`h-auto py-4 px-4 text-left justify-start whitespace-normal transition-all duration-200 ${getFeedbackClass(state)} ${!feedbackPhase && isSelected ? 'ring-2 ring-primary' : ''}`}
              style={getFeedbackStyle(state, colors)}
              onClick={() => toggleAnswer(answer.answer_id)}
              disabled={feedbackPhase || isPaused}
            >
              {showFeedback && state === 'correct' && <Check className="h-4 w-4 mr-2 inline" />}
              {showFeedback && state === 'wrong' && <X className="h-4 w-4 mr-2 inline" />}
              {!showFeedback && <span className="w-4 h-4 mr-2 inline-block border rounded" style={{ backgroundColor: isSelected ? hsl(colors.success) : 'transparent' }} />}
              {answer.text}
            </Button>
          );
        })}
      </div>
      {!feedbackPhase && (
        <Button
          className="mt-auto"
          disabled={selectedIds.size === 0 || isPaused}
          onClick={handleCheck}
        >
          Antwort prüfen
        </Button>
      )}
    </div>
  );
}

// --- TrueFalseSlide (REQ-CONTENT-PRES-003 TF, REQ-CONTENT-PRES-021) ---

interface TFQuestionSlideProps extends QuestionSlideBaseProps {
  onAnswer: (questionId: string, correct: boolean, score: number) => void;
}

function TrueFalseSlide({
  question, questionIndex, totalQuestions, onAnswer,
  isPaused, feedbackDelayCorrectMs, feedbackDelayWrongMs, colors,
}: TFQuestionSlideProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [feedbackPhase, setFeedbackPhase] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); }, []);

  const correctIds = useMemo(
    () => new Set(question.correct_answer_ids ?? []),
    [question.correct_answer_ids],
  );

  const answers = useMemo(
    () => shuffleArray(question.answers ?? [], true),
    [question.answers],
  );

  const handleSelect = useCallback((answerId: string) => {
    if (selectedId !== null || isPaused) return;
    const correct = correctIds.has(answerId);
    setSelectedId(answerId);
    setFeedbackPhase(true);
    const delay = correct ? feedbackDelayCorrectMs : feedbackDelayWrongMs;
    timeoutRef.current = setTimeout(() => {
      onAnswer(question.question_id, correct, calcQuestionScore(question, correct));
    }, delay);
  }, [selectedId, isPaused, correctIds, question, onAnswer, feedbackDelayCorrectMs, feedbackDelayWrongMs]);

  const getState = (answerId: string): 'idle' | 'correct' | 'wrong' | 'unselected' => {
    if (selectedId === null) return 'idle';
    if (correctIds.has(answerId)) return 'correct';
    if (answerId === selectedId) return 'wrong';
    return 'unselected';
  };

  return (
    <div className="flex flex-col h-full px-6 py-6" style={{ backgroundColor: hsl(colors.background) }}>
      <div className="flex items-center justify-between mb-6">
        <span className="text-sm font-medium text-muted-foreground">
          Frage {questionIndex + 1} / {totalQuestions}
        </span>
      </div>
      <p className="text-lg md:text-xl font-medium mb-8 whitespace-pre-wrap" style={{ color: hsl(colors.foreground) }}>
        {question.question}
      </p>
      <div className="grid grid-cols-2 gap-3 mt-auto">
        {answers.map((answer) => {
          const state = getState(answer.answer_id);
          return (
            <Button
              key={answer.answer_id}
              variant="outline"
              className={`h-auto py-6 px-4 text-lg font-medium transition-all duration-200 ${getFeedbackClass(state)}`}
              style={getFeedbackStyle(state, colors)}
              onClick={() => handleSelect(answer.answer_id)}
              disabled={feedbackPhase || isPaused}
            >
              {state === 'correct' && <Check className="h-5 w-5 mr-2 inline" />}
              {state === 'wrong' && <X className="h-5 w-5 mr-2 inline" />}
              {answer.text}
            </Button>
          );
        })}
      </div>
    </div>
  );
}

// --- DragWordSlide (REQ-CONTENT-PRES-027-030, REQ-CONTENT-PRES-034-035) ---

interface DWQuestionSlideProps extends QuestionSlideBaseProps {
  onAnswer: (questionId: string, correct: boolean, score: number) => void;
}

function DragWordSlide({
  question, questionIndex, totalQuestions, onAnswer,
  isPaused, feedbackDelayCorrectMs, feedbackDelayWrongMs, colors,
}: DWQuestionSlideProps) {
  const dragWords = question.drag_words;
  const correctWordIds = useMemo(() => question.correct_word_ids ?? [], [question.correct_word_ids]);

  const [feedbackPhase, setFeedbackPhase] = useState(false);
  const [correctSlots, setCorrectSlots] = useState<Record<string, boolean>>({});
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); }, []);

  // Build items and slots
  const items: DragItem[] = useMemo(() => {
    const words = (dragWords?.words ?? []).map((w) => ({ id: w.word_id, text: w.text }));
    const distractors = (dragWords?.distractors ?? []).map((d) => ({ id: d.word_id, text: d.text }));
    const all = [...words, ...distractors];
    return dragWords?.shuffle !== false ? shuffleArray(all, true) : all;
  }, [dragWords]);

  const slots: DragSlot[] = useMemo(() => {
    return (dragWords?.words ?? []).map((_w, i) => ({
      id: `slot_${i}`,
      label: `${i + 1}`,
    }));
  }, [dragWords]);

  const drag = useDrag(items, slots);

  // Check completion and trigger feedback
  useEffect(() => {
    if (!drag.isComplete || feedbackPhase) return;

    // REQ-CONTENT-PRES-034: Feedback sofort bei kompletter Belegung
    setFeedbackPhase(true);

    // Check which slots are correct
    const correctMap: Record<string, boolean> = {};
    const slotIds = Object.keys(drag.placements);
    let correctCount = 0;
    for (let i = 0; i < slotIds.length; i++) {
      const isCorrect = drag.placements[slotIds[i]] === correctWordIds[i];
      correctMap[slotIds[i]] = isCorrect;
      if (isCorrect) correctCount++;
    }
    setCorrectSlots(correctMap);

    // REQ-CONTENT-PRES-029: Scoring
    const allCorrect = correctCount === slotIds.length;
    let score: number;
    if (question.scoring === 'ALL_OR_NOTHING') {
      score = allCorrect ? 100 : 0;
    } else {
      // PER_WORD
      score = slotIds.length > 0 ? Math.round((correctCount / slotIds.length) * 100) : 0;
    }

    const delay = allCorrect ? feedbackDelayCorrectMs : feedbackDelayWrongMs;
    timeoutRef.current = setTimeout(() => {
      onAnswer(question.question_id, allCorrect, score);
    }, delay);
  }, [drag.isComplete, drag.placements, feedbackPhase, correctWordIds, question, onAnswer, feedbackDelayCorrectMs, feedbackDelayWrongMs]);

  const handleSlotTap = useCallback((slotId: string) => {
    if (feedbackPhase || isPaused) return;
    // If slot has an item, pick it up
    const existing = drag.getItemInSlot(slotId);
    if (existing) {
      drag.selectItem(existing.id);
    } else if (drag.selectedItemId) {
      drag.placeItem(slotId);
    }
  }, [drag, feedbackPhase, isPaused]);

  const handleBankItemTap = useCallback((itemId: string) => {
    if (feedbackPhase || isPaused) return;
    drag.selectItem(itemId);
  }, [drag, feedbackPhase, isPaused]);

  return (
    <div className="flex flex-col h-full px-6 py-6" style={{ backgroundColor: hsl(colors.background) }}>
      <div className="flex items-center justify-between mb-6">
        <span className="text-sm font-medium text-muted-foreground">
          Frage {questionIndex + 1} / {totalQuestions}
        </span>
      </div>
      <p className="text-lg md:text-xl font-medium mb-6 whitespace-pre-wrap" style={{ color: hsl(colors.foreground) }}>
        {question.question}
      </p>

      {/* Word Bank (REQ-CONTENT-PRES-027) */}
      <div className="flex flex-wrap gap-2 mb-6 p-3 rounded-lg" style={{ backgroundColor: hsl(colors.muted) }}>
        {drag.getUnplacedItems().map((item) => (
          <button
            key={item.id}
            className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all duration-150 cursor-pointer select-none ${
              drag.selectedItemId === item.id
                ? 'ring-2 ring-primary scale-105'
                : 'hover:scale-105'
            }`}
            style={{
              backgroundColor: hsl(colors.background),
              color: hsl(colors.foreground),
              borderColor: drag.selectedItemId === item.id ? hsl(colors.success) : hsl(colors.muted),
            }}
            onClick={() => handleBankItemTap(item.id)}
            disabled={feedbackPhase || isPaused}
          >
            {item.text}
          </button>
        ))}
        {drag.getUnplacedItems().length === 0 && (
          <span className="text-sm text-muted-foreground italic">Alle Wörter platziert</span>
        )}
      </div>

      {/* Slots (REQ-CONTENT-PRES-027: horizontale Reihe) */}
      <div className="flex gap-2 mt-auto justify-center flex-wrap">
        {slots.map((slot) => {
          const placedItem = drag.getItemInSlot(slot.id);
          const isCorrect = feedbackPhase ? correctSlots[slot.id] : undefined;
          const slotBg = feedbackPhase
            ? isCorrect
              ? hsl(colors.successBg)
              : hsl(colors.destructiveBg)
            : placedItem
              ? hsl(colors.muted)
              : 'transparent';
          const slotBorder = feedbackPhase
            ? isCorrect
              ? hsl(colors.success)
              : hsl(colors.destructive)
            : drag.selectedItemId && !placedItem
              ? hsl(colors.success)
              : hsl(colors.muted);

          return (
            <button
              key={slot.id}
              className="w-20 h-12 rounded-lg border-2 flex items-center justify-center text-sm font-medium transition-all duration-150 cursor-pointer"
              style={{
                backgroundColor: slotBg,
                borderColor: slotBorder,
                color: hsl(colors.foreground),
              }}
              onClick={() => handleSlotTap(slot.id)}
              disabled={feedbackPhase || isPaused}
            >
              {placedItem ? (
                <span className="flex items-center gap-1">
                  {feedbackPhase && (
                    isCorrect ? <Check className="h-3 w-3" style={{ color: hsl(colors.success) }} /> : <X className="h-3 w-3" style={{ color: hsl(colors.destructive) }} />
                  )}
                  {placedItem.text}
                </span>
              ) : (
                <span className="text-muted-foreground">___</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// --- ImagePairingSlide (REQ-CONTENT-PRES-031-033, REQ-CONTENT-PRES-034-035) ---

interface IPQuestionSlideProps extends QuestionSlideBaseProps {
  onAnswer: (questionId: string, correct: boolean, score: number) => void;
}

function ImagePairingSlide({
  question, questionIndex, totalQuestions, onAnswer,
  isPaused, feedbackDelayCorrectMs, feedbackDelayWrongMs, colors,
}: IPQuestionSlideProps) {
  const imagePairs = useMemo(() => question.image_pairs?.pairs ?? [], [question.image_pairs]);
  const shouldShuffle = question.image_pairs?.shuffle !== false;

  const [feedbackPhase, setFeedbackPhase] = useState(false);
  const [correctPairs, setCorrectPairs] = useState<Record<string, boolean>>({});
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); }, []);

  // Left column: images (fixed order)
  const imageSlots: DragSlot[] = useMemo(() => {
    return imagePairs.map((p, i) => ({ id: `img_${i}`, label: p.word }));
  }, [imagePairs]);

  // Right column: words (draggable)
  const wordItems: DragItem[] = useMemo(() => {
    const words = imagePairs.map((p, i) => ({ id: `word_${i}`, text: p.word }));
    return shouldShuffle ? shuffleArray(words, true) : words;
  }, [imagePairs, shouldShuffle]);

  const drag = useDrag(wordItems, imageSlots);

  // Check completion
  useEffect(() => {
    if (!drag.isComplete || feedbackPhase) return;

    setFeedbackPhase(true);

    // Check which pairs are correct
    const correctMap: Record<string, boolean> = {};
    let correctCount = 0;
    const slotIds = Object.keys(drag.placements);
    for (let i = 0; i < slotIds.length; i++) {
      // word_{i} should be in img_{i}
      const isCorrect = drag.placements[slotIds[i]] === `word_${i}`;
      correctMap[slotIds[i]] = isCorrect;
      if (isCorrect) correctCount++;
    }
    setCorrectPairs(correctMap);

    // REQ-CONTENT-PRES-032: IP uses PER_WORD always
    const allCorrect = correctCount === slotIds.length;
    const score = slotIds.length > 0 ? Math.round((correctCount / slotIds.length) * 100) : 0;

    const delay = allCorrect ? feedbackDelayCorrectMs : feedbackDelayWrongMs;
    timeoutRef.current = setTimeout(() => {
      onAnswer(question.question_id, allCorrect, score);
    }, delay);
  }, [drag.isComplete, drag.placements, feedbackPhase, imagePairs, question.question_id, onAnswer, feedbackDelayCorrectMs, feedbackDelayWrongMs]);

  const handleImageSlotTap = useCallback((slotId: string) => {
    if (feedbackPhase || isPaused) return;
    const existing = drag.getItemInSlot(slotId);
    if (existing) {
      drag.selectItem(existing.id);
    } else if (drag.selectedItemId) {
      drag.placeItem(slotId);
    }
  }, [drag, feedbackPhase, isPaused]);

  const handleWordTap = useCallback((itemId: string) => {
    if (feedbackPhase || isPaused) return;
    drag.selectItem(itemId);
  }, [drag, feedbackPhase, isPaused]);

  return (
    <div className="flex flex-col h-full px-6 py-6" style={{ backgroundColor: hsl(colors.background) }}>
      <div className="flex items-center justify-between mb-6">
        <span className="text-sm font-medium text-muted-foreground">
          Frage {questionIndex + 1} / {totalQuestions}
        </span>
      </div>
      <p className="text-lg md:text-xl font-medium mb-6 whitespace-pre-wrap" style={{ color: hsl(colors.foreground) }}>
        {question.question}
      </p>

      <div className="flex gap-6 flex-1 mt-auto">
        {/* Left column: Images (fixed, REQ-CONTENT-PRES-031) */}
        <div className="flex flex-col gap-3 flex-1">
          {imagePairs.map((pair, i) => {
            const slotId = `img_${i}`;
            const placedItem = drag.getItemInSlot(slotId);
            const isCorrect = feedbackPhase ? correctPairs[slotId] : undefined;
            const borderColor = feedbackPhase
              ? isCorrect ? hsl(colors.success) : hsl(colors.destructive)
              : drag.selectedItemId && !placedItem
                ? hsl(colors.success)
                : hsl(colors.muted);

            return (
              <div
                key={pair.pair_id}
                className="flex items-center gap-3 p-2 rounded-lg border-2 transition-all duration-150 cursor-pointer min-h-[60px]"
                style={{ borderColor }}
                onClick={() => handleImageSlotTap(slotId)}
              >
                {/* Image placeholder */}
                <div className="w-16 h-16 rounded bg-muted flex items-center justify-center overflow-hidden shrink-0">
                  <img
                    src={pair.image_url}
                    alt={pair.word}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
                {/* Placed word */}
                {placedItem ? (
                  <span
                    className="px-3 py-1 rounded text-sm font-medium"
                    style={{
                      backgroundColor: feedbackPhase
                        ? isCorrect ? hsl(colors.successBg) : hsl(colors.destructiveBg)
                        : hsl(colors.muted),
                      color: hsl(colors.foreground),
                    }}
                  >
                    {feedbackPhase && (isCorrect ? '✓ ' : '✗ ')}
                    {placedItem.text}
                  </span>
                ) : (
                  <span className="text-sm text-muted-foreground italic">Zuordnen...</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Right column: Words (draggable, REQ-CONTENT-PRES-031) */}
        <div className="flex flex-col gap-2 flex-shrink-0">
          {drag.getUnplacedItems().map((item) => (
            <button
              key={item.id}
              className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all duration-150 cursor-pointer select-none min-w-[80px] ${
                drag.selectedItemId === item.id
                  ? 'ring-2 ring-primary scale-105'
                  : 'hover:scale-105'
              }`}
              style={{
                backgroundColor: hsl(colors.background),
                color: hsl(colors.foreground),
                borderColor: drag.selectedItemId === item.id ? hsl(colors.success) : hsl(colors.muted),
              }}
              onClick={() => handleWordTap(item.id)}
              disabled={feedbackPhase || isPaused}
            >
              {item.text}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// --- ResultSlide (REQ-CONTENT-PRES-005) ---

interface ResultSlideProps {
  correctCount: number;
  totalQuestions: number;
  score: number;
  pass: boolean;
  colors: SlideColors;
}

function ResultSlide({ correctCount, totalQuestions, score, pass, colors }: ResultSlideProps) {
  return (
    <div
      className="flex flex-col items-center justify-center h-full px-6 py-8 text-center"
      style={{ backgroundColor: hsl(colors.background) }}
    >
      <div className="text-6xl font-bold mb-4" style={{ color: hsl(colors.foreground) }}>{score}%</div>
      <div className="flex gap-8 mb-8">
        <div className="text-center">
          <div className="text-3xl font-semibold" style={{ color: hsl(colors.success) }}>{correctCount}</div>
          <div className="text-sm text-muted-foreground">Richtig</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-semibold" style={{ color: hsl(colors.destructive) }}>{totalQuestions - correctCount}</div>
          <div className="text-sm text-muted-foreground">Falsch</div>
        </div>
      </div>
      <div
        className="text-lg font-medium"
        style={{ color: pass ? hsl(colors.success) : hsl(colors.destructive) }}
      >
        {pass ? 'Bestanden ✓' : 'Nicht bestanden ✗'}
      </div>
      <p className="text-sm text-muted-foreground mt-2">
        {correctCount} von {totalQuestions} Fragen richtig
      </p>
    </div>
  );
}

// --- Main Player Component ---

const KurspraesentationPlayerInner = forwardRef<PlayerHandle, PlayerProps>(
  ({ item, itemContext, onCompleted, onSkipped, onProgress, mode }, ref) => {
    // content_data (WAS) — PresentationContent dict from backend
    const presentation = getPresentation(item);

    const [slideIndex, setSlideIndex] = useState(0);
    const [correctCount, setCorrectCount] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const [startedAt] = useState(() => Date.now());
    const completedRef = useRef(false);

    // behavior_config (RULES) — CoursePresBehaviorConfig fields
    const feedbackDelayCorrectMs = (item.behavior_config?.feedback_delay_correct_ms as number) ?? 600;
    const feedbackDelayWrongMs = (item.behavior_config?.feedback_delay_wrong_ms as number) ?? 800;

    const questions = useMemo(
      () => [...(presentation?.questions ?? [])],
      [presentation?.questions],
    );
    const totalQuestions = questions.length;
    const resultSlideIndex = totalQuestions + 1;
    const totalSlides = resultSlideIndex + 1;

    const slideIndexRef = useRef(slideIndex);
    slideIndexRef.current = slideIndex;

    const colors = useMemo(
      () => resolveTheme(presentation?.appearance?.theme),
      [presentation?.appearance?.theme],
    );

    useImperativeHandle(ref, () => ({
      pause: () => setIsPaused(true),
      resume: () => setIsPaused(false),
      reset: () => {
        setSlideIndex(0);
        setCorrectCount(0);
        setIsPaused(false);
        completedRef.current = false;
      },
      abort: () => { setIsPaused(true); completedRef.current = true; },
      getProgress: () => {
        if (totalSlides <= 1) return 0;
        return Math.round((slideIndexRef.current / (totalSlides - 1)) * 100);
      },
    }));

    const advance = useCallback(() => {
      const next = slideIndexRef.current + 1;
      setSlideIndex(next);
      if (onProgress && totalSlides > 1) {
        onProgress(Math.round((next / (totalSlides - 1)) * 100));
      }
    }, [onProgress, totalSlides]);

    const handleIntroTap = useCallback(() => {
      if (isPaused) return;
      advance();
    }, [isPaused, advance]);

    const handleAnswer = useCallback((_questionId: string, correct: boolean, _score: number) => {
      if (correct) setCorrectCount((c) => c + 1);
      advance();
    }, [advance]);

    // REQ-CONTENT-PRES-006: onCompleted on result slide
    useEffect(() => {
      if (slideIndex !== resultSlideIndex) return;
      if (completedRef.current) return;
      completedRef.current = true;

      const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
      const pass = score >= getPassThreshold(itemContext);

      if (mode === 'session') {
        const durationSeconds = Math.round((Date.now() - startedAt) / 1000);
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
    }, [slideIndex, resultSlideIndex, correctCount, totalQuestions, itemContext, mode, onCompleted, startedAt]);

    if (!presentation) {
      const validation = validateItemData(item.content_data, [
        { field: 'course_presentation.intro.text', label: 'Intro-Text' },
      ]);
      return (
        <ItemValidationFallback
          errors={validation.errors}
          onContinue={() => onSkipped?.('invalid_content_data')}
        />
      );
    }

    const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
    const pass = score >= getPassThreshold(itemContext);

    return (
      <Card
        className="w-full max-w-2xl mx-auto h-[520px] flex flex-col overflow-hidden"
        style={{ backgroundColor: hsl(colors.background) }}
      >
        <CardHeader className="flex flex-row items-center justify-between py-3 px-4 border-b">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {slideIndex === 0
              ? 'Intro'
              : slideIndex <= totalQuestions
                ? `Folie ${slideIndex} / ${totalQuestions}`
                : 'Ergebnis'}
          </CardTitle>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto p-0">
          {slideIndex === 0 && (
            <IntroSlide
              presentation={presentation}
              onContinue={handleIntroTap}
              isPaused={isPaused}
              colors={colors}
            />
          )}

          {slideIndex > 0 && slideIndex <= totalQuestions && (() => {
            const q = questions[slideIndex - 1];
            const baseProps: QuestionSlideBaseProps = {
              question: q,
              questionIndex: slideIndex - 1,
              totalQuestions,
              isPaused,
              feedbackDelayCorrectMs,
              feedbackDelayWrongMs,
              colors,
            };

            switch (q.question_type) {
              case 'MULTIPLE_CHOICE':
                return <MultipleChoiceSlide key={q.question_id} {...baseProps} onAnswer={handleAnswer} />;
              case 'TRUE_FALSE':
                return <TrueFalseSlide key={q.question_id} {...baseProps} onAnswer={handleAnswer} />;
              case 'DRAG_WORD':
                return <DragWordSlide key={q.question_id} {...baseProps} onAnswer={handleAnswer} />;
              case 'IMAGE_PAIRING':
                return <ImagePairingSlide key={q.question_id} {...baseProps} onAnswer={handleAnswer} />;
              case 'SINGLE_CHOICE':
              default:
                return <SingleChoiceSlide key={q.question_id} {...baseProps} onAnswer={handleAnswer} />;
            }
          })()}

          {slideIndex === resultSlideIndex && (
            <ResultSlide
              correctCount={correctCount}
              totalQuestions={totalQuestions}
              score={score}
              pass={pass}
              colors={colors}
            />
          )}
        </CardContent>
      </Card>
    );
  }
);

KurspraesentationPlayerInner.displayName = 'KurspraesentationPlayer';

export const KurspraesentationPlayer = KurspraesentationPlayerInner;
export default KurspraesentationPlayer;
