import { useEffect, useState } from "react";
import { Button } from "@smarti/ui";
import { Clock } from "lucide-react";

interface BreakScreenProps {
  minutes: number;
  onDone: () => void;
}

export function BreakScreen({ minutes, onDone }: BreakScreenProps) {
  const [remaining, setRemaining] = useState(minutes * 60);

  useEffect(() => {
    if (remaining <= 0) return;
    const interval = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          onDone();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [remaining, onDone]);

  const displayMin = Math.floor(remaining / 60);
  const displaySec = remaining % 60;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="mx-auto max-w-sm space-y-6 text-center">
        <Clock className="mx-auto h-16 w-16 text-primary" />
        <h2 className="text-2xl font-bold">Pause</h2>
        <p className="text-5xl font-mono font-bold tabular-nums text-primary">
          {displayMin}:{displaySec.toString().padStart(2, "0")}
        </p>
        <p className="text-muted-foreground">
          Zeit für eine kurze Erholungspause.
        </p>
        <Button size="lg" onClick={onDone} className="min-w-[200px]">
          Weiter geht's
        </Button>
      </div>
    </div>
  );
}
