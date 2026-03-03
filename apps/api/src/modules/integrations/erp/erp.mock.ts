import type { IErpAdapter, ErpInvoicePayload, ErpPaymentPayload, ErpSyncResult } from './erp.interface.js';

export class MockErpAdapter implements IErpAdapter {
  async pushInvoice(payload: ErpInvoicePayload): Promise<ErpSyncResult> {
    const result: ErpSyncResult = {
      success: true,
      erpReference: `ERP-INV-${payload.invoiceNumber}`,
      glPostingId: `GL-${Date.now()}`,
      syncedAt: new Date(),
    };
    console.log('[MockERP] Invoice pushed:', { invoiceNumber: payload.invoiceNumber, erpReference: result.erpReference });
    return result;
  }

  async pushPayment(payload: ErpPaymentPayload): Promise<ErpSyncResult> {
    const result: ErpSyncResult = {
      success: true,
      erpReference: `ERP-PAY-${payload.reference}`,
      syncedAt: new Date(),
    };
    console.log('[MockERP] Payment pushed:', { paymentId: payload.paymentId, erpReference: result.erpReference });
    return result;
  }

  async ping(): Promise<boolean> {
    return true;
  }
}
