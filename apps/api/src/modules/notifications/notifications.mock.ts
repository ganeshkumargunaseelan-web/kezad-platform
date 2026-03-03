/**
 * Mock Notification Adapter
 * Logs to console + stores in DB.
 * Swap to real provider (SendGrid, Twilio, Firebase) via NOTIFICATION_ADAPTER env var.
 */
import type { INotificationAdapter, SendNotificationOptions, NotificationResult } from './notifications.interface.js';

export class MockNotificationAdapter implements INotificationAdapter {
  async send(options: SendNotificationOptions): Promise<NotificationResult> {
    const result: NotificationResult = {
      success: true,
      externalId: `mock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      sentAt: new Date(),
    };

    console.log('[MockNotification] Notification sent:', {
      channel: options.channel,
      recipientId: options.recipientId,
      subject: options.subject ?? '(no subject)',
      bodyPreview: options.body.slice(0, 120),
      externalId: result.externalId,
    });

    return result;
  }

  async sendBulk(options: SendNotificationOptions[]): Promise<NotificationResult[]> {
    return Promise.all(options.map((o) => this.send(o)));
  }

  async ping(): Promise<boolean> {
    return true;
  }
}
