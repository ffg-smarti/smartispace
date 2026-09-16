// @smarti/session - Session Shell, components, and hooks

// Components
export { SessionShell } from "./components/SessionShell";
export type { SessionShellHandle } from "./components/SessionShell";
export { ItemPlayerRenderer } from "./components/ItemPlayerRenderer";
export { BreakScreen } from "./components/BreakScreen";
export { SessionControls } from "./components/SessionControls";
export { SessionProgress } from "./components/SessionProgress";
export { FehlerteufelOverlay } from "./components/FehlerteufelOverlay";

// Hooks (usePlayerLifecycle re-exported from @smarti/players)
export { usePlayerLifecycle } from "@smarti/players";
export type { PlayerState } from "@smarti/players";
export {
  useCommitSession,
  useCompleteItem,
  useSkipItem,
  useCompleteSession,
  useAbortSession,
} from "./hooks/useSession";
export type {
  SessionStartedDTO,
  CompleteAtomicItemRequestSchema,
  CompleteCompositeItemRequestSchema,
  ItemCompletedDTO,
  ItemSkipDTO,
  SessionResultDTO,
  SessionAbortedDTO,
  SkipItemRequestSchema,
  AbortSessionRequestSchema,
} from "./hooks/useSession";
