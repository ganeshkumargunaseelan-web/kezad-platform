/**
 * Redis plugin — caching, rate limiting, session store.
 */
import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import Redis from 'ioredis';
import { env } from '../config/env.js';

declare module 'fastify' {
  interface FastifyInstance {
    redis: Redis;
    cache: {
      get: <T>(key: string) => Promise<T | null>;
      set: <T>(key: string, value: T, ttlSeconds?: number) => Promise<void>;
      del: (key: string) => Promise<void>;
      invalidatePattern: (pattern: string) => Promise<void>;
    };
  }
}

async function redisPlugin(fastify: FastifyInstance): Promise<void> {
  if (!env.REDIS_URL) {
    fastify.log.info('⚠️  Redis URL not set — caching disabled (in-memory noop)');
    const noopCache = {
      async get<T>(): Promise<T | null> { return null; },
      async set<T>(): Promise<void> {},
      async del(): Promise<void> {},
      async invalidatePattern(): Promise<void> {},
    };
    fastify.decorate('redis', null as any);
    fastify.decorate('cache', noopCache);
    return;
  }

  const redis = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => Math.min(times * 100, 3000),
    lazyConnect: true,
  });

  await redis.connect();
  fastify.log.info('✅ Redis connected');

  // ─── Typed cache helper ────────────────────────────────────────────────────
  const cache = {
    async get<T>(key: string): Promise<T | null> {
      const raw = await redis.get(key);
      if (!raw) return null;
      try {
        return JSON.parse(raw) as T;
      } catch {
        return null;
      }
    },

    async set<T>(key: string, value: T, ttlSeconds = 300): Promise<void> {
      await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    },

    async del(key: string): Promise<void> {
      await redis.del(key);
    },

    async invalidatePattern(pattern: string): Promise<void> {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    },
  };

  fastify.decorate('redis', redis);
  fastify.decorate('cache', cache);

  fastify.addHook('onClose', async () => {
    await redis.quit();
    fastify.log.info('Redis disconnected');
  });
}

export default fp(redisPlugin, { name: 'redis', dependencies: [] });
