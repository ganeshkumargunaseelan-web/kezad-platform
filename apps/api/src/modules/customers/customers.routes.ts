import type { FastifyInstance } from 'fastify';
import { CreateCustomerSchema, UpdateCustomerSchema, CustomerFilterSchema } from '@kezad/types';
import { buildSuccessResponse } from '../../lib/errors.js';
import { CustomersService } from './customers.service.js';

export default async function customersRoutes(fastify: FastifyInstance): Promise<void> {
  const service = new CustomersService(fastify.db);

  // GET /customers
  fastify.get('/', {
    preHandler: [fastify.authorize(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'OPERATOR'])],
    schema: { tags: ['customers'], summary: 'List customers with pagination and filters' },
  }, async (req, reply) => {
    const filter = CustomerFilterSchema.parse(req.query);
    const result = await service.list(filter);
    return reply.send(buildSuccessResponse(result.data, result.meta));
  });

  // GET /customers/:id
  fastify.get('/:id', {
    preHandler: [fastify.authenticate],
    schema: { tags: ['customers'], summary: 'Get customer by ID' },
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    // Customers can only view their own data
    if (req.user.role === 'CUSTOMER' && req.user.customerId !== id) {
      return reply.status(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } });
    }

    const cacheKey = `customers:${id}`;
    const cached = await fastify.cache.get(cacheKey);
    if (cached) return reply.send(buildSuccessResponse(cached));

    const result = await service.findById(id);
    await fastify.cache.set(cacheKey, result, 120); // 2 min TTL
    return reply.send(buildSuccessResponse(result));
  });

  // POST /customers
  fastify.post('/', {
    preHandler: [fastify.authorize(['SUPER_ADMIN', 'ADMIN', 'OPERATOR'])],
    schema: { tags: ['customers'], summary: 'Create new customer' },
  }, async (req, reply) => {
    const input = CreateCustomerSchema.parse(req.body);
    const result = await service.create(input, req.user.sub);
    await fastify.cache.del('reports:kpi-dashboard'); // customer count changes
    return reply.status(201).send(buildSuccessResponse(result));
  });

  // PATCH /customers/:id
  fastify.patch('/:id', {
    preHandler: [fastify.authorize(['SUPER_ADMIN', 'ADMIN', 'OPERATOR'])],
    schema: { tags: ['customers'], summary: 'Update customer details' },
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const input = UpdateCustomerSchema.parse(req.body);
    const result = await service.update(id, input);
    await fastify.cache.del(`customers:${id}`); // bust detail cache
    return reply.send(buildSuccessResponse(result));
  });

  // DELETE /customers/:id
  fastify.delete('/:id', {
    preHandler: [fastify.authorize(['SUPER_ADMIN', 'ADMIN'])],
    schema: { tags: ['customers'], summary: 'Soft-delete customer (checks for active contracts)' },
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    await service.softDelete(id);
    await fastify.cache.del(`customers:${id}`);
    await fastify.cache.del('reports:kpi-dashboard');
    return reply.status(204).send();
  });

  // POST /customers/:id/crm-sync
  fastify.post('/:id/crm-sync', {
    preHandler: [fastify.authorize(['SUPER_ADMIN', 'ADMIN'])],
    schema: { tags: ['customers'], summary: 'Trigger CRM sync for customer' },
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const result = await service.triggerCrmSync(id);
    return reply.send(buildSuccessResponse(result));
  });
}
