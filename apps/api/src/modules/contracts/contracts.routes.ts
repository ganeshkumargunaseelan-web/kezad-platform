import type { FastifyInstance } from 'fastify';
import { CreateContractSchema, ContractFilterSchema, SubmitNominatedQtySchema } from '@kezad/types';
import { buildSuccessResponse } from '../../lib/errors.js';
import { ContractsService } from './contracts.service.js';

export default async function contractsRoutes(fastify: FastifyInstance): Promise<void> {
  const service = new ContractsService(fastify.db);

  fastify.get('/', {
    preHandler: [fastify.authenticate],
    schema: { tags: ['contracts'], summary: 'List contracts' },
  }, async (req, reply) => {
    const rawFilter = ContractFilterSchema.parse(req.query);
    // Customers can only see their own contracts
    const filter = req.user.role === 'CUSTOMER'
      ? { ...rawFilter, customerId: req.user.customerId ?? undefined }
      : rawFilter;
    const result = await service.list(filter);
    return reply.send(buildSuccessResponse(result.data, result.meta));
  });

  fastify.get('/:id', {
    preHandler: [fastify.authenticate],
    schema: { tags: ['contracts'], summary: 'Get contract details' },
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const cacheKey = `contracts:${id}`;

    const cached = await fastify.cache.get(cacheKey);
    if (cached) return reply.send(buildSuccessResponse(cached));

    const result = await service.findById(id);
    await fastify.cache.set(cacheKey, result, 120); // 2 min TTL
    return reply.send(buildSuccessResponse(result));
  });

  fastify.post('/', {
    preHandler: [fastify.authorize(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'OPERATOR'])],
    schema: { tags: ['contracts'], summary: 'Create new contract (all 4 utility types)' },
  }, async (req, reply) => {
    const input = CreateContractSchema.parse(req.body);
    const result = await service.create(input, req.user.sub);
    await fastify.cache.del('reports:kpi-dashboard'); // KPI counts change
    return reply.status(201).send(buildSuccessResponse(result));
  });

  fastify.post('/:id/activate', {
    preHandler: [fastify.authorize(['SUPER_ADMIN', 'ADMIN', 'MANAGER'])],
    schema: { tags: ['contracts'], summary: 'Activate a contract (must be PENDING_APPROVAL)' },
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    await service.activate(id, req.user.sub);
    await fastify.cache.del(`contracts:${id}`);
    await fastify.cache.del('reports:kpi-dashboard');
    return reply.send(buildSuccessResponse({ message: 'Contract activated' }));
  });

  fastify.post('/:id/terminate', {
    preHandler: [fastify.authorize(['SUPER_ADMIN', 'ADMIN', 'MANAGER'])],
    schema: { tags: ['contracts'], summary: 'Terminate a contract' },
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { reason } = req.body as { reason: string };
    await service.terminate(id, reason, req.user.sub);
    await fastify.cache.del(`contracts:${id}`);
    await fastify.cache.del('reports:kpi-dashboard');
    return reply.send(buildSuccessResponse({ message: 'Contract terminated' }));
  });

  // Gas-specific: Nominated Quantity
  fastify.post('/:id/nominated-quantity', {
    preHandler: [fastify.authenticate],
    schema: { tags: ['contracts'], summary: 'Submit nominated quantity for gas contract' },
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const input = SubmitNominatedQtySchema.parse(req.body);
    const result = await service.submitNominatedQuantity(id, input, req.user.sub);
    return reply.status(201).send(buildSuccessResponse(result));
  });

  // Gas-specific: Year-end reconciliation
  fastify.post('/:id/year-end-reconciliation', {
    preHandler: [fastify.authorize(['SUPER_ADMIN', 'ADMIN', 'MANAGER'])],
    schema: { tags: ['contracts'], summary: 'Calculate gas year-end wash-up/wash-down' },
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { periodYear, totalBilledAmount } = req.body as { periodYear: number; totalBilledAmount: string };
    const result = await service.calculateYearEndReconciliation(id, periodYear, totalBilledAmount);
    return reply.send(buildSuccessResponse(result));
  });
}
