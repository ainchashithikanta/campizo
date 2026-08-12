/**
 * Campus Connect — In-Memory Repositories for Unit & Integration Testing
 * Deterministic in-memory storage mirroring production Drizzle repositories.
 */

import { OptimisticLockingError } from '../errors/domain-errors.js';

export class InMemoryStudentProfileRepository {
  private profiles = new Map<string, any>();

  async findById(id: string, collegeId: string): Promise<any | null> {
    const p = this.profiles.get(id);
    return p && p.collegeId === collegeId ? { ...p } : null;
  }

  async findByUserId(userId: string, collegeId: string): Promise<any | null> {
    for (const p of this.profiles.values()) {
      if (p.userId === userId && p.collegeId === collegeId) {
        return { ...p };
      }
    }
    return null;
  }

  async save(profile: any): Promise<void> {
    this.profiles.set(profile.id, { ...profile, version: profile.version || 1 });
  }

  async update(profile: any, expectedVersion: number): Promise<void> {
    const existing = this.profiles.get(profile.id);
    if (!existing || existing.collegeId !== profile.collegeId || existing.version !== expectedVersion) {
      throw new OptimisticLockingError('StudentProfile', expectedVersion, existing?.version || 0);
    }
    this.profiles.set(profile.id, { ...profile, version: expectedVersion + 1, updatedAt: new Date() });
  }
}

export class InMemoryStudentIntentRepository {
  private intents = new Map<string, any>();

  async findById(id: string, collegeId: string): Promise<any | null> {
    const i = this.intents.get(id);
    return i && i.collegeId === collegeId ? { ...i } : null;
  }

  async findActiveByStudentId(studentProfileId: string, collegeId: string): Promise<any[]> {
    const res: any[] = [];
    for (const i of this.intents.values()) {
      if (i.studentProfileId === studentProfileId && i.collegeId === collegeId && i.status === 'ACTIVE') {
        res.push({ ...i });
      }
    }
    return res;
  }

  async save(intent: any): Promise<void> {
    this.intents.set(intent.id, { ...intent, version: intent.version || 1 });
  }

  async update(intent: any, expectedVersion: number): Promise<void> {
    const existing = this.intents.get(intent.id);
    if (!existing || existing.collegeId !== intent.collegeId || existing.version !== expectedVersion) {
      throw new OptimisticLockingError('StudentIntent', expectedVersion, existing?.version || 0);
    }
    this.intents.set(intent.id, { ...intent, version: expectedVersion + 1, updatedAt: new Date() });
  }
}

export class InMemoryConnectionRequestRepository {
  private requests = new Map<string, any>();

  async findById(id: string, collegeId: string): Promise<any | null> {
    const r = this.requests.get(id);
    return r && r.collegeId === collegeId ? { ...r } : null;
  }

  async save(request: any): Promise<void> {
    this.requests.set(request.id, { ...request, version: request.version || 1 });
  }

  async update(request: any, expectedVersion: number): Promise<void> {
    const existing = this.requests.get(request.id);
    if (!existing || existing.collegeId !== request.collegeId || existing.version !== expectedVersion) {
      throw new OptimisticLockingError('ConnectionRequest', expectedVersion, existing?.version || 0);
    }
    this.requests.set(request.id, { ...request, version: expectedVersion + 1, updatedAt: new Date() });
  }
}

export class InMemoryConnectionRepository {
  private connections = new Map<string, any>();

  async findConnection(studentAId: string, studentBId: string, collegeId: string): Promise<any | null> {
    for (const c of this.connections.values()) {
      if (
        c.collegeId === collegeId &&
        ((c.studentAId === studentAId && c.studentBId === studentBId) ||
          (c.studentAId === studentBId && c.studentBId === studentAId))
      ) {
        return { ...c };
      }
    }
    return null;
  }

  async listConnections(
    studentProfileId: string,
    collegeId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<any[]> {
    const res: any[] = [];
    for (const c of this.connections.values()) {
      if (c.collegeId === collegeId && (c.studentAId === studentProfileId || c.studentBId === studentProfileId)) {
        res.push({ ...c });
      }
    }
    return res.slice(offset, offset + limit);
  }

  async save(connection: any): Promise<void> {
    this.connections.set(connection.id, { ...connection, version: connection.version || 1 });
  }
}

export class InMemoryConversationRepository {
  private conversations = new Map<string, any>();

  async findById(id: string, collegeId: string): Promise<any | null> {
    const c = this.conversations.get(id);
    return c && c.collegeId === collegeId ? { ...c } : null;
  }

