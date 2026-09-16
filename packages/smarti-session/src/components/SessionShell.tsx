import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Skeleton, Button } from "@smarti/ui";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@smarti/ui";
import type { ItemResult, PlayerErrorPayload } from "@smarti/players";
import type { TaskForIslandDTO, BreakForIslandDTO } from "@smarti/api";
import {
  useCommitSession as useCommitSessionDefault,
  useCompleteItem as useCompleteItemDefault,
  useSkipItem as useSkipItemDefault,
  useCompleteSession as useCompleteSessionDefault,
  useAbortSession as useAbortSessionDefault,
} from "../hooks/useSession";
import { ItemPlayerRenderer } from "./ItemPlayerRenderer";
import { SessionProgress } from "./SessionProgress";
import { SessionControls } from "./SessionControls";
import { BreakScreen } from "./BreakScreen";
import { FehlerteufelOverlay } from "./FehlerteufelOverlay";

const MAX_RETRIES = 3;

/**
 * Minimal hook return type — compatible with TanStack Query's UseMutationResult.
 *
 * Both the default SMARTi hooks (`@smarti/api`) and custom FFG hooks
 * (`ffg_frontend/hooks/useGuest`) satisfy this shape via `useMutation`.
 */
type UseSessionMutateHook = () => {
  mutate: (data: any, options?: any) => void;
};

export interface SessionShellHandle {
  /** Skip the current item with the given reason. */
  skipCurrentItem: (reason: string) => void;
  /** Complete the entire session immediately (used for timer auto-end). */
  completeSession: () => void;
}

interface SessionShellProps {
  sessionId: string;

  // ── Generic UI callbacks (package-owned) ────────────────────────────
  /** External callback invoked when the session starts. */
  onStart?: () => void;
  /** External callback invoked when the user initiates an abort. */
  onAbort?: () => void;
  /** Whether the abort confirmation dialog is open. */
  showAbortDialog?: boolean;
  /** Setter for the abort dialog open state. */
  setShowAbortDialog?: (show: boolean) => void;
  /** Whether the session contains audio items. */
  hasAudioItems?: boolean;
  /** Setter for the audio items flag. */
  setHasAudioItems?: (has: boolean) => void;
  /** Whether the session has been started (commit done). */
  started?: boolean;
  /** Setter for the started state. */
  setStarted?: (started: boolean) => void;
  /** Whether a commit request is in flight. */
  commitPending?: boolean;
  /** Pre-loaded session tasks (e.g. from FFG start response). */
  initialTasks?: TaskForIslandDTO[];
  /** Pre-loaded break schedule. */
  initialBreaks?: BreakForIslandDTO[];

  // ── Generic redirect callbacks (package-owned) ──────────────────────
  /** Called with the redirect URL after session completion. */
  onCompleteRedirect?: (redirectUrl: string) => void;
  /** Called with the redirect URL after session abort. */
  onAbortRedirect?: (redirectUrl: string) => void;
  /**
   * Called after each individual item is completed (complete-item mutation
   * succeeded).  Enables external accumulation of score / pass / completion
   * counters, e.g. for local subject-result computation.
   */
  onItemResult?: (result: ItemResult) => void;

  // ── Timer / Banner / Task-change props ──────────────────────────
  /** Component rendered in the header next to the progress bar (e.g. FFGSessionTimer). */
  headerTimer?: React.ReactNode;
  /** Component rendered between header and main (e.g. OvertimeBanner). */
  overtimeBanner?: React.ReactNode;
  /** Called whenever the current task changes (0-based index). */
  onTaskChange?: (task: TaskForIslandDTO, index: number) => void;
  /** Called when the session timer exceeds budget+grace (auto-end). */
  onSessionAutoEnd?: () => void;

  // ── Hook overrides (FFG / custom backends) ──────────────────────────
  /**
   * Override the "complete item" mutation hook.
   *
   * By default the package calls `POST /api/v1/sessions/{id}/complete-item/`
    * (SMARTi main backend).  FFG apps should inject their own hook that
    * targets `POST /api/v1/ffg/session/{id}/complete-item/` instead.
   *
   * The hook must return `{ mutate }` matching TanStack Query's
   * `UseMutationResult` shape.
   */
  useCompleteItemOverride?: UseSessionMutateHook;
  /**
   * Override the "skip item" mutation hook.
   *
   * Default target: `POST /api/v1/sessions/{id}/skip-item/`.
   * FFG target:     `POST /api/v1/ffg/session/{id}/skip-item/`.
   */
  useSkipItemOverride?: UseSessionMutateHook;
  /**
   * Override the "complete session" mutation hook.
   *
   * Default target: `POST /api/v1/sessions/{id}/complete/`.
   * FFG target:     `POST /api/v1/ffg/session/{id}/complete/`.
   */
  useCompleteSessionOverride?: UseSessionMutateHook;
  /**
   * Override the "abort session" mutation hook.
   *
   * Default target: `POST /api/v1/sessions/{id}/abort/`.
   * FFG target:     `POST /api/v1/ffg/session/{id}/abort/`.
   */
  useAbortSessionOverride?: UseSessionMutateHook;
}

