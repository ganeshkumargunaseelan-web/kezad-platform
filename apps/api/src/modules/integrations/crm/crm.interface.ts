/**
 * CRM Adapter Interface — Dynamics 365 compatible.
 * Switch between mock and real by setting CRM_ADAPTER env var.
 */

export interface CrmCustomer {
  externalId: string;
  companyName: string;
  email: string;
  phone?: string;
  address?: string;
  status: 'active' | 'inactive';
  syncedAt: string;
}

export interface ICrmAdapter {
  /** Push customer data to CRM, returns external CRM ID */
  syncCustomer(customer: {
    id: string;
    customerCode: string;
    companyName: string;
    email: string;
    phone?: string;
  }): Promise<CrmCustomer>;

  /** Pull customer data from CRM by external ID */
  getCustomer(externalId: string): Promise<CrmCustomer | null>;

  /** Update customer status in CRM */
  updateCustomerStatus(externalId: string, status: 'active' | 'inactive'): Promise<void>;

  /** Health check */
  ping(): Promise<boolean>;
}
