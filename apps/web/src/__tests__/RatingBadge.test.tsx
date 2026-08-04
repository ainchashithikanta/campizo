import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { RatingBadge } from '@web/components/ui/RatingBadge/RatingBadge';

describe('RatingBadge Component', () => {
  it('renders rating value and quality label for excellent rating (>= 4.5)', () => {
    render(<RatingBadge rating={4.8} />);
    expect(screen.getByText('4.8')).toBeInTheDocument();
    expect(screen.getByText('Excellent')).toBeInTheDocument();
  });

  it('renders rating value and quality label for good rating (>= 3.5)', () => {
    render(<RatingBadge rating={3.8} />);
    expect(screen.getByText('3.8')).toBeInTheDocument();
    expect(screen.getByText('Good')).toBeInTheDocument();
  });

  it('renders rating value for average rating (>= 2.5)', () => {
    render(<RatingBadge rating={2.8} />);
    expect(screen.getByText('2.8')).toBeInTheDocument();
    expect(screen.getByText('Average')).toBeInTheDocument();
  });

  it('hides label when showLabel is false', () => {
    render(<RatingBadge rating={4.5} showLabel={false} />);
    expect(screen.getByText('4.5')).toBeInTheDocument();
    expect(screen.queryByText('Excellent')).not.toBeInTheDocument();
  });
});