export const SessionShell = forwardRef<SessionShellHandle, SessionShellProps>(
  (
    {
      sessionId,
      onStart: _onStart,
      onAbort: _onAbort,
      showAbortDialog: _showAbortDialog = false,
      setShowAbortDialog: _setShowAbortDialog,
      hasAudioItems: _hasAudioItems = false,
      setHasAudioItems: _setHasAudioItems,
      started = false,
      setStarted,
      commitPending = false,
      initialTasks,
      initialBreaks,
      onCompleteRedirect: onCompleteRedirectProp,
      onAbortRedirect: onAbortRedirectProp,
      onItemResult,
      // ── Timer / Banner / Task-change props ────────────────────────
      headerTimer,
      overtimeBanner,
      onTaskChange,
      onSessionAutoEnd,
      // ── Hook overrides (FFG / custom backends) ──────────────────────
      useCompleteItemOverride,
      useSkipItemOverride,
      useCompleteSessionOverride,
      useAbortSessionOverride,
    }: SessionShellProps,
    ref,
  ) => {
  const navigate = useNavigate();

  // ── Effective redirect callbacks (prop default → navigate) ─────────────
  const redirectOnComplete = useCallback(
    (url: string) => {
      if (onCompleteRedirectProp) {
        onCompleteRedirectProp(url);
      } else {
        navigate(url, { replace: true });
      }
    },
    [onCompleteRedirectProp, navigate],
  );

  const redirectOnAbort = useCallback(
    (url: string) => {
      if (onAbortRedirectProp) {
        onAbortRedirectProp(url);
      } else {
        navigate(url, { replace: true });
      }
    },
    [onAbortRedirectProp, navigate],
  );

  // Refs keep the latest onItemResult without destabilising useCallback deps
  const onItemResultRef = useRef(onItemResult);
  onItemResultRef.current = onItemResult;

  // ── Resolve hooks: use override if provided, otherwise SMARTi default ──
  const { mutate: commitSession, isPending: isCommitting } = useCommitSessionDefault();
  const { mutate: completeItemMutation } = (useCompleteItemOverride ?? useCompleteItemDefault)();
  const { mutate: skipItemMutation } = (useSkipItemOverride ?? useSkipItemDefault)();
  const { mutate: completeSessionMutation } = (useCompleteSessionOverride ?? useCompleteSessionDefault)();
  const { mutate: abortSessionMutation } = (useAbortSessionOverride ?? useAbortSessionDefault)();

  // State - use external when provided
  const [localStarted, setLocalStarted] = useState(started ?? false);
  const [tasks, setTasks] = useState<TaskForIslandDTO[]>(initialTasks ?? []);
  const [breaks, setBreaks] = useState<BreakForIslandDTO[]>(initialBreaks ?? []);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showBreak, setShowBreak] = useState<number | null>(null);
  const [showFehlerteufel, setShowFehlerteufel] = useState(false);
  const [abortOpen, setAbortOpen] = useState(false);
  const retryCount = useRef(0);

  // Use external started/setStarted if provided, otherwise local state
  const isStarted = started ?? localStarted;
  const setIsStarted = setStarted ?? setLocalStarted;

  const currentTask = tasks[currentIndex] ?? null;

  const loadNextTask = useCallback(() => {
    const next = currentIndex + 1;
    if (next >= tasks.length) {
      completeSessionMutation(
        { sessionId },
        {
          onSuccess: () => {
            redirectOnComplete("/child/dashboard");
          },
          onError: () => {
            toast.error("Session konnte nicht abgeschlossen werden.");
          },
        },
      );
    } else {
      setCurrentIndex(next);
    }
  }, [currentIndex, tasks.length, completeSessionMutation, sessionId, redirectOnComplete]);

  const advance = useCallback(() => {
    const brk = breaks.find((b) => b.after_index === currentIndex);
    if (brk) {
      setShowBreak(brk.duration_minutes);
    } else {
      loadNextTask();
    }
  }, [breaks, currentIndex, loadNextTask]);

  const handleCompleted = useCallback(
    (result: ItemResult) => {
      if (!currentTask) return;

      completeItemMutation(
        {
          sessionId,
          data: {
            task_id: currentTask.task_id,
            item_id: currentTask.item_data?.item_id ?? "",
            score: result.score,
            pass: result.pass,
            duration_seconds: result.durationSeconds,
            progress: result.progress,
            completion: result.completion,
          },
        },
        {
          onSuccess: (data) => {
            retryCount.current = 0;
            onItemResultRef.current?.(result);
            if (data.all_completed) {
              loadNextTask();
            } else {
              advance();
            }
          },
          onError: () => {
            retryCount.current += 1;
            if (retryCount.current < MAX_RETRIES) {
              const delay = Math.pow(2, retryCount.current) * 1000;
              setTimeout(() => handleCompleted(result), delay);
            } else {
              toast.error("Aufgabe konnte nicht gespeichert werden. Die Session wurde pausiert.");
            }
          },
        },
      );
    },
    [currentTask, completeItemMutation, advance, loadNextTask, sessionId],
  );

  const handleSkipped = useCallback(
    (reason: string) => {
      if (!currentTask) return;
      skipItemMutation(
        { sessionId, data: { task_id: currentTask.task_id, reason } },
        {
          onSuccess: () => advance(),
          onError: () => {
            toast.error("Fehler beim Überspringen.");
          },
        },
      );
    },
    [currentTask, skipItemMutation, advance, sessionId],
  );

  const handleError = useCallback(
    (_error: PlayerErrorPayload) => {
      toast.error("Aufgabe konnte nicht geladen werden.");
      handleSkipped("player_error");
    },
    [handleSkipped],
  );

  const handleAbort = useCallback(() => {
    setAbortOpen(false);
    abortSessionMutation(
      { sessionId, data: { reason: "user_navigation" } },
      {
        onSuccess: () => {
          redirectOnAbort("/child/dashboard");
        },
        onError: () => {
          toast.error("Fehler beim Abbrechen.");
        },
      },
    );
  }, [abortSessionMutation, sessionId, redirectOnAbort]);

  const handleCommit = useCallback(() => {
    commitSession(
      { sessionId },
      {
        onSuccess: (data) => {
          setTasks(data.tasks);
          setBreaks(data.breaks ?? []);
          setCurrentIndex(0);
          setIsStarted(true);
        },
        onError: () => {
          toast.error("Session konnte nicht gestartet werden.");
        },
      },
    );
  }, [commitSession, sessionId]);

  // ── Imperative handle (accessible via ref) ───────────────────────────
  useImperativeHandle(
    ref,
    () => ({
      skipCurrentItem: (reason: string) => {
        handleSkipped(reason);
      },
      completeSession: () => {
        onSessionAutoEnd?.();
        completeSessionMutation(
          { sessionId },
          {
            onSuccess: () => {
              redirectOnComplete("/child/dashboard");
            },
            onError: () => {
              toast.error("Session konnte nicht abgeschlossen werden.");
            },
          },
        );
      },
    }),
    [handleSkipped, completeSessionMutation, sessionId, redirectOnComplete, onSessionAutoEnd],
  );

  // ── Notify parent on task change ─────────────────────────────────────
  const prevTaskRef = useRef(currentTask);
  useEffect(() => {
    if (currentTask && currentTask !== prevTaskRef.current) {
      prevTaskRef.current = currentTask;
      onTaskChange?.(currentTask, currentIndex);
    }
  }, [currentTask, currentIndex, onTaskChange]);

  // ── Early returns ────────────────────────────────────────────────────
  if (!isStarted && tasks.length === 0 && !commitPending) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="space-y-4 text-center">
          <Skeleton className="mx-auto h-8 w-64" />
          <Skeleton className="mx-auto h-32 w-96" />
        </div>
      </div>
    );
  }

  if (!isStarted && tasks.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
        <h1 className="text-3xl font-bold tracking-tight">Bereit für die Session?</h1>
        <p className="max-w-md text-center text-muted-foreground">
          Klicke auf "Starten" um mit den Aufgaben zu beginnen.
        </p>
        <Button size="lg" onClick={handleCommit} disabled={isCommitting}>
          {isCommitting ? "Wird gestartet..." : "Starten"}
        </Button>
      </div>
    );
  }

  if (!currentTask) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Skeleton className="h-8 w-48" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b px-4 py-3">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <SessionProgress current={currentIndex + 1} total={tasks.length} />
          {headerTimer}
          <SessionControls
            onAbort={() => setAbortOpen(true)}
            onSkip={() => handleSkipped("user_skip")}
          />
        </div>
      </header>

      {overtimeBanner && (
        <div className="border-b px-4 py-2">
          {overtimeBanner}
        </div>
      )}

      {showBreak !== null && (
        <BreakScreen
          minutes={showBreak}
          onDone={() => {
            setShowBreak(null);
            loadNextTask();
          }}
        />
      )}

      {showFehlerteufel && (
        <FehlerteufelOverlay
          onDone={() => {
            setShowFehlerteufel(false);
            advance();
          }}
        />
      )}

      <main className="flex flex-1 flex-col px-4 py-6">
        {currentTask && (
          <ItemPlayerRenderer
            key={currentTask.task_id}
            task={currentTask}
            onCompleted={handleCompleted}
            onSkipped={handleSkipped}
            onError={handleError}
          />
        )}
      </main>

      <AlertDialog open={abortOpen} onOpenChange={setAbortOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Session abbrechen?</AlertDialogTitle>
            <AlertDialogDescription>
              Wenn du die Session abbrichst, wird dein Fortschritt nicht gespeichert.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Weitermachen</AlertDialogCancel>
            <AlertDialogAction onClick={handleAbort}>
              Session beenden
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
  },
);
SessionShell.displayName = "SessionShell";
