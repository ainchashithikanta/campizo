import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ReviewCard } from '@web/components/rate-my-professor/ReviewCard';
import type { ReviewDto } from '@web/lib/types';

const mockReview: ReviewDto = {
  id: 'rev-101',
  professorId: 'prof-101',
  courseCode: 'CS201',
  courseName: 'Data Structures',
  academicYear: '2024-25',
  semester: '5th Sem',
  authorAnonymousToken: 'anon-12345678',
  isAnonymous: true,
  authorDisplayName: null,
  gradeReceived: 'A+',
  reviewText: 'Excellent course with deep insights into algorithms.',
  overallRating: 5.0,
  dimensions: {
    teachingClarity: 5.0,
    gradingFairness: 4.5,
    punctuality: 5.0,
    approachability: 4.8
  },
  tags: ['Clear Lectures', 'Lab Focused'],
  helpfulCount: 15,
  unhelpfulCount: 2,
  userVote: null,
  facultyResponse: {
    id: 'f-1',
    responseText: 'Thank you for your feedback.',
    respondedAt: new Date().toISOString()
  },
  createdAt: new Date().toISOString(),
  isEditable: false
};

describe('ReviewCard Component', () => {
  it('renders review content, author status, and course info', () => {
    render(<ReviewCard review={mockReview} onVote={vi.fn()} onReport={vi.fn()} />);

    expect(screen.getByText(/Anonymous Student/i)).toBeInTheDocument();
    expect(screen.getByText('Verified .edu')).toBeInTheDocument();
    expect(screen.getByText('CS201')).toBeInTheDocument();
    expect(screen.getByText('Grade: A+')).toBeInTheDocument();
    expect(screen.getByText('Excellent course with deep insights into algorithms.')).toBeInTheDocument();
  });

  it('renders verified faculty response when present', () => {
    render(<ReviewCard review={mockReview} onVote={vi.fn()} onReport={vi.fn()} />);

    expect(screen.getByText('Verified Faculty Response')).toBeInTheDocument();
    expect(screen.getByText('Thank you for your feedback.')).toBeInTheDocument();
  });

  it('triggers helpful vote callback when clicked', async () => {
    const handleVote = vi.fn().mockResolvedValue(undefined);
    render(<ReviewCard review={mockReview} onVote={handleVote} onReport={vi.fn()} />);

    const helpfulBtn = screen.getByRole('button', { name: /Vote helpful \(15\)/i });
    fireEvent.click(helpfulBtn);
    expect(handleVote).toHaveBeenCalledWith('rev-101', 'HELPFUL');
  });
});
