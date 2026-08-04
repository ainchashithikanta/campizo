export interface BaseDomainEvent {
  eventId: string;
  eventType: string;
  collegeId: string;
  occurredAt: string;
}

export interface ConfessionCreatedEvent extends BaseDomainEvent {
  eventType: 'ConfessionCreated';
  confessionId: string;
  categoryCode: string;
  title: string;
  authorThreadPseudonym: string;
}

export interface ConfessionPublishedEvent extends BaseDomainEvent {
  eventType: 'ConfessionPublished';
  confessionId: string;
  categoryCode: string;
  title: string;
  authorThreadPseudonym: string;
}

export interface ConfessionArchivedEvent extends BaseDomainEvent {
  eventType: 'ConfessionArchived';
  confessionId: string;
}

export interface ConfessionDeletedEvent extends BaseDomainEvent {
  eventType: 'ConfessionDeleted';
  confessionId: string;
}

export interface CommentAddedEvent extends BaseDomainEvent {
  eventType: 'CommentAdded';
  confessionId: string;
  commentId: string;
  parentCommentId?: string;
  depth: number;
  authorThreadPseudonym: string;
}

export interface CommentSoftDeletedEvent extends BaseDomainEvent {
  eventType: 'CommentSoftDeleted';
  confessionId: string;
  commentId: string;
}

export interface VoteAddedEvent extends BaseDomainEvent {
  eventType: 'VoteAdded';
  targetType: 'CONFESSION' | 'COMMENT';
  targetId: string;
  voterUserId: string;
  voteType: 'UPVOTE' | 'DOWNVOTE';
}

export interface VoteRemovedEvent extends BaseDomainEvent {
  eventType: 'VoteRemoved';
  targetType: 'CONFESSION' | 'COMMENT';
  targetId: string;
  voterUserId: string;
}

export interface BookmarkAddedEvent extends BaseDomainEvent {
  eventType: 'BookmarkAdded';
  confessionId: string;
  userId: string;
}

export interface BookmarkRemovedEvent extends BaseDomainEvent {
  eventType: 'BookmarkRemoved';
  confessionId: string;
  userId: string;
}

export interface ReportSubmittedEvent extends BaseDomainEvent {
  eventType: 'ReportSubmitted';
  confessionId: string;
  reporterUserId: string;
  reasonCode: string;
  severityLevel: number;
}

export interface ModerationCaseOpenedEvent extends BaseDomainEvent {
  eventType: 'ModerationCaseOpened';
  caseId: string;
  confessionId: string;
  severityLevel: number;
}

export interface ModerationDecisionRecordedEvent extends BaseDomainEvent {
  eventType: 'ModerationDecisionRecorded';
  caseId: string;
  confessionId: string;
  action: 'RESTORE' | 'HIDE' | 'DELETE' | 'ESCALATE';
  moderatorUserId: string;
}

export interface NotificationQueuedEvent extends BaseDomainEvent {
  eventType: 'NotificationQueued';
  recipientUserId: string;
  notificationType: string;
  payloadJson: string;
}

export interface StatisticsUpdatedEvent extends BaseDomainEvent {
  eventType: 'StatisticsUpdated';
  confessionId: string;
  totalViews: number;
  totalUpvotes: number;
  totalComments: number;
  trendingScore: number;
}

export interface RankingUpdatedEvent extends BaseDomainEvent {
  eventType: 'RankingUpdated';
  confessionId: string;
  trendingScore: number;
}

export interface AnonymousIdentityAssignedEvent extends BaseDomainEvent {
  eventType: 'AnonymousIdentityAssigned';
  confessionId: string;
  userIdHash: string;
  assignedPseudonym: string;
}

export interface MediaAttachedEvent extends BaseDomainEvent {
  eventType: 'MediaAttached';
  confessionId: string;
  mediaId: string;
  mediaUrl: string;
}

export interface MediaRemovedEvent extends BaseDomainEvent {
  eventType: 'MediaRemoved';
  confessionId: string;
  mediaId: string;
}

export type ConfessionDomainEvent =
  | ConfessionCreatedEvent
  | ConfessionPublishedEvent
  | ConfessionArchivedEvent
  | ConfessionDeletedEvent
  | CommentAddedEvent
  | CommentSoftDeletedEvent
  | VoteAddedEvent
  | VoteRemovedEvent
  | BookmarkAddedEvent
  | BookmarkRemovedEvent
  | ReportSubmittedEvent
  | ModerationCaseOpenedEvent
  | ModerationDecisionRecordedEvent
  | NotificationQueuedEvent
  | StatisticsUpdatedEvent
  | RankingUpdatedEvent
  | AnonymousIdentityAssignedEvent
  | MediaAttachedEvent
  | MediaRemovedEvent;
