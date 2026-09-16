import { forwardRef, useState, useMemo, useCallback, useEffect } from 'react';
import { Button } from '@smarti/ui';
import { PlayerProps, PlayerHandle, ItemContextResponse, ItemResult } from '../types';

type CardColor = "green" | "blue" | "red" | "yellow";
type Technique = "eselsbruecke" | "body-map" | "story" | "other";

interface Flashcard {
  front: string;
  back: string;
  hint: string | null;
  example: string | null;
  color: CardColor;
  technique: Technique;
}

const resolveCard = (item: PlayerProps['item'], itemContext: ItemContextResponse): Flashcard => {
  const raw = item.content_data.card as Record<string, unknown>;
  return {
    front:   raw.front as string,
    back:    raw.back as string,
    hint:    (itemContext.mnemonic_text ?? raw.hint ?? null) as string | null,
    example: (raw.example ?? null) as string | null,
    color:   (raw.color ?? 'blue') as CardColor,
    technique: (raw.technique ?? 'other') as Technique,
  };
};

interface CardState {
  flipped:    boolean;
  flippedAt:  number | null;
  hintVisible: boolean;
  answered:   boolean;
}

export const CardPlayer = forwardRef<PlayerHandle, PlayerProps>(
  function CardPlayer({ item, itemContext, mode, onCompleted, onProgress }, ref) {
    const [cardState, setCardState] = useState<CardState>({
      flipped: false, flippedAt: null, hintVisible: false, answered: false,
    });

    const [playerState, setPlayerState] = useState<'RUNNING' | 'PAUSED' | 'COMPLETED' | 'ABORTED'>('RUNNING');
    const [startTime] = useState(Date.now());

    const card = useMemo(() => resolveCard(item, itemContext), [item, itemContext]);

    // Autostart beim Mount
    useEffect(() => {
      // startRunning equivalent
    }, []);

    // PlayerHandle für Shell-Ref
    useEffect(() => {
      if (ref && typeof ref === 'object' && 'current' in ref) {
        ref.current = {
          pause:       () => setPlayerState('PAUSED'),
          resume:      () => setPlayerState('RUNNING'),
          reset:       () => { setPlayerState('RUNNING'); setCardState({ flipped: false, flippedAt: null, hintVisible: false, answered: false }); },
          abort:       (_reason?: import('../types').AbortReason) => { setPlayerState('ABORTED'); },
          getProgress: () => {
            if (cardState.answered) return 100;
            if (cardState.flipped) return 50;
            return 0;
          }
        };
      }
    }, [ref, cardState]);

    const handleFlip = useCallback(() => {
      if (playerState !== 'RUNNING' || cardState.flipped) return;
      const flippedAt = Date.now();
      setCardState(s => ({ ...s, flipped: true, flippedAt }));
      onProgress?.(50);
    }, [playerState, cardState.flipped, onProgress]);

    const handleAnswer = useCallback((correct: boolean) => {
      if (playerState !== 'RUNNING') return;
      if (!cardState.flipped) return;
      if (mode === 'preview') return;

      setCardState(s => ({ ...s, answered: true }));
      setPlayerState('COMPLETED');
      const durationSeconds = Math.floor((Date.now() - startTime) / 1000);
      const result: ItemResult = {
        score:            null,
        pass:             true,
        progress:         100,
        completion:       true,
        durationSeconds,
        skipped: false,
        card_result: {
          correct,
          response_time_sec: durationSeconds,
        },
      };
      onCompleted(result);
    }, [playerState, cardState.flipped, mode, onCompleted, startTime]);

    const isPaused = playerState === 'PAUSED';

    return (
      <div
        className="card-player"
        style={card.color ? { backgroundColor: card.color } : undefined}
        aria-busy={isPaused}
      >
        {!cardState.flipped ? (
          <div className="card-face card-front">
            <p className="card-text">{card.front}</p>

            {card.hint && (
              <>
                {cardState.hintVisible && (
                  <p className="card-hint">💡 {card.hint}</p>
                )}
                <button
                  onClick={() => setCardState(s => ({ ...s, hintVisible: !s.hintVisible }))}
                  disabled={isPaused}
                >
                  Eselsbrücke
                </button>
              </>
            )}

            <Button onClick={handleFlip} disabled={isPaused}>
              Umdrehen
            </Button>
          </div>
        ) : (
          <div className="card-face card-back">
            <p className="card-text">{card.back}</p>
            {card.hint    && <p className="card-hint">💡 {card.hint}</p>}
            {card.example && <p className="card-example">{card.example}</p>}

            <div className="answer-buttons">
              <Button
                onClick={() => handleAnswer(true)}
                disabled={isPaused || mode === 'preview' || playerState === 'COMPLETED'}
              >
                ✓ Gewusst
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleAnswer(false)}
                disabled={isPaused || mode === 'preview' || playerState === 'COMPLETED'}
              >
                ✗ Nicht gewusst
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }
);

CardPlayer.displayName = 'CardPlayer';