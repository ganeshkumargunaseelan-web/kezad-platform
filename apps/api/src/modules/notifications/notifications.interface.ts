/**
 * Notification Adapter Interface
 * Implement this interface for any notification provider (email, SMS, push).
 * Switch providers by setting NOTIFICATION_ADAPTER env var.
 */

export type NotificationChannel = 'EMAIL' | 'SMS' | 'PUSH' | 'IN_APP';

export interface SendNotificationOptions {
  recipientId: string;
  recipientEmail?: string;
  recipientPhone?: string;
  channel: NotificationChannel;
  templateId?: string;
  subject?: string;
  body: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationResult {
  success: boolean;
  externalId?: string;
  error?: string;
  sentAt: Date;
}

export interface INotificationAdapter {
  send(options: SendNotificationOptions): Promise<NotificationResult>;
  sendBulk(options: SendNotificationOptions[]): Promise<NotificationResult[]>;
  ping(): Promise<boolean>;
}
