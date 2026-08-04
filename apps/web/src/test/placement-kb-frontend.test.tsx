/**
 * Placement Knowledge Base — Next.js Frontend UI Component Tests (MS-36)
 */

import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import QuestionBankPage from '../app/placements/questions/page';
import DiscussionsPage from '../app/placements/discussions/page';
import RoadmapsPage from '../app/placements/roadmaps/page';
import CompanyStatisticsPage from '../app/company/[slug]/statistics/page';

vi.mock('../lib/api-placement-guidance', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/api-placement-guidance')>();
  return {
    ...actual,
    fetchAdminRoadmaps: vi.fn().mockResolvedValue([
      {
        id: 'rd_1',
        title: 'Software Engineering Roadmap 2026',
        description: 'Curated curriculum by alumni.',
        steps: [{ order: 1, topic: 'Arrays', description: 'Two Pointers', recommendedProblemsCount: 20 }],
        updatedAt: new Date().toISOString()
      }
    ]),
    fetchCompanyStatistics: vi.fn().mockResolvedValue({
      id: 'stat_1',
      companyId: 'comp_google',
      interviewCount: 42,
      avgCtcLpa: 48.0,
      highestCtcLpa: 65.0,
      avgDifficulty: 4.2,
      internshipCount: 10,
      fullTimeCount: 32,
      mostCommonTopics: ['Graphs', 'System Design'],
      lastComputedAt: new Date().toISOString()
    })
  };
});

describe('Placement Knowledge Base Frontend UI Suite (MS-36)', () => {
  it('1. QuestionBankPage renders header and search controls', () => {
    render(<QuestionBankPage />);
    expect(screen.getByText(/Interview Question Bank/i)).toBeInTheDocument();
    expect(screen.getByText(/💬 Ask Community Q&A/i)).toBeInTheDocument();
  });

  it('2. DiscussionsPage renders community Q&A title and post button', () => {
    render(<DiscussionsPage />);
    expect(screen.getByText(/Placement Community Q&A/i)).toBeInTheDocument();
    expect(screen.getByText(/\+ Ask Question/i)).toBeInTheDocument();
  });

  it('3. RoadmapsPage renders preparation roadmap title after data fetch', async () => {
    render(<RoadmapsPage />);
    const heading = await screen.findByText(/Software Engineering Roadmap 2026/i);
    expect(heading).toBeInTheDocument();
  });

  it('4. CompanyStatisticsPage renders SQL metrics header after data fetch', async () => {
    render(<CompanyStatisticsPage />);
    const header = await screen.findByText(/SQL Computed Metrics \(No AI\)/i);
    expect(header).toBeInTheDocument();
  });
});
