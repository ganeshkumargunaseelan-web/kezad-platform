/**
 * Notifications Service
 * Creates DB records + dispatches via configured adapter.
 * All notification history persisted for audit.
 */
import type { FastifyInstance } from 'fastify';
import type { NotificationChannel } from './notifications.interface.js';
import { getNotificationAdapter } from './notifications.factory.js';
import { buildPaginatedResponse, buildPrismaCursor } from '@kezad/utils';

export interface SendNotificationInput {
  recipientId: string;
  recipientEmail?: string;
  recipientPhone?: string;
  channel: NotificationChannel;
  subject?: string;
  body: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

export class NotificationsService {
  constructor(private readonly fastify: FastifyInstance) {}

  async send(input: SendNotificationInput): Promise<{ notification: object; result: object }> {
    const adapter = getNotificationAdapter();

    const result = await adapter.send({
      recipientId: input.recipientId,
      recipientEmail: input.recipientEmail,
      recipientPhone: input.recipientPhone,
      channel: input.channel,
      subject: input.subject,
      body: input.body,
      metadata: input.metadata,
    });

    // Persist to DB
    const notification = await this.fastify.db.notification.create({
      data: {
        userId: input.recipientId,
        type: 'SYSTEM_ALERT',
        channel: input.channel,
        title: input.subject ?? '',
        body: input.body,
        isRead: false,
        sentAt: result.sentAt,
        metadata: {
          ...(input.metadata ?? {}),
          ...(input.entityType ? { entityType: input.entityType } : {}),
          ...(input.entityId ? { entityId: input.entityId } : {}),
        } as never,
      },
    });

    return { notification, result } as { notification: object; result: object };
  }

  async sendBulk(inputs: SendNotificationInput[]): Promise<Array<{ notification: object; result: object }>> {
    return Promise.all(inputs.map((i) => this.send(i)));
  }

  async list(userId: string, query: { limit?: number; cursor?: string; unreadOnly?: boolean }): Promise<{ data: object[]; meta: object }> {
    const limit = query.limit ?? 20;

    const where = {
      userId,
      ...(query.unreadOnly ? { isRead: false } : {}),
    };

    const [items, total] = await Promise.all([
      this.fastify.db.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit + 1,
        ...buildPrismaCursor(query.cursor),
      }),
      this.fastify.db.notification.count({ where }),
    ]);

    return buildPaginatedResponse(items, limit, (n) => n.id, total) as { data: object[]; meta: object };
  }

  async markAsRead(id: string, userId: string): Promise<unknown> {
    return this.fastify.db.notification.update({
      where: { id, userId },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: string) {
    return this.fastify.db.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.fastify.db.notification.count({ where: { userId, isRead: false } });
  }

  // ─── System notifications triggered by business events ────────────────────

  async notifyInvoiceGenerated(userId: string, invoiceNumber: string, amount: string, dueDate: string): Promise<unknown> {
    return this.send({
      recipientId: userId,
      channel: 'IN_APP',
      subject: `Invoice ${invoiceNumber} Generated`,
      body: `Your invoice ${invoiceNumber} for ${amount} AED is due on ${dueDate}. Please log in to view and pay.`,
      entityType: 'INVOICE',
    });
  }

  async notifyPaymentOverdue(userId: string, invoiceNumber: string, overdueDays: number): Promise<unknown> {
    return this.send({
      recipientId: userId,
      channel: 'IN_APP',
      subject: `Payment Overdue — ${invoiceNumber}`,
      body: `Invoice ${invoiceNumber} is ${overdueDays} days overdue. Please make payment immediately to avoid service disruption.`,
      entityType: 'INVOICE',
    });
  }

  async notifyWorkflowAction(userId: string, workflowType: string, action: string, entityRef: string): Promise<unknown> {
    return this.send({
      recipientId: userId,
      channel: 'IN_APP',
      subject: `Workflow Update — ${workflowType}`,
      body: `Your ${workflowType} request (${entityRef}) has been ${action}.`,
      entityType: 'WORKFLOW',
    });
  }

  async notifyConsumptionAnomaly(userId: string, meterId: string, utilityType: string, deviation: number): Promise<unknown> {
    return this.send({
      recipientId: userId,
      channel: 'IN_APP',
      subject: `High Consumption Alert — ${utilityType}`,
      body: `Unusual consumption detected on meter ${meterId} (${deviation.toFixed(1)}% above normal for ${utilityType}). Please review.`,
      entityType: 'METER',
      entityId: meterId,
    });
  }
}
