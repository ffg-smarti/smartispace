import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { VideoPlayer } from '../players/VideoPlayer';
import type { PlayerProps } from '../types';

const baseProps: PlayerProps = {
  item: {
    content_data: {},
    display_config: {},
    behavior_config: {},
  },
  itemContext: { item_type: 'VIDEO' },
  mode: 'session',
  onCompleted: vi.fn(),
  onSkipped: vi.fn(),
  onError: vi.fn(),
};

describe('VideoPlayer', () => {
  test('shows fallback when no video_url is provided', () => {
    render(<VideoPlayer {...baseProps} />);
    expect(screen.getByText(/Kein Video-URL vorhanden/i)).toBeInTheDocument();
  });

  test('calls onCompleted when clicking Weiter in fallback view', async () => {
    const user = userEvent.setup();
    const onCompleted = vi.fn();
    render(<VideoPlayer {...baseProps} onCompleted={onCompleted} />);

    await user.click(screen.getByRole('button', { name: /Weiter/i }));
    expect(onCompleted).toHaveBeenCalledOnce();
  });

  test('renders video element when video_url exists', () => {
    render(
      <VideoPlayer
        {...baseProps}
        item={{
          content_data: { video_url: 'https://example.com/video.mp4' },
          display_config: {},
          behavior_config: {},
        }}
      />,
    );

    expect(screen.getByRole('button', { name: /Video gesehen/i })).toBeInTheDocument();
    expect(document.querySelector('video')).toBeTruthy();
  });
});
