/**
 * Mock Payment Gateway
 * Simulates real payment flow: initiation → webhook → completion.
 * 90% success rate with realistic response structure.
 */
import type { IPaymentAdapter, PaymentInitiatePayload, PaymentResult, RefundPayload } from './payment.interface.js';

const transactions = new Map<string, PaymentResult>();

export class MockPaymentAdapter implements IPaymentAdapter {
  async initiatePayment(payload: PaymentInitiatePayload): Promise<PaymentResult> {
    const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const result: PaymentResult = {
      success: true,
      transactionId,
      paymentUrl: `https://mock-payment.kezad.ae/pay/${transactionId}`,
      status: 'PENDING',
    };

    transactions.set(transactionId, result);

    // Simulate async payment completion (90% success)
    setTimeout(() => {
      const isSuccess = Math.random() < 0.90;
      const completed: PaymentResult = {
        ...result,
        status: isSuccess ? 'COMPLETED' : 'FAILED',
        paidAmount: isSuccess ? payload.amount : undefined,
        paidAt: isSuccess ? new Date() : undefined,
        errorCode: isSuccess ? undefined : 'INSUFFICIENT_FUNDS',
        errorMessage: isSuccess ? undefined : 'Payment declined — insufficient funds',
      };
      transactions.set(transactionId, completed);
      console.log(`[MockPayment] Transaction ${transactionId}: ${completed.status}`);
    }, 3000);

    console.log('[MockPayment] Payment initiated:', { transactionId, invoiceNumber: payload.invoiceNumber, amount: payload.amount });
    return result;
  }

  async getPaymentStatus(transactionId: string): Promise<PaymentResult> {
    return transactions.get(transactionId) ?? {
      success: false,
      transactionId,
      status: 'FAILED',
      errorCode: 'NOT_FOUND',
      errorMessage: 'Transaction not found',
    };
  }

  async processRefund(payload: RefundPayload): Promise<PaymentResult> {
    const original = transactions.get(payload.transactionId);
    if (!original) {
      return { success: false, status: 'FAILED', errorCode: 'NOT_FOUND', errorMessage: 'Transaction not found' };
    }

    const refundId = `REFUND-${payload.transactionId}`;
    const result: PaymentResult = { success: true, transactionId: refundId, status: 'REFUNDED', paidAmount: payload.amount, paidAt: new Date() };
    transactions.set(refundId, result);
    console.log('[MockPayment] Refund processed:', refundId);
    return result;
  }

  verifyWebhookSignature(_payload: string, _signature: string): boolean {
    // In production: HMAC-SHA256 verification
    return true;
  }

  async ping(): Promise<boolean> {
    return true;
  }
}
