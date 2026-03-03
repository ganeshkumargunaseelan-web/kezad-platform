/**
 * Payment Gateway Adapter Interface
 * Provided by KEZAD — swap implementation via PAYMENT_ADAPTER env var.
 */

export interface PaymentInitiatePayload {
  invoiceId: string;
  invoiceNumber: string;
  customerId: string;
  amount: string;
  currency: string;
  description: string;
  returnUrl: string;
  webhookUrl?: string;
  metadata?: Record<string, string>;
}

export interface PaymentResult {
  success: boolean;
  transactionId?: string;
  paymentUrl?: string;   // redirect URL for hosted payment page
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'REFUNDED';
  paidAmount?: string;
  paidAt?: Date;
  errorCode?: string;
  errorMessage?: string;
}

export interface RefundPayload {
  transactionId: string;
  amount: string;
  reason: string;
}

export interface IPaymentAdapter {
  initiatePayment(payload: PaymentInitiatePayload): Promise<PaymentResult>;
  getPaymentStatus(transactionId: string): Promise<PaymentResult>;
  processRefund(payload: RefundPayload): Promise<PaymentResult>;
  verifyWebhookSignature(payload: string, signature: string): boolean;
  ping(): Promise<boolean>;
}
