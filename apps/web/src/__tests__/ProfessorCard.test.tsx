import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ProfessorCard } from '@web/components/rate-my-professor/ProfessorCard';

const mockProf = {
  id: 'prof-101',
  slug: 'dr-alan-turing',
  fullName: 'Dr. Alan Turing',
  designation: 'Professor',
  departmentName: 'Computer Science',
  departmentCode: 'CSE',
  photoUrl: null,
  bayesianRating: 4.85,
  totalReviewsCount: 42,
  recommendationPercentage: 92.5,
  topTags: ['Theoretical Pioneer', 'Tough Grader']
};

describe('ProfessorCard Component', () => {
  it('renders professor name, designation, and department', () => {
    render(<ProfessorCard professor={mockProf} />);
    expect(screen.getByText('Dr. Alan Turing')).toBeInTheDocument();
    expect(screen.getByText('Professor')).toBeInTheDocument();
    expect(screen.getByText('Computer Science')).toBeInTheDocument();
  });

  it('displays Bayesian rating and recommendation metrics', () => {
    render(<ProfessorCard professor={mockProf} />);
    expect(screen.getByText('4.85')).toBeInTheDocument();
    expect(screen.getByText('93%')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('renders teaching style tags', () => {
    render(<ProfessorCard professor={mockProf} />);
    expect(screen.getByText('#Theoretical Pioneer')).toBeInTheDocument();
    expect(screen.getByText('#Tough Grader')).toBeInTheDocument();
  });
});
