export interface AcademicResourceDTO {
  id: string;
  collegeId: string;
  departmentId: string;
  subjectId: string;
  courseId?: string | null;
  resourceTypeId: string;
  uploaderUserId: string;
  title: string;
  slug: string;
  description?: string | null;
  academicYear: string;
  semesterNumber: number;
  isAnonymous: boolean;
  authorDisplayName?: string | null;
  status: string;
  verificationStatus: string;
  currentVersionId?: string | null;
}

export interface ResourceStatisticsDTO {
  resourceId: string;
  collegeId: string;
  totalDownloads: number;
  totalViews: number;
  helpfulVotes: number;
  unhelpfulVotes: number;
  reportCount: number;
  bookmarkCount: number;
  bayesianQualityScore: number;
}

export interface StudyCollectionDTO {
  id: string;
  collegeId: string;
  ownerUserId: string;
  title: string;
  description?: string | null;
  isPublic: boolean;
}

export interface ContributorDTO {
  id: string;
  collegeId: string;
  userId: string;
  reputationScore: number;
  totalUploads: number;
  totalHelpfulVotesReceived: number;
  badgeLevel: string;
}

export interface UploadSessionDTO {
  uploadId: string;
  preSignedUploadUrl: string;
  storageKey: string;
  expiresAt: string;
}

function buildHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-college-id': 'college-nitk-003'
  };
  if (typeof window !== 'undefined') {
    const userId = localStorage.getItem('ch_user_id');
    if (userId) headers['x-user-id'] = userId;
  }
  return headers;
}

export async function fetchResources(subjectId?: string, query?: string): Promise<AcademicResourceDTO[]> {
  const params = new URLSearchParams();
  if (subjectId) params.append('subjectId', subjectId);
  if (query) params.append('query', query);

  const res = await fetch(`/api/v1/resources?${params.toString()}`, { headers: buildHeaders() });
  if (!res.ok) throw new Error('Failed to fetch resources');
  const json = await res.json();
  return json.data;
}

export async function fetchResourceDetail(
  resourceId: string
): Promise<{ resource: AcademicResourceDTO; stats: ResourceStatisticsDTO | null }> {
  const res = await fetch(`/api/v1/resources/${resourceId}`, { headers: buildHeaders() });
  if (!res.ok) throw new Error('Resource not found');
  const json = await res.json();
  return json.data;
}

export async function createAcademicResource(payload: any): Promise<AcademicResourceDTO> {
  const res = await fetch('/api/v1/resources', {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const json = await res.json();
    throw new Error(json.error?.message || 'Failed to create resource');
  }
  const json = await res.json();
  return json.data;
}

export async function voteResource(resourceId: string, isHelpful: boolean): Promise<void> {
  const res = await fetch(`/api/v1/resources/${resourceId}/votes`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({ isHelpful })
  });
  if (!res.ok) {
    const json = await res.json();
    throw new Error(json.error?.message || 'Failed to submit vote');
  }
}

export async function bookmarkResource(resourceId: string): Promise<void> {
  const res = await fetch(`/api/v1/resources/${resourceId}/bookmarks`, {
    method: 'POST',
    headers: buildHeaders()
  });
  if (!res.ok) throw new Error('Failed to bookmark resource');
}

export async function reportResource(resourceId: string, reason: string): Promise<void> {
  const res = await fetch(`/api/v1/resources/${resourceId}/reports`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({ reason })
  });
  if (!res.ok) throw new Error('Failed to report resource');
}

export async function createUploadSession(
  fileName: string,
  fileSizeBytes: number,
  mimeType: string,
  sha256Hash: string
): Promise<UploadSessionDTO> {
  const res = await fetch('/api/v1/uploads/session', {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({ fileName, fileSizeBytes, mimeType, sha256Hash })
  });
  if (!res.ok) throw new Error('Failed to create upload session');
  const json = await res.json();
  return json.data;
}

export async function fetchUploadStatus(
  uploadId: string
): Promise<{ uploadId: string; status: string; virusScanStatus: string }> {
  const res = await fetch(`/api/v1/uploads/${uploadId}/status`, { headers: buildHeaders() });
  if (!res.ok) throw new Error('Failed to fetch upload status');
  const json = await res.json();
  return json.data;
}

export async function createStudyCollection(title: string, description?: string): Promise<StudyCollectionDTO> {
  const res = await fetch('/api/v1/collections', {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({ title, description })
  });
  if (!res.ok) throw new Error('Failed to create collection');
  const json = await res.json();
  return json.data;
}

export async function addResourceToCollection(collectionId: string, resourceId: string): Promise<void> {
  const res = await fetch(`/api/v1/collections/${collectionId}/resources`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({ resourceId })
  });
  if (!res.ok) throw new Error('Failed to add resource to collection');
}

export async function fetchContributorProfile(userId: string): Promise<ContributorDTO> {
  const res = await fetch(`/api/v1/contributors/${userId}`, { headers: buildHeaders() });
  if (!res.ok) throw new Error('Failed to fetch contributor profile');
  const json = await res.json();
  return json.data;
}
