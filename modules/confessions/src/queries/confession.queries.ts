import {
  ConfessionRepository,
  CommentRepository,
  BookmarkRepository,
  VoteRepository,
  ModerationRepository,
  ConfessionEntity,
  CommentEntity,
  ModerationCaseEntity
} from '../domain/repository.interface.js';

export interface ConfessionCompositeDetailReadModel {
  confession: ConfessionEntity;
  comments: CommentEntity[];
  statistics: {
    totalViews: number;
    totalUpvotes: number;
    totalComments: number;
    trendingScore: number;
  };
  currentUserState: {
    hasBookmarked: boolean;
    userVoteType?: 'UPVOTE' | 'DOWNVOTE' | null;
  };
  relatedConfessions: ConfessionEntity[];
}

export class ConfessionQueries {
  constructor(
    private confessionRepo: ConfessionRepository,
    private commentRepo: CommentRepository,
    private bookmarkRepo: BookmarkRepository,
    private voteRepo: VoteRepository,
    private modRepo: ModerationRepository
  ) {}

  async getFeed(
    collegeId: string,
    options: { categoryCode?: string; tab?: 'trending' | 'latest'; cursor?: string; limit?: number }
  ): Promise<ConfessionEntity[]> {
    return this.confessionRepo.listFeed(collegeId, options);
  }

  async getConfessionDetail(
    confessionId: string,
    collegeId: string,
    currentUserId: string
  ): Promise<ConfessionCompositeDetailReadModel | null> {
    const confession = await this.confessionRepo.findById(confessionId, collegeId);
    if (!confession) return null;

    const [comments, hasBookmarked, userVoteType, feed] = await Promise.all([
      this.commentRepo.listByConfession(confessionId, collegeId),
      this.bookmarkRepo.isBookmarked(confessionId, currentUserId, collegeId),
      this.voteRepo.getUserConfessionVote(confessionId, currentUserId, collegeId),
      this.confessionRepo.listFeed(collegeId, { limit: 5 })
    ]);

    const relatedConfessions = feed.filter(f => f.id !== confessionId).slice(0, 3);

    return {
      confession,
      comments,
      statistics: {
        totalViews: 42,
        totalUpvotes: confession.upvotesCount,
        totalComments: comments.length,
        trendingScore: parseFloat(confession.rankScore)
      },
      currentUserState: {
        hasBookmarked,
        userVoteType
      },
      relatedConfessions
    };
  }

  async getThreadComments(confessionId: string, collegeId: string): Promise<CommentEntity[]> {
    return this.commentRepo.listByConfession(confessionId, collegeId);
  }

  async getModerationQueue(collegeId: string): Promise<ModerationCaseEntity[]> {
    return this.modRepo.listQueue(collegeId);
  }
}
