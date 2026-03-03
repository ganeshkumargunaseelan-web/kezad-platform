import type { FastifyInstance } from 'fastify';
import { SubmitWorkflowSchema, WorkflowActionSchema } from '@kezad/types';
import { buildSuccessResponse } from '../../lib/errors.js';
import { WorkflowsService } from './workflows.service.js';

export default async function workflowRoutes(fastify: FastifyInstance): Promise<void> {
  const service = new WorkflowsService(fastify.db);

  fastify.get('/', {
    preHandler: [fastify.authenticate],
    schema: { tags: ['workflows'], summary: 'List workflow instances (inbox)' },
  }, async (req, reply) => {
    const q = req.query as Record<string, string>;
    const result = await service.list({
      workflowType: q.workflowType,
      status: q.status,
      entityType: q.entityType,
      limit: Number(q.limit ?? 20),
      cursor: q.cursor,
    });
    return reply.send(buildSuccessResponse(result.data, result.meta));
  });

  fastify.get('/:id', {
    preHandler: [fastify.authenticate],
    schema: { tags: ['workflows'], summary: 'Get workflow instance details + history' },
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    return reply.send(buildSuccessResponse(await service.findById(id)));
  });

  fastify.post('/', {
    preHandler: [fastify.authenticate],
    schema: { tags: ['workflows'], summary: 'Submit new workflow instance' },
  }, async (req, reply) => {
    const input = SubmitWorkflowSchema.parse(req.body);
    const result = await service.submit(input, req.user.sub);
    return reply.status(201).send(buildSuccessResponse(result));
  });

  fastify.post('/:id/action', {
    preHandler: [fastify.authenticate],
    schema: { tags: ['workflows'], summary: 'Approve / Reject / Send-back / Cancel workflow' },
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const input = WorkflowActionSchema.parse(req.body);
    const result = await service.processAction(id, input, req.user.sub, req.user.role);
    return reply.send(buildSuccessResponse(result));
  });
}
