import { getPlayer } from "@smarti/players";
import type { PlayerProps, ItemContextResponse } from "@smarti/players";
import type { TaskForIslandDTO } from "@smarti/api";
import { Alert, AlertDescription, AlertTitle, Button } from "@smarti/ui";
import { AlertCircle } from "lucide-react";
import { ErrorBoundary } from "react-error-boundary";
import type { FallbackProps } from "react-error-boundary";

interface ItemPlayerRendererProps {
  task: TaskForIslandDTO;
  onCompleted: PlayerProps["onCompleted"];
  onSkipped: PlayerProps["onSkipped"];
  onError: PlayerProps["onError"];
}

// Maps TaskForIslandDTO → PlayerProps (Three-Concern-Modell).
// item_data carries content_data (WAS), display_config (LOOKS), behavior_config (RULES).
// item_type is forwarded via itemContext for PLAYER_MAP lookup in PlayerWrapper.
// Spec: content-domain-spec §1.2.3.15, session-player-spec §4.8.3
function toPlayerProps(task: TaskForIslandDTO): {
  item: PlayerProps["item"];
  itemContext: ItemContextResponse;
} {
  const itemData = (task.item_data ?? {}) as Record<string, unknown>;
  return {
    item: {
      content_data: (itemData["content_data"] ?? {}) as Record<string, unknown>,
      display_config: (itemData["display_config"] ?? {}) as Record<string, unknown>,
      behavior_config: (itemData["behavior_config"] ?? {}) as Record<string, unknown>,
    },
    itemContext: {
      ...((task.item_context ?? {}) as Record<string, unknown>),
      item_type: (itemData["item_type"] as string) ?? "unknown",
    } as ItemContextResponse,
  };
}

function PlayerWrapper({
  item,
  itemContext,
  onCompleted,
  onSkipped,
  onError,
}: {
  item: PlayerProps["item"];
  itemContext: ItemContextResponse;
  onCompleted: PlayerProps["onCompleted"];
  onSkipped: PlayerProps["onSkipped"];
  onError: PlayerProps["onError"];
}) {
  // Extract item_type from itemContext for player lookup
  const itemType = itemContext.item_type ?? "unknown";
  const PlayerComponent = getPlayer(itemType);

  if (!PlayerComponent) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Unbekannter Item-Typ</AlertTitle>
        <AlertDescription>
          Der Item-Typ &ldquo;{itemType}&rdquo; wird nicht unterstützt.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <PlayerComponent
      item={item}
      itemContext={itemContext}
      onCompleted={onCompleted}
      onSkipped={onSkipped}
      onError={onError}
      mode="session"
    />
  );
}

function PlayerErrorFallback({
  error,
  resetErrorBoundary,
  onSkip,
}: {
  error: Error;
  resetErrorBoundary: () => void;
  onSkip?: (reason: string) => void;
}) {
  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Fehler beim Laden</AlertTitle>
      <AlertDescription>
        {error.message}
        <div className="mt-4 flex gap-2">
          <Button variant="outline" onClick={resetErrorBoundary}>
            Erneut versuchen
          </Button>
          <Button variant="ghost" onClick={() => onSkip?.("player_error")}>
            Überspringen
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}

export function ItemPlayerRenderer({
  task,
  onCompleted,
  onSkipped,
  onError,
}: ItemPlayerRendererProps) {
  const { item, itemContext } = toPlayerProps(task);

  return (
    <ErrorBoundary
      fallbackRender={({ error, resetErrorBoundary }: FallbackProps) => {
        const normalizedError =
          error instanceof Error ? error : new Error("Unbekannter Fehler");
        return (
          <PlayerErrorFallback
            error={normalizedError}
            resetErrorBoundary={resetErrorBoundary}
            onSkip={onSkipped}
          />
        );
      }}
    >
      <PlayerWrapper
        item={item}
        itemContext={itemContext}
        onCompleted={onCompleted}
        onSkipped={onSkipped}
        onError={onError}
      />
    </ErrorBoundary>
  );
}
