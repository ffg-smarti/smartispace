import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { FlashcardPlayer } from '../players/FlashcardPlayer';

describe('FlashcardPlayer', () => {
  test('renders first card front side and helper text', () => {
    render(<FlashcardPlayer />);

    expect(screen.getByText(/to remember/i)).toBeInTheDocument();
    expect(screen.getByText(/Tipp: Karte antippen zum Umdrehen/i)).toBeInTheDocument();
  });

  test('flips card and shows back side text', async () => {
    const user = userEvent.setup();
    render(<FlashcardPlayer />);

    await user.click(screen.getByRole('button', { name: /Karte umdrehen/i }));

    expect(screen.getByText(/sich erinnern/i)).toBeInTheDocument();
  });
});
