import { FastifyRequest, FastifyReply } from 'fastify';
import { MarketplaceUseCases } from '../use-cases/marketplace.use-cases.js';
import { MarketplaceQueries } from '../queries/marketplace.queries.js';
import { handleHttpError } from '../errors/http-error-handler.js';

export class ReservationController {
  constructor(
    private useCases: MarketplaceUseCases,
    private queries: MarketplaceQueries
  ) {}

  async getReservationStatus(request: FastifyRequest<{ Params: { reservationId: string } }>, reply: FastifyReply) {
    try {
      const collegeId = (request.headers['x-college-id'] as string) || 'college-stanford-001';
      const status = await this.queries.getReservationStatus(request.params.reservationId, collegeId);
      if (!status) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'RESERVATION_NOT_FOUND',
            message: 'Reservation not found.',
            timestamp: new Date().toISOString()
          }
        });
      }
      return reply.status(200).send({ success: true, data: status });
    } catch (err) {
      handleHttpError(err, request, reply);
    }
  }

  async completeReservation(request: FastifyRequest<{ Params: { reservationId: string } }>, reply: FastifyReply) {
    try {
      const collegeId = (request.headers['x-college-id'] as string) || 'college-stanford-001';
      const sellerUserId = (request.headers['x-user-id'] as string) || 'user-seller-101';

      const listing = await this.useCases.completeReservation(request.params.reservationId, collegeId, sellerUserId);
      return reply.status(200).send({ success: true, data: listing });
    } catch (err) {
      handleHttpError(err, request, reply);
    }
  }
}
