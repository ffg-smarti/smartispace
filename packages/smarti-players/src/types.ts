// @smarti/players - Unified player types
// Three-concern content model: content_data (WAS), display_config (LOOKS), behavior_config (RULES)
//
// PlayerProps Contract (§ content-item-player-spec §3.1, session-player-spec §4.8.4):
//   item        = { content_data, display_config, behavior_config }
//   itemContext = ItemContextResponse (top-level, separate from item)
//   item_type   = via itemContext.item_type (Task-Kontext, nicht in PlayerProps)

export type PlayerMode = 'session' | 'preview';

export type AbortReason =
  | 'session_timeout'
  | 'user_navigation'
  | 'session_paused'
  | 'error';

// Assembly DTO — three-concern content model
// Used by the session assembly layer to construct player props
export interface ItemWithPlayerDto {
  item_id: string;
  item_type: string;
  content_data: Record<string, unknown>;
  display_config: Record<string, unknown>;
  behavior_config: Record<string, unknown>;
  title?: string;
  item_context?: ItemContextResponse;
}

// Maps ItemContextForIslandDTO from the backend (session-player-spec §4.1).
// Content-specific data (formerly in type_config) is now in item.content_data.
export interface ItemContextResponse {
  item_type?: string;          // set by ItemPlayerRenderer from task context
  mnemonic_text?: string | null;
  body_mailbox_snapshot?: Record<string, unknown> | null;
  min_score_ever?: number | null;
  pass_threshold?: number;
  h5p_content_id?: string;
  [key: string]: unknown;
}

export interface CardResultPayload {
  correct: boolean;
  response_time_sec: number;
}

export interface ErrorAnalysisPayload {
  error_type: string;
  details: Record<string, unknown>;
}

export interface ScanResultPayload {
  checklist_total: number;
  checklist_done: number;
  checklist_completion_ratio: number;
}

export interface SessionTaskItem {
  item_type: string;
  item_id: string;
  item_data?: {
    item_type: string;
    content_data: Record<string, unknown>;
    display_config: Record<string, unknown>;
    behavior_config: Record<string, unknown>;
  };
  item_context: Record<string, unknown>;
  story_points?: number;
  task_id?: string;
}

export interface ItemResult {
  score: number | null;
  durationSeconds: number;
  skipped: boolean;
  pass?: boolean;
  progress?: number;
  completion?: boolean;
  card_result?: CardResultPayload;
  error_analysis?: ErrorAnalysisPayload;
  scan_result?: ScanResultPayload;
}

export interface PlayerErrorPayload {
  message: string;
  code?: string;
}

export interface PlayerProps {
  item: {
    content_data: Record<string, unknown>;
    display_config: Record<string, unknown>;
    behavior_config: Record<string, unknown>;
  };
  itemContext: ItemContextResponse;
  mode: PlayerMode;
  onCompleted: (result: ItemResult) => void;
  onSkipped?: (reason: string) => void;
  onError?: (error: PlayerErrorPayload) => void;
  onProgress?: (percent: number) => void;
  config?: {
    showHints?: boolean;
    allowSkip?: boolean;
  };
  ref?: React.Ref<PlayerHandle>;
}

export interface PlayerHandle {
  pause: () => void;
  resume: () => void;
  reset: () => void;
  abort: (reason?: AbortReason) => void;
  getProgress: () => number;
}
