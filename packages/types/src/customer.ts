import { z } from 'zod';

export const CreateCustomerSchema = z.object({
  companyName: z.string().min(1).max(200).trim(),
  tradeLicenseNo: z.string().optional(),
  vatRegistrationNo: z.string().optional(),
  industry: z.string().optional(),
  address: z
    .object({
      street: z.string(),
      city: z.string(),
      emirate: z.string(),
      poBox: z.string().optional(),
      country: z.string().default('UAE'),
    })
    .optional(),
  contacts: z
    .array(
      z.object({
        name: z.string(),
        role: z.string().optional(),
        email: z.string().email(),
        phone: z.string().optional(),
        isPrimary: z.boolean().default(false),
      }),
    )
    .min(1),
});
export type CreateCustomerInput = z.infer<typeof CreateCustomerSchema>;

export const UpdateCustomerSchema = CreateCustomerSchema.partial();
export type UpdateCustomerInput = z.infer<typeof UpdateCustomerSchema>;

export const CustomerFilterSchema = z.object({
  search: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type CustomerFilter = z.infer<typeof CustomerFilterSchema>;
