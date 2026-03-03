import type { FastifyInstance } from 'fastify';
import { buildSuccessResponse } from '../../lib/errors.js';

export default async function usersRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/', {
    preHandler: [fastify.authorize(['SUPER_ADMIN', 'ADMIN'])],
    schema: { tags: ['users'], summary: 'List all users' },
  }, async (req, reply) => {
    const users = await fastify.db.user.findMany({
      where: { deletedAt: null },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, department: true, isActive: true, lastLoginAt: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    return reply.send(buildSuccessResponse(users));
  });

  fastify.get('/:id', {
    preHandler: [fastify.authenticate],
    schema: { tags: ['users'], summary: 'Get user by ID' },
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const user = await fastify.db.user.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, department: true, isActive: true },
    });
    if (!user) return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });
    return reply.send(buildSuccessResponse(user));
  });

  fastify.patch('/:id/role', {
    preHandler: [fastify.authorize(['SUPER_ADMIN'])],
    schema: { tags: ['users'], summary: 'Update user role (SUPER_ADMIN only)' },
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { role } = req.body as { role: string };
    await fastify.db.user.update({ where: { id }, data: { role: role as never } });
    return reply.send(buildSuccessResponse({ message: 'Role updated' }));
  });

  fastify.patch('/:id/deactivate', {
    preHandler: [fastify.authorize(['SUPER_ADMIN', 'ADMIN'])],
    schema: { tags: ['users'], summary: 'Deactivate user account' },
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    await fastify.db.user.update({ where: { id }, data: { isActive: false } });
    return reply.status(204).send();
  });
}
