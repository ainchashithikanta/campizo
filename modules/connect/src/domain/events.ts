/**
 * Campus Connect — Domain Events Definition
 * Typed events dispatched across background BullMQ workers.
 */

export interface EventEnvelopeHeader {
  eventId: string;
  requestId: string;
  traceId: string;
  collegeId: string;
  timestamp: string;
}

export type ProfileCreatedEvent = EventEnvelopeHeader & {
  eventType: 'ProfileCreated';
  payload: { studentProfileId: string; major: string; classYear: number };
};

export type IntentCreatedEvent = EventEnvelopeHeader & {
  eventType: 'IntentCreated';
  payload: { intentId: string; studentProfileId: string; intentType: string; title: string };
};

export type IntentActivatedEvent = EventEnvelopeHeader & {
  eventType: 'IntentActivated';
  payload: { intentId: string; studentProfileId: string; intentType: string };
};

export type IntentFulfilledEvent = EventEnvelopeHeader & {
  eventType: 'IntentFulfilled';
  payload: { intentId: string; studentProfileId: string; fulfillmentReason?: string };
};

export type IntentArchivedEvent = EventEnvelopeHeader & {
  eventType: 'IntentArchived';
  payload: { intentId: string; studentProfileId: string };
};

export type ConnectionRequestedEvent = EventEnvelopeHeader & {
  eventType: 'ConnectionRequested';
  payload: { requestId: string; senderId: string; receiverId: string; originatingIntentId: string };
};

export type ConnectionAcceptedEvent = EventEnvelopeHeader & {
  eventType: 'ConnectionAccepted';
  payload: { connectionId: string; studentAId: string; studentBId: string };
};

export type ConnectionBlockedEvent = EventEnvelopeHeader & {
  eventType: 'ConnectionBlocked';
  payload: { blockerId: string; blockedId: string };
};

export type ConversationCreatedEvent = EventEnvelopeHeader & {
  eventType: 'ConversationCreated';
  payload: { conversationId: string; contextType: string; contextId: string; participantIds: string[] };
};

export type MessageSentEvent = EventEnvelopeHeader & {
  eventType: 'MessageSent';
  payload: { messageId: string; conversationId: string; senderId: string };
};

export type StudyGroupCreatedEvent = EventEnvelopeHeader & {
  eventType: 'StudyGroupCreated';
  payload: { studyGroupId: string; courseCode: string; creatorId: string };
};

export type ProjectCreatedEvent = EventEnvelopeHeader & {
  eventType: 'ProjectCreated';
  payload: { projectId: string; ownerId: string; title: string };
};

export type MentorshipStartedEvent = EventEnvelopeHeader & {
  eventType: 'MentorshipStarted';
  payload: { mentorshipId: string; mentorId: string; menteeId: string };
};

export type RecommendationGeneratedEvent = EventEnvelopeHeader & {
  eventType: 'RecommendationGenerated';
  payload: { snapshotId: string; sourceStudentId: string; candidateCount: number };
};

export type RecommendationArchivedEvent = EventEnvelopeHeader & {
  eventType: 'RecommendationArchived';
  payload: { snapshotId: string };
};

export type PrivacyUpdatedEvent = EventEnvelopeHeader & {
  eventType: 'PrivacyUpdated';
  payload: { studentProfileId: string; visibilityScope: string; isGhostMode: boolean };
};

export type ModerationCaseOpenedEvent = EventEnvelopeHeader & {
  eventType: 'ModerationCaseOpened';
  payload: { caseId: string; reportedUserId: string; reporterUserId: string; reason: string };
};

export type ModerationDecisionRecordedEvent = EventEnvelopeHeader & {
  eventType: 'ModerationDecisionRecorded';
  payload: { caseId: string; actionTaken: string; moderatorId: string };
};

export type NotificationQueuedEvent = EventEnvelopeHeader & {
  eventType: 'NotificationQueued';
  payload: { notificationId: string; recipientId: string; category: string };
};

export type ActivityRecordedEvent = EventEnvelopeHeader & {
  eventType: 'ActivityRecorded';
  payload: { activityId: string; actorId: string; actionType: string };
};

export type FeatureDisabledEvent = EventEnvelopeHeader & {
  eventType: 'FeatureDisabled';
  payload: { flagKey: string };
};

export type FeatureEnabledEvent = EventEnvelopeHeader & {
  eventType: 'FeatureEnabled';
  payload: { flagKey: string };
};

export type CampusConnectDomainEvent =
  | ProfileCreatedEvent
  | IntentCreatedEvent
  | IntentActivatedEvent
  | IntentFulfilledEvent
  | IntentArchivedEvent
  | ConnectionRequestedEvent
  | ConnectionAcceptedEvent
  | ConnectionBlockedEvent
  | ConversationCreatedEvent
  | MessageSentEvent
  | StudyGroupCreatedEvent
  | ProjectCreatedEvent
  | MentorshipStartedEvent
  | RecommendationGeneratedEvent
  | RecommendationArchivedEvent
  | PrivacyUpdatedEvent
  | ModerationCaseOpenedEvent
  | ModerationDecisionRecordedEvent
  | NotificationQueuedEvent
  | ActivityRecordedEvent
  | FeatureDisabledEvent
  | FeatureEnabledEvent;
