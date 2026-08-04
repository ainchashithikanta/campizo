/**
 * Placement Guidance Module — Unit & Integration Test Suite (MS-35)
 * Verifies repository methods, CQRS use cases, versioning, AI summary caching, bookmarks, analytics, and Fastify REST endpoints.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import Fastify from 'fastify';
import { InMemoryPlacementRepository } from '../src/infrastructure/repositories/in-memory-placement.repository.js';
import { PlacementUseCases } from '../src/application/use-cases.js';
import { placementRoutesPlugin } from '../src/presentation/routes.js';

describe('Placement Guidance Module Suite (MS-35)', () => {
  let repo: InMemoryPlacementRepository;
  let useCases: PlacementUseCases;

  beforeEach(() => {
    repo = new InMemoryPlacementRepository();
    useCases = new PlacementUseCases(repo);
  });

  it('1. Repository & Versioning: Creates placement experience and records immutable Version 1 audit history', async () => {
    const exp = await useCases.submitExperience({
      collegeId: 'college_stanford_001',
      authorId: 'usr_student_555',
      companyName: 'Meta',
      roleTitle: 'Software Engineer',
      jobType: 'FULL_TIME',
      branch: 'Computer Science',
      cgpa: 3.9,
      ctcOfferedLpa: 52.0,
      summary: 'Cleared 1 OA and 4 rounds including System Design.',
      rounds: [
        {
          roundNumber: 1,
          roundName: 'Coding Round',
          roundType: 'TECHNICAL',
          durationMinutes: 45,
          description: 'Two LeetCode Hard Questions',
          topicsCovered: ['Graphs', 'Heaps']
        }
      ]
    });

    expect(exp.id).toBeDefined();
    expect(exp.versionNumber).toBe(1);

    const versions = await useCases.getExperienceVersions(exp.id);
    expect(versions.length).toBe(1);
    expect(versions[0]!.versionNumber).toBe(1);
    expect(versions[0]!.roleTitle).toBe('Software Engineer');
  });

  it('2. AI Summary Cache: Caches generated company AI summaries and avoids redundant compute', async () => {
    const companyData = await useCases.getCompanyBySlug('google', 'college_stanford_001');

    expect(companyData?.aiSummary).toBeDefined();
    expect(companyData?.aiSummary?.topTopics).toContain('Graphs');

    // Second fetch hits cache
    const secondFetch = await useCases.getCompanyBySlug('google', 'college_stanford_001');
    expect(secondFetch?.aiSummary?.id).toBe(companyData?.aiSummary?.id);
  });

  it('3. Bookmarking & Analytics: Saves, queries, and removes student bookmarks while recording trending metrics', async () => {
    const bookmark = await useCases.bookmarkItem('usr_student_777', 'COMPANY', 'comp_google', 'college_stanford_001');
    expect(bookmark.id).toBeDefined();

    const userBookmarks = await useCases.getUserBookmarks('usr_student_777', 'college_stanford_001');
    expect(userBookmarks.length).toBe(1);
    expect(userBookmarks[0]!.targetId).toBe('comp_google');

    const trending = await useCases.getTrendingCompanies('college_stanford_001', 5);
    expect(trending.length).toBeGreaterThan(0);

    const removed = await useCases.removeBookmark('usr_student_777', 'COMPANY', 'comp_google', 'college_stanford_001');
    expect(removed).toBe(true);
  });

  it('4. REST API Integration: Verifies bookmarking and trending endpoints on Fastify route plugin', async () => {
    const app = Fastify();
    await app.register(placementRoutesPlugin, { useCases });

    // Test GET /placements/trending
    const resTrending = await app.inject({
      method: 'GET',
      url: '/placements/trending',
      headers: {
        'x-college-id': 'college_stanford_001'
      }
    });

    expect(resTrending.statusCode).toBe(200);
    const bodyTrending = JSON.parse(resTrending.payload);
    expect(bodyTrending.success).toBe(true);
    expect(bodyTrending.data.length).toBeGreaterThan(0);

    // Test POST /placements/bookmarks
    const resBookmark = await app.inject({
      method: 'POST',
      url: '/placements/bookmarks',
      headers: {
        'x-college-id': 'college_stanford_001',
        'x-user-id': 'usr_test_user'
      },
      payload: {
        targetType: 'COMPANY',
        targetId: 'comp_google'
      }
    });

    expect(resBookmark.statusCode).toBe(201);
    const bodyBookmark = JSON.parse(resBookmark.payload);
    expect(bodyBookmark.success).toBe(true);
  });
});
