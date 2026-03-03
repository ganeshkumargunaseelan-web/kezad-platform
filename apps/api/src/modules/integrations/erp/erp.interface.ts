/**
 * ERP Adapter Interface (Oracle Fusion)
 * Handles outbound invoice/payment push + GL posting.
 */

export interface ErpInvoicePayload {
  invoiceId: string;
  invoiceNumber: string;
  customerId: string;
  customerRef: string;
  totalAmount: string;
  vatAmount: string;
  currency: string;
  issueDate: Date;
  dueDate: Date;
  utilityType: string;
  lineItems: ErpInvoiceLineItem[];
}

export interface ErpInvoiceLineItem {
  description: string;
  quantity: string;
  unitPrice: string;
  amount: string;
  glCode?: string;
}

export interface ErpPaymentPayload {
  paymentId: string;
  invoiceId: string;
  invoiceNumber: string;
  amount: string;
  currency: string;
  paidAt: Date;
  method: string;
  reference: string;
}

export interface ErpSyncResult {
  success: boolean;
  erpReference?: string;
  glPostingId?: string;
  error?: string;
  syncedAt: Date;
}

export interface IErpAdapter {
  pushInvoice(payload: ErpInvoicePayload): Promise<ErpSyncResult>;
  pushPayment(payload: ErpPaymentPayload): Promise<ErpSyncResult>;
  ping(): Promise<boolean>;
}
