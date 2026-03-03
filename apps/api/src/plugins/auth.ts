/**
 * JWT authentication plugin + RBAC decorator.
 *
 * Usage in routes:
 *   { preHandler: [fastify.authenticate] }                    → any valid JWT
 *   { preHandler: [fastify.authorize(['ADMIN', 'MANAGER'])] } → role-based
 */
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import jwt from 'jsonwebtoken';
import type { JwtPayload } from '@kezad/types';
import { UnauthorizedError, ForbiddenError } from '../lib/errors.js';
import { env } from '../config/env.js';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
    authorize: (roles: string[]) => (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
  interface FastifyRequest {
    user: JwtPayload;
  }
}

async function authPlugin(fastify: FastifyInstance): Promise<void> {
  // ─── Extract and verify JWT ────────────────────────────────────────────────
  const authenticate = async (req: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or invalid Authorization header');
    }

    const token = authHeader.slice(7);
    try {
      const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
      req.user = payload;
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedError('Access token expired');
      }
      throw new UnauthorizedError('Invalid access token');
    }
  };

  // ─── Role-based access control ─────────────────────────────────────────────
  const authorize =
    (roles: string[]) =>
    async (req: FastifyRequest, _reply: FastifyReply): Promise<void> => {
      await authenticate(req, _reply);
      if (!roles.includes(req.user.role)) {
        throw new ForbiddenError(
          `Role '${req.user.role}' is not allowed. Required: ${roles.join(', ')}`,
        );
      }
    };

  fastify.decorate('authenticate', authenticate);
  fastify.decorate('authorize', authorize);
}

export default fp(authPlugin, { name: 'auth' });

// ─── JWT utility functions ─────────────────────────────────────────────────────

export function signAccessToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
    issuer: 'kezad-api',
    audience: 'kezad-platform',
  } as jwt.SignOptions);
}

export function signRefreshToken(userId: string): string {
  return jwt.sign({ sub: userId }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
    issuer: 'kezad-api',
    audience: 'kezad-platform',
  } as jwt.SignOptions);
}

export function verifyRefreshToken(token: string): { sub: string } {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as { sub: string };
}