  async findByContext(contextType: string, contextId: string, collegeId: string): Promise<any[]> {
    const res: any[] = [];
    for (const c of this.conversations.values()) {
      if (c.collegeId === collegeId && c.contextType === contextType && c.contextId === contextId) {
        res.push({ ...c });
      }
    }
    return res;
  }

  async findActiveRandomByParticipant(userId: string, collegeId: string): Promise<any | null> {
    for (const c of this.conversations.values()) {
      if (
        c.collegeId === collegeId &&
        c.conversationType === 'RANDOM' &&
        !c.closedAt &&
        c.participantIds?.includes(userId)
      ) {
        return { ...c };
      }
    }
    return null;
  }

  async findLatestRandomByParticipant(userId: string, collegeId: string): Promise<any | null> {
    let latest: any = null;
    for (const c of this.conversations.values()) {
      if (c.collegeId === collegeId && c.conversationType === 'RANDOM' && c.participantIds?.includes(userId)) {
        if (!latest || new Date(c.createdAt).getTime() > new Date(latest.createdAt).getTime()) {
          latest = { ...c };
        }
      }
    }
    return latest;
  }

  async save(conversation: any): Promise<void> {
    this.conversations.set(conversation.id, { ...conversation, version: conversation.version || 1 });
  }

  async update(conversation: any, expectedVersion: number): Promise<void> {
    const existing = this.conversations.get(conversation.id);
    if (!existing || existing.collegeId !== conversation.collegeId || existing.version !== expectedVersion) {
      throw new OptimisticLockingError('Conversation', expectedVersion, existing?.version || 0);
    }
    this.conversations.set(conversation.id, { ...conversation, version: expectedVersion + 1, updatedAt: new Date() });
  }
}

export class InMemoryMessageRepository {
  private messages = new Map<string, any>();

  async findById(id: string, collegeId: string): Promise<any | null> {
    const m = this.messages.get(id);
    return m && m.collegeId === collegeId ? { ...m } : null;
  }

  async listByConversation(
    conversationId: string,
    collegeId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<any[]> {
    const res: any[] = [];
    for (const m of this.messages.values()) {
      if (m.collegeId === collegeId && m.conversationId === conversationId && !m.isSoftDeleted) {
        res.push({ ...m });
      }
    }
    return res.slice(offset, offset + limit);
  }

  async save(message: any): Promise<void> {
    this.messages.set(message.id, { ...message, version: message.version || 1 });
  }
}

export class InMemoryRecommendationSnapshotRepository {
  private snapshots = new Map<string, any>();

  async findById(id: string, collegeId: string): Promise<any | null> {
    const s = this.snapshots.get(id);
    return s && s.collegeId === collegeId ? { ...s } : null;
  }

  async saveImmutable(snapshot: any): Promise<void> {
    this.snapshots.set(snapshot.id, { ...snapshot });
  }
}

export class InMemoryPrivacySettingsRepository {
  private privacy = new Map<string, any>();

  async findByStudentId(studentProfileId: string, collegeId: string): Promise<any | null> {
    const p = this.privacy.get(studentProfileId);
    return p && p.collegeId === collegeId ? { ...p } : null;
  }

  async save(settings: any): Promise<void> {
    this.privacy.set(settings.studentProfileId, { ...settings, version: settings.version || 1 });
  }

  async update(settings: any, expectedVersion: number): Promise<void> {
    const existing = this.privacy.get(settings.studentProfileId);
    if (!existing || existing.collegeId !== settings.collegeId || existing.version !== expectedVersion) {
      throw new OptimisticLockingError('PrivacySettings', expectedVersion, existing?.version || 0);
    }
    this.privacy.set(settings.studentProfileId, { ...settings, version: expectedVersion + 1, updatedAt: new Date() });
  }
}

export class InMemoryConnectRepositoryProvider {
  public profileRepo = new InMemoryStudentProfileRepository();
  public intentRepo = new InMemoryStudentIntentRepository();
  public connectionRequestRepo = new InMemoryConnectionRequestRepository();
  public connectionRepo = new InMemoryConnectionRepository();
  public conversationRepo = new InMemoryConversationRepository();
  public messageRepo = new InMemoryMessageRepository();
  public recommendationRepo = new InMemoryRecommendationSnapshotRepository();
  public privacyRepo = new InMemoryPrivacySettingsRepository();
  /** FIFO waiting room for random chats (only opposite genders are matched). */
  public randomQueue: Array<{ userId: string; collegeId: string; gender: string; joinedAt: string }> = [];

  clearRandomQueue(): void {
    this.randomQueue = [];
  }
}
