/**
 * Prisma client plugin — singleton with connection pooling and audit middleware.
 */
import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { PrismaClient } from '@kezad/database';
import { requestContext } from './context.js';

declare module 'fastify' {
  interface FastifyInstance {
    db: PrismaClient;
  }
}

async function databasePlugin(fastify: FastifyInstance): Promise<void> {
  const prisma = new PrismaClient({
    log:
      process.env['NODE_ENV'] === 'development'
        ? ['query', 'info', 'warn', 'error']
        : ['warn', 'error'],
  });

  // ─── Audit log middleware ──────────────────────────────────────────────────
  // Automatically logs all mutating operations to audit_logs table.
  // The userId is injected via AsyncLocalStorage from the request context.
  prisma.$use(async (params, next) => {
    const result = await next(params);

    const auditableModels = [
      'Contract', 'Invoice', 'Tariff', 'Customer', 'User',
      'GasContractDetail', 'WorkflowInstance', 'BillingRun',
    ];

    if (
      auditableModels.includes(params.model ?? '') &&
      ['create', 'update', 'delete', 'updateMany', 'deleteMany'].includes(params.action)
    ) {
      try {
        const ctx = requestContext.getStore();
        await prisma.auditLog.create({
          data: {
            action: params.action.toUpperCase() as 'CREATE' | 'UPDATE' | 'DELETE',
            entityType: params.model ?? 'Unknown',
            entityId:
              (result as { id?: string })?.id ??
              params.args?.where?.id ??
              'batch',
            userId: ctx?.userId ?? null,
            ipAddress: ctx?.ip ?? null,
            userAgent: ctx?.userAgent ?? null,
            newValues: params.action !== 'delete' ? (result as object) : undefined,
          },
        });
      } catch {
        // Audit log failure should never crash the main operation
      }
    }

    return result;
  });

  await prisma.$connect();
  fastify.log.info('✅ Database connected');

  fastify.decorate('db', prisma);

  fastify.addHook('onClose', async () => {
    await prisma.$disconnect();
    fastify.log.info('Database disconnected');
  });
}

export default fp(databasePlugin, { name: 'database' });
