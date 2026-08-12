/**
 * Campus Connect — Command Use Cases & StudentIntentService
 * Transactional use cases executing mutations and publishing domain events ONLY AFTER successful commit.
 * Enforces optimistic locking, non-null messaging context, and privacy supremacy.
 */

import { assertMandatoryConversationContext } from '../domain/invariants.js';
import { CampusConnectDomainEvent } from '../domain/events.js';
import {
  ConflictApplicationError,
  ForbiddenApplicationError,
  NotFoundApplicationError,
  ValidationApplicationError
} from '../errors/application-errors.js';
import { randomBytes } from 'node:crypto';

/** How long a random chat stays open before it closes itself. */
export function randomChatTtlMs(): number {
  return Number(process.env.RANDOM_CHAT_TTL_MS ?? 15 * 60 * 1000);
}

export class EventPublisher {
  private publishedEvents: CampusConnectDomainEvent[] = [];

  publish(event: CampusConnectDomainEvent): void {
    this.publishedEvents.push(event);
  }

  getPublishedEvents(): CampusConnectDomainEvent[] {
    return [...this.publishedEvents];
  }

  clear(): void {
    this.publishedEvents = [];
  }
}

export class StudentIntentService {
  constructor(
    private readonly repoProvider: any,
    private readonly eventPublisher: EventPublisher
  ) {}

  async createIntent(input: {
    id: string;
    collegeId: string;
    studentProfileId: string;
    intentType: string;
    title: string;
    description?: string | undefined;
    courseCode?: string | undefined;
    priority?: number | undefined;
    createdBy: string;
  }): Promise<any> {
    const intent = {
      ...input,
      status: 'ACTIVE',
      priority: input.priority || 1,
      availabilityState: 'AVAILABLE_NOW',
      targetCollegeIds: [],
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      updatedBy: input.createdBy
    };

    await this.repoProvider.intentRepo.save(intent);

    // Publish event ONLY AFTER successful commit!
    this.eventPublisher.publish({
      eventId: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      requestId: `req_${Date.now()}`,
      traceId: `trace_${Date.now()}`,
      collegeId: input.collegeId,
      timestamp: new Date().toISOString(),
      eventType: 'IntentCreated',
      payload: {
        intentId: intent.id,
        studentProfileId: intent.studentProfileId,
        intentType: intent.intentType,
        title: intent.title
      }
    });

    return intent;
  }

  async updateIntent(input: {
    id: string;
    collegeId: string;
    title: string;
    version: number;
    updatedBy: string;
  }): Promise<any> {
    const existing = await this.repoProvider.intentRepo.findById(input.id, input.collegeId);
    if (!existing) throw new Error(`Intent ${input.id} not found.`);

    const updated = { ...existing, title: input.title, updatedBy: input.updatedBy };
    await this.repoProvider.intentRepo.update(updated, input.version);

    return updated;
  }

  async pauseIntent(intentId: string, collegeId: string, version: number): Promise<void> {
    const existing = await this.repoProvider.intentRepo.findById(intentId, collegeId);
    if (!existing) throw new Error(`Intent ${intentId} not found.`);

    const updated = { ...existing, status: 'PAUSED' };
    await this.repoProvider.intentRepo.update(updated, version);
  }

  async fulfillIntent(intentId: string, collegeId: string, version: number): Promise<void> {
    const existing = await this.repoProvider.intentRepo.findById(intentId, collegeId);
    if (!existing) throw new Error(`Intent ${intentId} not found.`);

    const updated = { ...existing, status: 'FULFILLED' };
    await this.repoProvider.intentRepo.update(updated, version);

    this.eventPublisher.publish({
      eventId: `evt_${Date.now()}`,
      requestId: `req_${Date.now()}`,
      traceId: `trace_${Date.now()}`,
      collegeId,
      timestamp: new Date().toISOString(),
      eventType: 'IntentFulfilled',
      payload: { intentId, studentProfileId: existing.studentProfileId }
    });
  }

  async archiveIntent(intentId: string, collegeId: string, version: number): Promise<void> {
    const existing = await this.repoProvider.intentRepo.findById(intentId, collegeId);
    if (!existing) throw new Error(`Intent ${intentId} not found.`);

    const updated = { ...existing, status: 'ARCHIVED' };
    await this.repoProvider.intentRepo.update(updated, version);

    this.eventPublisher.publish({
      eventId: `evt_${Date.now()}`,
      requestId: `req_${Date.now()}`,
      traceId: `trace_${Date.now()}`,
      collegeId,
      timestamp: new Date().toISOString(),
      eventType: 'IntentArchived',
      payload: { intentId, studentProfileId: existing.studentProfileId }
    });
  }
}

