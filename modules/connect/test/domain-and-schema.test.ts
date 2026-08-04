import { describe, it, expect } from 'vitest';
import * as schema from '../src/schema/connect.schema.js';
import {
  DuplicateIntentError,
  InvalidConversationContextError,
  PrivacyViolationError,
  IllegalStateTransitionError,
  OptimisticLockingError
} from '../src/errors/domain-errors.js';
import {
  assertMandatoryConversationContext,
  assertValidStateTransition,
  assertOptimisticLockingVersion
} from '../src/domain/invariants.js';

describe('Campus Connect — Domain & Database Schema Suite (MS-23.8.1)', () => {
  it('1. Schema: Should export all 33 aggregate entities', () => {
    expect(schema.studentProfiles).toBeDefined();
    expect(schema.studentIntents).toBeDefined();
    expect(schema.intentHistory).toBeDefined();
    expect(schema.skills).toBeDefined();
    expect(schema.studentSkills).toBeDefined();
    expect(schema.interests).toBeDefined();
    expect(schema.studentInterests).toBeDefined();
    expect(schema.clubs).toBeDefined();
    expect(schema.studentClubs).toBeDefined();
    expect(schema.courses).toBeDefined();
    expect(schema.studentCourses).toBeDefined();
    expect(schema.connectionRequests).toBeDefined();
    expect(schema.connections).toBeDefined();
    expect(schema.conversations).toBeDefined();
    expect(schema.conversationMembers).toBeDefined();
    expect(schema.messages).toBeDefined();
    expect(schema.messageAttachments).toBeDefined();
    expect(schema.studyGroups).toBeDefined();
    expect(schema.projectTeams).toBeDefined();
    expect(schema.projectMembers).toBeDefined();
    expect(schema.mentorships).toBeDefined();
    expect(schema.recommendationSnapshots).toBeDefined();
    expect(schema.recommendationReasons).toBeDefined();
    expect(schema.privacySettings).toBeDefined();
    expect(schema.visibilityPreferences).toBeDefined();
    expect(schema.notifications).toBeDefined();
    expect(schema.activityFeed).toBeDefined();
    expect(schema.moderationCases).toBeDefined();
    expect(schema.moderationActions).toBeDefined();
    expect(schema.reports).toBeDefined();
    expect(schema.auditLogs).toBeDefined();
    expect(schema.featureUsageStatistics).toBeDefined();
    expect(schema.futureIntercollegeLinks).toBeDefined();
  });

  it('2. Invariants: Mutable entities must support optimistic locking version field', () => {
    expect(schema.studentProfiles.version).toBeDefined();
    expect(schema.studentIntents.version).toBeDefined();
    expect(schema.conversations.version).toBeDefined();
    expect(schema.privacySettings.version).toBeDefined();
  });

  it('3. Invariants: Append-only entities must NOT have version field (Immutable)', () => {
    expect('version' in schema.auditLogs).toBe(false);
    expect('version' in schema.recommendationSnapshots).toBe(false);
    expect('version' in schema.recommendationReasons).toBe(false);
    expect('version' in schema.intentHistory).toBe(false);
  });

  it('4. Mandatory Context: conversations schema must enforce contextType & contextId', () => {
    expect(schema.conversations.contextType).toBeDefined();
    expect(schema.conversations.contextId).toBeDefined();
    expect(schema.conversations.contextType.notNull).toBe(true);
    expect(schema.conversations.contextId.notNull).toBe(true);
  });

  it('5. Invariants: assertMandatoryConversationContext should throw InvalidConversationContextError if context is empty', () => {
    expect(() => assertMandatoryConversationContext('', 'intent_123')).toThrow(InvalidConversationContextError);
    expect(() => assertMandatoryConversationContext('STUDY_INTENT', '')).toThrow(InvalidConversationContextError);
    expect(() => assertMandatoryConversationContext('STUDY_INTENT', 'intent_123')).not.toThrow();
  });

  it('6. Invariants: assertValidStateTransition should enforce legal state machines', () => {
    const intentTransitions = {
      DRAFT: ['ACTIVE'],
      ACTIVE: ['PAUSED', 'FULFILLED', 'ARCHIVED'],
      PAUSED: ['ACTIVE', 'ARCHIVED']
    };

    expect(() => assertValidStateTransition('StudentIntent', 'ACTIVE', 'PAUSED', intentTransitions)).not.toThrow();
    expect(() => assertValidStateTransition('StudentIntent', 'DRAFT', 'FULFILLED', intentTransitions)).toThrow(
      IllegalStateTransitionError
    );
  });

  it('7. Invariants: assertOptimisticLockingVersion should detect version conflicts', () => {
    expect(() => assertOptimisticLockingVersion('StudentProfile', 2, 2)).not.toThrow();
    expect(() => assertOptimisticLockingVersion('StudentProfile', 2, 3)).toThrow(OptimisticLockingError);
  });

  it('8. Domain Errors: All typed error classes should instantiate correctly with timestamp & code', () => {
    const dupErr = new DuplicateIntentError('STUDY_PARTNER');
    expect(dupErr.code).toBe('DUPLICATE_INTENT');
    expect(dupErr.timestamp).toBeDefined();

    const privErr = new PrivacyViolationError('Hidden profile');
    expect(privErr.code).toBe('PRIVACY_VIOLATION');
  });
});
