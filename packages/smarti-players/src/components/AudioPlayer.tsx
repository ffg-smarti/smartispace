import { Button } from '@smarti/ui';
import { Play, Pause } from 'lucide-react';
import { useAudio } from '../hooks/useAudio';

export interface AudioPlayerProps {
  mediaUrl: string;
  isPaused?: boolean;
  color?: { foreground: string; borderColor: string };
  className?: string;
}

export function AudioPlayer({ mediaUrl, isPaused, color, className }: AudioPlayerProps) {
  const { audioRef, isPlaying, buttonRef } = useAudio({ mediaUrl, isPaused });

  return (
    <div className={className} onClick={(e) => e.stopPropagation()}>
      <audio ref={audioRef as React.RefObject<HTMLAudioElement>} src={mediaUrl} preload="metadata" />
      <Button
        ref={buttonRef}
        variant="outline"
        size="icon"
        className="w-20 h-20 rounded-full shrink-0"
        style={
          color
            ? { color: color.foreground, borderColor: color.borderColor }
            : undefined
        }
        aria-label={isPlaying ? 'Audio pausieren' : 'Audio abspielen'}
      >
        {isPlaying ? (
          <Pause className="h-8 w-8" />
        ) : (
          <Play className="h-8 w-8 ml-1" />
        )}
      </Button>
    </div>
  );
}
