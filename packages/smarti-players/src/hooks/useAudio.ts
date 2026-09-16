import { useState, useRef, useEffect, useCallback } from 'react';

export interface UseAudioOptions {
  mediaUrl: string | null | undefined;
  isPaused?: boolean;
}

export interface UseAudioReturn {
  audioRef: React.RefObject<HTMLAudioElement | null>;
  isPlaying: boolean;
  buttonRef: (el: HTMLButtonElement | null) => void;
}

export function useAudio({ mediaUrl, isPaused }: UseAudioOptions): UseAudioReturn {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const isPlayingRef = useRef(false);
  const buttonRefCb = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    if (isPaused) {
      audioRef.current?.pause();
      setIsPlaying(false);
    }
  }, [isPaused]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onEnded = () => setIsPlaying(false);
    audio.addEventListener('ended', onEnded);
    return () => audio.removeEventListener('ended', onEnded);
  }, [mediaUrl]);

  const handleToggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlayingRef.current) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play()
        .then(() => setIsPlaying(true))
        .catch((err) => console.error('[AudioPlayer] audio.play() failed:', err));
    }
  }, []);

  const buttonRef = useCallback((el: HTMLButtonElement | null) => {
    if (buttonRefCb.current) {
      buttonRefCb.current.removeEventListener('click', handleToggle);
    }
    buttonRefCb.current = el;
    if (el) {
      el.addEventListener('click', handleToggle);
    }
  }, [handleToggle]);

  return { audioRef, isPlaying, buttonRef };
}
