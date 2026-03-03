import { z } from 'zod';
import { UtilityTypeSchema, ContractStatusSchema } from './enums';

// ─── Gas Contract ─────────────────────────────────────────────────────────────

export const GasContractDetailSchema = z.object({
  dcq: z.string().regex(/^\d+(\.\d{1,6})?$/, 'Must be a valid decimal'), // MMBTU/day
  acq: z.string().regex(/^\d+(\.\d{1,6})?$/),                            // MMBTU/year
  basePrice: z.string().regex(/^\d+(\.\d{1,6})?$/),                      // AED/MMBTU
  serviceCharge: z.string().regex(/^\d+(\.\d{1,6})?$/),
  overtakeSurcharge: z.string().regex(/^\d+(\.\d{1,6})?$/),
  topThresholdPct: z.string().default('95.000000'),
  overtakeThresholdPct: z.string().default('105.000000'),
  monthlyFlexPct: z.string().default('10.000000'),
  monthlyCapPct: z.string().default('105.000000'),
  noticeRequiredDays: z.number().int().default(140),
  contractYear: z.number().int().min(1),
  priceEscalationPct: z.string().default('0.000000'),
  escalationFrequency: z.enum(['ANNUAL', 'BIANNUAL']).optional(),
});
export type GasContractDetail = z.infer<typeof GasContractDetailSchema>;

// ─── Power Contract ───────────────────────────────────────────────────────────

export const PowerContractDetailSchema = z.object({
  contractedKw: z.string().regex(/^\d+(\.\d{1,6})?$/),
  touEnabled: z.boolean().default(true),
  peakHoursStart: z.string().regex(/^\d{2}:\d{2}$/).optional(), // "06:00"
  peakHoursEnd: z.string().regex(/^\d{2}:\d{2}$/).optional(),
});
export type PowerContractDetail = z.infer<typeof PowerContractDetailSchema>;

// ─── Water Contract ───────────────────────────────────────────────────────────

export const WaterContractDetailSchema = z.object({
  contractedM3: z.string().regex(/^\d+(\.\d{1,6})?$/),
  tieredRates: z.boolean().default(true),
});
export type WaterContractDetail = z.infer<typeof WaterContractDetailSchema>;

// ─── Cooling Contract ─────────────────────────────────────────────────────────

export const CoolingContractDetailSchema = z.object({
  contractedRt: z.string().regex(/^\d+(\.\d{1,6})?$/),          // Refrigeration Tons
  contractedTonHours: z.string().regex(/^\d+(\.\d{1,6})?$/),
  capacityChargePerRt: z.string().regex(/^\d+(\.\d{1,6})?$/),   // AED/RT/month
  consumptionChargePerTh: z.string().regex(/^\d+(\.\d{1,6})?$/),// AED/ton-hour
});
export type CoolingContractDetail = z.infer<typeof CoolingContractDetailSchema>;

// ─── Create Contract ──────────────────────────────────────────────────────────

export const CreateContractSchema = z
  .object({
    customerId: z.string().cuid(),
    utilityType: UtilityTypeSchema,
    startDate: z.string().datetime({ offset: true }),
    endDate: z.string().datetime({ offset: true }).optional(),
    siteAddress: z.string().optional(),
    siteCoordinates: z
      .object({ lat: z.number(), lng: z.number() })
      .optional(),
    notes: z.string().optional(),
    // One of these must be present depending on utilityType
    gasDetails: GasContractDetailSchema.optional(),
    powerDetails: PowerContractDetailSchema.optional(),
    waterDetails: WaterContractDetailSchema.optional(),
    coolingDetails: CoolingContractDetailSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.utilityType === 'GAS' && !data.gasDetails) {
      ctx.addIssue({ code: 'custom', message: 'gasDetails required for GAS contracts', path: ['gasDetails'] });
    }
    if (data.utilityType === 'POWER' && !data.powerDetails) {
      ctx.addIssue({ code: 'custom', message: 'powerDetails required for POWER contracts', path: ['powerDetails'] });
    }
    if (data.utilityType === 'WATER' && !data.waterDetails) {
      ctx.addIssue({ code: 'custom', message: 'waterDetails required for WATER contracts', path: ['waterDetails'] });
    }
    if (data.utilityType === 'DISTRICT_COOLING' && !data.coolingDetails) {
      ctx.addIssue({ code: 'custom', message: 'coolingDetails required for DISTRICT_COOLING contracts', path: ['coolingDetails'] });
    }
  });
export type CreateContractInput = z.infer<typeof CreateContractSchema>;

export const ContractFilterSchema = z.object({
  customerId: z.string().optional(),
  utilityType: UtilityTypeSchema.optional(),
  status: ContractStatusSchema.optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type ContractFilter = z.infer<typeof ContractFilterSchema>;

// ─── Nominated Quantity ────────────────────────────────────────────────────────

export const SubmitNominatedQtySchema = z.object({
  periodYear: z.number().int().min(2020).max(2100),
  periodMonth: z.number().int().min(1).max(12),
  nominatedQty: z.string().regex(/^\d+(\.\d{1,6})?$/),
  changeReason: z.string().min(1),
});
export type SubmitNominatedQtyInput = z.infer<typeof SubmitNominatedQtySchema>;
