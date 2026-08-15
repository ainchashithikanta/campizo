import type { EventBus } from '@college-hub/core';
import { logger } from '@college-hub/logger';
import type {
  InMemoryConfessionRepository,
  InMemoryCommentRepository,
  InMemoryModerationRepository,
  InMemoryVoteRepository,
  InMemoryAnonymousIdentityRepository
} from '@college-hub/mod-confessions';

/**
 * Demo data seeder for the in-memory API.
 *
 * The API monolith currently boots with empty in-memory repositories (no
 * Postgres persistence wired in), so every admin queue starts empty and every
 * deploy wipes all data. Seeding gives the admin console real, actionable
 * content: a moderation queue with open cases and published confessions.
 *
 * Enabled via SEED_DEMO_DATA=true. Never seeds secrets or real user data.
 */
export async function seedDemoData(options: {
  confessionRepo: InMemoryConfessionRepository;
  commentRepo: InMemoryCommentRepository;
  modRepo: InMemoryModerationRepository;
  voteRepo: InMemoryVoteRepository;
  identityRepo: InMemoryAnonymousIdentityRepository;
  eventBus: EventBus;
  collegeId: string;
}): Promise<void> {
  const { confessionRepo, modRepo, collegeId } = options;

  // â”€â”€ Confessions (published + pending moderation) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const seedConfessions: Array<{
    title: string;
    content: string;
    categoryCode: string;
    authorThreadPseudonym: string;
    status: 'PUBLISHED' | 'QUARANTINED';
    upvotesCount: number;
    rankScore: string;
  }> = [
    {
      title: 'Midterm season survival thread',
      content:
        'Anyone else running on 4 hours of sleep and vending machine coffee? The library at 2am is eerily calm. We are all in this together. Keep pushing, midterms end Friday.',
      categoryCode: 'ACADEMICS',
      authorThreadPseudonym: 'Sleepy Sloth #118',
      status: 'PUBLISHED',
      upvotesCount: 42,
      rankScore: '0.9821'
    },
    {
      title: 'Best spot on campus to nap between classes',
      content:
        'Found a hidden corner on the third floor of the library with huge windows and almost zero foot traffic. Absolute gold for a 20 minute power nap. Not sharing the exact location, some things are sacred.',
      categoryCode: 'CAMPUS_LIFE',
      authorThreadPseudonym: 'Wise Fox #221',
      status: 'PUBLISHED',
      upvotesCount: 37,
      rankScore: '0.9544'
    },
    {
      title: 'Please review the mess food quality',
      content:
        'I have eaten at the mess for three semesters now and I still cannot decide if the dal is consistent. Can we petition for better breakfast options? Asking for a hungry friend.',
      categoryCode: 'CAMPUS_LIFE',
      authorThreadPseudonym: 'Hungry Otter #77',
      status: 'QUARANTINED',
      upvotesCount: 0,
      rankScore: '0.0000'
    },
    {
      title: 'Trading my old TI-84 for a coffee voucher',
      content:
        'Calculator survived all of my exams but I am not sure it survived the tumbler incident. Make me an offer. Only serious inquiries from people who understand 8-bit sacrifice.',
      categoryCode: 'VENTING',
      authorThreadPseudonym: 'Numeric Ninja #305',
      status: 'QUARANTINED',
      upvotesCount: 0,
      rankScore: '0.0000'
    }
  ];

  const saved: Array<{ id: string }> = [];
  for (const c of seedConfessions) {
    const entity = await confessionRepo.save({ ...c, collegeId });
    saved.push({ id: entity.id });
  }

  // â”€â”€ Moderation cases tied to the pending confessions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const pending = saved.slice(2);
  await modRepo.saveCase({
    collegeId,
    confessionId: pending[0]?.id ?? '',
    severityLevel: 2,
    status: 'OPEN',
    totalReports: 3
  });
  await modRepo.saveCase({
    collegeId,
    confessionId: pending[1]?.id ?? '',
    severityLevel: 1,
    status: 'OPEN',
    totalReports: 1
  });

  logger.info(`[seed] seeded ${saved.length} confessions + 2 open moderation cases for ${collegeId}`);
}
