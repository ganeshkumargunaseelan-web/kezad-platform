import type { FastifyInstance } from 'fastify';
import { ReportParamsSchema } from '@kezad/types';
import { buildSuccessResponse } from '../../lib/errors.js';

export default async function reportsRoutes(fastify: FastifyInstance): Promise<void> {
  // ─── Operational Reports ──────────────────────────────────────────────────

  fastify.get('/usage', {
    preHandler: [fastify.authenticate],
    schema: { tags: ['reports'], summary: 'Usage report by utility type and customer' },
  }, async (req, reply) => {
    const params = ReportParamsSchema.parse(req.query);
    const where = {
      periodStartUtc: { gte: new Date(params.from) },
      periodEndUtc: { lte: new Date(params.to) },
    };

    const aggregated = await fastify.db.meterDataPoint.groupBy({
      by: ['meterId', 'unit'],
      where,
      _sum: { rawValue: true },
      _count: true,
    });

    return reply.send(buildSuccessResponse(aggregated));
  });

  fastify.get('/billing-summary', {
    preHandler: [fastify.authorize(['SUPER_ADMIN', 'ADMIN', 'MANAGER'])],
    schema: { tags: ['reports'], summary: 'Billing revenue summary report' },
  }, async (req, reply) => {
    const params = ReportParamsSchema.parse(req.query);
    const cacheKey = `reports:billing-summary:${params.from}:${params.to}`;

    const cached = await fastify.cache.get(cacheKey);
    if (cached) return reply.send(buildSuccessResponse(cached));

    const summary = await fastify.db.invoice.groupBy({
      by: ['utilityType', 'status'],
      where: {
        deletedAt: null,
        periodFrom: { gte: new Date(params.from) },
        periodTo: { lte: new Date(params.to) },
      },
      _sum: { totalAmount: true, paidAmount: true },
      _count: true,
    });

    await fastify.cache.set(cacheKey, summary, 300); // 5 min TTL
    return reply.send(buildSuccessResponse(summary));
  });

  fastify.get('/ar-aging', {
    preHandler: [fastify.authorize(['SUPER_ADMIN', 'ADMIN', 'MANAGER'])],
    schema: { tags: ['reports'], summary: 'Accounts receivable aging analysis (IFRS-aligned)' },
  }, async (req, reply) => {
    const cacheKey = 'reports:ar-aging';
    const cached = await fastify.cache.get(cacheKey);
    if (cached) return reply.send(buildSuccessResponse(cached));

    const now = new Date();
    const buckets = [
      { label: 'Current', minDays: 0, maxDays: 30 },
      { label: '31-60 days', minDays: 31, maxDays: 60 },
      { label: '61-90 days', minDays: 61, maxDays: 90 },
      { label: '91+ days', minDays: 91, maxDays: 99999 },
    ];

    const result = await Promise.all(
      buckets.map(async (bucket) => {
        const from = new Date(now);
        from.setDate(from.getDate() - bucket.maxDays);
        const to = new Date(now);
        to.setDate(to.getDate() - bucket.minDays);

        const agg = await fastify.db.invoice.aggregate({
          where: {
            status: { in: ['APPROVED', 'SENT', 'OVERDUE', 'PARTIALLY_PAID'] },
            dueDate: { gte: from, lte: to },
            deletedAt: null,
          },
          _sum: { outstandingAmount: true },
          _count: true,
        });

        return {
          bucket: bucket.label,
          count: agg._count,
          outstandingAmount: String(agg._sum.outstandingAmount ?? '0'),
        };
      }),
    );

    await fastify.cache.set(cacheKey, result, 120); // 2 min TTL — AR changes frequently
    return reply.send(buildSuccessResponse(result));
  });

  fastify.get('/vat-compliance', {
    preHandler: [fastify.authorize(['SUPER_ADMIN', 'ADMIN', 'MANAGER'])],
    schema: { tags: ['reports'], summary: 'UAE VAT / FTA compliance report' },
  }, async (req, reply) => {
    const params = ReportParamsSchema.parse(req.query);

    const invoices = await fastify.db.invoice.findMany({
      where: {
        deletedAt: null,
        issueDate: { gte: new Date(params.from), lte: new Date(params.to) },
        status: { notIn: ['DRAFT', 'VOID'] },
      },
      select: {
        invoiceNumber: true,
        utilityType: true,
        issueDate: true,
        subtotal: true,
        vatPct: true,
        vatAmount: true,
        totalAmount: true,
        currency: true,
        contract: { select: { customer: { select: { vatRegistrationNo: true, companyName: true } } } },
      },
    });

    return reply.send(buildSuccessResponse(invoices));
  });

  fastify.get('/kpi-dashboard', {
    preHandler: [fastify.authorize(['SUPER_ADMIN', 'ADMIN', 'MANAGER'])],
    schema: { tags: ['reports'], summary: 'Operational KPI dashboard data' },
  }, async (_req, reply) => {
    const cacheKey = 'reports:kpi-dashboard';
    const cached = await fastify.cache.get(cacheKey);
    if (cached) return reply.send(buildSuccessResponse(cached));

    const [
      totalCustomers,
      activeContracts,
      pendingInvoices,
      pendingWorkflows,
      openServiceRequests,
    ] = await Promise.all([
      fastify.db.customer.count({ where: { isActive: true, deletedAt: null } }),
      fastify.db.contract.count({ where: { status: 'ACTIVE', deletedAt: null } }),
      fastify.db.invoice.count({ where: { status: { in: ['DRAFT', 'PENDING_APPROVAL'] }, deletedAt: null } }),
      fastify.db.workflowInstance.count({ where: { status: { in: ['PENDING', 'IN_PROGRESS'] } } }),
      fastify.db.serviceRequest.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
    ]);

    const data = { totalCustomers, activeContracts, pendingInvoices, pendingWorkflows, openServiceRequests };
    await fastify.cache.set(cacheKey, data, 60); // 60 sec TTL — dashboard refreshes every 60s
    return reply.send(buildSuccessResponse(data));
  });
}
