import { z } from 'zod';

export const UserRoleSchema = z.enum([
  'SUPER_ADMIN',
  'ADMIN',
  'MANAGER',
  'OPERATOR',
  'CUSTOMER',
]);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const UtilityTypeSchema = z.enum(['GAS', 'POWER', 'WATER', 'DISTRICT_COOLING']);
export type UtilityType = z.infer<typeof UtilityTypeSchema>;

export const ContractStatusSchema = z.enum([
  'DRAFT',
  'PENDING_APPROVAL',
  'ACTIVE',
  'SUSPENDED',
  'TERMINATED',
  'EXPIRED',
]);
export type ContractStatus = z.infer<typeof ContractStatusSchema>;

export const InvoiceStatusSchema = z.enum([
  'DRAFT',
  'PENDING_APPROVAL',
  'APPROVED',
  'SENT',
  'PAID',
  'PARTIALLY_PAID',
  'OVERDUE',
  'DISPUTED',
  'CANCELLED',
  'VOID',
]);
export type InvoiceStatus = z.infer<typeof InvoiceStatusSchema>;

export const WorkflowTypeSchema = z.enum([
  'CONTRACT_APPROVAL',
  'CONSUMPTION_PROFILE_UPDATE',
  'BILLING_DISPUTE',
  'SERVICE_ACTIVATION',
  'SERVICE_DEACTIVATION',
  'TARIFF_CHANGE_APPROVAL',
  'INVOICE_APPROVAL',
]);
export type WorkflowType = z.infer<typeof WorkflowTypeSchema>;

export const WorkflowStatusSchema = z.enum([
  'PENDING',
  'IN_PROGRESS',
  'APPROVED',
  'REJECTED',
  'SENT_BACK',
  'CANCELLED',
]);
export type WorkflowStatus = z.infer<typeof WorkflowStatusSchema>;

export const DataQualityFlagSchema = z.enum(['GOOD', 'BAD', 'SUSPECT', 'ESTIMATED', 'MANUAL']);
export type DataQualityFlag = z.infer<typeof DataQualityFlagSchema>;

export const TariffTypeSchema = z.enum([
  'VOLUME_BASED',
  'TIME_OF_USE',
  'DYNAMIC',
  'MULTI_TIER',
  'DUAL_STRUCTURE',
]);
export type TariffType = z.infer<typeof TariffTypeSchema>;

export const ServiceRequestTypeSchema = z.enum([
  'ACTIVATION',
  'DEACTIVATION',
  'TECHNICAL_ISSUE',
  'METER_VERIFICATION',
  'OTHER',
]);
export type ServiceRequestType = z.infer<typeof ServiceRequestTypeSchema>;
