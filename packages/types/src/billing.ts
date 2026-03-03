import { z } from 'zod';
import { UtilityTypeSchema, TariffTypeSchema } from './enums';

export const CreateTariffSchema = z.object({
  utilityType: UtilityTypeSchema,
  tariffType: TariffTypeSchema,
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  currency: z.string().default('AED'),
  effectiveFrom: z.string().datetime({ offset: true }),
  effectiveTo: z.string().datetime({ offset: true }).optional(),
  rates: z.array(
    z.object({
      rateKey: z.string(),     // base | service | overtake | capacity | consumption | peak | off_peak
      rate: z.string().regex(/^\d+(\.\d{1,6})?$/),
      unit: z.string(),        // per_mmbtu | per_kwh | per_m3 | per_rt | per_ton_hour
    }),
  ).min(1),
  tiers: z.array(
    z.object({
      tierNumber: z.number().int().min(1),
      fromQty: z.string().regex(/^\d+(\.\d{1,6})?$/),
      toQty: z.string().regex(/^\d+(\.\d{1,6})?$/).optional(),
      rate: z.string().regex(/^\d+(\.\d{1,6})?$/),
      unit: z.string(),
    }),
  ).optional(),
  touPeriods: z.array(
    z.object({
      periodName: z.string(),      // peak | off_peak | shoulder
      startTime: z.string().regex(/^\d{2}:\d{2}$/),
      endTime: z.string().regex(/^\d{2}:\d{2}$/),
      daysOfWeek: z.array(z.number().int().min(1).max(7)),
      rate: z.string().regex(/^\d+(\.\d{1,6})?$/),
      unit: z.string(),
    }),
  ).optional(),
});
export type CreateTariffInput = z.infer<typeof CreateTariffSchema>;

export const TriggerBillingRunSchema = z.object({
  periodFrom: z.string().datetime({ offset: true }),
  periodTo: z.string().datetime({ offset: true }),
  utilityTypes: z.array(UtilityTypeSchema).min(1),
  contractIds: z.array(z.string()).optional(), // if null → all active contracts
});
export type TriggerBillingRunInput = z.infer<typeof TriggerBillingRunSchema>;

export const BillingAdjustmentSchema = z.object({
  description: z.string().min(1),
  amount: z.string().regex(/^-?\d+(\.\d{1,6})?$/), // can be negative (credit)
  reason: z.string().min(1),
});
export type BillingAdjustmentInput = z.infer<typeof BillingAdjustmentSchema>;

export const CreateCreditNoteSchema = z.object({
  invoiceId: z.string().cuid(),
  amount: z.string().regex(/^\d+(\.\d{1,6})?$/),
  reason: z.string().min(1),
});
export type CreateCreditNoteInput = z.infer<typeof CreateCreditNoteSchema>;
