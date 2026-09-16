import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { TextPlayer } from '../players/TextPlayer';
import type { PlayerProps } from '../types';

const baseProps: PlayerProps = {
  item: {
    content_data: {},
    display_config: {},
    behavior_config: {},
  },
  itemContext: { item_type: 'TEXT' },
  mode: 'session',
  onCompleted: vi.fn(),
  onSkipped: vi.fn(),
  onError: vi.fn(),
};

describe('TextPlayer', () => {
  test('shows fallback text when no text payload exists', () => {
    render(<TextPlayer {...baseProps} />);
    expect(screen.getByText(/Kein Text vorhanden/i)).toBeInTheDocument();
  });

  test('renders provided html text content', () => {
    render(
      <TextPlayer
        {...baseProps}
        item={{
          content_data: { text: '<p>Hallo Lernende</p>' },
          display_config: {},
          behavior_config: {},
        }}
      />,
    );

    expect(screen.getByText(/Hallo Lernende/i)).toBeInTheDocument();
  });

  test('calls onCompleted when user clicks Gelesen', async () => {
    const user = userEvent.setup();
    const onCompleted = vi.fn();
    render(<TextPlayer {...baseProps} onCompleted={onCompleted} />);

    await user.click(screen.getByRole('button', { name: /Gelesen/i }));
    expect(onCompleted).toHaveBeenCalledOnce();
  });
});
