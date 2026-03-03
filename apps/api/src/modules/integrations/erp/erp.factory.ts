import { env } from '../../../config/env.js';
import type { IErpAdapter } from './erp.interface.js';
import { MockErpAdapter } from './erp.mock.js';
import { OracleFusionErpAdapter } from './erp.oracle-fusion.js';

let instance: IErpAdapter | null = null;

export function getErpAdapter(): IErpAdapter {
  if (instance) return instance;

  switch (env.ERP_ADAPTER) {
    case 'oracle_fusion':
      instance = new OracleFusionErpAdapter();
      break;
    case 'mock':
    default:
      instance = new MockErpAdapter();
  }

  return instance;
}
