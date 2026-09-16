import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { AppPlayer } from '../players/AppPlayer';
import type { PlayerProps } from '../types';

const baseProps: PlayerProps = {
  item: {
    content_data: {},
    display_config: {},
    behavior_config: {},
  },
  itemContext: { item_type: 'APP' },
  mode: 'session',
  onCompleted: vi.fn(),
  onSkipped: vi.fn(),
  onError: vi.fn(),
};

describe('AppPlayer', () => {
  test('shows fallback when no app content_url is provided', () => {
    render(<AppPlayer {...baseProps} />);
    expect(screen.getByText(/Keine App-URL vorhanden/i)).toBeInTheDocument();
  });

  test('calls onCompleted from fallback action', async () => {
    const user = userEvent.setup();
    const onCompleted = vi.fn();
    render(<AppPlayer {...baseProps} onCompleted={onCompleted} />);

    await user.click(screen.getByRole('button', { name: /Weiter/i }));
    expect(onCompleted).toHaveBeenCalledOnce();
  });

  test('renders iframe when content_url exists', () => {
    render(
      <AppPlayer
        {...baseProps}
        item={{
          content_data: { content_url: 'https://example.com/app' },
          display_config: {},
          behavior_config: {},
        }}
      />,
    );

    expect(screen.getByRole('button', { name: /Abschließen/i })).toBeInTheDocument();
    expect(document.querySelector('iframe')).toBeTruthy();
  });
});
