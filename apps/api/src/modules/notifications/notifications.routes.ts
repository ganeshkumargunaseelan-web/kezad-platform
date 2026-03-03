import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { NotificationsService } from './notifications.service.js';
import { buildSuccessResponse } from '../../lib/errors.js';

const PaginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
  unreadOnly: z.coerce.boolean().optional().default(false),
});

export default async function notificationsRoutes(fastify: FastifyInstance): Promise<void> {
  const svc = new NotificationsService(fastify);

  // GET /notifications — list for current user
  fastify.get('/', {
    preHandler: [fastify.authenticate],
    schema: { tags: ['notifications'], summary: 'List notifications for current user' },
  }, async (req, reply) => {
    const query = PaginationSchema.parse(req.query);
    const result = await svc.list(req.user!.sub, query);
    return reply.send(buildSuccessResponse(result.data, result.meta));
  });

  // GET /notifications/unread-count
  fastify.get('/unread-count', {
    preHandler: [fastify.authenticate],
    schema: { tags: ['notifications'], summary: 'Get unread notification count' },
  }, async (req, reply) => {
    const count = await svc.getUnreadCount(req.user!.sub);
    return reply.send(buildSuccessResponse({ count }));
  });

  // PATCH /notifications/:id/read
  fastify.patch('/:id/read', {
    preHandler: [fastify.authenticate],
    schema: { tags: ['notifications'], summary: 'Mark a notification as read' },
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const notification = await svc.markAsRead(id, req.user!.sub);
    return reply.send(buildSuccessResponse(notification));
  });

  // PATCH /notifications/read-all
  fastify.patch('/read-all', {
    preHandler: [fastify.authenticate],
    schema: { tags: ['notifications'], summary: 'Mark all notifications as read' },
  }, async (req, reply) => {
    const { count } = await svc.markAllAsRead(req.user!.sub);
    return reply.send(buildSuccessResponse({ markedRead: count }));
  });

  // POST /notifications/send (admin use — send manual notification)
  fastify.post('/send', {
    preHandler: [fastify.authorize(['SUPER_ADMIN', 'ADMIN'])],
    schema: { tags: ['notifications'], summary: 'Send manual notification to a user' },
  }, async (req, reply) => {
    const body = z.object({
      recipientId: z.string(),
      channel: z.enum(['EMAIL', 'SMS', 'PUSH', 'IN_APP']),
      subject: z.string().optional(),
      body: z.string().min(1),
    }).parse(req.body);

    const result = await svc.send({
      recipientId: body.recipientId,
      channel: body.channel,
      subject: body.subject,
      body: body.body,
    });

    return reply.status(201).send(buildSuccessResponse(result.notification));
  });
}
