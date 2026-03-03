import type { FastifyInstance } from 'fastify';
import { CreateTariffSchema, TriggerBillingRunSchema, BillingAdjustmentSchema, CreateCreditNoteSchema } from '@kezad/types';
import { buildSuccessResponse } from '../../lib/errors.js';
import { BillingService } from './billing.service.js';

export default async function billingRoutes(fastify: FastifyInstance): Promise<void> {
  const service = new BillingService(fastify.db);

  // ─── Tariffs ──────────────────────────────────────────────────────────────

  fastify.get('/tariffs', {
    preHandler: [fastify.authenticate],
    schema: { tags: ['billing'], summary: 'List all tariffs' },
  }, async (req, reply) => {
    const { utilityType } = req.query as { utilityType?: string };
    const cacheKey = `billing:tariffs:${utilityType ?? 'all'}`;

    const cached = await fastify.cache.get(cacheKey);
    if (cached) return reply.send(buildSuccessResponse(cached));

    const result = await service.listTariffs(utilityType);
    await fastify.cache.set(cacheKey, result, 600); // 10 min — tariffs rarely change
    return reply.send(buildSuccessResponse(result));
  });

  fastify.post('/tariffs', {
    preHandler: [fastify.authorize(['SUPER_ADMIN', 'ADMIN', 'MANAGER'])],
    schema: { tags: ['billing'], summary: 'Create new tariff (version-controlled)' },
  }, async (req, reply) => {
    const input = CreateTariffSchema.parse(req.body);
    const result = await service.createTariff(input, req.user.sub);
    await fastify.cache.invalidatePattern('billing:tariffs:*'); // bust tariff cache on create
    return reply.status(201).send(buildSuccessResponse(result));
  });

  // ─── Billing Runs ─────────────────────────────────────────────────────────

  fastify.get('/runs', {
    preHandler: [fastify.authorize(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'OPERATOR'])],
    schema: { tags: ['billing'], summary: 'List billing runs' },
  }, async (req, reply) => {
    const q = req.query as { limit?: string };
    const limit = Number(q.limit ?? 20);
    const runs = await fastify.db.billingRun.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
    });
    const hasMore = runs.length > limit;
    return reply.send(buildSuccessResponse(runs.slice(0, limit), { total: runs.length, hasMore }));
  });

  fastify.post('/runs', {
    preHandler: [fastify.authorize(['SUPER_ADMIN', 'ADMIN', 'MANAGER'])],
    schema: { tags: ['billing'], summary: 'Trigger batch billing run (≥10,000 invoices/cycle)' },
  }, async (req, reply) => {
    const input = TriggerBillingRunSchema.parse(req.body);
    const result = await service.triggerBillingRun(input, req.user.sub);
    return reply.status(202).send(buildSuccessResponse(result));
  });

  // ─── Invoices ─────────────────────────────────────────────────────────────

  fastify.get('/invoices', {
    preHandler: [fastify.authenticate],
    schema: { tags: ['billing'], summary: 'List invoices' },
  }, async (req, reply) => {
    const q = req.query as { contractId?: string; status?: string; cursor?: string; limit?: string };
    const filter = {
      contractId: q.contractId,
      status: q.status,
      cursor: q.cursor,
      limit: Number(q.limit ?? 20),
    };
    const result = await service.listInvoices(filter);
    return reply.send(buildSuccessResponse(result.data, result.meta));
  });

  fastify.get('/invoices/:id', {
    preHandler: [fastify.authenticate],
    schema: { tags: ['billing'], summary: 'Get invoice details' },
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const result = await service.getInvoice(id);
    return reply.send(buildSuccessResponse(result));
  });

  fastify.get('/invoices/:id/pdf', {
    preHandler: [fastify.authenticate],
    schema: { tags: ['billing'], summary: 'Download invoice as PDF (stub)' },
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const invoice = await service.getInvoice(id);
    const text = `KEZAD INVOICE\n==============\nInvoice No: ${invoice.invoiceNumber}\nStatus: ${invoice.status}\nTotal: ${invoice.totalAmount} ${invoice.currency}\nDue Date: ${invoice.dueDate}\n`;
    return reply
      .header('Content-Type', 'application/pdf')
      .header('Content-Disposition', `attachment; filename="${invoice.invoiceNumber}.pdf"`)
      .send(Buffer.from(text));
  });

  // ─── Invoice Adjustments ───────────────────────────────────────────────────

  fastify.post('/invoices/:id/adjust', {
    preHandler: [fastify.authorize(['SUPER_ADMIN', 'ADMIN', 'MANAGER'])],
    schema: { tags: ['billing'], summary: 'Apply manual adjustment to invoice' },
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const input = BillingAdjustmentSchema.parse(req.body);
    const result = await service.adjustInvoice(id, input, req.user.sub);
    return reply.status(201).send(buildSuccessResponse(result));
  });

  // ─── Credit Notes ──────────────────────────────────────────────────────────

  fastify.post('/credit-notes', {
    preHandler: [fastify.authorize(['SUPER_ADMIN', 'ADMIN', 'MANAGER'])],
    schema: { tags: ['billing'], summary: 'Issue credit note against an invoice' },
  }, async (req, reply) => {
    const input = CreateCreditNoteSchema.parse(req.body);
    const result = await service.createCreditNote(input, req.user.sub);
    return reply.status(201).send(buildSuccessResponse(result));
  });

  fastify.get('/invoices/:id/adjustments', {
    preHandler: [fastify.authorize(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'OPERATOR'])],
    schema: { tags: ['billing'], summary: 'List adjustments for an invoice' },
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const result = await service.listAdjustments(id);
    return reply.send(buildSuccessResponse(result));
  });
}
