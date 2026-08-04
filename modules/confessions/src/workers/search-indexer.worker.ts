/**
 * Search Indexer Worker
 *
 * Trigger: ConfessionPublished, CommentAdded, CommentSoftDeleted,
 *          ModerationDecisionRecorded, ConfessionArchived, ConfessionDeleted
 *
 * Updates PostgreSQL GIN search indexes.
 * Supports future abstraction for Meilisearch/OpenSearch.
 *
 * Never indexes anonymous identity mappings.
 */

export interface SearchIndexEntry {
  confessionId: string;
  collegeId: string;
  action: 'INDEX' | 'UPDATE' | 'REMOVE';
  indexedFields: string[];
}

export interface SearchIndexerDeps {
  indexConfession: (confessionId: string, collegeId: string) => Promise<void>;
  removeFromIndex: (confessionId: string, collegeId: string) => Promise<void>;
}

export async function searchIndexerWorkerHandler(
  payload: Record<string, unknown>,
  deps: SearchIndexerDeps
): Promise<SearchIndexEntry> {
  const eventType = payload['eventType'] as string;
  const confessionId = payload['confessionId'] as string;
  const collegeId = payload['collegeId'] as string;

  let action: SearchIndexEntry['action'] = 'INDEX';
  let indexedFields = ['title', 'content', 'categoryCode'];

  switch (eventType) {
    case 'ConfessionPublished':
      action = 'INDEX';
      await deps.indexConfession(confessionId, collegeId);
      break;
    case 'CommentAdded':
      action = 'UPDATE';
      indexedFields = ['commentContent'];
      await deps.indexConfession(confessionId, collegeId);
      break;
    case 'CommentSoftDeleted':
      action = 'UPDATE';
      indexedFields = ['commentContent'];
      await deps.indexConfession(confessionId, collegeId);
      break;
    case 'ModerationDecisionRecorded':
      action = 'UPDATE';
      indexedFields = ['status'];
      await deps.indexConfession(confessionId, collegeId);
      break;
    case 'ConfessionArchived':
    case 'ConfessionDeleted':
      action = 'REMOVE';
      indexedFields = [];
      await deps.removeFromIndex(confessionId, collegeId);
      break;
    default:
      await deps.indexConfession(confessionId, collegeId);
  }

  return { confessionId, collegeId, action, indexedFields };
}