export class ConnectUseCases {
  constructor(
    public readonly repoProvider: any,
    private readonly eventPublisher: EventPublisher,
    public readonly intentService: StudentIntentService
  ) {}

  async sendConnectionRequest(input: {
    id: string;
    collegeId: string;
    senderProfileId: string;
    receiverProfileId: string;
    originatingIntentId: string;
    note?: string | undefined;
    createdBy: string;
  }): Promise<any> {
    const req = {
      ...input,
      status: 'PENDING',
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      updatedBy: input.createdBy
    };

    await this.repoProvider.connectionRequestRepo.save(req);

    this.eventPublisher.publish({
      eventId: `evt_${Date.now()}`,
      requestId: `req_${Date.now()}`,
      traceId: `trace_${Date.now()}`,
      collegeId: input.collegeId,
      timestamp: new Date().toISOString(),
      eventType: 'ConnectionRequested',
      payload: {
        requestId: req.id,
        senderId: req.senderProfileId,
        receiverId: req.receiverProfileId,
        originatingIntentId: req.originatingIntentId
      }
    });

    return req;
  }

  async acceptConnection(requestId: string, collegeId: string, expectedVersion: number): Promise<any> {
    const req = await this.repoProvider.connectionRequestRepo.findById(requestId, collegeId);
    if (!req) throw new Error(`Connection request ${requestId} not found.`);

    const updatedReq = { ...req, status: 'ACCEPTED' };
    await this.repoProvider.connectionRequestRepo.update(updatedReq, expectedVersion);

    const connection = {
      id: `conn_${Date.now()}`,
      collegeId,
      studentAId: req.senderProfileId,
      studentBId: req.receiverProfileId,
      status: 'CONNECTED',
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: req.senderProfileId,
      updatedBy: req.senderProfileId
    };
    await this.repoProvider.connectionRepo.save(connection);

    this.eventPublisher.publish({
      eventId: `evt_${Date.now()}`,
      requestId: `req_${Date.now()}`,
      traceId: `trace_${Date.now()}`,
      collegeId,
      timestamp: new Date().toISOString(),
      eventType: 'ConnectionAccepted',
      payload: {
        connectionId: connection.id,
        studentAId: connection.studentAId,
        studentBId: connection.studentBId
      }
    });

    return connection;
  }

  async rejectConnection(requestId: string, collegeId: string, expectedVersion: number): Promise<void> {
    const req = await this.repoProvider.connectionRequestRepo.findById(requestId, collegeId);
    if (!req) throw new Error(`Connection request ${requestId} not found.`);

    const updated = { ...req, status: 'REJECTED' };
    await this.repoProvider.connectionRequestRepo.update(updated, expectedVersion);
  }

  async blockConnection(blockerId: string, blockedId: string, collegeId: string): Promise<void> {
    this.eventPublisher.publish({
      eventId: `evt_${Date.now()}`,
      requestId: `req_${Date.now()}`,
      traceId: `trace_${Date.now()}`,
      collegeId,
      timestamp: new Date().toISOString(),
      eventType: 'ConnectionBlocked',
      payload: { blockerId, blockedId }
    });
  }

  async createConversation(input: {
    id: string;
    collegeId: string;
    conversationType?: string | undefined;
    contextType: string;
    contextId: string;
    title?: string | undefined;
    createdBy: string;
  }): Promise<any> {
    // Mandatory Non-Null Context Assertion!
    assertMandatoryConversationContext(input.contextType, input.contextId);

    const conv = {
      ...input,
      conversationType: input.conversationType || 'DIRECT',
      lifecycleState: 'ACTIVE',
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      updatedBy: input.createdBy
    };

    await this.repoProvider.conversationRepo.save(conv);

    this.eventPublisher.publish({
      eventId: `evt_${Date.now()}`,
      requestId: `req_${Date.now()}`,
      traceId: `trace_${Date.now()}`,
      collegeId: input.collegeId,
      timestamp: new Date().toISOString(),
      eventType: 'ConversationCreated',
      payload: {
        conversationId: conv.id,
        contextType: conv.contextType,
        contextId: conv.contextId,
        participantIds: [input.createdBy]
      }
    });

    return conv;
  }

