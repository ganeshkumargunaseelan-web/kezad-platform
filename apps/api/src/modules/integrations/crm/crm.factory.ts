/**
 * CRM Adapter Factory — reads CRM_ADAPTER env var and returns correct implementation.
 * Zero code changes needed to switch from mock to real.
 */
import type { ICrmAdapter } from './crm.interface.js';
import { MockCrmAdapter } from './crm.mock.js';
import { Dynamics365CrmAdapter } from './crm.dynamics365.js';
import { env } from '../../../config/env.js';

let instance: ICrmAdapter | null = null;

export function getCrmAdapter(): ICrmAdapter {
  if (!instance) {
    switch (env.CRM_ADAPTER) {
      case 'dynamics365':
        instance = new Dynamics365CrmAdapter();
        break;
      case 'mock':
      default:
        instance = new MockCrmAdapter();
        break;
    }
    console.info(`[CRM] Adapter initialized: ${env.CRM_ADAPTER}`);
  }
  return instance;
}
