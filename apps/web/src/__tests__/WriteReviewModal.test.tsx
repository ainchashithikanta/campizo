import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { WriteReviewModal } from '@web/components/rate-my-professor/WriteReviewModal';
import type { ProfessorProfileDto } from '@web/lib/types';

const mockProfile: ProfessorProfileDto = {
  id: 'prof-101',
  slug: 'dr-alan-turing',
  fullName: 'Dr. Alan Turing',
  designation: 'Professor',
  status: 'ACTIVE',
  department: { id: 'd-1', name: 'Computer Science', code: 'CSE' },
  biography: 'Pioneer',
  photoUrl: null,
  coursesTaught: [],
  statistics: {
    bayesianRating: 4.8,
    rawAverageRating: 4.9,
    totalReviewsCount: 10,
    recommendationPercentage: 90,
    ratingConfidenceScore: 0.9,
    ratingDimensions: { teachingClarity: 5, gradingFairness: 5, punctuality: 5, approachability: 5 },
    starDistribution: { star5: 8, star4: 2, star3: 0, star2: 0, star1: 0 },
    lastCalculatedAt: new Date().toISOString()
  }
};

describe('WriteReviewModal Component', () => {
  it('displays modal title and form controls when open', () => {
    render(<WriteReviewModal isOpen={true} onClose={vi.fn()} profile={mockProfile} onSubmit={vi.fn()} />);

    expect(screen.getByText('Rate Dr. Alan Turing')).toBeInTheDocument();
    expect(screen.getByText('Select Course Taken')).toBeInTheDocument();
    expect(screen.getByText('Written Feedback (Min 20, Max 1000 chars)')).toBeInTheDocument();
  });

  it('shows error validation when review text is less than 20 characters', async () => {
    render(<WriteReviewModal isOpen={true} onClose={vi.fn()} profile={mockProfile} onSubmit={vi.fn()} />);

    const submitBtn = screen.getByRole('button', { name: /Submit Verified Review/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Review text must be at least 20 characters long.')).toBeInTheDocument();
    });
  });

  it('submits form successfully when review text is valid', async () => {
    const handleSubmit = vi.fn().mockResolvedValue(undefined);
    render(<WriteReviewModal isOpen={true} onClose={vi.fn()} profile={mockProfile} onSubmit={handleSubmit} />);

    const textarea = screen.getByPlaceholderText(/Describe teaching style/i);
    fireEvent.change(textarea, {
      target: { value: 'This is a great professor who explains algorithms clearly and thoroughly.' }
    });

    const submitBtn = screen.getByRole('button', { name: /Submit Verified Review/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalled();
      expect(screen.getByText('Review Submitted!')).toBeInTheDocument();
    });
  });
});
