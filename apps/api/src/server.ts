/**
 * KEZAD Platform — Fastify API Server
 * World-class: structured logging, security headers, rate limiting, OpenAPI docs.
 */
import Fastify from 'fastify';
import compress from '@fastify/compress';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import multipart from '@fastify/multipart';
import { requestContext } from './plugins/context.js';

import { env } from './config/env.js';
import { registerErrorHandler } from './middleware/error-handler.js';

// Plugins
import databasePlugin from './plugins/database.js';
import redisPlugin from './plugins/redis.js';
import authPlugin from './plugins/auth.js';

// Route modules
import authRoutes from './modules/auth/auth.routes.js';
import usersRoutes from './modules/users/users.routes.js';
import customersRoutes from './modules/customers/customers.routes.js';
import contractsRoutes from './modules/contracts/contracts.routes.js';
import consumptionRoutes from './modules/consumption/consumption.routes.js';
import billingRoutes from './modules/billing/billing.routes.js';
import workflowRoutes from './modules/workflows/workflows.routes.js';
import reportsRoutes from './modules/reports/reports.routes.js';
import notificationsRoutes from './modules/notifications/notifications.routes.js';
import serviceRequestsRoutes from './modules/service-requests/service-requests.routes.js';
import auditLogRoutes from './modules/audit-log/audit-log.routes.js';

async function buildServer() {
  const fastify = Fastify({
    logger: {
      level: env.LOG_LEVEL,
      ...(env.NODE_ENV === 'development'
        ? { transport: { target: 'pino-pretty', options: { colorize: true } } }
        : {}),
    },
    requestIdHeader: 'x-request-id',
    requestIdLogLabel: 'reqId',
    disableRequestLogging: false,
    trustProxy: true,
    bodyLimit: 1 * 1024 * 1024, // 1 MB — protect against large payload attacks
  });

  // ─── Compression ───────────────────────────────────────────────────────────
  await fastify.register(compress, {
    global: true,
    encodings: ['gzip', 'deflate', 'br'],
    threshold: 1024, // Only compress responses ≥ 1KB
  });

  // ─── Security ──────────────────────────────────────────────────────────────
  await fastify.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        scriptSrc: ["'self'"],
      },
    },
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  });

  await fastify.register(cors, {
    origin:
      env.NODE_ENV === 'production'
        ? [
            'https://customer.kezad.ae',
            'https://portal.kezad.ae',
            'https://kezad-platform.vercel.app',
            'https://kezad-employee-portal.vercel.app',
          ]
        : true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    credentials: true,
  });

  // ─── Rate Limiting ─────────────────────────────────────────────────────────
  await fastify.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    keyGenerator: (req) => req.user?.sub ?? req.ip,
    errorResponseBuilder: () => ({
      success: false,
      error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests. Please slow down.' },
    }),
  });

  // ─── Multipart (file uploads) ──────────────────────────────────────────────
  await fastify.register(multipart, {
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  });

  // ─── OpenAPI / Swagger ─────────────────────────────────────────────────────
  await fastify.register(swagger, {
    openapi: {
      info: {
        title: 'KEZAD Utilities Management API',
        description:
          'Enterprise-grade API for KEZAD Utilities & Facilities Management (KUFM). ' +
          'Manages Gas, Power, Water, and District Cooling for 2,030+ industrial investors.',
        version: '1.0.0',
        contact: { name: 'Intertec Systems LLC', email: 'helpdesk@intertecSys.com' },
      },
      servers: [{ url: `http://localhost:${env.API_PORT}`, description: 'Development' }],
      components: {
        securitySchemes: {
          bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        },
      },
      security: [{ bearerAuth: [] }],
      tags: [
        { name: 'auth', description: 'Authentication & authorization' },
        { name: 'users', description: 'User management' },
        { name: 'customers', description: 'Customer management' },
        { name: 'contracts', description: 'Contract lifecycle management' },
        { name: 'consumption', description: 'Meter data & consumption management' },
        { name: 'billing', description: 'Tariffs, billing runs, invoices' },
        { name: 'workflows', description: 'Approval workflows' },
        { name: 'reports', description: 'Reporting & analytics' },
        { name: 'notifications', description: 'Notifications' },
      ],
    },
  });

  await fastify.register(swaggerUi, {
    routePrefix: '/api/docs',
    uiConfig: { deepLinking: true, displayRequestDuration: true },
    staticCSP: true,
  });

  // ─── Infrastructure plugins ────────────────────────────────────────────────
  await fastify.register(databasePlugin);
  await fastify.register(redisPlugin);
  await fastify.register(authPlugin);

  // ─── Request context (AsyncLocalStorage) ───────────────────────────────────
  // Establishes a per-request async context so Prisma audit middleware
  // can read userId, IP, and userAgent without coupling to Fastify's req object.
  fastify.addHook('onRequest', (req, reply, done) => {
    requestContext.run(
      { userId: undefined, ip: req.ip, userAgent: req.headers['user-agent'] as string },
      done,
    );
  });

  // After authentication runs (preHandler), inject the authenticated userId.
  fastify.addHook('preHandler', (req, reply, done) => {
    if ((req as { user?: { sub?: string } }).user?.sub) {
      const store = requestContext.getStore();
      if (store) store.userId = (req as { user: { sub: string } }).user.sub;
    }
    done();
  });

  // Stamp every response with its request ID for tracing.
  fastify.addHook('onSend', async (req, reply) => {
    reply.header('X-Request-ID', req.id);
  });

  // ─── Error handler ─────────────────────────────────────────────────────────
  registerErrorHandler(fastify);

  // ─── Health check ──────────────────────────────────────────────────────────
  fastify.get('/health', {
    schema: { tags: ['system'], hide: true },
  }, async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: env.NODE_ENV,
    adapters: {
      crm: env.CRM_ADAPTER,
      erp: env.ERP_ADAPTER,
      scada: env.SCADA_ADAPTER,
      bms: env.BMS_ADAPTER,
      regulatory: env.REGULATORY_ADAPTER,
      payment: env.PAYMENT_ADAPTER,
      notifications: env.NOTIFICATION_ADAPTER,
    },
  }));

  // ─── API Routes ────────────────────────────────────────────────────────────
  await fastify.register(authRoutes, { prefix: '/api/v1/auth' });
  await fastify.register(usersRoutes, { prefix: '/api/v1/users' });
  await fastify.register(customersRoutes, { prefix: '/api/v1/customers' });
  await fastify.register(contractsRoutes, { prefix: '/api/v1/contracts' });
  await fastify.register(consumptionRoutes, { prefix: '/api/v1/consumption' });
  await fastify.register(billingRoutes, { prefix: '/api/v1/billing' });
  await fastify.register(workflowRoutes, { prefix: '/api/v1/workflows' });
  await fastify.register(reportsRoutes, { prefix: '/api/v1/reports' });
  await fastify.register(notificationsRoutes, { prefix: '/api/v1/notifications' });
  await fastify.register(serviceRequestsRoutes, { prefix: '/api/v1/service-requests' });
  await fastify.register(auditLogRoutes, { prefix: '/api/v1/audit-log' });

  return fastify;
}

// ─── Bootstrap ──────────────────────────────────────────────────────────────
async function main() {
  const server = await buildServer();

  try {
    await server.listen({ port: env.API_PORT, host: env.API_HOST });
    server.log.info(`🚀 KEZAD API running at http://${env.API_HOST}:${env.API_PORT}`);
    server.log.info(`📚 API Docs: http://localhost:${env.API_PORT}/api/docs`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    server.log.info(`Received ${signal}. Shutting down gracefully...`);
    await server.close();
    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

void main();
