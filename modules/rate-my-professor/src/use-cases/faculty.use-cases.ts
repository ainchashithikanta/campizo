import { randomUUID } from 'node:crypto';
import type { EventBus } from '@college-hub/core';
import type { ReviewRepository } from '../domain/repository.interface.js';
import { assertFacultyCanRespond } from '../domain/invariants.js';
import { EntityNotFoundError } from '../errors/application-errors.js';

export class AddFacultyResponseUseCase {
  constructor(
    private readonly reviewRepo: ReviewRepository,
    private readonly eventBus: EventBus
  ) {}

  public async execute(params: {
    reviewId: string;
    professorUserId: string;
    collegeId: string;
    responseText: string;
  }): Promise<{ responseId: string }> {
    const review = await this.reviewRepo.findById(params.reviewId, params.collegeId);
    if (!review) {
      throw new EntityNotFoundError('Review', params.reviewId);
    }

    assertFacultyCanRespond(0);

    const responseId = randomUUID();

    await this.eventBus.publish('FacultyResponded', {
      eventId: randomUUID(),
      eventName: 'FacultyResponded',
      collegeId: params.collegeId,
      aggregateId: params.reviewId,
      timestamp: new Date(),
      payload: {
        responseId,
        reviewId: params.reviewId,
        professorId: review.professorId
      }
    });

    return { responseId };
  }
}

export class UpdateFacultyResponseUseCase {
  constructor(private readonly eventBus: EventBus) {}

  public async execute(params: {
    responseId: string;
    professorUserId: string;
    collegeId: string;
    responseText: string;
  }): Promise<{ responseId: string }> {
    await this.eventBus.publish('FacultyResponseUpdated', {
      eventId: randomUUID(),
      eventName: 'FacultyResponseUpdated',
      collegeId: params.collegeId,
      aggregateId: params.responseId,
      timestamp: new Date(),
      payload: {
        responseId: params.responseId,
        responseText: params.responseText
      }
    });

    return { responseId: params.responseId };
  }
}
