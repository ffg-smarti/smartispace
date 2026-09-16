import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

interface FehlerteufelOverlayProps {
  onDone: () => void;
}

export function FehlerteufelOverlay({ onDone }: FehlerteufelOverlayProps) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDismissed(true);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (dismissed) onDone();
  }, [dismissed, onDone]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="mx-auto max-w-sm space-y-4 text-center animate-in fade-in zoom-in">
        <Sparkles className="mx-auto h-16 w-16 text-yellow-500" />
        <h2 className="text-2xl font-bold">Fehlerteufel</h2>
        <p className="text-muted-foreground">
          Dieses Item wurde bereits einmal bearbeitet. Nutze die Gelegenheit um
          dein Wissen zu festigen!
        </p>
      </div>
    </div>
  );
}
