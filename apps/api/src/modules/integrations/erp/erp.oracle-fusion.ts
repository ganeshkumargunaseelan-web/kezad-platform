/**
 * Oracle Fusion ERP Adapter — Production Implementation
 * Enable by setting ERP_ADAPTER=oracle-fusion in environment.
 */
import { withRetry, CircuitBreaker } from '../../../lib/retry.js';
import { ExternalServiceError } from '../../../lib/errors.js';
import type { IErpAdapter, ErpInvoicePayload, ErpPaymentPayload, ErpSyncResult } from './erp.interface.js';

export class OracleFusionErpAdapter implements IErpAdapter {
  private readonly circuitBreaker = new CircuitBreaker(5, 30_000);
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && this.tokenExpiry && this.tokenExpiry > new Date()) {
      return this.accessToken;
    }

    const baseUrl = process.env['ORACLE_FUSION_BASE_URL'];
    const clientId = process.env['ORACLE_FUSION_CLIENT_ID'];
    const clientSecret = process.env['ORACLE_FUSION_CLIENT_SECRET'];

    if (!baseUrl || !clientId || !clientSecret) {
      throw new ExternalServiceError('oracle-fusion-erp', 'Oracle Fusion ERP credentials not configured');
    }

    const resp = await fetch(`${baseUrl}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'client_credentials', client_id: clientId, client_secret: clientSecret }),
    });

    if (!resp.ok) throw new ExternalServiceError('oracle-fusion-erp', 'Oracle Fusion token refresh failed');
    const data = await resp.json() as { access_token: string; expires_in: number };
    this.accessToken = data.access_token;
    this.tokenExpiry = new Date(Date.now() + (data.expires_in - 60) * 1000);
    return this.accessToken;
  }

  async pushInvoice(payload: ErpInvoicePayload): Promise<ErpSyncResult> {
    return this.circuitBreaker.execute(async () => {
      return withRetry(async () => {
        const token = await this.getAccessToken();
        const baseUrl = process.env['ORACLE_FUSION_BASE_URL'];

        const resp = await fetch(`${baseUrl}/receivables/invoices`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            TransactionNumber: payload.invoiceNumber,
            CustomerId: payload.customerRef,
            TotalAmount: payload.totalAmount,
            TaxAmount: payload.vatAmount,
            Currency: payload.currency,
            TransactionDate: payload.issueDate.toISOString(),
            DueDate: payload.dueDate.toISOString(),
            Lines: payload.lineItems.map((li) => ({
              Description: li.description,
              Quantity: li.quantity,
              UnitPrice: li.unitPrice,
              Amount: li.amount,
              NaturalAccount: li.glCode,
            })),
          }),
        });

        if (!resp.ok) {
          const err = await resp.text();
          throw new ExternalServiceError('oracle-fusion-erp', `Oracle Fusion invoice push failed: ${err}`);
        }

        const data = await resp.json() as { InvoiceId: string; GlPostingId: string };
        return { success: true, erpReference: data.InvoiceId, glPostingId: data.GlPostingId, syncedAt: new Date() };
      }, { maxAttempts: 3, initialDelayMs: 500 });
    });
  }

  async pushPayment(payload: ErpPaymentPayload): Promise<ErpSyncResult> {
    return this.circuitBreaker.execute(async () => {
      return withRetry(async () => {
        const token = await this.getAccessToken();
        const baseUrl = process.env['ORACLE_FUSION_BASE_URL'];

        const resp = await fetch(`${baseUrl}/receivables/receipts`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ReceiptNumber: payload.reference,
            Amount: payload.amount,
            Currency: payload.currency,
            ReceiptDate: payload.paidAt.toISOString(),
            PaymentMethod: payload.method,
            InvoiceNumber: payload.invoiceNumber,
          }),
        });

        if (!resp.ok) throw new ExternalServiceError('oracle-fusion-erp', 'Oracle Fusion payment push failed');
        const data = await resp.json() as { ReceiptId: string };
        return { success: true, erpReference: data.ReceiptId, syncedAt: new Date() };
      }, { maxAttempts: 3, initialDelayMs: 500 });
    });
  }

  async ping(): Promise<boolean> {
    try {
      await this.getAccessToken();
      return true;
    } catch {
      return false;
    }
  }
}
