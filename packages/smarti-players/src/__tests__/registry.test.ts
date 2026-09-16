/**
 * Unit tests for PLAYER_REGISTRY and dynamic registry functions.
 *
 * @file packages/smarti-players/src/__tests__/registry.test.ts
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  PLAYER_REGISTRY,
  getPlayer,
  hasPlayer,
  registerPlayer,
  getRegisteredPlayers,
} from '../registry';

// Simple function component for testing
const DummyPlayer = () => null;

// ---------------------------------------------------------------------------
// PLAYER_REGISTRY — static registry
// ---------------------------------------------------------------------------

describe('PLAYER_REGISTRY (static)', () => {
  it('registers all 9 expected player types', () => {
    const keys = Object.keys(PLAYER_REGISTRY);
    expect(keys).toHaveLength(9);
    expect(keys).toEqual(
      expect.arrayContaining([
        'card',
        'scan',
        'flashcard',
        'h5p',
        'course_presentation',
        'fill_the_blanks',
        'video',
        'text',
        'app',
      ]),
    );
  });

  it('each entry is a React component (function or object with $$typeof)', () => {
    for (const component of Object.values(PLAYER_REGISTRY)) {
      expect(component).toBeDefined();
      // React components are functions or memo-wrapped objects
      const isFunction = typeof component === 'function';
      const isMemo = typeof component === 'object' && component !== null && '$$typeof' in component;
      expect(isFunction || isMemo).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// getPlayer() — dynamic + static fallback
// ---------------------------------------------------------------------------

describe('getPlayer()', () => {
  it('returns static player for known type', () => {
    const player = getPlayer('card');
    expect(player).toBe(PLAYER_REGISTRY['card']);
  });

  it('returns null for unknown type', () => {
    const player = getPlayer('nonexistent_type');
    expect(player).toBeNull();
  });

  it('case-insensitive lookup', () => {
    const player = getPlayer('Card');
    expect(player).toBe(PLAYER_REGISTRY['card']);
  });
});

// ---------------------------------------------------------------------------
// hasPlayer() — checks both registries
// ---------------------------------------------------------------------------

describe('hasPlayer()', () => {
  it('returns true for static player', () => {
    expect(hasPlayer('card')).toBe(true);
  });

  it('returns false for unknown type', () => {
    expect(hasPlayer('nonexistent_type')).toBe(false);
  });

  it('case-insensitive check', () => {
    expect(hasPlayer('Card')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// registerPlayer() + dynamic lookup
// ---------------------------------------------------------------------------

describe('registerPlayer()', () => {
  beforeEach(() => {
    // Clean up any previously registered dummy players
    // Note: dynamicRegistry is module-scoped, so we register with unique keys
  });

  it('registers a new player type', () => {
    registerPlayer('test_dynamic_player', DummyPlayer);
    expect(hasPlayer('test_dynamic_player')).toBe(true);
    expect(getPlayer('test_dynamic_player')).toBe(DummyPlayer);
  });

  it('dynamic player takes precedence over static', () => {
    const CustomCard = () => null;
    registerPlayer('card', CustomCard);
    expect(getPlayer('card')).toBe(CustomCard);
  });

  it('lowercases the key', () => {
    registerPlayer('UPPERCASE_KEY', DummyPlayer);
    expect(hasPlayer('uppercase_key')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// getRegisteredPlayers() — union of all keys
// ---------------------------------------------------------------------------

describe('getRegisteredPlayers()', () => {
  it('returns at least the 9 static types', () => {
    const players = getRegisteredPlayers();
    expect(players.length).toBeGreaterThanOrEqual(9);
    expect(players).toEqual(expect.arrayContaining(['card', 'scan', 'video']));
  });

  it('includes dynamically registered types', () => {
    registerPlayer('test_get_all', DummyPlayer);
    const players = getRegisteredPlayers();
    expect(players).toContain('test_get_all');
  });
});