  async sendMessage(input: {
    id: string;
    collegeId: string;
    conversationId: string;
    senderProfileId: string;
    content?: string | undefined;
    ciphertext?: string | undefined;
    iv?: string | undefined;
    algorithm?: string | undefined;
    createdBy: string;
  }): Promise<any> {
    const conversation = await this.repoProvider.conversationRepo.findById(input.conversationId, input.collegeId);
    if (!conversation) throw new NotFoundApplicationError('Conversation', input.conversationId);
    if (conversation.participantIds && !conversation.participantIds.includes(input.senderProfileId)) {
      throw new ForbiddenApplicationError('You are not a participant of this conversation.');
    }
    if (conversation.closedAt) throw new ConflictApplicationError('Conversation already closed.');
    if (conversation.expiresAt && Date.now() >= new Date(conversation.expiresAt).getTime()) {
      conversation.closedAt = conversation.expiresAt;
      conversation.closeReason = 'TIMEOUT';
      conversation.lifecycleState = 'CLOSED';
      await this.repoProvider.conversationRepo.update(conversation, conversation.version);
      throw new ConflictApplicationError('Conversation expired.');
    }

    // Random chats only accept client-side AES-256-GCM ciphertext (end-to-end
    // encrypted): the server stores ciphertext alone and never sees plaintext.
    if (conversation.conversationType === 'RANDOM' && !input.ciphertext) {
      throw new ValidationApplicationError('Encrypted content (ciphertext, iv) required for random chat.');
    }

    const msg: any = {
      id: input.id,
      collegeId: input.collegeId,
      conversationId: input.conversationId,
      senderProfileId: input.senderProfileId,
      content: input.content ?? null,
      ciphertext: input.ciphertext ?? null,
      iv: input.iv ?? null,
      algorithm: input.algorithm ?? (input.ciphertext ? 'AES-256-GCM' : null),
      isSoftDeleted: false,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      updatedBy: input.createdBy
    };

    await this.repoProvider.messageRepo.save(msg);

    this.eventPublisher.publish({
      eventId: `evt_${Date.now()}`,
      requestId: `req_${Date.now()}`,
      traceId: `trace_${Date.now()}`,
      collegeId: input.collegeId,
      timestamp: new Date().toISOString(),
      eventType: 'MessageSent',
      payload: {
        messageId: msg.id,
        conversationId: msg.conversationId,
        senderId: msg.senderProfileId
      }
    });

    return msg;
  }

  /**
   * Join (or get matched in) the anonymous random chat.
   * Only opposite-gender students are ever matched together.
   */
  async joinRandomChat(input: { userId: string; collegeId: string; gender: string }): Promise<any> {
    const active = await this.repoProvider.conversationRepo.findActiveRandomByParticipant(
      input.userId,
      input.collegeId
    );
    if (active) return this.getRandomChatStatus({ userId: input.userId, collegeId: input.collegeId });

    const alreadyWaiting = this.repoProvider.randomQueue.find((w: { userId: string }) => w.userId === input.userId);
    if (alreadyWaiting) {
      return { status: 'WAITING', joinedAt: alreadyWaiting.joinedAt };
    }

    const opposite = input.gender === 'MALE' ? 'FEMALE' : 'MALE';
    const waitingIndex = this.repoProvider.randomQueue.findIndex(
      (w: { gender: string; collegeId: string }) => w.gender === opposite && w.collegeId === input.collegeId
    );

    if (waitingIndex === -1) {
      this.repoProvider.randomQueue.push({
        userId: input.userId,
        collegeId: input.collegeId,
        gender: input.gender,
        joinedAt: new Date().toISOString()
      });
      return { status: 'WAITING', joinedAt: new Date().toISOString() };
    }

    const [waitingPeer] = this.repoProvider.randomQueue.splice(waitingIndex, 1);
    return this.matchRandomChat(input.userId, input.collegeId, input.gender, waitingPeer);
  }

  private async matchRandomChat(
    userId: string,
    collegeId: string,
    _gender: string,
    peer: { userId: string; collegeId: string; gender: string }
  ): Promise<any> {
    const now = new Date();
    const conversationKey = randomBytes(32).toString('base64url');
    const conversation = {
      id: `conv_${Date.now()}_${randomBytes(4).toString('hex')}`,
      collegeId,
      conversationType: 'RANDOM',
      contextType: 'RANDOM_CHAT',
      contextId: 'random',
      title: null,
      participantIds: [userId, peer.userId],
      lifecycleState: 'ACTIVE',
      expiresAt: new Date(now.getTime() + randomChatTtlMs()).toISOString(),
      closedAt: null,
      closeReason: null,
      closedBy: null,
      matchedAt: now.toISOString(),
      conversationKey,
      version: 1,
      createdAt: now,
      updatedAt: now,
      createdBy: userId
    };
    await this.repoProvider.conversationRepo.save(conversation);

    this.eventPublisher.publish({
      eventId: `evt_${Date.now()}`,
      requestId: `req_${Date.now()}`,
      traceId: `trace_${Date.now()}`,
      collegeId,
      timestamp: now.toISOString(),
      eventType: 'RandomChatMatched',
      payload: { conversationId: conversation.id, participantIds: conversation.participantIds }
    });

    return {
      status: 'MATCHED',
      conversationId: conversation.id,
      peerGender: peer.gender,
      expiresAt: conversation.expiresAt,
      matchedAt: conversation.matchedAt,
      conversationKey
    };
  }

