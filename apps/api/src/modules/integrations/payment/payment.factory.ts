import { env } from '../../../config/env.js';
import type { IPaymentAdapter } from './payment.interface.js';
import { MockPaymentAdapter } from './payment.mock.js';

let instance: IPaymentAdapter | null = null;

export function getPaymentAdapter(): IPaymentAdapter {
  if (instance) return instance;

  switch (env.PAYMENT_ADAPTER) {
    // @ts-expect-error future adapter — not yet in env enum
    case 'kezad-gateway':
      throw new Error('KEZAD payment gateway adapter not yet wired — set PAYMENT_ADAPTER=mock for development');
    case 'mock':
    default:
      instance = new MockPaymentAdapter();
  }

  return instance;
}
