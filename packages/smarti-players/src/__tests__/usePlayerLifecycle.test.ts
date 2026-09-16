/**
 * Unit tests for usePlayerLifecycle hook.
 *
 * @file packages/smarti-players/src/__tests__/usePlayerLifecycle.test.ts
 */

import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { usePlayerLifecycle } from '../hooks/usePlayerLifecycle';

describe('usePlayerLifecycle()', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('initializes to LOADING state', () => {
    const { result } = renderHook(() => usePlayerLifecycle());
    expect(result.current.playerState).toBe('LOADING');
  });

  it('startRunning transitions to RUNNING', () => {
    const { result } = renderHook(() => usePlayerLifecycle());
    act(() => {
      result.current.startRunning();
    });
    expect(result.current.playerState).toBe('RUNNING');
  });

  it('setPlayerState allows arbitrary transitions', () => {
    const { result } = renderHook(() => usePlayerLifecycle());
    act(() => {
      result.current.setPlayerState('READY');
    });
    expect(result.current.playerState).toBe('READY');

    act(() => {
      result.current.setPlayerState('RUNNING');
    });
    expect(result.current.playerState).toBe('RUNNING');

    act(() => {
      result.current.setPlayerState('COMPLETED');
    });
    expect(result.current.playerState).toBe('COMPLETED');
  });

  it('elapsedSeconds returns 0 before startRunning', () => {
    const { result } = renderHook(() => usePlayerLifecycle());
    // Before startRunning, startedAt is null → uses Date.now()
    // With fake timers, Date.now() is frozen
    expect(result.current.elapsedSeconds()).toBe(0);
  });

  it('elapsedSeconds returns elapsed time after startRunning', () => {
    const { result } = renderHook(() => usePlayerLifecycle());
    act(() => {
      result.current.startRunning();
    });
    // Advance timer by 5 seconds
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(result.current.elapsedSeconds()).toBe(5);
  });

  it('elapsedSeconds accepts custom since parameter', () => {
    const { result } = renderHook(() => usePlayerLifecycle());
    const now = Date.now();
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    // Since 3 seconds ago
    expect(result.current.elapsedSeconds(now)).toBe(3);
  });

  it('all 8 PlayerState values are valid', () => {
    const validStates = [
      'IDLE', 'LOADING', 'READY', 'RUNNING',
      'PAUSED', 'COMPLETED', 'ABORTED', 'ERROR',
    ];
    const { result } = renderHook(() => usePlayerLifecycle());
    for (const state of validStates) {
      act(() => {
        result.current.setPlayerState(state as any);
      });
      expect(result.current.playerState).toBe(state);
    }
  });
});
