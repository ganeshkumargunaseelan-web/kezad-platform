import { z } from 'zod';
import { UserRoleSchema } from './enums';

export const LoginSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(8),
});
export type LoginInput = z.infer<typeof LoginSchema>;

export const RegisterSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(8).regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/,
    'Password must contain uppercase, lowercase, number, and special character',
  ),
  firstName: z.string().min(1).max(100).trim(),
  lastName: z.string().min(1).max(100).trim(),
  phone: z.string().optional(),
  department: z.string().optional(),
  role: UserRoleSchema.exclude(['CUSTOMER', 'SUPER_ADMIN']).optional().default('OPERATOR'),
});
export type RegisterInput = z.infer<typeof RegisterSchema>;

export const CustomerRegisterSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  phone: z.string().min(7),
  companyName: z.string().min(1).max(200).trim(),
  firstName: z.string().min(1).max(100).trim(),
  lastName: z.string().min(1).max(100).trim(),
});
export type CustomerRegisterInput = z.infer<typeof CustomerRegisterSchema>;

export const VerifyOtpSchema = z.object({
  email: z.string().email().toLowerCase(),
  code: z.string().length(6),
  purpose: z.enum(['registration', 'login', 'amendment']),
  password: z.string().min(8).optional(), // required for registration
});
export type VerifyOtpInput = z.infer<typeof VerifyOtpSchema>;

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});
export type RefreshTokenInput = z.infer<typeof RefreshTokenSchema>;

export const JwtPayloadSchema = z.object({
  sub: z.string(),           // userId
  email: z.string(),
  role: UserRoleSchema,
  customerId: z.string().nullable().optional(),
  iat: z.number().optional(),
  exp: z.number().optional(),
});
export type JwtPayload = z.infer<typeof JwtPayloadSchema>;

export const AuthResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number(),
  user: z.object({
    id: z.string(),
    email: z.string(),
    role: UserRoleSchema,
    firstName: z.string(),
    lastName: z.string(),
    customerId: z.string().nullable().optional(),
  }),
});
export type AuthResponse = z.infer<typeof AuthResponseSchema>;
