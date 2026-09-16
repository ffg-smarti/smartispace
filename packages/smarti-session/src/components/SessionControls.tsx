import { Button } from "@smarti/ui";
import { XCircle, SkipForward } from "lucide-react";

interface SessionControlsProps {
  onAbort: () => void;
  onSkip?: () => void;
  isAborting?: boolean;
  isSkipping?: boolean;
}

export function SessionControls({
  onAbort,
  onSkip,
  isAborting = false,
  isSkipping = false,
}: SessionControlsProps) {
  return (
    <div className="flex items-center gap-2">
      {onSkip && (
        <Button
          variant="default"
          size="sm"
          onClick={onSkip}
          disabled={isSkipping}
        >
          <SkipForward className="mr-1.5 h-4 w-4" />
          Überspringen
        </Button>
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={onAbort}
        disabled={isAborting}
      >
        <XCircle className="mr-1.5 h-4 w-4" />
        Abbrechen
      </Button>
    </div>
  );
}
