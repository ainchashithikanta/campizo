/**
 * Placement Guidance Module — Fastify REST Controllers
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { PlacementUseCases } from '../application/use-cases.js';
import {
  SubmitExperienceSchema,
  ExperienceFilterQuerySchema,
  CreateQuestionSchema,
  QuestionFilterQuerySchema,
  CreateDiscussionSchema,
  CreateReplySchema,
  VoteSchema
} from './validators.js';

export class PlacementController {
  constructor(private readonly useCases: PlacementUseCases) {}

  async submitExperience(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    const collegeId = (req.headers['x-college-id'] as string) || 'college_stanford_001';
    const authorId = (req.headers['x-user-id'] as string) || 'usr_anonymous';
    const body = SubmitExperienceSchema.parse(req.body);

    const result = await this.useCases.submitExperience({ ...body, collegeId, authorId });
    reply
      .status(201)
      .send({ success: true, data: result, metadata: { timestamp: new Date().toISOString(), collegeId } });
  }

  async listExperiences(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    const collegeId = (req.headers['x-college-id'] as string) || 'college_stanford_001';
    const query = ExperienceFilterQuerySchema.parse(req.query);

    const result = await this.useCases.listExperiences({ ...query, collegeId });
    reply
      .status(200)
      .send({ success: true, data: result, metadata: { timestamp: new Date().toISOString(), collegeId } });
  }

  async getCompanyBySlug(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    const collegeId = (req.headers['x-college-id'] as string) || 'college_stanford_001';
    const studentProfileId = (req.headers['x-user-id'] as string) || 'usr_me';
    const { slug } = req.params as { slug: string };

    const result = await this.useCases.getCompanyBySlug(slug, collegeId, studentProfileId);
    if (!result) {
      reply
        .status(404)
        .send({ success: false, error: { code: 'COMPANY_NOT_FOUND', message: `Company '${slug}' not found` } });
      return;
    }
    reply
      .status(200)
      .send({ success: true, data: result, metadata: { timestamp: new Date().toISOString(), collegeId } });
  }

  async getCompanyStatistics(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    const collegeId = (req.headers['x-college-id'] as string) || 'college_stanford_001';
    const { slug } = req.params as { slug: string };

    const stats = await this.useCases.getCompanyStatistics(slug, collegeId);
    if (!stats) {
      reply.status(404).send({
        success: false,
        error: { code: 'COMPANY_NOT_FOUND', message: `Company '${slug}' statistics not found` }
      });
      return;
    }
    reply.status(200).send({ success: true, data: stats, metadata: { timestamp: new Date().toISOString() } });
  }

  async getExperienceById(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    const collegeId = (req.headers['x-college-id'] as string) || 'college_stanford_001';
    const studentProfileId = (req.headers['x-user-id'] as string) || 'usr_me';
    const { id } = req.params as { id: string };

    const result = await this.useCases.getExperienceById(id, collegeId, studentProfileId);
    if (!result) {
      reply.status(404).send({
        success: false,
        error: { code: 'EXPERIENCE_NOT_FOUND', message: `Placement experience '${id}' not found` }
      });
      return;
    }
    reply
      .status(200)
      .send({ success: true, data: result, metadata: { timestamp: new Date().toISOString(), collegeId } });
  }

  async getExperienceVersions(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { id } = req.params as { id: string };
    const versions = await this.useCases.getExperienceVersions(id);
    reply.status(200).send({ success: true, data: versions, metadata: { timestamp: new Date().toISOString() } });
  }

  // Question Bank Endpoints
  async createQuestion(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    const collegeId = (req.headers['x-college-id'] as string) || 'college_stanford_001';
    const authorId = (req.headers['x-user-id'] as string) || 'usr_anonymous';
    const body = CreateQuestionSchema.parse(req.body);

    const question = await this.useCases.createQuestion({ ...body, collegeId, authorId });
    reply.status(201).send({ success: true, data: question });
  }

  async getQuestionById(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    const collegeId = (req.headers['x-college-id'] as string) || 'college_stanford_001';
    const { id } = req.params as { id: string };

    const question = await this.useCases.getQuestionById(id, collegeId);
    if (!question) {
      reply
        .status(404)
        .send({ success: false, error: { code: 'QUESTION_NOT_FOUND', message: `Question '${id}' not found` } });
      return;
    }
    reply.status(200).send({ success: true, data: question });
  }

  async listQuestions(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    const collegeId = (req.headers['x-college-id'] as string) || 'college_stanford_001';
    const query = QuestionFilterQuerySchema.parse(req.query);

    const result = await this.useCases.listQuestions({ ...query, collegeId });
    reply.status(200).send({ success: true, data: result });
  }

  async markQuestionHelpful(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    const collegeId = (req.headers['x-college-id'] as string) || 'college_stanford_001';
    const { id } = req.params as { id: string };

    const result = await this.useCases.markQuestionHelpful(id, collegeId);
    reply.status(200).send({ success: true, data: result });
  }

  async reportQuestion(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    const collegeId = (req.headers['x-college-id'] as string) || 'college_stanford_001';
    const { id } = req.params as { id: string };

    const result = await this.useCases.reportQuestion(id, collegeId);
    reply.status(200).send({ success: true, data: result });
  }

  // Community Q&A Endpoints
  async createDiscussion(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    const collegeId = (req.headers['x-college-id'] as string) || 'college_stanford_001';
    const authorId = (req.headers['x-user-id'] as string) || 'usr_anonymous';
    const body = CreateDiscussionSchema.parse(req.body);

    const thread = await this.useCases.createDiscussionThread({ ...body, collegeId, authorId });
    reply.status(201).send({ success: true, data: thread });
  }

  async getDiscussionById(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    const collegeId = (req.headers['x-college-id'] as string) || 'college_stanford_001';
    const { id } = req.params as { id: string };

    const thread = await this.useCases.getDiscussionById(id, collegeId);
    if (!thread) {
      reply
        .status(404)
        .send({ success: false, error: { code: 'THREAD_NOT_FOUND', message: `Discussion thread '${id}' not found` } });
      return;
    }
    reply.status(200).send({ success: true, data: thread });
  }

  async listDiscussions(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    const collegeId = (req.headers['x-college-id'] as string) || 'college_stanford_001';
    const query = req.query as { topic?: string; companySlug?: string; query?: string };

    const result = await this.useCases.listDiscussions({ ...query, collegeId });
    reply.status(200).send({ success: true, data: result });
  }

  async createReply(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    const authorId = (req.headers['x-user-id'] as string) || 'usr_anonymous';
    const { id: threadId } = req.params as { id: string };
    const body = CreateReplySchema.parse(req.body);

    const rep = await this.useCases.createDiscussionReply({ threadId, authorId, content: body.content });
    reply.status(201).send({ success: true, data: rep });
  }

  async voteDiscussion(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    const collegeId = (req.headers['x-college-id'] as string) || 'college_stanford_001';
    const { id } = req.params as { id: string };
    const body = VoteSchema.parse(req.body);

    const thread = await this.useCases.voteDiscussion(id, collegeId, body.direction);
    reply.status(200).send({ success: true, data: thread });
  }

  async voteReply(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { id } = req.params as { id: string };
    const body = VoteSchema.parse(req.body);
    const { threadId } = (req.body as { threadId?: string }) || {};

    const rep = await this.useCases.voteReply(id, threadId || 'disc_sys_design_01', body.direction);
    reply.status(200).send({ success: true, data: rep });
  }

  // Admin Roadmaps Endpoint
  async getAdminRoadmaps(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    const collegeId = (req.headers['x-college-id'] as string) || 'college_stanford_001';
    const roadmaps = await this.useCases.getAdminRoadmaps(collegeId);
    reply.status(200).send({ success: true, data: roadmaps });
  }

  async saveBookmark(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    const collegeId = (req.headers['x-college-id'] as string) || 'college_stanford_001';
    const studentProfileId = (req.headers['x-user-id'] as string) || 'usr_me';
    const body = req.body as { targetType: 'COMPANY' | 'EXPERIENCE' | 'QUESTION' | 'THREAD'; targetId: string };

    const bookmark = await this.useCases.bookmarkItem(studentProfileId, body.targetType, body.targetId, collegeId);
    reply.status(201).send({ success: true, data: bookmark });
  }

  async removeBookmark(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    const collegeId = (req.headers['x-college-id'] as string) || 'college_stanford_001';
    const studentProfileId = (req.headers['x-user-id'] as string) || 'usr_me';
    const { targetType, targetId } = req.params as {
      targetType: 'COMPANY' | 'EXPERIENCE' | 'QUESTION' | 'THREAD';
      targetId: string;
    };

    const removed = await this.useCases.removeBookmark(studentProfileId, targetType, targetId, collegeId);
    reply.status(200).send({ success: true, data: { removed } });
  }

  async getUserBookmarks(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    const collegeId = (req.headers['x-college-id'] as string) || 'college_stanford_001';
    const studentProfileId = (req.headers['x-user-id'] as string) || 'usr_me';

    const bookmarks = await this.useCases.getUserBookmarks(studentProfileId, collegeId);
    reply.status(200).send({ success: true, data: bookmarks });
  }

  async getTrendingCompanies(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    const collegeId = (req.headers['x-college-id'] as string) || 'college_stanford_001';
    const trending = await this.useCases.getTrendingCompanies(collegeId, 5);
    reply.status(200).send({ success: true, data: trending });
  }

  async markHelpful(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    const collegeId = (req.headers['x-college-id'] as string) || 'college_stanford_001';
    const studentProfileId = (req.headers['x-user-id'] as string) || 'usr_me';
    const { id } = req.params as { id: string };

    const result = await this.useCases.markHelpful(id, collegeId, studentProfileId);
    if (!result) {
      reply.status(404).send({
        success: false,
        error: { code: 'EXPERIENCE_NOT_FOUND', message: `Placement experience '${id}' not found` }
      });
      return;
    }
    reply
      .status(200)
      .send({ success: true, data: result, metadata: { timestamp: new Date().toISOString(), collegeId } });
  }

  async reportExperience(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    const collegeId = (req.headers['x-college-id'] as string) || 'college_stanford_001';
    const body = (req.body as { id: string; reason?: string }) || {};

    if (!body.id) {
      reply.status(400).send({ success: false, error: { code: 'INVALID_INPUT', message: 'Missing experience id' } });
      return;
    }
    const result = await this.useCases.reportExperience(body.id, collegeId);
    if (!result) {
      reply.status(404).send({
        success: false,
        error: { code: 'EXPERIENCE_NOT_FOUND', message: `Placement experience '${body.id}' not found` }
      });
      return;
    }
    reply
      .status(200)
      .send({ success: true, data: result, metadata: { timestamp: new Date().toISOString(), collegeId } });
  }
}
