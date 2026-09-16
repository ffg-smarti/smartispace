import { forwardRef, useState, useCallback, useImperativeHandle } from 'react';
import { Button } from '@smarti/ui';
import { PlayerProps, PlayerHandle } from '../types';

export const TextPlayer = forwardRef<PlayerHandle, PlayerProps>(
  ({ item, onCompleted, onSkipped }, ref) => {
    const [read, setRead] = useState(false);
    const text = (item.content_data as Record<string, unknown>)?.text as string | undefined;

    useImperativeHandle(ref, () => ({
      pause: () => {},
      resume: () => {},
      reset: () => setRead(false),
      abort: (reason) => onSkipped?.(reason ?? 'error'),
      getProgress: () => (read ? 100 : 0),
    }));

    const handleComplete = useCallback(() => {
      setRead(true);
      onCompleted({ score: null, durationSeconds: 0, skipped: false, completion: true });
    }, [onCompleted]);

    return (
      <div className="flex flex-col h-full gap-4 p-6 overflow-auto">
        <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: text ?? '<p>Kein Text vorhanden.</p>' }} />
        <Button onClick={handleComplete}>Gelesen</Button>
      </div>
    );
  },
);
TextPlayer.displayName = 'TextPlayer';
