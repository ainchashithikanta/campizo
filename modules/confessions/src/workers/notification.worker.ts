/**
 * Notification Worker
 *
 * Trigger: ConfessionPublished, CommentAdded, ModerationCaseOpened
 *
 * Prepares notification payloads ONLY.
 * Does NOT send notifications.
 * Actual delivery (push, email, future channels) is handled by
 * the platform-wide notification service.
 *
 * Emits: NotificationQueued
 *
 * Never includes real user identity or identity mappings in payload.
 */

export interface NotificationPayload {
  recipientUserId: string;
  notificationType: string;
  title: string;
  body: string;
  confessionId: string;
  collegeId: string;
}

export interface NotificationWorkerDeps {
  queueNotification: (notification: {
    collegeId: string;
    recipientUserId: string;
    notificationType: string;
    payloadJson: string;
  }) => Promise<void>;
}

export async function notificationWorkerHandler(
  payload: Record<string, unknown>,
  deps: NotificationWorkerDeps
): Promise<NotificationPayload> {
  const eventType = payload['eventType'] as string;
  const confessionId = payload['confessionId'] as string;
  const collegeId = payload['collegeId'] as string;

  let notificationType = 'GENERAL';
  let title = 'Campus Confessions';
  let body = 'Something happened on a confession you follow.';
  // Notifications are sent to a generic "followers" audience
  // Real recipient resolution happens in the platform notification service
  let recipientUserId = 'FOLLOWERS';

  switch (eventType) {
    case 'ConfessionPublished':
      notificationType = 'NEW_CONFESSION';
      title = 'New Confession Posted';
      body = 'A new confession was posted in your campus feed.';
      break;
    case 'CommentAdded':
      notificationType = 'NEW_COMMENT';
      title = 'New Comment';
      body = 'Someone replied to a confession you follow.';
      break;
    case 'ModerationCaseOpened':
      notificationType = 'MODERATION_ALERT';
      title = 'Moderation Review Required';
      body = 'A confession requires moderator attention.';
      recipientUserId = 'MODERATORS';
      break;
    default:
      break;
  }

  const notificationPayload: NotificationPayload = {
    recipientUserId,
    notificationType,
    title,
    body,
    confessionId,
    collegeId
  };

  await deps.queueNotification({
    collegeId,
    recipientUserId,
    notificationType,
    payloadJson: JSON.stringify({ title, body, confessionId })
  });

  return notificationPayload;
}
