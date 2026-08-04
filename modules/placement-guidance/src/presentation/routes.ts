/**
 * Placement Guidance Module — Fastify Route Plugin
 * Mounts REST API endpoints for Placement Knowledge Base & Community Q&A.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PlacementController } from './controller.js';
import { PlacementUseCases } from '../application/use-cases.js';
import { InMemoryPlacementRepository } from '../infrastructure/repositories/in-memory-placement.repository.js';

export async function placementRoutesPlugin(fastify: FastifyInstance, options?: { useCases?: PlacementUseCases }) {
  const repo = new InMemoryPlacementRepository();
  const useCases = options?.useCases || new PlacementUseCases(repo);
  const controller = new PlacementController(useCases);

  // Experience Endpoints
  fastify.post('/placements/experience', (req: FastifyRequest, reply: FastifyReply) =>
    controller.submitExperience(req, reply)
  );
  fastify.get('/placements', (req: FastifyRequest, reply: FastifyReply) => controller.listExperiences(req, reply));
  fastify.get('/placements/company/:slug', (req: FastifyRequest, reply: FastifyReply) =>
    controller.getCompanyBySlug(req, reply)
  );
  fastify.get('/placements/company/:slug/statistics', (req: FastifyRequest, reply: FastifyReply) =>
    controller.getCompanyStatistics(req, reply)
  );
  fastify.get('/placements/experience/:id', (req: FastifyRequest, reply: FastifyReply) =>
    controller.getExperienceById(req, reply)
  );
  fastify.get('/placements/experience/:id/versions', (req: FastifyRequest, reply: FastifyReply) =>
    controller.getExperienceVersions(req, reply)
  );

  // Question Bank Endpoints
  fastify.get('/placements/questions', (req: FastifyRequest, reply: FastifyReply) =>
    controller.listQuestions(req, reply)
  );
  fastify.get('/placements/questions/search', (req: FastifyRequest, reply: FastifyReply) =>
    controller.listQuestions(req, reply)
  );
  fastify.get('/placements/questions/:id', (req: FastifyRequest, reply: FastifyReply) =>
    controller.getQuestionById(req, reply)
  );
  fastify.post('/placements/questions', (req: FastifyRequest, reply: FastifyReply) =>
    controller.createQuestion(req, reply)
  );
  fastify.patch('/placements/questions/:id/helpful', (req: FastifyRequest, reply: FastifyReply) =>
    controller.markQuestionHelpful(req, reply)
  );
  fastify.post('/placements/questions/report', (req: FastifyRequest, reply: FastifyReply) =>
    controller.reportQuestion(req, reply)
  );

  // Community Q&A Endpoints
  fastify.post('/placements/discussions', (req: FastifyRequest, reply: FastifyReply) =>
    controller.createDiscussion(req, reply)
  );
  fastify.get('/placements/discussions', (req: FastifyRequest, reply: FastifyReply) =>
    controller.listDiscussions(req, reply)
  );
  fastify.get('/placements/discussions/:id', (req: FastifyRequest, reply: FastifyReply) =>
    controller.getDiscussionById(req, reply)
  );
  fastify.post('/placements/discussions/:id/reply', (req: FastifyRequest, reply: FastifyReply) =>
    controller.createReply(req, reply)
  );
  fastify.patch('/placements/discussions/:id/vote', (req: FastifyRequest, reply: FastifyReply) =>
    controller.voteDiscussion(req, reply)
  );
  fastify.patch('/placements/replies/:id/vote', (req: FastifyRequest, reply: FastifyReply) =>
    controller.voteReply(req, reply)
  );

  // Roadmaps & Trending & Bookmarks
  fastify.get('/placements/roadmaps', (req: FastifyRequest, reply: FastifyReply) =>
    controller.getAdminRoadmaps(req, reply)
  );
  fastify.get('/placements/trending', (req: FastifyRequest, reply: FastifyReply) =>
    controller.getTrendingCompanies(req, reply)
  );

  fastify.post('/placements/bookmarks', (req: FastifyRequest, reply: FastifyReply) =>
    controller.saveBookmark(req, reply)
  );
  fastify.delete('/placements/bookmarks/:targetType/:targetId', (req: FastifyRequest, reply: FastifyReply) =>
    controller.removeBookmark(req, reply)
  );
  fastify.get('/placements/bookmarks', (req: FastifyRequest, reply: FastifyReply) =>
    controller.getUserBookmarks(req, reply)
  );

  fastify.patch('/placements/:id/helpful', (req: FastifyRequest, reply: FastifyReply) =>
    controller.markHelpful(req, reply)
  );
  fastify.post('/placements/report', (req: FastifyRequest, reply: FastifyReply) =>
    controller.reportExperience(req, reply)
  );
}
