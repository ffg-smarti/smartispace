import { forwardRef, useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { Button, Input, Checkbox, cn } from "@smarti/ui";
import { PlayerProps, PlayerHandle, ItemResult, ScanResultPayload } from "../types";
import { usePlayerLifecycle } from "../hooks/usePlayerLifecycle";

/**
 * ScanPlayer — Player für scan-basierte Lerneinheiten (z. B. PDFs/Arbeitsblätter)
 * mit zugehöriger Checkliste.
 *
 * Folgt dem Pattern aus `src/players/types.ts` (PlayerProps/PlayerHandle) +
 * `src/players/base/usePlayerLifecycle.ts`.
 */

interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

// Demo-PDF (mehrseitig) — Fallback wenn `item.content_data.scan.file_url` fehlt
const DEMO_SCAN_URL =
  "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf";

function resolveScanConfig(item: PlayerProps["item"]): {
  fileUrl: string;
  initialChecklist: ChecklistItem[];
} {
  // content_data wird im Backend pro Medium-Typ geliefert. Wir lesen defensiv,
  // da das exakte Backend-Schema für SCAN-Items derzeit nicht typisiert vorliegt.
  type RawScanConfig = {
    file_url?: string;
    fileUrl?: string;
    url?: string;
    checklist_items?: Array<{ id?: string; text?: string }>;
  };
  type RawContentData = { scan?: RawScanConfig };

  const tc = ((item.content_data as unknown as RawContentData) ?? {}) as RawContentData;
  const scan: RawScanConfig = tc.scan ?? {};
  const fileUrl: string =
    scan.file_url ?? scan.fileUrl ?? scan.url ?? DEMO_SCAN_URL;
  const rawItems = Array.isArray(scan.checklist_items)
    ? scan.checklist_items
    : [];
  const initialChecklist: ChecklistItem[] = rawItems
    .filter((it) => typeof it?.text === "string")
    .map((it, idx) => ({
      id: it.id ?? `pre-${idx}`,
      text: it.text as string,
      done: false,
    }));
  return { fileUrl, initialChecklist };
}

export const ScanPlayer = forwardRef<PlayerHandle, PlayerProps>(
  function ScanPlayer({ item, itemContext, mode, onCompleted, onProgress }, ref) {
    const { playerState, setPlayerState, startRunning, elapsedSeconds } =
      usePlayerLifecycle();

    const { fileUrl, initialChecklist } = resolveScanConfig(item);
    // Konsumiere itemContext explizit, damit künftige Nutzung (Mnemonic etc.)
    // klar sichtbar ist und linter zufrieden ist.
    void itemContext;

    const [items, setItems] = useState<ChecklistItem[]>(initialChecklist);
    const [newItem, setNewItem] = useState("");
    const [expanded, setExpanded] = useState(false);
    const [completed, setCompleted] = useState(false);

    // Autostart beim Mount
    useEffect(() => {
      startRunning();
    }, [startRunning]);

    // PlayerHandle für Shell-Ref
    useEffect(() => {
      if (!ref || typeof ref === "function") return;
      ref.current = {
        pause: () => setPlayerState("PAUSED"),
        resume: () => setPlayerState("RUNNING"),
        reset: () => { setPlayerState("RUNNING"); setItems(initialChecklist); setCompleted(false); },
        abort: (_reason?: import('../types').AbortReason) => { setPlayerState("ABORTED"); },
        getProgress: () => {
          if (items.length === 0) return completed ? 100 : 0;
          return Math.round(
            (items.filter((i) => i.done).length / items.length) * 100,
          );
        },
      };
    }, [ref, items, completed, setPlayerState, initialChecklist]);

    const isPaused = playerState === "PAUSED";
    const doneCount = items.filter((i) => i.done).length;
    const ratio = items.length === 0 ? 0 : doneCount / items.length;

    const reportProgress = useCallback(
      (next: ChecklistItem[]) => {
        if (next.length === 0) return;
        const pct = Math.round(
          (next.filter((i) => i.done).length / next.length) * 100,
        );
        onProgress?.(pct);
      },
      [onProgress],
    );

    const addItem = useCallback(() => {
      const text = newItem.trim();
      if (!text || isPaused) return;
      setItems((prev) => {
        const next = [
          ...prev,
          { id: crypto.randomUUID(), text, done: false },
        ];
        reportProgress(next);
        return next;
      });
      setNewItem("");
    }, [newItem, isPaused, reportProgress]);

    const toggleItem = useCallback(
      (id: string) => {
        if (isPaused) return;
        setItems((prev) => {
          const next = prev.map((it) =>
            it.id === id ? { ...it, done: !it.done } : it,
          );
          reportProgress(next);
          return next;
        });
      },
      [isPaused, reportProgress],
    );

    const removeItem = useCallback(
      (id: string) => {
        if (isPaused) return;
        setItems((prev) => {
          const next = prev.filter((it) => it.id !== id);
          reportProgress(next);
          return next;
        });
      },
      [isPaused, reportProgress],
    );

    const handleComplete = useCallback(() => {
      if (mode === "preview") return;
      if (playerState !== "RUNNING") return;
      const total = items.length;
      const done = items.filter((i) => i.done).length;
      const completionRatio = total === 0 ? 1 : done / total;
      const scanResult: ScanResultPayload = {
        checklist_total: total,
        checklist_done: done,
        checklist_completion_ratio: completionRatio,
      };
      setCompleted(true);
      setPlayerState("COMPLETED");
      const result: ItemResult = {
        score: null,
        pass: completionRatio >= 1,
        progress: 100,
        completion: true,
        durationSeconds: elapsedSeconds(),
        skipped: false,
        scan_result: scanResult,
      };
      onCompleted(result);
    }, [mode, playerState, items, elapsedSeconds, onCompleted, setPlayerState]);

    return (
      <div
        className="mx-auto flex h-[80vh] w-full max-w-4xl flex-col gap-3 rounded-3xl border-2 border-foreground/15 bg-card/60 p-4 shadow-sm"
        aria-busy={isPaused}
      >
        {/* Scan-Bereich */}
        <div
          className={cn(
            "min-h-0 overflow-hidden rounded-2xl border border-border bg-muted transition-all",
            expanded ? "flex-[1]" : "flex-[3]",
          )}
        >
          <iframe
            src={`${fileUrl}#view=FitH`}
            sandbox="allow-scripts allow-same-origin"
            title="Scan"
            className="h-full w-full"
          />
        </div>

        {/* Checkliste */}
        <div
          className={cn(
            "min-h-0 flex flex-col rounded-2xl border border-border bg-card p-3 transition-all",
            expanded ? "flex-[3]" : "flex-1",
          )}
        >
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="mb-2 flex items-center justify-between rounded-md px-1 py-0.5 text-left hover:bg-muted/60"
          >
            <div className="flex items-center gap-2">
              {expanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              )}
              <h3 className="text-sm font-semibold text-foreground">
                Checkliste
              </h3>
            </div>
            <span className="text-xs text-muted-foreground">
              {doneCount}/{items.length}
            </span>
          </button>

          {expanded && (
            <div className="flex-1 min-h-0 overflow-auto pr-1">
              {items.length === 0 ? (
                <p className="py-3 text-center text-xs text-muted-foreground">
                  Noch keine Checkpunkte. Füge unten einen hinzu.
                </p>
              ) : (
                <ul className="space-y-1">
                  {items.map((it) => (
                    <li
                      key={it.id}
                      className="group flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/60"
                    >
                      <Checkbox
                        checked={it.done}
                        onCheckedChange={() => toggleItem(it.id)}
                        disabled={isPaused}
                      />
                      <span
                        className={cn(
                          "flex-1 text-sm text-foreground",
                          it.done && "text-muted-foreground line-through",
                        )}
                      >
                        {it.text}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(it.id)}
                        className="h-7 w-7 opacity-0 transition group-hover:opacity-100"
                        aria-label="Entfernen"
                        disabled={isPaused}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Input für neue Checkpunkte */}
        <div className="flex gap-2">
          <Input
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyDown={(e) =>
              e.key === "Enter" && (e.preventDefault(), addItem())
            }
            placeholder="Neuen Punkt hinzufügen…"
            className="h-9 text-sm"
            disabled={isPaused}
          />
          <Button
            size="sm"
            onClick={addItem}
            className="h-9 shrink-0"
            disabled={isPaused}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Abschluss — nur im Session-Modus */}
        {mode === "session" && (
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">
              Fortschritt: {Math.round(ratio * 100)}%
            </span>
            <Button
              size="sm"
              onClick={handleComplete}
              disabled={isPaused || playerState === "COMPLETED"}
            >
              Abschließen
            </Button>
          </div>
        )}
      </div>
    );
  },
);
