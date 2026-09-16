import { forwardRef, useState, useCallback, useImperativeHandle } from 'react';
import { Button } from '@smarti/ui';
import { PlayerProps, PlayerHandle } from '../types';

export const AppPlayer = forwardRef<PlayerHandle, PlayerProps>(
  ({ item, onCompleted, onSkipped }, ref) => {
    const [completed, setCompleted] = useState(false);
    const contentUrl = (item.content_data as Record<string, unknown>)?.content_url as string | undefined;

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

    if (!contentUrl) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-4 p-6">
          <p className="text-muted-foreground">Keine App-URL vorhanden.</p>
          <Button onClick={handleComplete}>Weiter</Button>
        </div>
      );
    }

    return (
      <div className="flex flex-col h-full gap-4 p-6">
        <iframe
          src={contentUrl}
          sandbox="allow-scripts allow-same-origin"
          className="flex-1 w-full border rounded min-h-[400px]"
          title="App-Inhalt"
        />
        <Button onClick={handleComplete}>Abschließen</Button>
      </div>
    );
  },
);
AppPlayer.displayName = 'AppPlayer';
