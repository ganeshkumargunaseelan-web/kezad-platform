import type { FastifyInstance } from 'fastify';
import { CreateTariffSchema, TriggerBillingRunSchema, BillingAdjustmentSchema, CreateCreditNoteSchema } from '@kezad/types';
import { buildSuccessResponse } from '../../lib/errors.js';
import { BillingService } from './billing.service.js';
import { PaymentService } from './payment.service.js';

export default async function billingRoutes(fastify: FastifyInstance): Promise<void> {
  const service = new BillingService(fastify.db);
  const paymentService = new PaymentService(fastify.db);

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
    schema: { tags: ['billing'], summary: 'Download invoice as printable HTML' },
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const invoice = await service.getInvoice(id);
    const amt = (v: string | number) => `AED ${Number(v).toLocaleString('en-AE', { minimumFractionDigits: 2 })}`;
    const fmtDate = (d: unknown) => d ? new Date(d as string).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Invoice ${invoice.invoiceNumber}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',Arial,sans-serif;color:#1a1a1a;max-width:800px;margin:0 auto;padding:48px 40px}
.header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:40px;padding-bottom:24px;border-bottom:3px solid #0F766E}
.logo{font-size:28px;font-weight:800;color:#0F766E;letter-spacing:1px}.logo img{display:block;margin-bottom:4px}.logo span{color:#64748b;font-weight:400;font-size:14px;display:block;letter-spacing:0}
.inv-title{text-align:right}.inv-title h2{font-size:24px;color:#334155;margin-bottom:4px}.inv-title .num{font-size:15px;color:#0F766E;font-weight:600;font-family:monospace}
.meta{display:grid;grid-template-columns:1fr 1fr;gap:32px;margin-bottom:32px}
.meta-box h4{font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;margin-bottom:8px}
.meta-box p{font-size:13px;line-height:1.6;color:#475569}
.status{display:inline-block;padding:4px 12px;border-radius:20px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px}
.status.PAID{background:#dcfce7;color:#166534}.status.SENT{background:#dbeafe;color:#1e40af}.status.OVERDUE{background:#fef2f2;color:#991b1b}.status.DRAFT{background:#f1f5f9;color:#475569}.status.DISPUTED{background:#fef3c7;color:#92400e}
table{width:100%;border-collapse:collapse;margin:24px 0}th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#94a3b8;padding:10px 12px;border-bottom:2px solid #e2e8f0}
td{padding:12px;font-size:13px;border-bottom:1px solid #f1f5f9;color:#475569}td:last-child{text-align:right;font-weight:600}th:last-child{text-align:right}
.totals{margin-top:16px;display:flex;justify-content:flex-end}.totals-box{width:280px}
.totals-row{display:flex;justify-content:space-between;padding:8px 0;font-size:13px;color:#475569;border-bottom:1px solid #f1f5f9}
.totals-row.grand{border-top:2px solid #0F766E;border-bottom:none;padding:12px 0;font-size:16px;font-weight:700;color:#0F766E}
.footer{margin-top:48px;padding-top:24px;border-top:1px solid #e2e8f0;text-align:center;color:#94a3b8;font-size:11px;line-height:1.8}
@media print{body{padding:20px}@page{margin:1cm}}
</style></head><body>
<div class="header"><div class="logo"><img src="data:image/png;base64,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" alt="KEZAD Group" style="height:40px;margin-bottom:4px"><span>Khalifa Economic Zones Abu Dhabi</span></div><div class="inv-title"><h2>TAX INVOICE</h2><div class="num">${invoice.invoiceNumber}</div></div></div>
<div class="meta">
<div class="meta-box"><h4>Invoice Details</h4><p><strong>Issue Date:</strong> ${fmtDate(invoice.issueDate)}<br><strong>Due Date:</strong> ${fmtDate(invoice.dueDate)}<br><strong>Period:</strong> ${fmtDate(invoice.periodFrom)} – ${fmtDate(invoice.periodTo)}<br><strong>Utility:</strong> ${(invoice.utilityType as string).replace(/_/g, ' ')}<br><strong>Status:</strong> <span class="status ${invoice.status}">${invoice.status}</span></p></div>
<div class="meta-box"><h4>Payment Terms</h4><p><strong>Currency:</strong> ${invoice.currency}<br><strong>VAT Rate:</strong> 5%<br><strong>Payment Method:</strong> Bank Transfer<br><strong>IBAN:</strong> AE12 0000 0000 0000 0000 01</p></div>
</div>
<table><thead><tr><th>Description</th><th>Amount</th></tr></thead><tbody>
<tr><td>${(invoice.utilityType as string).replace(/_/g, ' ')} consumption charges — ${fmtDate(invoice.periodFrom)} to ${fmtDate(invoice.periodTo)}</td><td>${amt(invoice.subtotal)}</td></tr>
</tbody></table>
<div class="totals"><div class="totals-box">
<div class="totals-row"><span>Subtotal</span><span>${amt(invoice.subtotal)}</span></div>
<div class="totals-row"><span>VAT (5%)</span><span>${amt(invoice.vatAmount)}</span></div>
<div class="totals-row grand"><span>Total Due</span><span>${amt(invoice.totalAmount)}</span></div>
${Number(invoice.paidAmount) > 0 ? `<div class="totals-row"><span>Paid</span><span style="color:#166534">(${amt(invoice.paidAmount)})</span></div><div class="totals-row" style="font-weight:700"><span>Outstanding</span><span style="color:${Number(invoice.outstandingAmount) > 0 ? '#991b1b' : '#166534'}">${amt(invoice.outstandingAmount)}</span></div>` : ''}
</div></div>
<div class="footer">KEZAD Utilities Management · Khalifa Economic Zones Abu Dhabi, P.O. Box 54115, Abu Dhabi, UAE<br>TRN: 100000000000001 · Tel: +971 2 000 0000 · Email: billing@kezad.ae<br><br>This is a system-generated invoice. For queries, contact billing@kezad.ae</div>
</body></html>`;
    return reply
      .header('Content-Type', 'text/html; charset=utf-8')
      .send(html);
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

  // ─── Payments ─────────────────────────────────────────────────────────────

  fastify.post('/payments/initiate', {
    preHandler: [fastify.authenticate],
    schema: { tags: ['billing'], summary: 'Initiate payment for an invoice' },
  }, async (req, reply) => {
    const body = req.body as { invoiceId: string; method: string; returnUrl?: string };
    const result = await paymentService.initiatePayment(body, req.user.sub);
    return reply.status(201).send(buildSuccessResponse(result));
  });

  fastify.get('/payments/:paymentId/status', {
    preHandler: [fastify.authenticate],
    schema: { tags: ['billing'], summary: 'Get payment status (polls adapter)' },
  }, async (req, reply) => {
    const { paymentId } = req.params as { paymentId: string };
    const result = await paymentService.getPaymentStatus(paymentId);
    return reply.send(buildSuccessResponse(result));
  });

  fastify.post('/payments/:paymentId/confirm', {
    preHandler: [fastify.authenticate],
    schema: { tags: ['billing'], summary: 'Force-confirm payment (dev/mock)' },
  }, async (req, reply) => {
    const { paymentId } = req.params as { paymentId: string };
    const result = await paymentService.confirmPayment(paymentId);
    return reply.send(buildSuccessResponse(result));
  });
}
