import { env } from '../../../config/env.js';
import type { IRegulatoryAdapter } from './regulatory.interface.js';
import { MockRegulatoryAdapter } from './regulatory.mock.js';

let instance: IRegulatoryAdapter | null = null;

export function getRegulatoryAdapter(): IRegulatoryAdapter {
  if (instance) return instance;

  switch (env.REGULATORY_ADAPTER) {
    case 'atlp':
      throw new Error('ATLP regulatory adapter not yet wired — set REGULATORY_ADAPTER=mock for development');
    case 'mock':
    default:
      instance = new MockRegulatoryAdapter();
  }

  return instance;
}
