/**
 * Campus Connect — Drizzle ORM Production Repositories
 * Multi-tenant isolation (`college_id`), optimistic locking (`version`), CRUD operations.
 */

import { eq, and, sql } from 'drizzle-orm';
import * as schema from '../schema/connect.schema.js';
import { OptimisticLockingError } from '../errors/domain-errors.js';

export class DrizzleStudentProfileRepository {
  constructor(private readonly db: any) {}

  async findById(id: string, collegeId: string): Promise<any | null> {
    const rows = await this.db.select().from(schema.studentProfiles).where(and(eq(schema.studentProfiles.id, id), eq(schema.studentProfiles.collegeId, collegeId)));
    return rows[0] || null;
  }

  async findByUserId(userId: string, collegeId: string): Promise<any | null> {
    const rows = await this.db.select().from(schema.studentProfiles).where(and(eq(schema.studentProfiles.userId, userId), eq(schema.studentProfiles.collegeId, collegeId)));
    return rows[0] || null;
  }

  async save(profile: any): Promise<void> {
    await this.db.insert(schema.studentProfiles).values(profile);
  }

  async update(profile: any, expectedVersion: number): Promise<void> {
    const result = await this.db.update(schema.studentProfiles)
      .set({ ...profile, version: expectedVersion + 1, updatedAt: new Date() })
      .where(and(
        eq(schema.studentProfiles.id, profile.id),
        eq(schema.studentProfiles.collegeId, profile.collegeId),
        eq(schema.studentProfiles.version, expectedVersion)
      ));
    if (result.rowCount === 0) {
      throw new OptimisticLockingError('StudentProfile', expectedVersion, profile.version);
    }
  }
}

export class DrizzleStudentIntentRepository {
  constructor(private readonly db: any) {}

  async findById(id: string, collegeId: string): Promise<any | null> {
    const rows = await this.db.select().from(schema.studentIntents).where(and(eq(schema.studentIntents.id, id), eq(schema.studentIntents.collegeId, collegeId)));
    return rows[0] || null;
  }

  async findActiveByStudentId(studentProfileId: string, collegeId: string): Promise<any[]> {
    return this.db.select().from(schema.studentIntents).where(and(
      eq(schema.studentIntents.studentProfileId, studentProfileId),
      eq(schema.studentIntents.collegeId, collegeId),
      eq(schema.studentIntents.status, 'ACTIVE')
    ));
  }

  async save(intent: any): Promise<void> {
    await this.db.insert(schema.studentIntents).values(intent);
  }

  async update(intent: any, expectedVersion: number): Promise<void> {
    const result = await this.db.update(schema.studentIntents)
      .set({ ...intent, version: expectedVersion + 1, updatedAt: new Date() })
      .where(and(
        eq(schema.studentIntents.id, intent.id),
        eq(schema.studentIntents.collegeId, intent.collegeId),
        eq(schema.studentIntents.version, expectedVersion)
      ));
    if (result.rowCount === 0) {
      throw new OptimisticLockingError('StudentIntent', expectedVersion, intent.version);
    }
  }
}

export class DrizzleConnectionRequestRepository {
  constructor(private readonly db: any) {}

  async findById(id: string, collegeId: string): Promise<any | null> {
    const rows = await this.db.select().from(schema.connectionRequests).where(and(eq(schema.connectionRequests.id, id), eq(schema.connectionRequests.collegeId, collegeId)));
    return rows[0] || null;
  }

  async save(request: any): Promise<void> {
    await this.db.insert(schema.connectionRequests).values(request);
  }

  async update(request: any, expectedVersion: number): Promise<void> {
    const result = await this.db.update(schema.connectionRequests)
      .set({ ...request, version: expectedVersion + 1, updatedAt: new Date() })
      .where(and(
        eq(schema.connectionRequests.id, request.id),
        eq(schema.connectionRequests.collegeId, request.collegeId),
        eq(schema.connectionRequests.version, expectedVersion)
      ));
    if (result.rowCount === 0) {
      throw new OptimisticLockingError('ConnectionRequest', expectedVersion, request.version);
    }
  }
}

export class DrizzleConnectionRepository {
  constructor(private readonly db: any) {}

  async findConnection(studentAId: string, studentBId: string, collegeId: string): Promise<any | null> {
    const rows = await this.db.select().from(schema.connections).where(and(
      eq(schema.connections.collegeId, collegeId),
      sql`(${schema.connections.studentAId} = ${studentAId} AND ${schema.connections.studentBId} = ${studentBId}) OR (${schema.connections.studentAId} = ${studentBId} AND ${schema.connections.studentBId} = ${studentAId})`
    ));
    return rows[0] || null;
  }

