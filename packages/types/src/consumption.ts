import { z } from 'zod';
import { DataQualityFlagSchema } from './enums';

export const CreateMeterSchema = z.object({
  contractId: z.string().cuid(),
  meterType: z.enum(['GAS', 'POWER', 'WATER', 'COOLING', 'SUB_METER']),
  serialNumber: z.string().optional(),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  installDate: z.string().datetime({ offset: true }).optional(),
  location: z.string().optional(),
  isSubMeter: z.boolean().default(false),
  parentMeterId: z.string().cuid().optional(),
  scadaNodeId: z.string().optional(),
  modbusRegister: z.number().int().optional(),
  dataSource: z.enum(['scada', 'bms', 'manual']).optional(),
  pollingInterval: z.number().int().default(900),
});
export type CreateMeterInput = z.infer<typeof CreateMeterSchema>;

export const IngestDataPointSchema = z.object({
  meterId: z.string(),
  periodStartUtc: z.string().datetime({ offset: true }),
  periodEndUtc: z.string().datetime({ offset: true }),
  rawValue: z.string().regex(/^\d+(\.\d{1,6})?$/),
  unit: z.string(),
  qualityFlag: DataQualityFlagSchema.default('GOOD'),
  sourceSystem: z.string().optional(),
});
export type IngestDataPointInput = z.infer<typeof IngestDataPointSchema>;

export const IngestBatchSchema = z.object({
  dataPoints: z.array(IngestDataPointSchema).min(1).max(10000),
});
export type IngestBatchInput = z.infer<typeof IngestBatchSchema>;

export const ManualReadingSchema = z.object({
  readingDate: z.string().datetime({ offset: true }),
  reading: z.string().regex(/^\d+(\.\d{1,6})?$/),
  unit: z.string(),
  notes: z.string().optional(),
});
export type ManualReadingInput = z.infer<typeof ManualReadingSchema>;

export const ConsumptionQuerySchema = z.object({
  meterId: z.string().optional(),
  from: z.string().datetime({ offset: true }),
  to: z.string().datetime({ offset: true }),
  interval: z.enum(['15m', '60m', '1d', '1mo']).default('60m'),
  qualityFlag: DataQualityFlagSchema.optional(),
});
export type ConsumptionQuery = z.infer<typeof ConsumptionQuerySchema>;
