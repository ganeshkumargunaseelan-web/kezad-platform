/**
 * Environment configuration — validated at startup.
 * The app will REFUSE to start if required env vars are missing.
 */
import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  API_PORT: z.coerce.number().int().default(3001),
  API_HOST: z.string().default('0.0.0.0'),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),

  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().default('redis://localhost:6379'),

  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // Integration adapters
  CRM_ADAPTER: z.enum(['mock', 'dynamics365']).default('mock'),
  ERP_ADAPTER: z.enum(['mock', 'oracle_fusion']).default('mock'),
  SCADA_ADAPTER: z.enum(['mock', 'opcua']).default('mock'),
  BMS_ADAPTER: z.enum(['mock', 'modbus']).default('mock'),
  REGULATORY_ADAPTER: z.enum(['mock', 'atlp']).default('mock'),
  PAYMENT_ADAPTER: z.enum(['mock', 'stripe', 'cybersource']).default('mock'),
  NOTIFICATION_ADAPTER: z.enum(['mock', 'smtp', 'twilio']).default('mock'),

  // Real CRM (only if CRM_ADAPTER=dynamics365)
  D365_TENANT_ID: z.string().optional(),
  D365_CLIENT_ID: z.string().optional(),
  D365_CLIENT_SECRET: z.string().optional(),
  D365_ENVIRONMENT_URL: z.string().optional(),

  // Real ERP (only if ERP_ADAPTER=oracle_fusion)
  ORACLE_BASE_URL: z.string().optional(),
  ORACLE_USERNAME: z.string().optional(),
  ORACLE_PASSWORD: z.string().optional(),

  // OPC UA (only if SCADA_ADAPTER=opcua)
  OPCUA_SIEMENS_ENDPOINT: z.string().optional(),
  OPCUA_EMERSON_ENDPOINT: z.string().optional(),

  // Modbus (only if BMS_ADAPTER=modbus)
  MODBUS_TRIDIUM_HOST: z.string().optional(),
  MODBUS_TRIDIUM_PORT: z.coerce.number().int().optional(),
  MODBUS_HONEYWELL_HOST: z.string().optional(),
  MODBUS_HONEYWELL_PORT: z.coerce.number().int().optional(),

  // SMTP (only if NOTIFICATION_ADAPTER=smtp)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().email().optional(),

  // Twilio (only if NOTIFICATION_ADAPTER=twilio)
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_FROM_NUMBER: z.string().optional(),

  // Payment gateway
  PAYMENT_GATEWAY_URL: z.string().optional(),
  PAYMENT_GATEWAY_API_KEY: z.string().optional(),
  PAYMENT_GATEWAY_SECRET: z.string().optional(),

  // Regulatory
  ATLP_BASE_URL: z.string().optional(),
  ATLP_API_KEY: z.string().optional(),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;
