/**
 * Campus Connect — Moderation Queue & Decision Tests
 * Verifies the moderation case store lifecycle: reportUser opens a case,
 * getModerationQueue lists only open cases, and recordModerationDecision
 * closes the case while appending the decision action.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryConnectRepositoryProvider } from '../src/repositories/in-memory-connect.repository.js';
import { ConnectUseCases, EventPublisher, StudentIntentService } from '../src/use-cases/connect.use-cases.js';

describe('Campus Connect — Moderation Queue & Decisions (MS-23.8.4)', () => {
  let repoProvider: InMemoryConnectRepositoryProvider;
  let eventPublisher: EventPublisher;
  let useCases: ConnectUseCases;

  beforeEach(() => {
    repoProvider = new InMemoryConnectRepositoryProvider();
    eventPublisher = new EventPublisher();
    useCases = new ConnectUseCases(
      repoProvider,
      eventPublisher,
      new StudentIntentService(repoProvider, eventPublisher)
    );
  });

  it('1. reportUser persists an OPEN moderation case in the queue', async () => {
    await useCases.reportUser({
      caseId: 'case_mod_001',
      collegeId: 'college_stanford_001',
      reportedUserId: 'usr_102',
      reporterUserId: 'usr_101',
      reason: 'HARASSMENT'
    });

    const caseRecord = await repoProvider.moderationCaseRepo.findCaseById('case_mod_001', 'college_stanford_001');
    expect(caseRecord).toBeDefined();
    expect(caseRecord?.status).toBe('OPEN');
    expect(caseRecord?.reportedUserId).toBe('usr_102');
    expect(caseRecord?.reasonCategory).toBe('HARASSMENT');
    expect(caseRecord?.actions).toEqual([]);
  });

  it('2. getModerationQueue returns only open cases, newest first', async () => {
    await useCases.reportUser({
      caseId: 'case_mod_001',
      collegeId: 'college_stanford_001',
      reportedUserId: 'usr_102',
      reporterUserId: 'usr_101',
      reason: 'HARASSMENT'
    });
    await useCases.reportUser({
      caseId: 'case_mod_002',
      collegeId: 'college_stanford_001',
      reportedUserId: 'usr_103',
      reporterUserId: 'usr_101',
      reason: 'SPAM'
    });
    await useCases.reportUser({
      caseId: 'case_mod_003',
      collegeId: 'college_stanford_001',
      reportedUserId: 'usr_104',
      reporterUserId: 'usr_101',
      reason: 'IMPERSONATION'
    });
    // Close the second case — it must disappear from the queue.
    await useCases.recordModerationDecision({
      caseId: 'case_mod_002',
      collegeId: 'college_stanford_001',
      actionTaken: 'WARN',
      moderatorId: 'usr_mod_001'
    });

    const queue = await useCases.getModerationQueue({ collegeId: 'college_stanford_001' });
    expect(queue.map((c: { id: string }) => c.id)).toEqual(['case_mod_003', 'case_mod_001']);
    expect(queue.every((c: { status: string }) => c.status !== 'CLOSED')).toBe(true);

    // Tenant isolation — other colleges see an empty queue.
    const otherCollegeQueue = await useCases.getModerationQueue({ collegeId: 'college_mit_001' });
    expect(otherCollegeQueue).toEqual([]);
  });

  it('3. recordModerationDecision closes the case and appends the action', async () => {
    await useCases.reportUser({
      caseId: 'case_mod_001',
      collegeId: 'college_stanford_001',
      reportedUserId: 'usr_102',
      reporterUserId: 'usr_101',
      reason: 'HARASSMENT'
    });

    await useCases.recordModerationDecision({
      caseId: 'case_mod_001',
      collegeId: 'college_stanford_001',
      actionTaken: 'SUSPEND',
      moderatorId: 'usr_mod_001',
      reasonNote: 'Repeated harassment after prior warning'
    });

    const caseRecord = await repoProvider.moderationCaseRepo.findCaseById('case_mod_001', 'college_stanford_001');
    expect(caseRecord?.status).toBe('CLOSED');
    expect(caseRecord?.actions).toHaveLength(1);
    expect(caseRecord?.actions[0]?.action).toBe('SUSPEND');
    expect(caseRecord?.actions[0]?.moderatorUserId).toBe('usr_mod_001');
    expect(caseRecord?.actions[0]?.reasonNote).toBe('Repeated harassment after prior warning');

    const queue = await useCases.getModerationQueue({ collegeId: 'college_stanford_001' });
    expect(queue).toEqual([]);
  });
});
