import type { FastifyInstance } from 'fastify';
import { buildSuccessResponse } from '../../lib/errors.js';

export default async function auditLogRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /audit-log
  fastify.get('/', {
    preHandler: [fastify.authorize(['SUPER_ADMIN', 'ADMIN', 'MANAGER'])],
    schema: { tags: ['audit-log'], summary: 'List audit log entries' },
  }, async (req, reply) => {
    const q = req.query as {
      entityType?: string;
      entityId?: string;
      action?: string;
      limit?: string;
      cursor?: string;
    };
    const limit = Math.min(Number(q.limit ?? 20), 100);

    const where: Record<string, unknown> = {};
    if (q.entityType) where.entityType = q.entityType;
    if (q.entityId) where.entityId = q.entityId;
    if (q.action) where.action = q.action;

    const items = await fastify.db.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(q.cursor ? { cursor: { id: q.cursor }, skip: 1 } : {}),
    });

    const hasMore = items.length > limit;
    const data = items.slice(0, limit);
    const nextCursor = hasMore ? data[data.length - 1]?.id : undefined;

    return reply.send(buildSuccessResponse(data, { total: data.length, hasMore, nextCursor }));
  });
}
