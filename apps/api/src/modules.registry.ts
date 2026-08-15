import type { FastifyInstance } from 'fastify';
import type { EventBus } from '@college-hub/core';
import { logger } from '@college-hub/logger';
import {
  confessionRoutes,
  ConfessionUseCases,
  ConfessionQueries,
  InMemoryConfessionRepository,
  InMemoryCommentRepository,
  InMemoryModerationRepository,
  InMemoryNotificationRepository,
  InMemoryAnonymousIdentityRepository,
  InMemoryBookmarkRepository,
  InMemoryVoteRepository,
  InMemoryIdempotencyStore
} from '@college-hub/mod-confessions';
import { connectRoutesPlugin } from '@college-hub/mod-connect';
import {
  registerMarketplaceRoutes,
  MarketplaceUseCases,
  MarketplaceQueries,
  InMemoryMarketplaceListingRepository,
  InMemoryOfferRepository,
  InMemoryReservationRepository,
  InMemoryConversationRepository,
  InMemorySellerProfileRepository,
  InMemoryMarketplaceStatisticsRepository,
  InMemoryBookmarkRepository as InMemoryMarketplaceBookmarkRepository,
  InMemoryReportRepository,
  InMemoryAuditRepository
} from '@college-hub/mod-marketplace';
import {
  registerResourceRoutes,
  registerCollectionRoutes,
  registerContributorRoutes,
  registerUploadRoutes,
  CreateAcademicResourceUseCase,
  PublishAcademicResourceUseCase,
  ArchiveAcademicResourceUseCase,
  ReplaceAcademicResourceUseCase,
  CreateResourceVersionUseCase,
  PublishVersionUseCase,
  RollbackVersionUseCase,
  BookmarkResourceUseCase,
  VoteHelpfulUseCase,
  ReportResourceUseCase,
  RecordDownloadUseCase,
  RecordViewUseCase,
  CreateStudyCollectionUseCase,
  UpdateStudyCollectionUseCase,
  AddResourceToCollectionUseCase,
  RemoveResourceFromCollectionUseCase,
  SearchResourcesQuery,
  GetResourceDetailQuery,
  GetStudyCollectionQuery,
  GetContributorProfileQuery,
  InMemoryAcademicResourceRepository,
  InMemoryResourceVersionRepository,
  InMemoryStudyCollectionRepository,
  InMemoryContributorRepository,
  InMemoryStatisticsRepository,
  InMemoryStorageMetadataRepository
} from '@college-hub/mod-academic-resource-hub';
import { notificationRoutesPlugin } from '@college-hub/mod-notifications';
import { placementRoutesPlugin } from '@college-hub/mod-placement-guidance';

export interface FeatureModuleRepositories {
  confessionRepo: InMemoryConfessionRepository;
  commentRepo: InMemoryCommentRepository;
  modRepo: InMemoryModerationRepository;
  identityRepo: InMemoryAnonymousIdentityRepository;
  voteRepo: InMemoryVoteRepository;
}

