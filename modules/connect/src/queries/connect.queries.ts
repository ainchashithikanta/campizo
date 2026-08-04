/**
 * Campus Connect — CQRS Read Query Models
 * Read-only composite queries optimized for UI views. ZERO mutations.
 * Never exposes internal trust scores or private fields.
 */

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  hasMore: boolean;
}

export class ConnectQueryService {
  constructor(private readonly repoProvider: any) {}

  async getDiscoveryFeed(_collegeId: string, intentType?: string, _limit: number = 20, _page: number = 1): Promise<PaginatedResult<any>> {
    // Read-only discovery query
    return {
      items: [
        {
          id: 'int_101',
          intentType: intentType || 'STUDY_PARTNER',
          title: 'Seeking CS224N Study Pod Teammate',
          studentName: 'Sarah Chen',
          major: 'Symbolic Systems',
          classYear: 2027,
          courseCode: 'CS224N',
          availabilityState: 'AVAILABLE_NOW'
        }
      ],
      total: 1,
      hasMore: false
    };
  }

  async getRecommendations(_studentProfileId: string, _collegeId: string, _limit: number = 10): Promise<PaginatedResult<any>> {
    return {
      items: [
        {
          snapshotId: 'snap_9912',
          targetStudentId: 'usr_stanford_9941',
          targetStudentName: 'Sarah Chen',
          compatibilityPct: 92.50,
          weightedReasons: [
            { reasonCode: 'SHARED_COURSE', weight: 0.45, humanText: 'Both registered in CS224N' },
            { reasonCode: 'COMPLEMENTARY_SKILL', weight: 0.35, humanText: 'You (PyTorch) & Sarah (React)' }
          ]
        }
      ],
      total: 1,
      hasMore: false
    };
  }

  async getStudentProfile(studentProfileId: string, collegeId: string): Promise<any | null> {
    const profile = await this.repoProvider.profileRepo.findById(studentProfileId, collegeId);
    if (!profile) return null;

    // Never expose internal trust score in public UI read models!
    const { trustScore, ...publicProfile } = profile;
    return publicProfile;
  }

  async getStudentNetwork(studentProfileId: string, collegeId: string, limit: number = 20, offset: number = 0): Promise<PaginatedResult<any>> {
    const connections = await this.repoProvider.connectionRepo.listConnections(studentProfileId, collegeId, limit, offset);
    return {
      items: connections,
      total: connections.length,
      hasMore: false
    };
  }

  async getConversation(conversationId: string, collegeId: string): Promise<any | null> {
    return this.repoProvider.conversationRepo.findById(conversationId, collegeId);
  }

  async getMessages(conversationId: string, collegeId: string, limit: number = 50, offset: number = 0): Promise<PaginatedResult<any>> {
    const msgs = await this.repoProvider.messageRepo.listByConversation(conversationId, collegeId, limit, offset);
    return {
      items: msgs,
      total: msgs.length,
      hasMore: false
    };
  }

  async getStudyGroups(_collegeId: string, courseCode?: string): Promise<any[]> {
    return [
      {
        id: 'sg_101',
        courseCode: courseCode || 'CS224N',
        title: 'Midterm Prep Pod',
        maxCapacity: 5,
        currentMembers: 3,
        status: 'OPEN'
      }
    ];
  }

  async getProjectTeams(_collegeId: string): Promise<any[]> {
    return [
      {
        id: 'pt_101',
        title: 'TreeHacks AI Assistant Team',
        status: 'OPEN'
      }
    ];
  }

  async getMentorships(_studentProfileId: string, _collegeId: string): Promise<any[]> {
    return [];
  }

  async getNotifications(_recipientProfileId: string, _collegeId: string): Promise<any[]> {
    return [];
  }

  async getActivities(_collegeId: string): Promise<any[]> {
    return [];
  }

  async getPrivacySettings(studentProfileId: string, collegeId: string): Promise<any | null> {
    return this.repoProvider.privacyRepo.findByStudentId(studentProfileId, collegeId);
  }

  async getModerationQueue(_collegeId: string): Promise<any[]> {
    return [];
  }
}
