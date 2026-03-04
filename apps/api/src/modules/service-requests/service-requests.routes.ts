import type { FastifyInstance } from 'fastify';
import { buildSuccessResponse } from '../../lib/errors.js';

export default async function serviceRequestsRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /service-requests — list (admin sees all, customer sees own)
  fastify.get('/', {
    preHandler: [fastify.authenticate],
    schema: { tags: ['service-requests'], summary: 'List service requests' },
  }, async (req, reply) => {
    const q = req.query as { status?: string; requestType?: string; limit?: string; cursor?: string };
    const limit = Math.min(Number(q.limit ?? 20), 100);

    const where: Record<string, unknown> = {};
    if (q.status) where.status = q.status;
    if (q.requestType) where.requestType = q.requestType;

    // Customers only see their own requests
    if (req.user.role === 'CUSTOMER') {
      where.customerId = req.user.customerId ?? undefined;
    }

    const items = await fastify.db.serviceRequest.findMany({
      where,
      include: {
        customer: { select: { id: true, companyName: true, customerCode: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(q.cursor ? { cursor: { id: q.cursor }, skip: 1 } : {}),
    });

    const hasMore = items.length > limit;
    const data = items.slice(0, limit);
    const nextCursor = hasMore ? data[data.length - 1]?.id : undefined;

    return reply.send(buildSuccessResponse(data, { total: data.length, hasMore, nextCursor }));
  });

  // GET /service-requests/:id — get single
  fastify.get('/:id', {
    preHandler: [fastify.authenticate],
    schema: { tags: ['service-requests'], summary: 'Get service request details' },
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const sr = await fastify.db.serviceRequest.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, companyName: true, customerCode: true } },
      },
    });
    if (!sr) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Service request not found' } });
    }
    // Customers can only view their own
    if (req.user.role === 'CUSTOMER' && req.user.customerId !== sr.customerId) {
      return reply.status(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } });
    }
    return reply.send(buildSuccessResponse(sr));
  });

  // POST /service-requests — create (customer)
  fastify.post('/', {
    preHandler: [fastify.authenticate],
    schema: { tags: ['service-requests'], summary: 'Create service request' },
  }, async (req, reply) => {
    const body = req.body as { requestType: string; subject: string; description: string };
    const count = await fastify.db.serviceRequest.count();
    const requestNumber = `SR-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const sr = await fastify.db.serviceRequest.create({
      data: {
        requestNumber,
        customerId: req.user.customerId ?? '',
        requestType: body.requestType as any,
        subject: body.subject,
        description: body.description,
        slaDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
    return reply.status(201).send(buildSuccessResponse(sr));
  });

  // PATCH /service-requests/:id — update status/assign
  fastify.patch('/:id', {
    preHandler: [fastify.authorize(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'OPERATOR'])],
    schema: { tags: ['service-requests'], summary: 'Update service request (assign, close, escalate)' },
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = req.body as { status?: string; assignedTo?: string; resolutionNote?: string };
    const data: Record<string, unknown> = {};
    if (body.status) data.status = body.status;
    if (body.assignedTo !== undefined) data.assignedTo = body.assignedTo;
    if (body.resolutionNote) data.resolutionNote = body.resolutionNote;
    if (body.status === 'RESOLVED') data.resolvedAt = new Date();

    const sr = await fastify.db.serviceRequest.update({ where: { id }, data });
    return reply.send(buildSuccessResponse(sr));
  });
}
