/**
 * Campus Connect — Fastify Route Registration Plugin
 * Mounts all REST API endpoints for Campus Connect with middleware stack (RequestContext, PrivacyGuard, RBAC, Idempotency, Logger, ErrorHandler).
 */

import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { ConnectProfileController } from '../controllers/connect.controller.js';
import { IntentController } from '../controllers/intent.controller.js';
import { ConnectionController } from '../controllers/connection.controller.js';
import { ConversationController } from '../controllers/conversation.controller.js';
import { MessageController } from '../controllers/message.controller.js';
import { StudyGroupController } from '../controllers/study-group.controller.js';
import { ProjectController } from '../controllers/project.controller.js';
import { MentorshipController } from '../controllers/mentorship.controller.js';
import { RecommendationController } from '../controllers/recommendation.controller.js';
import { PrivacyController } from '../controllers/privacy.controller.js';
import { NotificationController } from '../controllers/notification.controller.js';
import { ModerationController } from '../controllers/moderation.controller.js';
import { ActivityController } from '../controllers/activity.controller.js';

import { requestContextMiddleware } from '../middleware/request-context.js';
import { privacyGuardMiddleware } from '../middleware/privacy-guard.js';
import { rbacMiddleware } from '../middleware/rbac.js';
import { idempotencyMiddleware } from '../middleware/idempotency.js';
import { requestLoggerMiddleware } from '../middleware/request-logger.js';
import { httpErrorHandler } from '../middleware/http-error-handler.js';

import { ConnectUseCases, StudentIntentService, EventPublisher } from '../use-cases/connect.use-cases.js';
import { ConnectQueryService } from '../queries/connect.queries.js';
import { InMemoryConnectRepositoryProvider } from '../repositories/in-memory-connect.repository.js';

