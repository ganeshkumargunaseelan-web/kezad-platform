import { env } from '../../../config/env.js';
import type { IScadaAdapter } from './scada.interface.js';
import { MockScadaAdapter } from './scada.mock.js';

let instance: IScadaAdapter | null = null;

export function getScadaAdapter(): IScadaAdapter {
  if (instance) return instance;

  switch (env.SCADA_ADAPTER) {
    case 'opcua':
      // Production: import and instantiate OpcUaScadaAdapter
      // instance = new OpcUaScadaAdapter();
      throw new Error('OPC UA SCADA adapter not yet wired — set SCADA_ADAPTER=mock for development');
    case 'mock':
    default:
      instance = new MockScadaAdapter();
  }

  return instance;
}
