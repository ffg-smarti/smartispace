import { Button } from "../components/ui/button";
import type { FallbackProps } from "react-error-boundary";

export function GlobalErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  const getErrorMessage = () => {
    if (typeof error === 'object' && error !== null) {
      if ('message' in error) {
        return error.message as string;
      }
    }
    return 'Ein unbekannter Fehler ist aufgetreten';
  };

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="space-y-4 text-center">
        <h2 className="text-2xl font-bold">Etwas ist schiefgelaufen</h2>
        <p className="text-muted-foreground">{getErrorMessage()}</p>
        <Button onClick={resetErrorBoundary}>Erneut versuchen</Button>
      </div>
    </div>
  );
}
