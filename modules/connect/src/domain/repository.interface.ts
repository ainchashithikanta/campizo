/**
 * Campus Connect — Repository Interfaces Specification
 * CQRS Repository contracts defining persistence operations for domain aggregate roots.
 */

export interface IStudentProfileRepository {
  findById(id: string, collegeId: string): Promise<unknown | null>;
  findByUserId(userId: string, collegeId: string): Promise<unknown | null>;
  save(profile: unknown): Promise<void>;
  update(profile: unknown, expectedVersion: number): Promise<void>;
}

export interface IStudentIntentRepository {
  findById(id: string, collegeId: string): Promise<unknown | null>;
  findActiveByStudentId(studentProfileId: string, collegeId: string): Promise<unknown[]>;
  save(intent: unknown): Promise<void>;
  update(intent: unknown, expectedVersion: number): Promise<void>;
}

export interface IConnectionRepository {
  findConnection(studentAId: string, studentBId: string, collegeId: string): Promise<unknown | null>;
  listConnections(studentProfileId: string, collegeId: string, limit: number, offset: number): Promise<unknown[]>;
  save(connection: unknown): Promise<void>;
  delete(connectionId: string, collegeId: string): Promise<void>;
}

export interface IConversationRepository {
  findById(id: string, collegeId: string): Promise<unknown | null>;
  findByContext(contextType: string, contextId: string, collegeId: string): Promise<unknown[]>;
  save(conversation: unknown): Promise<void>;
  update(conversation: unknown, expectedVersion: number): Promise<void>;
}

export interface IMessageRepository {
  findById(id: string, collegeId: string): Promise<unknown | null>;
  listByConversation(conversationId: string, collegeId: string, limit: number, offset: number): Promise<unknown[]>;
  save(message: unknown): Promise<void>;
  softDelete(messageId: string, collegeId: string): Promise<void>;
}

export interface IRecommendationSnapshotRepository {
  findById(id: string, collegeId: string): Promise<unknown | null>;
  findLatestForStudent(studentProfileId: string, collegeId: string): Promise<unknown | null>;
  saveImmutable(snapshot: unknown): Promise<void>;
}

export interface IPrivacySettingsRepository {
  findByStudentId(studentProfileId: string, collegeId: string): Promise<unknown | null>;
  save(privacy: unknown): Promise<void>;
  update(privacy: unknown, expectedVersion: number): Promise<void>;
}

export interface IModerationCaseRepository {
  findById(id: string, collegeId: string): Promise<unknown | null>;
  listPending(collegeId: string, limit: number, offset: number): Promise<unknown[]>;
  save(moderationCase: unknown): Promise<void>;
  update(moderationCase: unknown, expectedVersion: number): Promise<void>;
}
