/**
 * Payment Service — orchestrates payment initiation, status polling,
 * and invoice allocation using the payment adapter (mock/stripe/etc).
 */
import type { PrismaClient } from '@kezad/database';
import { NotFoundError, BusinessRuleError } from '../../lib/errors.js';
import { getPaymentAdapter } from '../integrations/payment/payment.factory.js';
import { Decimal, toDecimal } from '@kezad/utils';

interface InitiatePaymentInput {
  invoiceId: string;
  method: string;
  returnUrl?: string;
}

export class PaymentService {
  constructor(private readonly db: PrismaClient) {}

  async initiatePayment(input: InitiatePaymentInput, userId: string) {
    const invoice = await this.db.invoice.findFirst({
      where: { id: input.invoiceId, deletedAt: null },
      include: { contract: { select: { customerId: true, contractNumber: true } } },
    });
    if (!invoice) throw new NotFoundError('Invoice', input.invoiceId);

    const payableStatuses = ['SENT', 'OVERDUE', 'PARTIALLY_PAID'];
    if (!payableStatuses.includes(invoice.status)) {
      throw new BusinessRuleError(
        `Invoice status '${invoice.status}' is not eligible for payment. Must be one of: ${payableStatuses.join(', ')}`,
      );
    }

    const outstanding = toDecimal(invoice.outstandingAmount.toString());
    if (outstanding.lte(0)) {
      throw new BusinessRuleError('Invoice has no outstanding balance');
    }

    // Generate unique payment reference
    const count = await this.db.payment.count();
    const paymentRef = `PAY-${Date.now().toString(36).toUpperCase()}-${String(count + 1).padStart(6, '0')}`;

    // Call payment adapter
    const adapter = getPaymentAdapter();
    const adapterResult = await adapter.initiatePayment({
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      customerId: invoice.contract.customerId,
      amount: outstanding.toFixed(6),
      currency: invoice.currency,
      description: `Payment for invoice ${invoice.invoiceNumber}`,
      returnUrl: input.returnUrl ?? 'http://localhost:3001/payments/result',
    });

    // Persist payment record
    const payment = await this.db.payment.create({
      data: {
        invoiceId: invoice.id,
        paymentRef,
        amount: outstanding.toFixed(6),
        currency: invoice.currency,
        method: input.method,
        status: 'PENDING',
        gatewayRef: adapterResult.transactionId ?? null,
        gatewayResponse: adapterResult as object,
      },
    });

    return {
      paymentId: payment.id,
      paymentRef: payment.paymentRef,
      transactionId: adapterResult.transactionId,
      paymentUrl: adapterResult.paymentUrl,
      status: payment.status,
      amount: payment.amount.toString(),
      currency: payment.currency,
    };
  }

  async getPaymentStatus(paymentId: string) {
    const payment = await this.db.payment.findUnique({
      where: { id: paymentId },
      include: { invoice: { select: { invoiceNumber: true, status: true } } },
    });
    if (!payment) throw new NotFoundError('Payment', paymentId);

    // Already terminal — return immediately
    if (['COMPLETED', 'FAILED', 'REFUNDED'].includes(payment.status)) {
      return {
        paymentId: payment.id,
        paymentRef: payment.paymentRef,
        status: payment.status,
        amount: payment.amount.toString(),
        currency: payment.currency,
        method: payment.method,
        paidAt: payment.paidAt,
        invoiceNumber: payment.invoice.invoiceNumber,
        invoiceStatus: payment.invoice.status,
      };
    }

    // Poll the adapter for latest status
    if (payment.gatewayRef) {
      const adapter = getPaymentAdapter();
      const adapterResult = await adapter.getPaymentStatus(payment.gatewayRef);

      if (adapterResult.status !== payment.status) {
        const updated = await this.db.payment.update({
          where: { id: paymentId },
          data: {
            status: adapterResult.status as 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REFUNDED',
            paidAt: adapterResult.paidAt ?? null,
            gatewayResponse: adapterResult as object,
          },
        });

        if (adapterResult.status === 'COMPLETED') {
          await this.allocatePaymentToInvoice(paymentId);
        }

        // Re-fetch to get updated invoice status
        const refreshed = await this.db.payment.findUnique({
          where: { id: paymentId },
          include: { invoice: { select: { invoiceNumber: true, status: true } } },
        });

        return {
          paymentId: updated.id,
          paymentRef: updated.paymentRef,
          status: updated.status,
          amount: updated.amount.toString(),
          currency: updated.currency,
          method: updated.method,
          paidAt: updated.paidAt,
          invoiceNumber: refreshed?.invoice.invoiceNumber,
          invoiceStatus: refreshed?.invoice.status,
          errorCode: adapterResult.errorCode,
          errorMessage: adapterResult.errorMessage,
        };
      }
    }

    return {
      paymentId: payment.id,
      paymentRef: payment.paymentRef,
      status: payment.status,
      amount: payment.amount.toString(),
      currency: payment.currency,
      method: payment.method,
      paidAt: payment.paidAt,
      invoiceNumber: payment.invoice.invoiceNumber,
      invoiceStatus: payment.invoice.status,
    };
  }

  async confirmPayment(paymentId: string) {
    const payment = await this.db.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new NotFoundError('Payment', paymentId);
    if (payment.status !== 'PENDING') {
      throw new BusinessRuleError(`Payment is already ${payment.status}`);
    }

    await this.db.payment.update({
      where: { id: paymentId },
      data: { status: 'COMPLETED', paidAt: new Date() },
    });

    await this.allocatePaymentToInvoice(paymentId);

    return this.getPaymentStatus(paymentId);
  }

  private async allocatePaymentToInvoice(paymentId: string) {
    const payment = await this.db.payment.findUnique({
      where: { id: paymentId },
      include: { invoice: true },
    });
    if (!payment || !payment.invoice) return;

    const invoice = payment.invoice;
    const paymentAmount = toDecimal(payment.amount.toString());
    const currentPaid = toDecimal(invoice.paidAmount.toString());
    const totalAmount = toDecimal(invoice.totalAmount.toString());

    const newPaidAmount = currentPaid.plus(paymentAmount);
    const newOutstanding = Decimal.max(new Decimal(0), totalAmount.minus(newPaidAmount));

    let newStatus = invoice.status;
    if (newOutstanding.isZero()) {
      newStatus = 'PAID';
    } else if (newPaidAmount.gt(0)) {
      newStatus = 'PARTIALLY_PAID';
    }

    await this.db.invoice.update({
      where: { id: invoice.id },
      data: {
        paidAmount: newPaidAmount.toFixed(6),
        outstandingAmount: newOutstanding.toFixed(6),
        status: newStatus as 'PAID' | 'PARTIALLY_PAID',
      },
    });

    await this.db.payment.update({
      where: { id: paymentId },
      data: { allocatedAt: new Date() },
    });
  }
}
