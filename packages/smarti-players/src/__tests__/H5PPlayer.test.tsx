import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { H5PPlayerComponent } from '../players/H5PPlayer';
import type { PlayerProps } from '../types';

const baseProps: PlayerProps = {
  item: {
    content_data: {},
    display_config: {},
    behavior_config: {},
  },
  itemContext: {
    item_type: 'H5P_TEST',
    h5p_content_id: 'h5p-123',
    pass_threshold: 80,
  },
  mode: 'session',
  onCompleted: vi.fn(),
  onSkipped: vi.fn(),
  onError: vi.fn(),
};

describe('H5PPlayerComponent', () => {
  test('shows loading state when assets are not available', () => {
    render(<H5PPlayerComponent {...baseProps} />);
    expect(screen.getByText(/Loading H5P content/i)).toBeInTheDocument();
  });

  test('does not call onCompleted while still loading', () => {
    const onCompleted = vi.fn();
    render(<H5PPlayerComponent {...baseProps} onCompleted={onCompleted} />);
    expect(onCompleted).not.toHaveBeenCalled();
  });
});
