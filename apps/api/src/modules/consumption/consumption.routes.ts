import type { FastifyInstance } from 'fastify';
import { CreateMeterSchema, IngestBatchSchema, ManualReadingSchema, ConsumptionQuerySchema } from '@kezad/types';
import { buildSuccessResponse, NotFoundError } from '../../lib/errors.js';
import { generateMeterCode } from '@kezad/utils';

export default async function consumptionRoutes(fastify: FastifyInstance): Promise<void> {
  // ─── Meter Management ─────────────────────────────────────────────────────

  fastify.post('/meters', {
    preHandler: [fastify.authorize(['SUPER_ADMIN', 'ADMIN', 'OPERATOR'])],
    schema: { tags: ['consumption'], summary: 'Register a new meter' },
  }, async (req, reply) => {
    const input = CreateMeterSchema.parse(req.body);
    const meter = await fastify.db.meter.create({
      data: { ...input, meterCode: generateMeterCode(input.meterType) },
    });
    return reply.status(201).send(buildSuccessResponse(meter));
  });

  fastify.get('/meters', {
    preHandler: [fastify.authenticate],
    schema: { tags: ['consumption'], summary: 'List meters' },
  }, async (req, reply) => {
    const { contractId } = req.query as { contractId?: string };
    const meters = await fastify.db.meter.findMany({
      where: { ...(contractId ? { contractId } : {}), isActive: true },
      include: { _count: { select: { dataPoints: true, manualReadings: true } } },
    });
    return reply.send(buildSuccessResponse(meters));
  });

  // ─── Data Ingestion ───────────────────────────────────────────────────────

  fastify.post('/ingest', {
    preHandler: [fastify.authorize(['SUPER_ADMIN', 'ADMIN', 'OPERATOR'])],
    schema: { tags: ['consumption'], summary: 'Bulk ingest meter data points (max 10,000)' },
  }, async (req, reply) => {
    const input = IngestBatchSchema.parse(req.body);

    // Deduplicate and upsert
    let inserted = 0;
    let skipped = 0;

    for (const dp of input.dataPoints) {
      try {
        await fastify.db.meterDataPoint.create({
          data: {
            meterId: dp.meterId,
            periodStartUtc: new Date(dp.periodStartUtc),
            periodEndUtc: new Date(dp.periodEndUtc),
            rawValue: dp.rawValue,
            unit: dp.unit,
            qualityFlag: dp.qualityFlag ?? 'GOOD',
            sourceSystem: dp.sourceSystem,
            checksum: `${dp.meterId}_${dp.periodEndUtc}_${dp.rawValue}`,
          },
        });
        inserted++;
      } catch {
        skipped++; // Duplicate detected (unique constraint)
      }
    }

    return reply.status(207).send(buildSuccessResponse({ inserted, skipped, total: input.dataPoints.length }));
  });

  // ─── Manual Readings ──────────────────────────────────────────────────────

  fastify.post('/meters/:meterId/readings', {
    preHandler: [fastify.authorize(['SUPER_ADMIN', 'ADMIN', 'OPERATOR'])],
    schema: { tags: ['consumption'], summary: 'Submit manual meter reading' },
  }, async (req, reply) => {
    const { meterId } = req.params as { meterId: string };
    const input = ManualReadingSchema.parse(req.body);

    const reading = await fastify.db.meterReading.create({
      data: {
        meterId,
        readingDate: new Date(input.readingDate),
        reading: input.reading,
        unit: input.unit,
        readBy: req.user.sub,
        notes: input.notes,
      },
    });

    return reply.status(201).send(buildSuccessResponse(reading));
  });

  // ─── Query Consumption ────────────────────────────────────────────────────

  fastify.get('/data', {
    preHandler: [fastify.authenticate],
    schema: { tags: ['consumption'], summary: 'Query consumption data with interval aggregation' },
  }, async (req, reply) => {
    const query = ConsumptionQuerySchema.parse(req.query);

    const dataPoints = await fastify.db.meterDataPoint.findMany({
      where: {
        ...(query.meterId ? { meterId: query.meterId } : {}),
        periodStartUtc: { gte: new Date(query.from) },
        periodEndUtc: { lte: new Date(query.to) },
        ...(query.qualityFlag ? { qualityFlag: query.qualityFlag } : {}),
      },
      orderBy: { periodStartUtc: 'asc' },
      take: 10000,
    });

    return reply.send(buildSuccessResponse(dataPoints));
  });

  // ─── Mock SCADA data generation ───────────────────────────────────────────

  fastify.post('/mock/generate-scada', {
    preHandler: [fastify.authorize(['SUPER_ADMIN', 'ADMIN'])],
    schema: { tags: ['consumption'], summary: 'Generate mock SCADA data for a meter (dev/test)' },
  }, async (req, reply) => {
    const { meterId, days = 30 } = req.body as { meterId: string; days?: number };

    const meter = await fastify.db.meter.findFirst({ where: { id: meterId } });
    if (!meter) throw new NotFoundError('Meter', meterId);

    const generated = [];
    const now = new Date();
    for (let d = 0; d < days; d++) {
      for (let h = 0; h < 24; h++) {
        const start = new Date(now);
        start.setDate(start.getDate() - d);
        start.setHours(h, 0, 0, 0);
        const end = new Date(start);
        end.setHours(h + 1);

        const baseValue = 50 + Math.random() * 20; // MMBTU/hr
        generated.push({
          meterId,
          periodStartUtc: start,
          periodEndUtc: end,
          rawValue: baseValue.toFixed(6),
          unit: meter.meterType === 'GAS' ? 'MMBTU' : meter.meterType === 'POWER' ? 'KWH' : 'M3',
          qualityFlag: 'GOOD' as const,
          sourceSystem: 'mock_scada',
          checksum: `${meterId}_${end.toISOString()}_${baseValue.toFixed(6)}`,
        });
      }
    }

    await fastify.db.meterDataPoint.createMany({ data: generated, skipDuplicates: true });

    return reply.send(buildSuccessResponse({ generated: generated.length, meterId, days }));
  });
}
