/**
 * Auth routes — rate limited stricter than global (5 req/min on login)
 */
import type { FastifyInstance } from 'fastify';
import {
  LoginSchema,
  RegisterSchema,
  CustomerRegisterSchema,
  VerifyOtpSchema,
  RefreshTokenSchema,
} from '@kezad/types';
import { buildSuccessResponse } from '../../lib/errors.js';
import { AuthService } from './auth.service.js';

export default async function authRoutes(fastify: FastifyInstance): Promise<void> {
  const service = new AuthService(fastify.db);

  // ─── POST /auth/login ────────────────────────────────────────────────────
  fastify.post('/login', {
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
    schema: { tags: ['auth'], summary: 'Employee/admin login' },
  }, async (req, reply) => {
    const input = LoginSchema.parse(req.body);
    const result = await service.login(input, req.ip, req.headers['user-agent']);
    return reply.send(buildSuccessResponse(result));
  });

  // ─── POST /auth/customer/login ────────────────────────────────────────────
  fastify.post('/customer/login', {
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
    schema: { tags: ['auth'], summary: 'Customer portal login' },
  }, async (req, reply) => {
    const input = LoginSchema.parse(req.body);
    const result = await service.customerLogin(input, req.ip, req.headers['user-agent']);
    return reply.send(buildSuccessResponse(result));
  });

  // ─── POST /auth/register ──────────────────────────────────────────────────
  fastify.post('/register', {
    preHandler: [fastify.authorize(['SUPER_ADMIN'])],
    schema: { tags: ['auth'], summary: 'Register employee/admin user (SUPER_ADMIN only)' },
  }, async (req, reply) => {
    const input = RegisterSchema.parse(req.body);
    const result = await service.register(input);
    return reply.status(201).send(buildSuccessResponse(result));
  });

  // ─── POST /auth/customer/register ────────────────────────────────────────
  fastify.post('/customer/register', {
    config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
    schema: { tags: ['auth'], summary: 'Initiate customer registration (sends OTP)' },
  }, async (req, reply) => {
    const input = CustomerRegisterSchema.parse(req.body);
    const result = await service.initiateCustomerRegistration(input);
    return reply.status(202).send(buildSuccessResponse(result));
  });

  // ─── POST /auth/customer/verify-otp ──────────────────────────────────────
  fastify.post('/customer/verify-otp', {
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
    schema: { tags: ['auth'], summary: 'Verify OTP and complete customer registration' },
  }, async (req, reply) => {
    const body = req.body as Record<string, unknown>;
    const otpInput = VerifyOtpSchema.parse(body);
    const registrationData = CustomerRegisterSchema.parse(body);
    const result = await service.verifyOtpAndCreateCustomer(otpInput, registrationData);
    return reply.status(201).send(buildSuccessResponse(result));
  });

  // ─── POST /auth/refresh ───────────────────────────────────────────────────
  fastify.post('/refresh', {
    schema: { tags: ['auth'], summary: 'Refresh access token using refresh token' },
  }, async (req, reply) => {
    const input = RefreshTokenSchema.parse(req.body);
    const result = await service.refreshTokens(input, req.ip, req.headers['user-agent']);
    return reply.send(buildSuccessResponse(result));
  });

  // ─── POST /auth/logout ────────────────────────────────────────────────────
  fastify.post('/logout', {
    preHandler: [fastify.authenticate],
    schema: { tags: ['auth'], summary: 'Logout (revoke refresh token)' },
  }, async (req, reply) => {
    const { refreshToken } = req.body as { refreshToken: string };
    await service.logout(refreshToken);
    return reply.status(204).send();
  });

  // ─── POST /auth/logout/all ────────────────────────────────────────────────
  fastify.post('/logout/all', {
    preHandler: [fastify.authenticate],
    schema: { tags: ['auth'], summary: 'Logout from all devices' },
  }, async (req, reply) => {
    await service.logoutAll(req.user.sub);
    return reply.status(204).send();
  });

  // ─── GET /auth/me ─────────────────────────────────────────────────────────
  fastify.get('/me', {
    preHandler: [fastify.authenticate],
    schema: { tags: ['auth'], summary: 'Get current authenticated user' },
  }, async (req, reply) => {
    return reply.send(buildSuccessResponse(req.user));
  });
}
