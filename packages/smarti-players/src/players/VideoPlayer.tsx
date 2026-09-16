import { forwardRef, useState, useCallback, useImperativeHandle } from 'react';
import { Button } from '@smarti/ui';
import { PlayerProps, PlayerHandle } from '../types';

export const VideoPlayer = forwardRef<PlayerHandle, PlayerProps>(
  ({ item, onCompleted, onSkipped }, ref) => {
    const [completed, setCompleted] = useState(false);
    const videoUrl = (item.content_data as Record<string, unknown>)?.video_url as string | undefined;

    useImperativeHandle(ref, () => ({
      pause: () => {},
      resume: () => {},
      reset: () => setCompleted(false),
      abort: (reason) => onSkipped?.(reason ?? 'error'),
      getProgress: () => (completed ? 100 : 0),
    }));

    const handleComplete = useCallback(() => {
      setCompleted(true);
      onCompleted({ score: null, durationSeconds: 0, skipped: false, completion: true });
    }, [onCompleted]);

    if (!videoUrl) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-4 p-6">
          <p className="text-muted-foreground">Kein Video-URL vorhanden.</p>
          <Button onClick={handleComplete}>Weiter</Button>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-6">
        <video src={videoUrl} controls className="max-w-full max-h-[60vh] rounded" />
        <Button onClick={handleComplete}>Video gesehen</Button>
      </div>
    );
  },
);
VideoPlayer.displayName = 'VideoPlayer';