export async function connectRoutesPlugin(fastify: FastifyInstance, _opts: FastifyPluginOptions): Promise<void> {
  // Wire up default in-memory infrastructure if not supplied via options/decorations
  const repoProvider = new InMemoryConnectRepositoryProvider();
  const eventPublisher = new EventPublisher();
  const intentService = new StudentIntentService(repoProvider, eventPublisher);
  const useCases = new ConnectUseCases(repoProvider, eventPublisher, intentService);
  const queryService = new ConnectQueryService(repoProvider);

  // Instantiating controllers
  const profileCtrl = new ConnectProfileController(queryService);
  const intentCtrl = new IntentController(intentService);
  const connectionCtrl = new ConnectionController(useCases, queryService);
  const conversationCtrl = new ConversationController(useCases, queryService);
  const messageCtrl = new MessageController(useCases);
  const studyGroupCtrl = new StudyGroupController(useCases, queryService);
  const projectCtrl = new ProjectController(useCases, queryService);
  const mentorshipCtrl = new MentorshipController(useCases, queryService);
  const recommendationCtrl = new RecommendationController(queryService);
  const privacyCtrl = new PrivacyController(useCases, queryService);
  const notificationCtrl = new NotificationController(queryService);
  const moderationCtrl = new ModerationController(useCases);
  const activityCtrl = new ActivityController(queryService);

  // Global error handler for this plugin scope
  fastify.setErrorHandler(httpErrorHandler);

  // Register Hooks
  fastify.addHook('onRequest', requestContextMiddleware);
  fastify.addHook('preHandler', requestLoggerMiddleware);
  fastify.addHook('preHandler', idempotencyMiddleware);
  fastify.addHook('preHandler', privacyGuardMiddleware);

  const studentRoles = ['STUDENT', 'MODERATOR', 'COLLEGE_ADMIN', 'PLATFORM_ADMIN', 'SUPER_ADMIN'];
  const modRoles = ['MODERATOR', 'COLLEGE_ADMIN', 'PLATFORM_ADMIN', 'SUPER_ADMIN'];

  // 1. Student Profile & Discovery
  fastify.get(
    '/connect/profile',
    { preHandler: [rbacMiddleware(studentRoles)] },
    profileCtrl.getMyProfile.bind(profileCtrl)
  );
  fastify.put(
    '/connect/profile',
    { preHandler: [rbacMiddleware(studentRoles)] },
    profileCtrl.updateMyProfile.bind(profileCtrl)
  );
  fastify.get(
    '/connect/discovery',
    { preHandler: [rbacMiddleware(studentRoles)] },
    profileCtrl.getDiscoveryFeed.bind(profileCtrl)
  );
  fastify.get(
    '/connect/recommendations',
    { preHandler: [rbacMiddleware(studentRoles)] },
    recommendationCtrl.getRecommendations.bind(recommendationCtrl)
  );

  // 2. Intent Lifecycle
  fastify.post(
    '/connect/intents',
    { preHandler: [rbacMiddleware(studentRoles)] },
    intentCtrl.createIntent.bind(intentCtrl)
  );
  fastify.patch(
    '/connect/intents/:id',
    { preHandler: [rbacMiddleware(studentRoles)] },
    intentCtrl.updateIntent.bind(intentCtrl)
  );
  fastify.post(
    '/connect/intents/:id/pause',
    { preHandler: [rbacMiddleware(studentRoles)] },
    intentCtrl.pauseIntent.bind(intentCtrl)
  );
  fastify.post(
    '/connect/intents/:id/fulfill',
    { preHandler: [rbacMiddleware(studentRoles)] },
    intentCtrl.fulfillIntent.bind(intentCtrl)
  );
  fastify.post(
    '/connect/intents/:id/archive',
    { preHandler: [rbacMiddleware(studentRoles)] },
    intentCtrl.archiveIntent.bind(intentCtrl)
  );

  // 3. Connections
  fastify.post(
    '/connect/connections/request',
    { preHandler: [rbacMiddleware(studentRoles)] },
    connectionCtrl.requestConnection.bind(connectionCtrl)
  );
  fastify.post(
    '/connect/connections/:id/accept',
    { preHandler: [rbacMiddleware(studentRoles)] },
    connectionCtrl.acceptConnection.bind(connectionCtrl)
  );
  fastify.post(
    '/connect/connections/:id/reject',
    { preHandler: [rbacMiddleware(studentRoles)] },
    connectionCtrl.rejectConnection.bind(connectionCtrl)
  );
  fastify.post(
    '/connect/connections/:id/block',
    { preHandler: [rbacMiddleware(studentRoles)] },
    connectionCtrl.blockConnection.bind(connectionCtrl)
  );
  fastify.get(
    '/connect/network',
    { preHandler: [rbacMiddleware(studentRoles)] },
    connectionCtrl.getNetwork.bind(connectionCtrl)
  );

  // 4. Messaging & Conversations
  fastify.post(
    '/connect/conversations',
    { preHandler: [rbacMiddleware(studentRoles)] },
    conversationCtrl.createConversation.bind(conversationCtrl)
  );
  fastify.get(
    '/connect/conversations/:id',
    { preHandler: [rbacMiddleware(studentRoles)] },
    conversationCtrl.getConversation.bind(conversationCtrl)
  );
  fastify.post(
    '/connect/messages',
    { preHandler: [rbacMiddleware(studentRoles)] },
    messageCtrl.sendMessage.bind(messageCtrl)
  );
  fastify.patch(
    '/connect/messages/read',
    { preHandler: [rbacMiddleware(studentRoles)] },
    messageCtrl.markRead.bind(messageCtrl)
  );

  // 5. Study Groups, Projects, Mentorship
  fastify.post(
    '/connect/study-groups',
    { preHandler: [rbacMiddleware(studentRoles)] },
    studyGroupCtrl.createStudyGroup.bind(studyGroupCtrl)
  );
  fastify.get(
    '/connect/study-groups',
    { preHandler: [rbacMiddleware(studentRoles)] },
    studyGroupCtrl.getStudyGroups.bind(studyGroupCtrl)
  );
  fastify.post(
    '/connect/projects',
    { preHandler: [rbacMiddleware(studentRoles)] },
    projectCtrl.createProject.bind(projectCtrl)
  );
  fastify.get(
    '/connect/projects',
    { preHandler: [rbacMiddleware(studentRoles)] },
    projectCtrl.getProjects.bind(projectCtrl)
  );
  fastify.post(
    '/connect/mentorship',
    { preHandler: [rbacMiddleware(studentRoles)] },
    mentorshipCtrl.createMentorship.bind(mentorshipCtrl)
  );
  fastify.get(
    '/connect/mentorship',
    { preHandler: [rbacMiddleware(studentRoles)] },
    mentorshipCtrl.getMentorships.bind(mentorshipCtrl)
  );

  // 6. Privacy & Notifications & Activity
  fastify.get(
    '/connect/privacy',
    { preHandler: [rbacMiddleware(studentRoles)] },
    privacyCtrl.getPrivacySettings.bind(privacyCtrl)
  );
  fastify.put(
    '/connect/privacy',
    { preHandler: [rbacMiddleware(studentRoles)] },
    privacyCtrl.updatePrivacySettings.bind(privacyCtrl)
  );
  fastify.get(
    '/connect/notifications',
    { preHandler: [rbacMiddleware(studentRoles)] },
    notificationCtrl.getNotifications.bind(notificationCtrl)
  );
  fastify.get(
    '/connect/activity',
    { preHandler: [rbacMiddleware(studentRoles)] },
    activityCtrl.getActivityFeed.bind(activityCtrl)
  );

  // 7. Moderation
  fastify.post(
    '/connect/report',
    { preHandler: [rbacMiddleware(studentRoles)] },
    moderationCtrl.reportUser.bind(moderationCtrl)
  );
  fastify.post(
    '/connect/moderation/action',
    { preHandler: [rbacMiddleware(modRoles)] },
    moderationCtrl.recordModerationAction.bind(moderationCtrl)
  );
}
