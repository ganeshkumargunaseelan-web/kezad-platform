/**
 * Notification Adapter Factory
 * Reads NOTIFICATION_ADAPTER env var to return the correct implementation.
 * Adding a new provider = new class + one case here.
 */
import { env } from '../../config/env.js';
import type { INotificationAdapter } from './notifications.interface.js';
import { MockNotificationAdapter } from './notifications.mock.js';

let instance: INotificationAdapter | null = null;

export function getNotificationAdapter(): INotificationAdapter {
  if (instance) return instance;

  switch (env.NOTIFICATION_ADAPTER) {
    case 'mock':
    default:
      instance = new MockNotificationAdapter();
  }

  return instance;
}
