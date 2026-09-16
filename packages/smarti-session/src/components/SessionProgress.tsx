import { Progress } from "@smarti/ui";

interface SessionProgressProps {
  current: number;
  total: number;
}

export function SessionProgress({ current, total }: SessionProgressProps) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-muted-foreground">
        {current} / {total} Aufgaben
      </span>
      <Progress value={pct} className="h-2 w-32" />
    </div>
  );
}
