import { z } from 'zod';

// ─── Standard API Response Envelopes ─────────────────────────────────────────

export const PaginationMetaSchema = z.object({
  total: z.number().int(),
  limit: z.number().int(),
  nextCursor: z.string().nullable(),
  hasMore: z.boolean(),
});
export type PaginationMeta = z.infer<typeof PaginationMetaSchema>;

export const ApiErrorSchema = z.object({
  code: z.string(),       // e.g. VALIDATION_ERROR, UNAUTHORIZED, NOT_FOUND
  message: z.string(),
  details: z.unknown().optional(),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;

export const ApiSuccessSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    data: dataSchema,
    meta: PaginationMetaSchema.optional(),
  });

export const ApiFailSchema = z.object({
  success: z.literal(false),
  error: ApiErrorSchema,
});

// ─── Pagination Query ─────────────────────────────────────────────────────────

export const PaginationQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;

// ─── Date range query ─────────────────────────────────────────────────────────

export const DateRangeQuerySchema = z.object({
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
});
export type DateRangeQuery = z.infer<typeof DateRangeQuerySchema>;
