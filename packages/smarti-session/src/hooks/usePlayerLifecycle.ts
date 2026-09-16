import { useState, useRef, useCallback } from 'react';

export type PlayerState = 
  | 'IDLE' 
  | 'LOADING' 
  | 'READY' 
  | 'RUNNING'
  | 'PAUSED' 
  | 'COMPLETED' 
  | 'ABORTED' 
  | 'ERROR';

export function usePlayerLifecycle() {
  const [playerState, setPlayerState] = useState<PlayerState>('LOADING');
  const startedAt = useRef<number | null>(null);

  const startRunning = useCallback(() => {
    startedAt.current = Date.now();
    setPlayerState('RUNNING');
  }, []);

  const elapsedSeconds = useCallback((since?: number) => {
    const from = since ?? startedAt.current ?? Date.now();
    return Math.round((Date.now() - from) / 1000);
  }, []);

  return { playerState, setPlayerState, startRunning, elapsedSeconds };
}
