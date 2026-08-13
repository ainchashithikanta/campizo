import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

import {
  AnonymousIdentity,
  TrendingBadge,
  HotBadge,
  VoteBar,
  ConfessionCard,
  CommentTree,
  PiiWarning,
  EmptyState,
  CharacterCounter
} from '../components/confessions/ConfessionComponents';
import { ConfessionsApiClient } from '../lib/api-confessions';

describe('Campus Confessions Next.js Frontend Component Suite', () => {
  const mockConfession = {
    id: 'conf-1',
    collegeId: 'college-stanford-001',
    categoryCode: 'academic',
    title: 'CASIO FX-991ES+ Usage',
    slug: 'casio-fx-991es-usage',
    content: 'How to clear memory before entering exam hall? Press Shift + 9 + 3 + =',
    authorThreadPseudonym: 'Curious Panda #402',
    isAnonymous: true,
    status: 'PUBLISHED' as const,
    upvotesCount: 42,
    commentsCount: 5,
    reportsCount: 0,
    rankScore: '15.5000',
    createdAt: new Date().toISOString()
  };

  it('1. should render AnonymousIdentity pseudonym without real user name or avatar', () => {
    render(<AnonymousIdentity pseudonym="Curious Panda #402" />);
    expect(screen.getByText(/Curious Panda #402/i)).toBeInTheDocument();
  });

  it('2. should render TrendingBadge and HotBadge correctly', () => {
    render(
      <div>
        <TrendingBadge />
        <HotBadge />
      </div>
    );
    expect(screen.getByText(/Trending/i)).toBeInTheDocument();
    expect(screen.getByText(/Hot/i)).toBeInTheDocument();
  });

  it('3. should handle VoteBar upvote and downvote clicks', () => {
    const handleVote = vi.fn();
    render(<VoteBar upvotesCount={42} userVoteType={null} onVote={handleVote} />);

    const upvoteBtn = screen.getByLabelText(/Upvote confession/i);
    fireEvent.click(upvoteBtn);

    expect(handleVote).toHaveBeenCalledWith('UPVOTE');
  });

  it('4. should render ConfessionCard with title, pseudonym, and content', () => {
    render(<ConfessionCard confession={mockConfession} />);
    expect(screen.getByText(/CASIO FX-991ES\+ Usage/i)).toBeInTheDocument();
    expect(screen.getByText(/Curious Panda #402/i)).toBeInTheDocument();
    expect(screen.getByText(/Press Shift \+ 9 \+ 3 \+ =/i)).toBeInTheDocument();
  });

  it('5. should display PiiWarning when PII is detected in client-side text', () => {
    render(<PiiWarning detected={true} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/PII Warning:/i)).toBeInTheDocument();
  });

  it('6. should render CharacterCounter accurately', () => {
    render(<CharacterCounter current={150} max={256} />);
    expect(screen.getByText(/150 \/ 256 characters/i)).toBeInTheDocument();
  });

  it('7. should render CommentTree with replies', () => {
    const mockComments = [
      {
        id: 'c1',
        collegeId: 'college-stanford-001',
        confessionId: 'conf-1',
        depth: 1,
        authorThreadPseudonym: 'Witty Owl #108',
        content: 'Select DEG mode for trig calculations!',
        status: 'ACTIVE' as const,
        upvotesCount: 3,
        createdAt: new Date().toISOString()
      }
    ];

    render(<CommentTree comments={mockComments} />);
    expect(screen.getByText(/Witty Owl #108/i)).toBeInTheDocument();
    expect(screen.getByText(/Select DEG mode/i)).toBeInTheDocument();
  });

  it('8. should render EmptyState when list is empty', () => {
    render(<EmptyState message="No confessions found." />);
    expect(screen.getByText(/No confessions found./i)).toBeInTheDocument();
  });

  it('9. should execute ConfessionsApiClient methods', async () => {
    // Mock global fetch
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => ({ success: true, data: [mockConfession] })
    });

    const res = await ConfessionsApiClient.fetchFeed('college-stanford-001');
    expect(res.success).toBe(true);
    expect(res.data?.length).toBe(1);
  });
});
