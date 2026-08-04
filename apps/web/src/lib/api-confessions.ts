export interface ApiV1Response<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  metadata?: {
    requestId: string;
    collegeId: string;
    timestamp: string;
  };
}

export interface ConfessionDTO {
  id: string;
  collegeId: string;
  categoryCode: string;
  title: string;
  slug: string;
  content: string;
  authorThreadPseudonym: string;
  status: 'PUBLISHED' | 'QUARANTINED' | 'DELETED';
  upvotesCount: number;
  commentsCount: number;
  reportsCount: number;
  rankScore: string;
  createdAt: string;
}

export interface CommentDTO {
  id: string;
  collegeId: string;
  confessionId: string;
  parentCommentId?: string | null;
  depth: number;
  authorThreadPseudonym: string;
  content: string;
  status: 'ACTIVE' | 'SOFT_DELETED';
  upvotesCount: number;
  createdAt: string;
}

export interface ConfessionDetailDTO {
  confession: ConfessionDTO;
  comments: CommentDTO[];
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
  relatedConfessions: ConfessionDTO[];
}

export interface ModerationCaseDTO {
  id: string;
  collegeId: string;
  confessionId: string;
  severityLevel: number;
  status: 'OPEN' | 'UNDER_REVIEW' | 'QUARANTINED' | 'CLOSED';
  totalReports: number;
  createdAt: string;
  authorIdentity: string;
}

const API_BASE = typeof window !== 'undefined' ? '/api/v1/confessions' : 'http://localhost:3000/api/v1/confessions';

export class ConfessionsApiClient {
  private static getHeaders(collegeId: string, idempotencyKey?: string) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-college-id': collegeId,
      'x-request-id': `req-${Date.now()}`
    };
    if (idempotencyKey) {
      headers['x-idempotency-key'] = idempotencyKey;
    }
    return headers;
  }

  static async fetchFeed(
    collegeId: string,
    options?: { tab?: 'trending' | 'latest'; categoryCode?: string }
  ): Promise<ApiV1Response<ConfessionDTO[]>> {
    try {
      const params = new URLSearchParams();
      if (options?.tab) params.append('tab', options.tab);
      if (options?.categoryCode) params.append('categoryCode', options.categoryCode);

      const url = `${API_BASE}/feed${params.toString() ? `?${params.toString()}` : ''}`;
      const res = await fetch(url, { headers: this.getHeaders(collegeId) });
      return await res.json();
    } catch (err) {
      return { success: false, error: { code: 'NETWORK_ERROR', message: (err as Error).message } };
    }
  }

  static async searchConfessions(collegeId: string, query: string): Promise<ApiV1Response<ConfessionDTO[]>> {
    try {
      const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(query)}`, {
        headers: this.getHeaders(collegeId)
      });
      return await res.json();
    } catch (err) {
      return { success: false, error: { code: 'NETWORK_ERROR', message: (err as Error).message } };
    }
  }

  static async fetchConfession(id: string, collegeId: string): Promise<ApiV1Response<ConfessionDetailDTO>> {
    try {
      const res = await fetch(`${API_BASE}/${id}`, { headers: this.getHeaders(collegeId) });
      return await res.json();
    } catch (err) {
      return { success: false, error: { code: 'NETWORK_ERROR', message: (err as Error).message } };
    }
  }

  static async createConfession(
    collegeId: string,
    payload: { categoryCode: string; title: string; content: string },
    idempotencyKey?: string
  ): Promise<ApiV1Response<ConfessionDTO>> {
    try {
      const res = await fetch(API_BASE, {
        method: 'POST',
        headers: this.getHeaders(collegeId, idempotencyKey),
        body: JSON.stringify(payload)
      });
      return await res.json();
    } catch (err) {
      return { success: false, error: { code: 'NETWORK_ERROR', message: (err as Error).message } };
    }
  }

  static async vote(
    id: string,
    collegeId: string,
    voteType: 'UPVOTE' | 'DOWNVOTE' | 'REMOVE'
  ): Promise<ApiV1Response<{ voted: boolean }>> {
    try {
      const res = await fetch(`${API_BASE}/${id}/vote`, {
        method: 'POST',
        headers: this.getHeaders(collegeId),
        body: JSON.stringify({ voteType })
      });
      return await res.json();
    } catch (err) {
      return { success: false, error: { code: 'NETWORK_ERROR', message: (err as Error).message } };
    }
  }

  static async bookmark(id: string, collegeId: string): Promise<ApiV1Response<{ bookmarked: boolean }>> {
    try {
      const res = await fetch(`${API_BASE}/${id}/bookmark`, {
        method: 'POST',
        headers: this.getHeaders(collegeId)
      });
      return await res.json();
    } catch (err) {
      return { success: false, error: { code: 'NETWORK_ERROR', message: (err as Error).message } };
    }
  }

  static async report(
    id: string,
    collegeId: string,
    reasonCode: string
  ): Promise<ApiV1Response<{ reported: boolean }>> {
    try {
      const res = await fetch(`${API_BASE}/${id}/report`, {
        method: 'POST',
        headers: this.getHeaders(collegeId),
        body: JSON.stringify({ reasonCode })
      });
      return await res.json();
    } catch (err) {
      return { success: false, error: { code: 'NETWORK_ERROR', message: (err as Error).message } };
    }
  }

  static async createComment(
    id: string,
    collegeId: string,
    payload: { content: string; parentCommentId?: string }
  ): Promise<ApiV1Response<CommentDTO>> {
    try {
      const res = await fetch(`${API_BASE}/${id}/comments`, {
        method: 'POST',
        headers: this.getHeaders(collegeId),
        body: JSON.stringify(payload)
      });
      return await res.json();
    } catch (err) {
      return { success: false, error: { code: 'NETWORK_ERROR', message: (err as Error).message } };
    }
  }

  static async fetchModerationQueue(collegeId: string): Promise<ApiV1Response<ModerationCaseDTO[]>> {
    try {
      const res = await fetch(`${API_BASE}/moderation/queue`, { headers: this.getHeaders(collegeId) });
      return await res.json();
    } catch (err) {
      return { success: false, error: { code: 'NETWORK_ERROR', message: (err as Error).message } };
    }
  }

  static async submitModerationDecision(
    caseId: string,
    collegeId: string,
    payload: { action: 'RESTORE' | 'HIDE' | 'DELETE' | 'ESCALATE'; reasonNote?: string }
  ): Promise<ApiV1Response<{ caseId: string; action: string }>> {
    try {
      const res = await fetch(`${API_BASE}/moderation/${caseId}/decision`, {
        method: 'POST',
        headers: this.getHeaders(collegeId),
        body: JSON.stringify(payload)
      });
      return await res.json();
    } catch (err) {
      return { success: false, error: { code: 'NETWORK_ERROR', message: (err as Error).message } };
    }
  }
}
