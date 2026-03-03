import { env } from '../../../config/env.js';
import type { IBmsAdapter } from './bms.interface.js';
import { MockBmsAdapter } from './bms.mock.js';

let instance: IBmsAdapter | null = null;

export function getBmsAdapter(): IBmsAdapter {
  if (instance) return instance;

  switch (env.BMS_ADAPTER) {
    case 'modbus':
      throw new Error('Modbus BMS adapter not yet wired — set BMS_ADAPTER=mock for development');
    case 'mock':
    default:
      instance = new MockBmsAdapter();
  }

  return instance;
}
