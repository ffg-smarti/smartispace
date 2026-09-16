import { Card, CardContent, Button } from '@smarti/ui';
import { AlertTriangle } from 'lucide-react';

interface ItemValidationFallbackProps {
  errors: string[];
  onContinue?: () => void;
}

export function ItemValidationFallback({ errors, onContinue }: ItemValidationFallbackProps) {
  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardContent className="flex flex-col items-center justify-center gap-4 py-12">
        <AlertTriangle className="h-12 w-12 text-destructive" />
        <p className="text-lg font-medium text-destructive">
          Aufgabe kann nicht angezeigt werden
        </p>
        <ul className="text-sm text-muted-foreground list-disc list-inside">
          {errors.map((err, i) => <li key={i}>{err}</li>)}
        </ul>
        {onContinue && (
          <Button onClick={onContinue} variant="outline" className="mt-4">
            Weiter
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
