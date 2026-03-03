/**
 * Mock CRM Adapter — simulates Dynamics 365 behavior.
 * Generates realistic responses. Replace with crm.dynamics365.ts when ready.
 */
import type { ICrmAdapter, CrmCustomer } from './crm.interface.js';

export class MockCrmAdapter implements ICrmAdapter {
  private readonly store = new Map<string, CrmCustomer>();

  async syncCustomer(customer: {
    id: string;
    customerCode: string;
    companyName: string;
    email: string;
    phone?: string;
  }): Promise<CrmCustomer> {
    const externalId = `D365-${customer.customerCode}`;
    const record: CrmCustomer = {
      externalId,
      companyName: customer.companyName,
      email: customer.email,
      phone: customer.phone,
      status: 'active',
      syncedAt: new Date().toISOString(),
    };
    this.store.set(externalId, record);
    console.info(`[MockCRM] Synced customer ${customer.customerCode} → ${externalId}`);
    return record;
  }

  async getCustomer(externalId: string): Promise<CrmCustomer | null> {
    return this.store.get(externalId) ?? null;
  }

  async updateCustomerStatus(externalId: string, status: 'active' | 'inactive'): Promise<void> {
    const record = this.store.get(externalId);
    if (record) {
      record.status = status;
      this.store.set(externalId, record);
    }
    console.info(`[MockCRM] Updated status for ${externalId} → ${status}`);
  }

  async ping(): Promise<boolean> {
    return true;
  }
}
