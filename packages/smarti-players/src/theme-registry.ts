/**
 * Theme Registry — Single source of truth for slide appearance colors.
 *
 * The backend stores only the theme name (string).
 * This registry maps theme names to HSL color values (Doc5 §2.2).
 * Color names follow the semantic token convention (Doc5 §2.4):
 *   --background, --foreground, --success, --destructive, --muted.
 *
 * Unknown theme names fall back to "default".
 */

export interface SlideColors {
  /** Slide background — maps to --background (Doc5 §2.4) */
  background: string;
  /** Text color (questions, intro, score) — maps to --foreground */
  foreground: string;
  /** Correct answer color — maps to --success */
  success: string;
  /** Correct answer background tint */
  successBg: string;
  /** Wrong answer color — maps to --destructive */
  destructive: string;
  /** Wrong answer background tint */
  destructiveBg: string;
  /** Muted/secondary elements (borders, disabled states) — maps to --muted */
  muted: string;
}

/**
 * HSL values as bare "H S% L%" strings (Doc5 §2.2 convention).
 * Wrap in `hsl(...)` when applying to CSS.
 */
const registry: Record<string, SlideColors> = {
  default: {
    background:    '0 0% 100%',
    foreground:    '222 47% 11%',
    success:       '142 71% 45%',
    successBg:     '142 76% 94%',
    destructive:   '0 84% 60%',
    destructiveBg: '0 86% 97%',
    muted:         '210 40% 96%',
  },
  lightBlue: {
    background:    '204 100% 97%',
    foreground:    '222 47% 11%',
    success:       '142 71% 45%',
    successBg:     '142 76% 94%',
    destructive:   '0 84% 60%',
    destructiveBg: '0 86% 97%',
    muted:         '210 40% 96%',
  },
  dark: {
    background:    '222 47% 11%',
    foreground:    '210 40% 96%',
    success:       '142 71% 45%',
    successBg:     '142 40% 15%',
    destructive:   '0 84% 60%',
    destructiveBg: '0 40% 15%',
    muted:         '217 33% 17%',
  },
};

export type ThemeName = keyof typeof registry;

/**
 * Resolve a theme name to its concrete HSL color values.
 * Falls back to "default" if the theme is unknown.
 */
export function resolveTheme(name: string | undefined): SlideColors {
  if (name && name in registry) {
    return registry[name];
  }
  return registry.default;
}

/**
 * Get all available theme names (for UI dropdowns, etc.).
 */
export function availableThemes(): string[] {
  return Object.keys(registry);
}
