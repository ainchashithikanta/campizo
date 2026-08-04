/**
 * Placement Knowledge Base & Community Q&A Suite (MS-36)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import Fastify from 'fastify';
import { InMemoryPlacementRepository } from '../src/infrastructure/repositories/in-memory-placement.repository.js';
import { PlacementUseCases } from '../src/application/use-cases.js';
import { placementRoutesPlugin } from '../src/presentation/routes.js';

describe('Placement Knowledge Base & Community Q&A Suite (MS-36)', () => {
  let repo: InMemoryPlacementRepository;
  let useCases: PlacementUseCases;

  beforeEach(() => {
    repo = new InMemoryPlacementRepository();
    useCases = new PlacementUseCases(repo);
  });

  it('1. Question Bank: Creates question, searches with filters, and increments helpful votes', async () => {
    const q = await useCases.createQuestion({
      collegeId: 'college_stanford_001',
      authorId: 'usr_senior_99',
      companyName: 'Google',
      roleTitle: 'Software Engineer',
      questionText: 'Implement a LRU Cache with O(1) time complexity.',
      topic: 'Data Structures',
      difficulty: 'MEDIUM',
      roundType: 'TECHNICAL'
    });

    expect(q.id).toBeDefined();
    expect(q.topic).toBe('Data Structures');

    const searchRes = await useCases.listQuestions({
      collegeId: 'college_stanford_001',
      query: 'LRU Cache'
    });

    expect(searchRes.items.length).toBe(1);
    expect(searchRes.items[0]!.questionText).toContain('LRU Cache');

    const helpful = await useCases.markQuestionHelpful(q.id, 'college_stanford_001');
    expect(helpful?.helpfulCount).toBe(1);
  });

  it('2. Community Q&A: Creates discussion thread, replies, and handles upvoting/downvoting', async () => {
    const thread = await useCases.createDiscussionThread({
      collegeId: 'college_stanford_001',
      authorId: 'usr_student_12',
      title: 'How to practice Graphs for Meta?',
      content: 'Which topics are most common for telephone technical rounds?',
      topic: 'Graphs'
    });

    expect(thread.id).toBeDefined();
    expect(thread.repliesCount).toBe(0);

    const reply = await useCases.createDiscussionReply({
      threadId: thread.id,
      authorId: 'usr_senior_01',
      content: 'Focus on BFS, Shortest Path in binary matrix, and Topological Sort.'
    });

    expect(reply.id).toBeDefined();

    const updatedThread = await useCases.getDiscussionById(thread.id, 'college_stanford_001');
    expect(updatedThread?.repliesCount).toBe(1);
    expect(updatedThread?.replies?.length).toBe(1);

    const voted = await useCases.voteDiscussion(thread.id, 'college_stanford_001', 'UPVOTE');
    expect(voted?.upvotesCount).toBe(1);
  });

  it('3. Pure SQL Statistics: Computes database-driven company statistics without any AI', async () => {
    const stats = await useCases.getCompanyStatistics('google', 'college_stanford_001');

    expect(stats).toBeDefined();
    expect(stats?.avgCtcLpa).toBeGreaterThan(0);
    expect(stats?.mostCommonTopics.length).toBeGreaterThan(0);
  });

  it('4. Admin Roadmaps: Queries structured preparation steps', async () => {
    const roadmaps = await useCases.getAdminRoadmaps('college_stanford_001');

    expect(roadmaps.length).toBe(1);
    expect(roadmaps[0]!.steps.length).toBeGreaterThan(0);
  });

  it('5. REST API Plugin Integration: Verifies Fastify Question Bank & Q&A routes', async () => {
    const app = Fastify();
    await app.register(placementRoutesPlugin, { useCases });

    const resQuestions = await app.inject({
      method: 'GET',
      url: '/placements/questions',
      headers: { 'x-college-id': 'college_stanford_001' }
    });

    expect(resQuestions.statusCode).toBe(200);
    const bodyQ = JSON.parse(resQuestions.payload);
    expect(bodyQ.success).toBe(true);
    expect(bodyQ.data.items.length).toBeGreaterThan(0);

    const resDiscussions = await app.inject({
      method: 'GET',
      url: '/placements/discussions',
      headers: { 'x-college-id': 'college_stanford_001' }
    });

    expect(resDiscussions.statusCode).toBe(200);
    const bodyD = JSON.parse(resDiscussions.payload);
    expect(bodyD.success).toBe(true);
  });
});
