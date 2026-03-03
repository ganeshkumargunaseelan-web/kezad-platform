/**
 * Request context — propagates per-request data (userId, IP, userAgent)
 * through async boundaries via AsyncLocalStorage.
 * Used by the Prisma audit log middleware to record the acting user.
 */
import { AsyncLocalStorage } from 'node:async_hooks';

export interface RequestContext {
  userId?: string;
  ip?: string;
  userAgent?: string;
}

export const requestContext = new AsyncLocalStorage<RequestContext>();
