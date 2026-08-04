/**
 * Placement Guidance — Next.js Frontend Component Integration Tests (MS-35)
 */

import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

import {
  DifficultyBadge,
  CompensationBadge,
  PlacementCard,
  CompanyHeader,
  RoundAccordion,
  BookmarkButton,
  CompanyAISummaryCard
} from '../components/placements/placement-components';

describe('Placement Guidance Frontend Component Suite (MS-35)', () => {
  const mockExperience = {
    id: 'exp_google_swe_001',
    collegeId: 'college_stanford_001',
    companyId: 'comp_google',
    authorId: 'usr_student_101',
    roleTitle: 'Software Engineer',
    jobType: 'FULL_TIME' as const,
    branch: 'Computer Science',
    cgpa: 3.85,
    ctcOfferedLpa: 45.0,
    stipendMonthly: null,
    offerStatus: 'ACCEPTED' as const,
    difficultyRating: 4,
    overallRating: 5,
    summary: 'Cleared 1 OA and 3 technical rounds focusing on graphs.',
    preparationTips: 'Practice LeetCode Graphs.',
    versionNumber: 1,
    helpfulCount: 15,
    reportsCount: 0,
    isAnonymous: false,
    status: 'APPROVED' as const,
    companyName: 'Google',
    companySlug: 'google',
    createdAt: new Date().toISOString()
  };

  it('1. should render DifficultyBadge and CompensationBadge correctly', () => {
    render(
      <div>
        <DifficultyBadge difficulty={4} />
        <CompensationBadge ctcLpa={45.0} />
      </div>
    );

    expect(screen.getByText(/Difficulty: Hard \(4\/5\)/i)).toBeInTheDocument();
    expect(screen.getByText(/₹45 LPA/i)).toBeInTheDocument();
  });

  it('2. should render PlacementCard with company name, role title, version tag, and bookmark button', () => {
    render(<PlacementCard experience={mockExperience} />);

    expect(screen.getByText(/Google/i)).toBeInTheDocument();
    expect(screen.getByText(/Software Engineer/i)).toBeInTheDocument();
    expect(screen.getByText(/Posted by Verified Senior \(v1\)/i)).toBeInTheDocument();
    expect(screen.getByText(/☆ Save/i)).toBeInTheDocument();
  });

  it('3. should render CompanyHeader with company name, tier, and average salary insight', () => {
    const mockCompany = {
      id: 'comp_google',
      collegeId: 'college_stanford_001',
      name: 'Google',
      slug: 'google',
      industry: 'Technology',
      tier: 'TIER_1'
    };

    const mockInsights = [
      {
        id: 'sal_1',
        companyId: 'comp_google',
        roleTitle: 'Software Engineer',
        batchYear: 2026,
        avgCtcLpa: 48.0,
        minCtcLpa: 42.0,
        maxCtcLpa: 55.0,
        sampleSize: 10
      }
    ];

    render(<CompanyHeader company={mockCompany} salaryInsights={mockInsights} />);

    expect(screen.getByText(/Google/i)).toBeInTheDocument();
    expect(screen.getByText(/Tier: TIER_1/i)).toBeInTheDocument();
    expect(screen.getByText(/₹48 LPA/i)).toBeInTheDocument();
  });

  it('4. should render BookmarkButton and toggle bookmark state on click', () => {
    render(<BookmarkButton targetType="COMPANY" targetId="comp_google" />);

    const saveBtn = screen.getByRole('button', { name: /Save bookmark/i });
    expect(saveBtn).toHaveTextContent('☆ Save');

    fireEvent.click(saveBtn);
    expect(saveBtn).toHaveTextContent('⭐ Saved');
  });

  it('5. should render CompanyAISummaryCard with top topics and cached text summary', () => {
    const mockAISummary = {
      id: 'aisum_1',
      companyId: 'comp_google',
      companySummary: 'Heavy emphasis on Graphs and System Design.',
      topTopics: ['Graphs', 'System Design'],
      difficultyDistribution: { Easy: 10, Medium: 60, Hard: 30 },
      salaryDistribution: { '40-50 LPA': 80 },
      lastGeneratedAt: new Date().toISOString()
    };

    render(<CompanyAISummaryCard summary={mockAISummary} />);

    expect(screen.getByText(/Heavy emphasis on Graphs and System Design\./i)).toBeInTheDocument();
    expect(screen.getByText(/#Graphs/i)).toBeInTheDocument();
  });
});
