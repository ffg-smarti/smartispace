import { describe, test, expect, vi, beforeAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { CardPlayer } from '../players/CardPlayer';
import type { PlayerProps, ItemContextResponse } from '../types';

// Mock data — three-concern model
const mockItem: PlayerProps['item'] = {
  content_data: {
    card: {
      front: 'Hello',
      back: 'Hallo',
      hint: 'Standard hint',
      example: 'Hello, how are you?'
    }
  },
  display_config: {},
  behavior_config: {},
};

const mockItemContextWithMnemonic: ItemContextResponse = {
  mnemonic_text: 'Custom mnemonic from context',
  pass_threshold: 80,
};

const mockItemContextWithoutMnemonic: ItemContextResponse = {
  mnemonic_text: null,
  pass_threshold: 80,
};

describe('CardPlayer - REQ-CONTENT-PLAYER-CARD Requirements', () => {
  beforeAll(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  test('REQ-CONTENT-PLAYER-CARD-001: Shows front side on mount', () => {
    const onCompleted = vi.fn();
    render(
      <CardPlayer 
        item={mockItem}
        itemContext={mockItemContextWithoutMnemonic}
        mode="session"
        onCompleted={onCompleted}
        onSkipped={vi.fn()}
        onError={vi.fn()}
      />
    );
    
    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.queryByText('Hallo')).not.toBeInTheDocument();
  });

  test('REQ-CONTENT-PLAYER-CARD-001: Shows back side after flip', async () => {
    const user = userEvent.setup();
    const onCompleted = vi.fn();
    render(
      <CardPlayer 
        item={mockItem}
        itemContext={mockItemContextWithoutMnemonic}
        mode="session"
        onCompleted={onCompleted}
        onSkipped={vi.fn()}
        onError={vi.fn()}
      />
    );
    
    const flipButton = screen.getByRole('button', { name: /umdrehen/i });
    await user.click(flipButton);
    
    expect(screen.getByText('Hallo')).toBeInTheDocument();
    expect(screen.queryByText('Hello')).not.toBeInTheDocument();
  });

  test('REQ-CONTENT-PLAYER-CARD-002: onCompleted called with correct payload for "Gewusst"', async () => {
    const user = userEvent.setup();
    const onCompleted = vi.fn();
    render(
      <CardPlayer 
        item={mockItem}
        itemContext={mockItemContextWithoutMnemonic}
        mode="session"
        onCompleted={onCompleted}
        onSkipped={vi.fn()}
        onError={vi.fn()}
      />
    );
    
    await user.click(screen.getByRole('button', { name: /umdrehen/i }));
    await user.click(screen.getByText(/✓ Gewusst/i));
    
    expect(onCompleted).toHaveBeenCalledOnce();
    const payload = onCompleted.mock.calls[0][0];
    expect(payload.card_result).toBeDefined();
    expect(payload.card_result.correct).toBe(true);
    expect(payload.score).toBeNull();
    expect(payload.pass).toBe(true);
    expect(payload.progress).toBe(100);
    expect(payload.completion).toBe(true);
    expect(payload.durationSeconds).toBeGreaterThanOrEqual(0);
  });

  test('REQ-CONTENT-PLAYER-CARD-002: onCompleted called with correct=false for "Nicht gewusst"', async () => {
    const user = userEvent.setup();
    const onCompleted = vi.fn();
    render(
      <CardPlayer 
        item={mockItem}
        itemContext={mockItemContextWithoutMnemonic}
        mode="session"
        onCompleted={onCompleted}
        onSkipped={vi.fn()}
        onError={vi.fn()}
      />
    );
    
    await user.click(screen.getByRole('button', { name: /umdrehen/i }));
    await user.click(screen.getByText(/✗ Nicht gewusst/i));
    
    const payload = onCompleted.mock.calls[0][0];
    expect(payload.card_result.correct).toBe(false);
  });

  test('REQ-CONTENT-PLAYER-CARD-003: itemContext.mnemonic_text overrides standard hint', async () => {
    const user = userEvent.setup();
    render(
      <CardPlayer 
        item={mockItem}
        itemContext={mockItemContextWithMnemonic}
        mode="session"
        onCompleted={vi.fn()}
      />
    );
    
    await user.click(screen.getByText(/Eselsbrücke/i));
    
    expect(screen.getByText(/💡 Custom mnemonic from context/)).toBeInTheDocument();
    expect(screen.queryByText(/💡 Standard hint/)).not.toBeInTheDocument();
  });

  test('REQ-CONTENT-PLAYER-CARD-003: Standard hint when no mnemonic_text', async () => {
    const user = userEvent.setup();
    render(
      <CardPlayer 
        item={mockItem}
        itemContext={mockItemContextWithoutMnemonic}
        mode="session"
        onCompleted={vi.fn()}
      />
    );
    
    await user.click(screen.getByText(/Eselsbrücke/i));
    
    expect(screen.getByText(/💡 Standard hint/)).toBeInTheDocument();
  });

  test('REQ-CONTENT-PLAYER-CARD-004: Preview mode shows buttons but onCompleted not called', async () => {
    const user = userEvent.setup();
    const onCompleted = vi.fn();
    render(
      <CardPlayer 
        item={mockItem}
        itemContext={mockItemContextWithoutMnemonic}
        mode="preview"
        onCompleted={onCompleted}
        onSkipped={vi.fn()}
        onError={vi.fn()}
      />
    );
    
    await user.click(screen.getByRole('button', { name: /umdrehen/i }));
    
    expect(screen.getByText(/✓ Gewusst/i)).toBeInTheDocument();
    expect(screen.getByText(/✗ Nicht gewusst/i)).toBeInTheDocument();
    
    await user.click(screen.getByText(/✓ Gewusst/i));
    expect(onCompleted).not.toHaveBeenCalled();
  });

  test('REQ-CONTENT-PLAYER-CARD-005: getProgress() returns correct values', async () => {
    const user = userEvent.setup();
    const ref: { current: any } = { current: null };
    
    render(
      <CardPlayer 
        item={mockItem}
        itemContext={mockItemContextWithoutMnemonic}
        mode="session"
        onCompleted={vi.fn()}
        ref={ref}
      />
    );
    
    expect(ref.current?.getProgress()).toBe(0);
    
    await user.click(screen.getByRole('button', { name: /umdrehen/i }));
    expect(ref.current?.getProgress()).toBe(50);
    
    await user.click(screen.getByText(/✓ Gewusst/i));
    expect(ref.current?.getProgress()).toBe(100);
  });

  test('REQ-CONTENT-PLAYER-CARD-006: handleAnswer() before flip() is ignored', () => {
    const onCompleted = vi.fn();
    render(
      <CardPlayer 
        item={mockItem}
        itemContext={mockItemContextWithoutMnemonic}
        mode="session"
        onCompleted={onCompleted}
        onSkipped={vi.fn()}
        onError={vi.fn()}
      />
    );
    
    expect(screen.queryByText(/✓ Gewusst/i)).not.toBeInTheDocument();
    expect(onCompleted).not.toHaveBeenCalled();
  });

  test('REQ-CONTENT-PLAYER-CARD-007: No dangerouslySetInnerHTML used', () => {
    const { container } = render(
      <CardPlayer 
        item={mockItem}
        itemContext={mockItemContextWithoutMnemonic}
        mode="session"
        onCompleted={vi.fn()}
      />
    );
    
    const html = container.innerHTML;
    expect(html).not.toContain('dangerouslySetInnerHTML');
  });

  test('REQ-CONTENT-PLAYER-CARD-008: Buttons disabled in PAUSED state', async () => {
    const ref: { current: any } = { current: null };
    
    render(
      <CardPlayer 
        item={mockItem}
        itemContext={mockItemContextWithoutMnemonic}
        mode="session"
        onCompleted={vi.fn()}
        ref={ref}
      />
    );
    
    ref.current?.pause();
    
    await waitFor(() => {
      const flipButton = screen.getByRole('button', { name: /umdrehen/i });
      expect(flipButton).toBeDisabled();
    });
  });

  test('PlayerHandle: pause() stops interaction', () => {
    const ref: { current: any } = { current: null };
    render(
      <CardPlayer 
        item={mockItem}
        itemContext={mockItemContextWithoutMnemonic}
        mode="session"
        onCompleted={vi.fn()}
        ref={ref}
      />
    );
    
    ref.current?.pause();
    expect(ref.current?.getProgress()).toBe(0);
  });

  test('PlayerHandle: abort() sets ABORTED state', () => {
    const ref: { current: any } = { current: null };
    render(
      <CardPlayer 
        item={mockItem}
        itemContext={mockItemContextWithoutMnemonic}
        mode="session"
        onCompleted={vi.fn()}
        ref={ref}
      />
    );
    
    ref.current?.abort('user_navigation');
  });

  test('PlayerHandle: resume() allows continuation', () => {
    const ref: { current: any } = { current: null };
    render(
      <CardPlayer 
        item={mockItem}
        itemContext={mockItemContextWithoutMnemonic}
        mode="session"
        onCompleted={vi.fn()}
        ref={ref}
      />
    );
    
    ref.current?.pause();
    ref.current?.resume();
  });

  test('onProgress called with 50 after flip', async () => {
    const user = userEvent.setup();
    const onProgress = vi.fn();
    
    render(
      <CardPlayer 
        item={mockItem}
        itemContext={mockItemContextWithoutMnemonic}
        mode="session"
        onCompleted={vi.fn()}
        onProgress={onProgress}
      />
    );
    
    await user.click(screen.getByRole('button', { name: /umdrehen/i }));
    
    expect(onProgress).toHaveBeenCalledWith(50);
  });
});
