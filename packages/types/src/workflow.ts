import { z } from 'zod';
import { WorkflowTypeSchema } from './enums';

export const WorkflowActionTypeSchema = z.enum([
  'SUBMIT', 'APPROVE', 'REJECT', 'SEND_BACK', 'ESCALATE', 'CANCEL',
]);

export const SubmitWorkflowSchema = z.object({
  workflowType: WorkflowTypeSchema,
  entityType: z.string(),
  entityId: z.string(),
  contractId: z.string().cuid().optional(),
  notes: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});
export type SubmitWorkflowInput = z.infer<typeof SubmitWorkflowSchema>;

export const WorkflowActionSchema = z.object({
  action: WorkflowActionTypeSchema,
  comments: z.string().optional(),
});
export type WorkflowActionInput = z.infer<typeof WorkflowActionSchema>;
