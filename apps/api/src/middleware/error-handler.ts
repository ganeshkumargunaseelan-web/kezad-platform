/**
 * Global error handler — converts all errors to structured JSON responses.
 * Never leaks stack traces in production.
 */
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ZodError } from 'zod';
import { AppError, buildErrorResponse } from '../lib/errors.js';

export function registerErrorHandler(fastify: FastifyInstance): void {
  fastify.setErrorHandler(
    async (error: Error, request: FastifyRequest, reply: FastifyReply) => {
      // Zod validation errors
      if (error instanceof ZodError) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Request validation failed',
            details: error.flatten().fieldErrors,
          },
        });
      }

      // Known application errors
      if (error instanceof AppError) {
        return reply.status(error.statusCode).send(buildErrorResponse(error));
      }

      // Fastify validation errors (JSON Schema)
      if ('validation' in error && Array.isArray((error as { validation: unknown[] }).validation)) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message,
            details: (error as { validation: unknown[] }).validation,
          },
        });
      }

      // Unknown errors — log and return 500
      request.log.error({ err: error }, 'Unhandled error');

      return reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message:
            process.env['NODE_ENV'] === 'production'
              ? 'An unexpected error occurred'
              : error.message,
        },
      });
    },
  );

  // 404 handler
  fastify.setNotFoundHandler(async (_request: FastifyRequest, reply: FastifyReply) => {
    return reply.status(404).send({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Route not found',
      },
    });
  });
}