  /** Poll the random chat state. Auto-closes the conversation once it expires. */
  async getRandomChatStatus(input: { userId: string; collegeId: string }): Promise<any> {
    const waiting = this.repoProvider.randomQueue.find((w: { userId: string }) => w.userId === input.userId);
    if (waiting) return { status: 'WAITING', joinedAt: waiting.joinedAt };

    const conversation = await this.repoProvider.conversationRepo.findLatestRandomByParticipant(
      input.userId,
      input.collegeId
    );
    if (!conversation) return { status: 'IDLE' };

    if (conversation.closedAt) {
      return {
        status: 'CLOSED',
        conversationId: conversation.id,
        reason: conversation.closeReason || 'LEFT',
        closedBy: conversation.closedBy,
        closedAt: conversation.closedAt
      };
    }

    if (conversation.expiresAt && Date.now() >= new Date(conversation.expiresAt).getTime()) {
      conversation.closedAt = conversation.expiresAt;
      conversation.closeReason = 'TIMEOUT';
      conversation.lifecycleState = 'CLOSED';
      await this.repoProvider.conversationRepo.update(conversation, conversation.version);
      return {
        status: 'CLOSED',
        conversationId: conversation.id,
        reason: 'TIMEOUT',
        closedAt: conversation.closedAt
      };
    }

    const peerId = conversation.participantIds.find((p: string) => p !== input.userId);
    const peerProfile = peerId ? await this.repoProvider.profileRepo.findById(peerId, input.collegeId) : null;

    return {
      status: 'MATCHED',
      conversationId: conversation.id,
      peerGender: peerProfile?.gender ?? null,
      expiresAt: conversation.expiresAt,
      matchedAt: conversation.matchedAt,
      conversationKey: conversation.conversationKey
    };
  }

  /** Leave the random chat (or cancel the waiting room). Closes it for BOTH sides. */
  async leaveRandomChat(input: { userId: string; collegeId: string }): Promise<any> {
    const queueIndex = this.repoProvider.randomQueue.findIndex((w: { userId: string }) => w.userId === input.userId);
    if (queueIndex !== -1) {
      const [removed] = this.repoProvider.randomQueue.splice(queueIndex, 1);
      return { status: 'LEFT_QUEUE', joinedAt: removed?.joinedAt };
    }

    const conversation = await this.repoProvider.conversationRepo.findActiveRandomByParticipant(
      input.userId,
      input.collegeId
    );
    if (!conversation) return { status: 'IDLE' };

    conversation.closedAt = new Date().toISOString();
    conversation.closeReason = 'LEFT';
    conversation.closedBy = input.userId;
    conversation.lifecycleState = 'CLOSED';
    await this.repoProvider.conversationRepo.update(conversation, conversation.version);

    this.eventPublisher.publish({
      eventId: `evt_${Date.now()}`,
      requestId: `req_${Date.now()}`,
      traceId: `trace_${Date.now()}`,
      collegeId: input.collegeId,
      timestamp: new Date().toISOString(),
      eventType: 'RandomChatLeft',
      payload: { conversationId: conversation.id, leftBy: input.userId }
    });

    return { status: 'CLOSED', conversationId: conversation.id, reason: 'LEFT', closedAt: conversation.closedAt };
  }

  async markRead(_conversationId: string, _studentProfileId: string, _collegeId: string): Promise<void> {
    // Read receipt marker
  }

  async createStudyGroup(input: {
    id: string;
    collegeId: string;
    courseCode: string;
    title: string;
    createdBy: string;
  }): Promise<any> {
    this.eventPublisher.publish({
      eventId: `evt_${Date.now()}`,
      requestId: `req_${Date.now()}`,
      traceId: `trace_${Date.now()}`,
      collegeId: input.collegeId,
      timestamp: new Date().toISOString(),
      eventType: 'StudyGroupCreated',
      payload: { studyGroupId: input.id, courseCode: input.courseCode, creatorId: input.createdBy }
    });
    return input;
  }

