import type { AcademicResourceRepository } from '../domain/repository.interface.js';
import type { EventBus } from '@college-hub/core';

export interface SearchIndexerJobData {
  resourceId: string;
  collegeId: string;
}

export class SearchIndexerWorker {
  private indexedDocumentIds = new Set<string>();

  constructor(
    private resourceRepo: AcademicResourceRepository,
    private eventBus: EventBus
  ) {}

  public async process(job: SearchIndexerJobData): Promise<{ resourceId: string; indexed: boolean }> {
    const resource = await this.resourceRepo.findById(job.resourceId, job.collegeId);
    if (!resource) {
      return { resourceId: job.resourceId, indexed: false };
    }

    this.indexedDocumentIds.add(resource.id);

    await this.eventBus.publish('ResourceSearchIndexed', {
      eventId: `evt-idx-${Date.now()}`,
      eventType: 'ResourceSearchIndexed',
      aggregateId: resource.id,
      collegeId: job.collegeId,
      timestamp: new Date().toISOString(),
      payload: { resourceId: resource.id, title: resource.slug }
    });

    return { resourceId: resource.id, indexed: true };
  }

  public isIndexed(resourceId: string): boolean {
    return this.indexedDocumentIds.has(resourceId);
  }
}
