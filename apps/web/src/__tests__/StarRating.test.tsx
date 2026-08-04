import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { StarRating } from '@web/components/ui/StarRating/StarRating';

describe('StarRating Component', () => {
  it('renders correctly with given rating value', () => {
    render(<StarRating value={4} max={5} label="Test Rating" />);
    const container = screen.getByRole('img', { name: /Test Rating/i });
    expect(container).toBeInTheDocument();
  });

  it('handles interactive star clicks when enabled', () => {
    const handleChange = vi.fn();
    render(<StarRating value={3} interactive={true} onChange={handleChange} />);

    const starButtons = screen.getAllByRole('button');
    expect(starButtons.length).toBe(5);

    fireEvent.click(starButtons[4]); // 5th star
    expect(handleChange).toHaveBeenCalledWith(5);
  });

  it('renders accessibility labels properly', () => {
    render(<StarRating value={4.5} label="4.5 out of 5 stars" />);
    expect(screen.getByRole('img')).toHaveAttribute('aria-label', '4.5 out of 5 stars');
  });
});