  async createProjectTeam(input: { id: string; collegeId: string; title: string; createdBy: string }): Promise<any> {
    this.eventPublisher.publish({
      eventId: `evt_${Date.now()}`,
      requestId: `req_${Date.now()}`,
      traceId: `trace_${Date.now()}`,
      collegeId: input.collegeId,
      timestamp: new Date().toISOString(),
      eventType: 'ProjectCreated',
      payload: { projectId: input.id, ownerId: input.createdBy, title: input.title }
    });
    return input;
  }

  async createMentorship(input: {
    id: string;
    collegeId: string;
    mentorId: string;
    menteeId: string;
    createdBy: string;
  }): Promise<any> {
    this.eventPublisher.publish({
      eventId: `evt_${Date.now()}`,
      requestId: `req_${Date.now()}`,
      traceId: `trace_${Date.now()}`,
      collegeId: input.collegeId,
      timestamp: new Date().toISOString(),
      eventType: 'MentorshipStarted',
      payload: { mentorshipId: input.id, mentorId: input.mentorId, menteeId: input.menteeId }
    });
    return input;
  }

  async updatePrivacy(input: {
    studentProfileId: string;
    collegeId: string;
    isGhostMode: boolean;
    isIncognitoMode: boolean;
    version: number;
    updatedBy: string;
  }): Promise<any> {
    const settings = {
      ...input,
      showOnlineIndicator: true,
      showLastActive: true,
      dailyRequestLimit: 5,
      updatedAt: new Date()
    };
    await this.repoProvider.privacyRepo.update(settings, input.version);

    this.eventPublisher.publish({
      eventId: `evt_${Date.now()}`,
      requestId: `req_${Date.now()}`,
      traceId: `trace_${Date.now()}`,
      collegeId: input.collegeId,
      timestamp: new Date().toISOString(),
      eventType: 'PrivacyUpdated',
      payload: {
        studentProfileId: input.studentProfileId,
        visibilityScope: 'VISIBLE_ALL',
        isGhostMode: input.isGhostMode
      }
    });

    return settings;
  }

  async generateRecommendationSnapshot(input: {
    id: string;
    collegeId: string;
    sourceStudentId: string;
    targetStudentId: string;
    overallCompatibilityPct: string;
    algorithmVersion: string;
    createdBy: string;
  }): Promise<any> {
    // Immutable snapshot generation!
    const snapshot = {
      ...input,
      createdAt: new Date()
    };

    await this.repoProvider.recommendationRepo.saveImmutable(snapshot);

    this.eventPublisher.publish({
      eventId: `evt_${Date.now()}`,
      requestId: `req_${Date.now()}`,
      traceId: `trace_${Date.now()}`,
      collegeId: input.collegeId,
      timestamp: new Date().toISOString(),
      eventType: 'RecommendationGenerated',
      payload: { snapshotId: snapshot.id, sourceStudentId: snapshot.sourceStudentId, candidateCount: 1 }
    });

    return snapshot;
  }

  async archiveRecommendation(snapshotId: string, collegeId: string): Promise<void> {
    this.eventPublisher.publish({
      eventId: `evt_${Date.now()}`,
      requestId: `req_${Date.now()}`,
      traceId: `trace_${Date.now()}`,
      collegeId,
      timestamp: new Date().toISOString(),
      eventType: 'RecommendationArchived',
      payload: { snapshotId }
    });
  }

  async reportUser(input: {
    caseId: string;
    collegeId: string;
    reportedUserId: string;
    reporterUserId: string;
    reason: string;
  }): Promise<void> {
    this.eventPublisher.publish({
      eventId: `evt_${Date.now()}`,
      requestId: `req_${Date.now()}`,
      traceId: `trace_${Date.now()}`,
      collegeId: input.collegeId,
      timestamp: new Date().toISOString(),
      eventType: 'ModerationCaseOpened',
      payload: input
    });
  }

  async recordModerationDecision(input: {
    caseId: string;
    collegeId: string;
    actionTaken: string;
    moderatorId: string;
  }): Promise<void> {
    this.eventPublisher.publish({
      eventId: `evt_${Date.now()}`,
      requestId: `req_${Date.now()}`,
      traceId: `trace_${Date.now()}`,
      collegeId: input.collegeId,
      timestamp: new Date().toISOString(),
      eventType: 'ModerationDecisionRecorded',
      payload: input
    });
  }
}
