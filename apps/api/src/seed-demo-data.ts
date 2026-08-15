import type { EventBus } from '@college-hub/core';
import { logger } from '@college-hub/logger';
import type {
  InMemoryConfessionRepository,
  InMemoryCommentRepository,
  InMemoryModerationRepository,
  InMemoryVoteRepository,
  InMemoryAnonymousIdentityRepository
} from '@college-hub/mod-confessions';
import type { InMemoryMarketplaceListingRepository } from '@college-hub/mod-marketplace';
import type { InMemoryAcademicResourceRepository } from '@college-hub/mod-academic-resource-hub';
import type { InMemoryPlacementRepository } from '@college-hub/mod-placement-guidance';
import type { InMemoryConnectRepositoryProvider } from '@college-hub/mod-connect';
import { MarketplaceListingEntity } from '@college-hub/mod-marketplace';
import { AcademicResourceEntity } from '@college-hub/mod-academic-resource-hub';
import { PlacementExperienceEntity, QuestionBankEntity } from '@college-hub/mod-placement-guidance';
import { ModerationCaseRecord } from '@college-hub/mod-connect';

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
  listingRepo: InMemoryMarketplaceListingRepository;
  academicResourceRepo: InMemoryAcademicResourceRepository;
  placementRepo: InMemoryPlacementRepository;
  connectRepoProvider: InMemoryConnectRepositoryProvider;
}): Promise<void> {
  const { confessionRepo, modRepo, collegeId, listingRepo, academicResourceRepo, placementRepo, connectRepoProvider } =
    options;

  // ── Campus Confessions (published + pending moderation) ──
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

  // Moderation cases tied to the pending confessions
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

  // ── Marketplace: quarantined listings (auto-quarantined after 3 reports) ──
  const marketplaceListings: MarketplaceListingEntity[] = [
    {
      id: 'listing-seed-001',
      collegeId,
      sellerUserId: 'usr-seed-seller-001',
      categoryCode: 'ELECTRONICS',
      title: 'Used MacBook Pro M1 - Great condition',
      slug: 'used-macbook-pro-m1-great-condition',
      description:
        'MacBook Pro 13" M1, 8GB RAM, 256GB SSD. Battery health 92%. Includes charger. Minor cosmetic wear on bottom case. Asking ₹75,000.',
      conditionCode: 'GOOD',
      listingType: 'SALE',
      priceInr: 75000,
      isNegotiable: true,
      pickupLocationName: 'Campus Library Entrance',
      status: 'QUARANTINED',
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
    },
    {
      id: 'listing-seed-002',
      collegeId,
      sellerUserId: 'usr-seed-seller-002',
      categoryCode: 'BOOKS',
      title: 'Cracking the Coding Interview + LeetCode notes',
      slug: 'cracking-coding-interview-leetcode-notes',
      description:
        'Cracking the Coding Interview 6th edition + my handwritten LeetCode notes (200+ problems). Perfect for placement prep. ₹800 negotiable.',
      conditionCode: 'LIKE_NEW',
      listingType: 'SALE',
      priceInr: 800,
      isNegotiable: true,
      pickupLocationName: 'Hostel Block C Common Room',
      status: 'QUARANTINED',
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
    },
    {
      id: 'listing-seed-003',
      collegeId,
      sellerUserId: 'usr-seed-seller-003',
      categoryCode: 'FURNITURE',
      title: 'Ergonomic office chair - barely used',
      slug: 'ergonomic-office-chair-barely-used',
      description:
        'Herman Miller Aeron size B, graphite. Purchased last semester, moving out so selling. Excellent lumbar support. ₹18,000 firm.',
      conditionCode: 'EXCELLENT',
      listingType: 'SALE',
      priceInr: 18000,
      isNegotiable: false,
      pickupLocationName: 'Faculty Housing Gate 2',
      status: 'QUARANTINED',
      createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 5 * 60 * 60 * 1000)
    }
  ];
  for (const l of marketplaceListings) {
    await listingRepo.save(l);
  }

  // ── Academic Resources: PENDING/QUARANTINED resources ──
  const academicResources: AcademicResourceEntity[] = [
    {
      id: 'res-seed-001',
      collegeId,
      departmentId: 'dept-cs-001',
      subjectId: 'sub-cs-dsa',
      resourceTypeId: 'rt-notes',
      uploaderUserId: 'usr-seed-uploader-001',
      title: 'DSA Complete Notes - Graphs & DP',
      slug: 'dsa-complete-notes-graphs-dp',
      description:
        'Comprehensive notes covering all graph algorithms (BFS, DFS, Dijkstra, Bellman-Ford, MST) and dynamic programming patterns. Includes practice problems with solutions.',
      academicYear: '2025-26',
      semesterNumber: 3,
      isAnonymous: true,
      authorDisplayName: 'Senior CSE Student',
      status: 'PENDING',
      verificationStatus: 'UNVERIFIED',
      currentVersionId: null,
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
    },
    {
      id: 'res-seed-002',
      collegeId,
      departmentId: 'dept-ec-001',
      subjectId: 'sub-ec-signals',
      resourceTypeId: 'rt-question-paper',
      uploaderUserId: 'usr-seed-uploader-002',
      title: 'Signals & Systems Midterm 2024 + Solutions',
      slug: 'signals-systems-midterm-2024-solutions',
      description:
        'Full midterm paper from Autumn 2024 with step-by-step solutions. Covers Fourier series, Laplace transforms, convolution.',
      academicYear: '2024-25',
      semesterNumber: 5,
      isAnonymous: false,
      authorDisplayName: 'Ananya R.',
      status: 'QUARANTINED',
      verificationStatus: 'STUDENT_VERIFIED',
      currentVersionId: null,
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
    },
    {
      id: 'res-seed-003',
      collegeId,
      departmentId: 'dept-me-001',
      subjectId: 'sub-me-thermo',
      resourceTypeId: 'rt-lab-manual',
      uploaderUserId: 'usr-seed-uploader-003',
      title: 'Thermodynamics Lab Manual - All Experiments',
      slug: 'thermodynamics-lab-manual-all-experiments',
      description:
        'Complete lab manual for ME201 Thermodynamics. Includes all 10 experiments with theory, procedure, observations table, and viva questions.',
      academicYear: '2025-26',
      semesterNumber: 3,
      isAnonymous: true,
      authorDisplayName: 'Mech Senior',
      status: 'PENDING',
      verificationStatus: 'UNVERIFIED',
      currentVersionId: null,
      createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 6 * 60 * 60 * 1000)
    }
  ];
  for (const r of academicResources) {
    await academicResourceRepo.save(r);
  }

  // ── Placement: flagged experiences & questions (auto-flagged at 3 reports) ──
  // First create experiences & questions, then increment reports to trigger FLAGGED
  const seedExperience: PlacementExperienceEntity = {
    id: 'exp-seed-001',
    collegeId,
    companyId: 'comp_google',
    authorId: 'usr-seed-placement-001',
    roleTitle: 'Software Engineer Intern',
    jobType: 'INTERNSHIP',
    branch: 'Computer Science',
    cgpa: 3.9,
    ctcOfferedLpa: 12.0,
    stipendMonthly: null,
    offerStatus: 'ACCEPTED',
    difficultyRating: 4,
    overallRating: 5,
    summary:
      'Great learning experience. Worked on internal tooling for the Search team. Mentor was very supportive. The OA was 2 LeetCode Mediums. Technical rounds focused on system design basics and behavioural.',
    preparationTips:
      'Focus on LeetCode Medium graphs/trees. Practice system design basics (load balancer, cache, DB sharding). Be ready to discuss your projects in depth.',
    versionNumber: 1,
    helpfulCount: 15,
    reportsCount: 3,
    isAnonymous: false,
    status: 'FLAGGED',
    companyName: 'Google',
    companySlug: 'google',
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000)
  };
  await placementRepo.createExperience({
    id: seedExperience.id,
    collegeId: seedExperience.collegeId,
    companyId: seedExperience.companyId,
    authorId: seedExperience.authorId,
    roleTitle: seedExperience.roleTitle,
    jobType: seedExperience.jobType,
    branch: seedExperience.branch,
    cgpa: seedExperience.cgpa,
    summary: seedExperience.summary,
    isAnonymous: seedExperience.isAnonymous
  });
  // Increment reports to 3 (auto-flags) - the created experience starts with reportsCount=0
  await placementRepo.incrementReportCount(seedExperience.id, collegeId);
  await placementRepo.incrementReportCount(seedExperience.id, collegeId);
  await placementRepo.incrementReportCount(seedExperience.id, collegeId);

  const seedQuestion: QuestionBankEntity = {
    id: 'qb-seed-001',
    collegeId,
    companyId: 'comp_microsoft',
    companyName: 'Microsoft',
    roleTitle: 'SWE Intern',
    questionText: 'Design a URL shortener like bit.ly. Handle custom aliases, analytics, and expiration.',
    topic: 'System Design',
    difficulty: 'MEDIUM',
    roundType: 'SYSTEM_DESIGN',
    jobType: 'INTERNSHIP',
    branch: 'Computer Science',
    batchYear: 2025,
    frequencyCount: 8,
    helpfulCount: 22,
    reportsCount: 3,
    status: 'FLAGGED',
    authorId: 'usr-seed-placement-002',
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  };
  await placementRepo.createQuestion(seedQuestion);
  await placementRepo.incrementQuestionReportCount(seedQuestion.id, collegeId);
  await placementRepo.incrementQuestionReportCount(seedQuestion.id, collegeId);
  await placementRepo.incrementQuestionReportCount(seedQuestion.id, collegeId);

  // ── Connect: open moderation cases ──
  const now = new Date();
  const connectCases: ModerationCaseRecord[] = [
    {
      id: 'case-seed-001',
      collegeId,
      reportedUserId: 'usr-reported-001',
      reporterUserId: 'usr-reporter-001',
      reasonCategory: 'HARASSMENT',
      severityLevel: 'HIGH',
      status: 'OPEN',
      actions: [],
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      updatedAt: now
    },
    {
      id: 'case-seed-002',
      collegeId,
      reportedUserId: 'usr-reported-002',
      reporterUserId: 'usr-reporter-002',
      reasonCategory: 'SPAM',
      severityLevel: 'LOW',
      status: 'OPEN',
      actions: [],
      createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
      updatedAt: now
    },
    {
      id: 'case-seed-003',
      collegeId,
      reportedUserId: 'usr-reported-003',
      reporterUserId: 'usr-reporter-003',
      reasonCategory: 'INAPPROPRIATE_CONTENT',
      severityLevel: 'MEDIUM',
      status: 'OPEN',
      actions: [],
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      updatedAt: now
    }
  ];
  for (const c of connectCases) {
    await connectRepoProvider.moderationCaseRepo.saveCase(c);
  }

  logger.info(
    `[seed] seeded ${saved.length} confessions + 2 open mod cases + ${marketplaceListings.length} quarantined listings + ${academicResources.length} academic resources + 1 flagged experience + 1 flagged question + ${connectCases.length} connect mod cases for ${collegeId}`
  );
}
