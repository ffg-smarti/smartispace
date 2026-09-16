// @smarti/players - Player components, registry, and types

// Types
export type {
  PlayerMode,
  AbortReason,
  SessionTaskItem,
  ItemResult,
  PlayerErrorPayload,
  PlayerProps,
  PlayerHandle,
  ItemWithPlayerDto,
  ItemContextResponse,
} from "./types";

// Hooks
export { usePlayerLifecycle } from "./hooks/usePlayerLifecycle";
export { useDrag } from "./hooks/useDrag";
export { useAudio } from "./hooks/useAudio";
export type { PlayerState } from "./hooks/usePlayerLifecycle";
export type { DragItem, DragSlot, UseDragReturn } from "./hooks/useDrag";
export type { UseAudioOptions, UseAudioReturn } from "./hooks/useAudio";

// Registry
export { PLAYER_REGISTRY, registerPlayer, getPlayer, hasPlayer, getRegisteredPlayers } from "./registry";

// Theme Registry
export { resolveTheme, availableThemes } from "./theme-registry";
export type { SlideColors, ThemeName } from "./theme-registry";

// Validation
export { validateItemData } from "./validation";
export type { ValidationRule, ValidationResult } from "./validation";

// Components
export { ItemValidationFallback } from "./components/ItemValidationFallback";
export { AudioPlayer } from "./components/AudioPlayer";
export type { AudioPlayerProps } from "./components/AudioPlayer";

// Player Components (imported for side-effect registration)
import "./players/CardPlayer";
import "./players/ScanPlayer";
import "./players/FlashcardPlayer";
import "./players/H5PPlayer";
import "./players/KurspraesentationPlayer";
import "./players/FillInTheBlanksPlayer";

// Re-export player components for direct usage if needed
export { CardPlayer } from "./players/CardPlayer";
export { ScanPlayer } from "./players/ScanPlayer";
export { FlashcardPlayer } from "./players/FlashcardPlayer";
export { H5PPlayerComponent as H5PPlayer } from "./players/H5PPlayer";
export { KurspraesentationPlayer } from "./players/KurspraesentationPlayer";
export { FillInTheBlanksPlayer } from "./players/FillInTheBlanksPlayer";