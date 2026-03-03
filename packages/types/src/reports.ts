import { z } from 'zod';
import { UtilityTypeSchema } from './enums';

export const ReportParamsSchema = z.object({
  from: z.string().datetime({ offset: true }),
  to: z.string().datetime({ offset: true }),
  utilityType: UtilityTypeSchema.optional(),
  customerId: z.string().optional(),
  format: z.enum(['json', 'csv', 'pdf']).default('json'),
});
export type ReportParams = z.infer<typeof ReportParamsSchema>;

export const WhatIfScenarioSchema = z.object({
  contractId: z.string().cuid(),
  proposedRateChange: z.string().regex(/^-?\d+(\.\d{1,6})?$/), // % change
  periodFrom: z.string().datetime({ offset: true }),
  periodTo: z.string().datetime({ offset: true }),
});
export type WhatIfScenarioInput = z.infer<typeof WhatIfScenarioSchema>;
