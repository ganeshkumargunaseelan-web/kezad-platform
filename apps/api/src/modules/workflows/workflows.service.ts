/**
 * Workflow Engine — 5-level approval workflows, send-back capability.
 * No third-party BPM engine. Built in Node.js for zero vendor lock-in.
 */
import type { PrismaClient, WorkflowStatus, WorkflowActionType } from '@kezad/database';
import type { SubmitWorkflowInput, WorkflowActionInput } from '@kezad/types';
import { NotFoundError, BusinessRuleError, ForbiddenError } from '../../lib/errors.js';

export class WorkflowsService {
  constructor(private readonly db: PrismaClient) {}

  // ─── Submit new workflow ───────────────────────────────────────────────────

  async submit(input: SubmitWorkflowInput, submittedBy: string): Promise<unknown> {
    // Get workflow definition
    const definition = await this.db.workflowDefinition.findFirst({
      where: { workflowType: input.workflowType as never, isActive: true },
      include: { steps: { orderBy: { stepNumber: 'asc' } } },
    });
    if (!definition) {
      throw new BusinessRuleError(`No active workflow definition for type '${input.workflowType}'`);
    }

    // Check no pending instance exists for same entity
    const existing = await this.db.workflowInstance.findFirst({
      where: {
        entityType: input.entityType,
        entityId: input.entityId,
        status: { in: ['PENDING', 'IN_PROGRESS'] },
      },
    });
    if (existing) {
      throw new BusinessRuleError(
        `An active workflow already exists for this ${input.entityType} (instance: ${existing.id})`,
      );
    }

    const instance = await this.db.workflowInstance.create({
      data: {
        workflowType: input.workflowType as never,
        workflowDefinitionId: definition.id,
        contractId: input.contractId,
        entityType: input.entityType,
        entityId: input.entityId,
        currentStep: 1,
        status: 'IN_PROGRESS',
        submittedBy,
        notes: input.notes,
        metadata: (input.metadata ?? undefined) as never,
      },
      include: { definition: { include: { steps: true } } },
    });

    // Log submit action
    await this.db.workflowAction.create({
      data: {
        workflowInstanceId: instance.id,
        stepNumber: 0,
        actionType: 'SUBMIT',
        actedBy: submittedBy,
        comments: input.notes,
        previousStatus: 'PENDING',
        newStatus: 'IN_PROGRESS',
      },
    });

    return instance;
  }

  // ─── Process action (approve / reject / send-back / cancel) ───────────────

  async processAction(
    instanceId: string,
    input: WorkflowActionInput,
    actedBy: string,
    actorRole: string,
  ) {
    const instance = await this.db.workflowInstance.findFirst({
      where: { id: instanceId },
      include: {
        definition: {
          include: { steps: { orderBy: { stepNumber: 'asc' } } },
        },
      },
    });
    if (!instance) throw new NotFoundError('Workflow instance', instanceId);

    if (!['PENDING', 'IN_PROGRESS'].includes(instance.status)) {
      throw new BusinessRuleError(`Workflow is already ${instance.status}`);
    }

    const currentStep = instance.definition.steps.find(
      (s) => s.stepNumber === instance.currentStep,
    );
    if (!currentStep) {
      throw new BusinessRuleError('No step definition found for current step');
    }

    // Enforce role requirement for this step
    if (currentStep.requiredRole !== actorRole) {
      throw new ForbiddenError(
        `Step ${currentStep.stepNumber} requires role '${currentStep.requiredRole}', but actor has '${actorRole}'`,
      );
    }

    const previousStatus = instance.status as WorkflowStatus;
    let newStatus: WorkflowStatus = 'IN_PROGRESS';
    let newStep = instance.currentStep;

    switch (input.action) {
      case 'APPROVE': {
        if (currentStep.isFinalStep) {
          newStatus = 'APPROVED';
        } else {
          newStep = instance.currentStep + 1;
          newStatus = 'IN_PROGRESS';
        }
        break;
      }
      case 'REJECT': {
        newStatus = 'REJECTED';
        break;
      }
      case 'SEND_BACK': {
        newStep = Math.max(1, instance.currentStep - 1);
        newStatus = 'IN_PROGRESS';
        break;
      }
      case 'CANCEL': {
        newStatus = 'CANCELLED';
        break;
      }
      default:
        throw new BusinessRuleError(`Unknown action: ${input.action}`);
    }

    await this.db.$transaction(async (tx) => {
      await tx.workflowInstance.update({
        where: { id: instanceId },
        data: {
          status: newStatus,
          currentStep: newStep,
          completedAt: ['APPROVED', 'REJECTED', 'CANCELLED'].includes(newStatus) ? new Date() : null,
        },
      });

      await tx.workflowAction.create({
        data: {
          workflowInstanceId: instanceId,
          stepNumber: instance.currentStep,
          actionType: input.action as WorkflowActionType,
          actedBy,
          comments: input.comments,
          previousStatus,
          newStatus,
        },
      });
    });

    // Post-approval side effects
    if (newStatus === 'APPROVED') {
      await this.handleApproval(instance.entityType, instance.entityId, actedBy);
    }

    return { instanceId, action: input.action, newStatus, newStep };
  }

  private async handleApproval(entityType: string, entityId: string, approvedBy: string) {
    switch (entityType) {
      case 'contract':
        await this.db.contract.update({
          where: { id: entityId },
          data: { status: 'ACTIVE' },
        });
        break;
      case 'invoice':
        await this.db.invoice.update({
          where: { id: entityId },
          data: { status: 'APPROVED', issueDate: new Date() },
        });
        break;
      case 'tariff':
        await this.db.tariff.update({
          where: { id: entityId },
          data: { isActive: true },
        });
        break;
    }
  }

  // ─── List workflow instances ───────────────────────────────────────────────

  async list(filter: {
    workflowType?: string;
    status?: string;
    entityType?: string;
    assignedRole?: string;
    limit: number;
    cursor?: string;
  }): Promise<{ data: object[]; meta: object }> {
    const where = {
      ...(filter.workflowType ? { workflowType: filter.workflowType as never } : {}),
      ...(filter.status ? { status: filter.status as never } : {}),
      ...(filter.entityType ? { entityType: filter.entityType } : {}),
    };

    const total = await this.db.workflowInstance.count({ where });
    const items = await this.db.workflowInstance.findMany({
      where,
      include: {
        definition: { select: { name: true, workflowType: true } },
        actions: { orderBy: { actedAt: 'desc' }, take: 1 },
      },
      orderBy: { submittedAt: 'desc' },
      take: filter.limit + 1,
    });

    return {
      data: items.slice(0, filter.limit) as object[],
      meta: {
        total,
        limit: filter.limit,
        hasMore: items.length > filter.limit,
        nextCursor: items.length > filter.limit ? items[filter.limit - 1]?.id ?? null : null,
      },
    };
  }

  async findById(id: string): Promise<unknown> {
    const instance = await this.db.workflowInstance.findFirst({
      where: { id },
      include: {
        definition: { include: { steps: true } },
        actions: { include: { actor: { select: { firstName: true, lastName: true, role: true } } }, orderBy: { actedAt: 'asc' } },
      },
    });
    if (!instance) throw new NotFoundError('Workflow instance', id);
    return instance;
  }
}