export async function registerFeatureModules(
  app: FastifyInstance,
  eventBus: EventBus,
  _collegeId = 'college-nitk-003'
): Promise<FeatureModuleRepositories> {
  // ── Campus Confessions (MS-40) ──────────────────────────────────────
  const confessionRepo = new InMemoryConfessionRepository();
  const commentRepo = new InMemoryCommentRepository();
  const modRepo = new InMemoryModerationRepository();
  const notifRepo = new InMemoryNotificationRepository();
  const identityRepo = new InMemoryAnonymousIdentityRepository();
  const bookmarkRepo = new InMemoryBookmarkRepository();
  const voteRepo = new InMemoryVoteRepository();

  const confessionUseCases = new ConfessionUseCases(
    confessionRepo,
    commentRepo,
    voteRepo,
    bookmarkRepo,
    modRepo,
    identityRepo,
    notifRepo,
    eventBus
  );
  const confessionQueries = new ConfessionQueries(confessionRepo, commentRepo, bookmarkRepo, voteRepo, modRepo);
  const idempotencyStore = new InMemoryIdempotencyStore();

  await app.register(confessionRoutes, { useCases: confessionUseCases, queries: confessionQueries, idempotencyStore });

  // ── Connect (MS-01) ─────────────────────────────────────────────────
  await app.register(connectRoutesPlugin);

  // ── Marketplace (MS-02) ─────────────────────────────────────────────
  const listingRepo = new InMemoryMarketplaceListingRepository();
  const offerRepo = new InMemoryOfferRepository();
  const reservationRepo = new InMemoryReservationRepository();
  const convRepo = new InMemoryConversationRepository();
  const sellerRepo = new InMemorySellerProfileRepository();
  const statsRepo = new InMemoryMarketplaceStatisticsRepository();
  const marketplaceBookmarkRepo = new InMemoryMarketplaceBookmarkRepository();
  const reportRepo = new InMemoryReportRepository();
  const auditRepo = new InMemoryAuditRepository();

  const marketplaceUseCases = new MarketplaceUseCases(
    listingRepo,
    offerRepo,
    reservationRepo,
    convRepo,
    sellerRepo,
    marketplaceBookmarkRepo,
    reportRepo,
    auditRepo,
    eventBus
  );
  const marketplaceQueries = new MarketplaceQueries(
    listingRepo,
    sellerRepo,
    statsRepo,
    convRepo,
    reservationRepo,
    marketplaceBookmarkRepo,
    offerRepo
  );

  await app.register(registerMarketplaceRoutes, { useCases: marketplaceUseCases, queries: marketplaceQueries });

  // ── Academic Resource Hub (MS-07) ───────────────────────────────────
  const academicResourceRepo = new InMemoryAcademicResourceRepository();
  const resourceVersionRepo = new InMemoryResourceVersionRepository();
  const studyCollectionRepo = new InMemoryStudyCollectionRepository();
  const contributorRepo = new InMemoryContributorRepository();
  const academicStatsRepo = new InMemoryStatisticsRepository();
  const storageMetadataRepo = new InMemoryStorageMetadataRepository();

  registerUploadRoutes(app);
  registerCollectionRoutes(app, {
    createCollectionUC: new CreateStudyCollectionUseCase(studyCollectionRepo, eventBus),
    updateCollectionUC: new UpdateStudyCollectionUseCase(studyCollectionRepo),
    addResourceUC: new AddResourceToCollectionUseCase(studyCollectionRepo),
    removeResourceUC: new RemoveResourceFromCollectionUseCase(studyCollectionRepo),
    getCollectionQuery: new GetStudyCollectionQuery(studyCollectionRepo)
  });
  registerContributorRoutes(app, {
    getContributorProfileQuery: new GetContributorProfileQuery(contributorRepo)
  });
  registerResourceRoutes(app, {
    createResourceUC: new CreateAcademicResourceUseCase(
      academicResourceRepo,
      resourceVersionRepo,
      storageMetadataRepo,
      academicStatsRepo,
      eventBus
    ),
    publishResourceUC: new PublishAcademicResourceUseCase(academicResourceRepo, eventBus),
    archiveResourceUC: new ArchiveAcademicResourceUseCase(academicResourceRepo, eventBus),
    replaceResourceUC: new ReplaceAcademicResourceUseCase(academicResourceRepo, eventBus),
    createVersionUC: new CreateResourceVersionUseCase(academicResourceRepo, resourceVersionRepo, eventBus),
    publishVersionUC: new PublishVersionUseCase(academicResourceRepo, resourceVersionRepo, eventBus),
    rollbackVersionUC: new RollbackVersionUseCase(academicResourceRepo, resourceVersionRepo, eventBus),
    bookmarkResourceUC: new BookmarkResourceUseCase(academicResourceRepo, eventBus),
    voteHelpfulUC: new VoteHelpfulUseCase(academicResourceRepo, eventBus),
    reportResourceUC: new ReportResourceUseCase(academicResourceRepo, academicStatsRepo, eventBus),
    recordDownloadUC: new RecordDownloadUseCase(academicStatsRepo, eventBus),
    recordViewUC: new RecordViewUseCase(academicStatsRepo, eventBus),
    searchResourcesQuery: new SearchResourcesQuery(academicResourceRepo),
    getResourceDetailQuery: new GetResourceDetailQuery(academicResourceRepo, academicStatsRepo)
  });

  // ── Notifications (MS-40) ───────────────────────────────────────────
  await app.register(notificationRoutesPlugin);

  // ── Placement Guidance (MS-03) ──────────────────────────────────────
  await app.register(placementRoutesPlugin);

  logger.info(
    'All feature modules registered: confessions, connect, marketplace, academic-resources, notifications, placement-guidance'
  );

  return { confessionRepo, commentRepo, modRepo, identityRepo, voteRepo };
}