  async listConnections(studentProfileId: string, collegeId: string, limit: number = 20, offset: number = 0): Promise<any[]> {
    return this.db.select().from(schema.connections)
      .where(and(
        eq(schema.connections.collegeId, collegeId),
        sql`${schema.connections.studentAId} = ${studentProfileId} OR ${schema.connections.studentBId} = ${studentProfileId}`
      ))
      .limit(limit)
      .offset(offset);
  }

  async save(connection: any): Promise<void> {
    await this.db.insert(schema.connections).values(connection);
  }
}

export class DrizzleConversationRepository {
  constructor(private readonly db: any) {}

  async findById(id: string, collegeId: string): Promise<any | null> {
    const rows = await this.db.select().from(schema.conversations).where(and(eq(schema.conversations.id, id), eq(schema.conversations.collegeId, collegeId)));
    return rows[0] || null;
  }

  async findByContext(contextType: string, contextId: string, collegeId: string): Promise<any[]> {
    return this.db.select().from(schema.conversations).where(and(
      eq(schema.conversations.collegeId, collegeId),
      eq(schema.conversations.contextType, contextType),
      eq(schema.conversations.contextId, contextId)
    ));
  }

  async save(conversation: any): Promise<void> {
    await this.db.insert(schema.conversations).values(conversation);
  }

  async update(conversation: any, expectedVersion: number): Promise<void> {
    const result = await this.db.update(schema.conversations)
      .set({ ...conversation, version: expectedVersion + 1, updatedAt: new Date() })
      .where(and(
        eq(schema.conversations.id, conversation.id),
        eq(schema.conversations.collegeId, conversation.collegeId),
        eq(schema.conversations.version, expectedVersion)
      ));
    if (result.rowCount === 0) {
      throw new OptimisticLockingError('Conversation', expectedVersion, conversation.version);
    }
  }
}

export class DrizzleMessageRepository {
  constructor(private readonly db: any) {}

  async findById(id: string, collegeId: string): Promise<any | null> {
    const rows = await this.db.select().from(schema.messages).where(and(eq(schema.messages.id, id), eq(schema.messages.collegeId, collegeId)));
    return rows[0] || null;
  }

  async listByConversation(conversationId: string, collegeId: string, limit: number = 50, offset: number = 0): Promise<any[]> {
    return this.db.select().from(schema.messages)
      .where(and(
        eq(schema.messages.collegeId, collegeId),
        eq(schema.messages.conversationId, conversationId),
        eq(schema.messages.isSoftDeleted, false)
      ))
      .limit(limit)
      .offset(offset);
  }

  async save(message: any): Promise<void> {
    await this.db.insert(schema.messages).values(message);
  }
}

export class DrizzleRecommendationSnapshotRepository {
  constructor(private readonly db: any) {}

  async findById(id: string, collegeId: string): Promise<any | null> {
    const rows = await this.db.select().from(schema.recommendationSnapshots).where(and(eq(schema.recommendationSnapshots.id, id), eq(schema.recommendationSnapshots.collegeId, collegeId)));
    return rows[0] || null;
  }

  async saveImmutable(snapshot: any): Promise<void> {
    await this.db.insert(schema.recommendationSnapshots).values(snapshot);
  }
}

export class DrizzlePrivacySettingsRepository {
  constructor(private readonly db: any) {}

  async findByStudentId(studentProfileId: string, collegeId: string): Promise<any | null> {
    const rows = await this.db.select().from(schema.privacySettings).where(and(
      eq(schema.privacySettings.studentProfileId, studentProfileId),
      eq(schema.privacySettings.collegeId, collegeId)
    ));
    return rows[0] || null;
  }

  async save(privacy: any): Promise<void> {
    await this.db.insert(schema.privacySettings).values(privacy);
  }

  async update(privacy: any, expectedVersion: number): Promise<void> {
    const result = await this.db.update(schema.privacySettings)
      .set({ ...privacy, version: expectedVersion + 1, updatedAt: new Date() })
      .where(and(
        eq(schema.privacySettings.studentProfileId, privacy.studentProfileId),
        eq(schema.privacySettings.collegeId, privacy.collegeId),
        eq(schema.privacySettings.version, expectedVersion)
      ));
    if (result.rowCount === 0) {
      throw new OptimisticLockingError('PrivacySettings', expectedVersion, privacy.version);
    }
  }
}
