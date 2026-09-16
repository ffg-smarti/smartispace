// @smarti/players - Player Registry
// Single lowercase-key convention — no dual-keyed legacy/MediumType duplicates.
// Registry lookup uses toLowerCase() for case-insensitive matching.

import type { PlayerProps, PlayerHandle } from './types';
import { CardPlayer } from './players/CardPlayer';
import { ScanPlayer } from './players/ScanPlayer';
import { FlashcardPlayer } from './players/FlashcardPlayer';
import { H5PPlayerComponent } from './players/H5PPlayer';
import { KurspraesentationPlayer } from './players/KurspraesentationPlayer';
import { FillInTheBlanksPlayer } from './players/FillInTheBlanksPlayer';
import { VideoPlayer } from './players/VideoPlayer';
import { TextPlayer } from './players/TextPlayer';
import { AppPlayer } from './players/AppPlayer';

type PlayerComponent = React.ComponentType<PlayerProps> | React.ForwardRefExoticComponent<PlayerProps & React.RefAttributes<PlayerHandle>>;

// Static registry — lowercase keys only (single canonical convention)
export const PLAYER_REGISTRY: Record<string, React.ComponentType<PlayerProps>> = {
  card: CardPlayer as React.ComponentType<PlayerProps>,
  scan: ScanPlayer as React.ComponentType<PlayerProps>,
  flashcard: FlashcardPlayer as React.ComponentType<PlayerProps>,
  h5p: H5PPlayerComponent as React.ComponentType<PlayerProps>,
  course_presentation: KurspraesentationPlayer as React.ComponentType<PlayerProps>,
  fill_the_blanks: FillInTheBlanksPlayer as React.ComponentType<PlayerProps>,
  video: VideoPlayer as React.ComponentType<PlayerProps>,
  text: TextPlayer as React.ComponentType<PlayerProps>,
  app: AppPlayer as React.ComponentType<PlayerProps>,
};

// Dynamic registry — for runtime registration
const dynamicRegistry: Record<string, PlayerComponent> = {};

export function registerPlayer(mediumType: string, component: PlayerComponent): void {
  dynamicRegistry[mediumType.toLowerCase()] = component;
}

export function getPlayer(mediumType: string): PlayerComponent | null {
  const key = mediumType.toLowerCase();
  return (dynamicRegistry[key] ?? PLAYER_REGISTRY[key] as PlayerComponent | undefined) ?? null;
}

export function hasPlayer(mediumType: string): boolean {
  const key = mediumType.toLowerCase();
  return key in dynamicRegistry || key in PLAYER_REGISTRY;
}

export function getRegisteredPlayers(): string[] {
  return [...new Set([...Object.keys(dynamicRegistry), ...Object.keys(PLAYER_REGISTRY)])];
}
