/**
 * Real CRM Adapter — Microsoft Dynamics 365 via Dataverse REST API.
 * Activated when CRM_ADAPTER=dynamics365 in environment.
 */
import type { ICrmAdapter, CrmCustomer } from './crm.interface.js';
import { withRetry, CircuitBreaker } from '../../../lib/retry.js';
import { ExternalServiceError } from '../../../lib/errors.js';
import { env } from '../../../config/env.js';

export class Dynamics365CrmAdapter implements ICrmAdapter {
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;
  private readonly circuitBreaker = new CircuitBreaker(5, 30000);

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && this.tokenExpiry && this.tokenExpiry > new Date()) {
      return this.accessToken;
    }

    const response = await fetch(
      `https://login.microsoftonline.com/${env.D365_TENANT_ID}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: env.D365_CLIENT_ID ?? '',
          client_secret: env.D365_CLIENT_SECRET ?? '',
          scope: `${env.D365_ENVIRONMENT_URL}/.default`,
          grant_type: 'client_credentials',
        }),
      },
    );

    if (!response.ok) {
      throw new ExternalServiceError('CRM', `Token acquisition failed: ${response.statusText}`);
    }

    const data = (await response.json()) as { access_token: string; expires_in: number };
    this.accessToken = data.access_token;
    this.tokenExpiry = new Date(Date.now() + (data.expires_in - 60) * 1000);
    return this.accessToken;
  }

  private async request<T>(method: string, path: string, body?: object): Promise<T> {
    return this.circuitBreaker.execute(() =>
      withRetry(
        async () => {
          const token = await this.getAccessToken();
          const response = await fetch(`${env.D365_ENVIRONMENT_URL}/api/data/v9.2/${path}`, {
            method,
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
              'OData-MaxVersion': '4.0',
              'OData-Version': '4.0',
              Prefer: 'return=representation',
            },
            body: body ? JSON.stringify(body) : undefined,
          });

          if (!response.ok) {
            const error = await response.text();
            throw new ExternalServiceError('CRM', `D365 API error ${response.status}: ${error}`);
          }

          return response.json() as T;
        },
        {
          maxAttempts: 3,
          onRetry: (attempt, error, delay) =>
            console.warn(`[D365 CRM] Retry ${attempt} after ${delay}ms: ${error.message}`),
        },
      ),
    );
  }

  async syncCustomer(customer: {
    id: string;
    customerCode: string;
    companyName: string;
    email: string;
    phone?: string;
  }): Promise<CrmCustomer> {
    const d365Customer = await this.request<{ accountid: string; name: string }>('POST', 'accounts', {
      name: customer.companyName,
      emailaddress1: customer.email,
      telephone1: customer.phone,
      description: `KEZAD Customer Code: ${customer.customerCode}`,
      kezad_customercode: customer.customerCode,
    });

    return {
      externalId: d365Customer.accountid,
      companyName: d365Customer.name,
      email: customer.email,
      phone: customer.phone,
      status: 'active',
      syncedAt: new Date().toISOString(),
    };
  }

  async getCustomer(externalId: string): Promise<CrmCustomer | null> {
    try {
      const data = await this.request<{ accountid: string; name: string; emailaddress1: string }>(
        'GET',
        `accounts(${externalId})?$select=accountid,name,emailaddress1,statecode`,
      );
      return {
        externalId: data.accountid,
        companyName: data.name,
        email: data.emailaddress1,
        status: 'active',
        syncedAt: new Date().toISOString(),
      };
    } catch {
      return null;
    }
  }

  async updateCustomerStatus(externalId: string, status: 'active' | 'inactive'): Promise<void> {
    await this.request('PATCH', `accounts(${externalId})`, {
      statecode: status === 'active' ? 0 : 1,
    });
  }

  async ping(): Promise<boolean> {
    try {
      await this.request('GET', 'WhoAmI');
      return true;
    } catch {
      return false;
    }
  }
}
