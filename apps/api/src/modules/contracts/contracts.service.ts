/**
 * Contract Service — full lifecycle for all 4 utility types.
 * Gas contracts include DCQ/ACQ/Take-or-Pay/Overtake/Wash-up/Wash-down.
 */
import type { PrismaClient, Contract, Prisma } from '@kezad/database';
import type { CreateContractInput, ContractFilter, SubmitNominatedQtyInput } from '@kezad/types';
import { NotFoundError, BusinessRuleError, ConflictError } from '../../lib/errors.js';
import {
  generateContractNumber,
  validateNominatedQtyChange,
  validateMonthlyNomination,
  calculateYearEndReconciliation,
  toDecimal,
  checkNoticeRequirement,
} from '@kezad/utils';
import { buildPrismaCursor, buildPaginatedResponse } from '@kezad/utils';
import { addDays } from 'date-fns';

export class ContractsService {
  constructor(private readonly db: PrismaClient) {}

  // ─── List contracts ────────────────────────────────────────────────────────

  async list(filter: ContractFilter) {
    const { customerId, utilityType, status, cursor, limit } = filter;

    const where: Prisma.ContractWhereInput = {
      deletedAt: null,
      ...(customerId ? { customerId } : {}),
      ...(utilityType ? { utilityType } : {}),
      ...(status ? { status } : {}),
    };

    const total = await this.db.contract.count({ where });
    const items = await this.db.contract.findMany({
      where,
      include: {
        customer: { select: { customerCode: true, companyName: true } },
        gasDetails: true,
        powerDetails: true,
        waterDetails: true,
        coolingDetails: true,
        _count: { select: { invoices: true, meters: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...buildPrismaCursor(cursor),
    });

    return buildPaginatedResponse(items, limit, (c) => c.id, total);
  }

  // ─── Get contract by ID ────────────────────────────────────────────────────

  async findById(id: string) {
    const contract = await this.db.contract.findFirst({
      where: { id, deletedAt: null },
      include: {
        customer: { select: { customerCode: true, companyName: true } },
        gasDetails: {
          include: {
            nominatedQuantities: { orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }], take: 12 },
          },
        },
        powerDetails: true,
        waterDetails: true,
        coolingDetails: true,
        meters: { where: { isActive: true } },
        versions: { orderBy: { version: 'desc' }, take: 5 },
        amendments: { orderBy: { requestedAt: 'desc' }, take: 5 },
      },
    });
    if (!contract) throw new NotFoundError('Contract', id);
    return contract;
  }

  // ─── Create contract ───────────────────────────────────────────────────────

  async create(input: CreateContractInput, createdBy: string): Promise<Contract> {
    // Check customer exists
    const customer = await this.db.customer.findFirst({
      where: { id: input.customerId, deletedAt: null, isActive: true },
    });
    if (!customer) throw new NotFoundError('Customer', input.customerId);

    const contractNumber = generateContractNumber(input.utilityType, new Date().getFullYear());

    return this.db.$transaction(async (tx) => {
      const contract = await tx.contract.create({
        data: {
          contractNumber,
          customerId: input.customerId,
          utilityType: input.utilityType,
          status: 'DRAFT',
          startDate: new Date(input.startDate),
          endDate: input.endDate ? new Date(input.endDate) : null,
          siteAddress: input.siteAddress,
          siteCoordinates: input.siteCoordinates ?? undefined,
          notes: input.notes,
        },
      });

      // Create utility-specific details
      if (input.utilityType === 'GAS' && input.gasDetails) {
        await tx.gasContractDetail.create({
          data: {
            contractId: contract.id,
            dcq: input.gasDetails.dcq,
            acq: input.gasDetails.acq,
            basePrice: input.gasDetails.basePrice,
            serviceCharge: input.gasDetails.serviceCharge,
            overtakeSurcharge: input.gasDetails.overtakeSurcharge,
            topThresholdPct: input.gasDetails.topThresholdPct,
            overtakeThresholdPct: input.gasDetails.overtakeThresholdPct,
            monthlyFlexPct: input.gasDetails.monthlyFlexPct,
            monthlyCapPct: input.gasDetails.monthlyCapPct,
            noticeRequiredDays: input.gasDetails.noticeRequiredDays,
            contractYear: input.gasDetails.contractYear,
            priceEscalationPct: input.gasDetails.priceEscalationPct,
            escalationFrequency: input.gasDetails.escalationFrequency,
          },
        });
      } else if (input.utilityType === 'POWER' && input.powerDetails) {
        await tx.powerContractDetail.create({
          data: { contractId: contract.id, ...input.powerDetails },
        });
      } else if (input.utilityType === 'WATER' && input.waterDetails) {
        await tx.waterContractDetail.create({
          data: { contractId: contract.id, ...input.waterDetails },
        });
      } else if (input.utilityType === 'DISTRICT_COOLING' && input.coolingDetails) {
        await tx.coolingContractDetail.create({
          data: { contractId: contract.id, ...input.coolingDetails },
        });
      }

      // Snapshot initial version
      await tx.contractVersion.create({
        data: {
          contractId: contract.id,
          version: 1,
          snapshotData: contract as object,
          changedBy: createdBy,
          reason: 'Initial creation',
        },
      });

      return contract;
    });
  }

  // ─── Activate contract ─────────────────────────────────────────────────────

  async activate(id: string, activatedBy: string): Promise<void> {
    const contract = await this.db.contract.findFirst({ where: { id, deletedAt: null } });
    if (!contract) throw new NotFoundError('Contract', id);
    if (contract.status !== 'PENDING_APPROVAL') {
      throw new BusinessRuleError(`Cannot activate contract in status '${contract.status}'. Must be PENDING_APPROVAL.`);
    }

    await this.db.contract.update({
      where: { id },
      data: { status: 'ACTIVE' },
    });
  }

  // ─── Terminate contract ────────────────────────────────────────────────────

  async terminate(id: string, reason: string, terminatedBy: string): Promise<void> {
    const contract = await this.db.contract.findFirst({ where: { id, deletedAt: null } });
    if (!contract) throw new NotFoundError('Contract', id);
    if (!['ACTIVE', 'SUSPENDED'].includes(contract.status)) {
      throw new BusinessRuleError(`Cannot terminate contract in status '${contract.status}'`);
    }

    await this.db.$transaction(async (tx) => {
      await tx.contract.update({
        where: { id },
        data: { status: 'TERMINATED', endDate: new Date() },
      });

      await tx.contractAmendment.create({
        data: {
          contractId: id,
          amendmentType: 'TERMINATION',
          requestedBy: terminatedBy,
          effectiveDate: new Date(),
          changes: {},
          reason,
          status: 'TERMINATED',
          approvedBy: terminatedBy,
          approvedAt: new Date(),
        },
      });
    });
  }

  // ─── Submit Nominated Quantity (Gas only) ──────────────────────────────────

  async submitNominatedQuantity(
    contractId: string,
    input: SubmitNominatedQtyInput,
    submittedBy: string,
  ) {
    const contract = await this.db.contract.findFirst({
      where: { id: contractId, deletedAt: null },
      include: { gasDetails: true },
    });
    if (!contract) throw new NotFoundError('Contract', contractId);
    if (contract.utilityType !== 'GAS' || !contract.gasDetails) {
      throw new BusinessRuleError('Nominated quantity is only applicable to GAS contracts');
    }
    if (contract.status !== 'ACTIVE') {
      throw new BusinessRuleError('Contract must be ACTIVE to submit nominated quantities');
    }

    const gasDetails = contract.gasDetails;
    const params = {
      dcq: String(gasDetails.dcq),
      acq: String(gasDetails.acq),
      basePrice: String(gasDetails.basePrice),
      serviceCharge: String(gasDetails.serviceCharge),
      overtakeSurcharge: String(gasDetails.overtakeSurcharge),
      topThresholdPct: String(gasDetails.topThresholdPct),
      overtakeThresholdPct: String(gasDetails.overtakeThresholdPct),
      monthlyFlexPct: String(gasDetails.monthlyFlexPct),
      monthlyCapPct: String(gasDetails.monthlyCapPct),
      contractYear: gasDetails.contractYear,
      maxReductionPctYear1_2: String(gasDetails.maxReductionPctYear1_2),
      maxReductionPctAfter: String(gasDetails.maxReductionPctAfter),
      noticeRequiredDays: gasDetails.noticeRequiredDays,
      priceEscalationPct: String(gasDetails.priceEscalationPct),
      escalationFrequency: gasDetails.escalationFrequency ?? undefined,
    };

    // Calculate days in the requested month
    const daysInMonth = new Date(input.periodYear, input.periodMonth, 0).getDate();

    // Validate monthly nomination against ±10% flex / 105% cap
    const validationError = validateMonthlyNomination(
      params,
      String(gasDetails.dcq),
      input.nominatedQty,
      daysInMonth,
    );
    if (validationError) {
      throw new BusinessRuleError(validationError);
    }

    // Enforce 140-day notice requirement
    const effectiveDate = new Date(input.periodYear, input.periodMonth - 1, 1);
    const noticeSent = new Date();
    const { isValid, daysDiff } = checkNoticeRequirement(noticeSent, effectiveDate, gasDetails.noticeRequiredDays);
    if (!isValid) {
      throw new BusinessRuleError(
        `Insufficient notice: ${daysDiff} days given, ${gasDetails.noticeRequiredDays} days required for month ${input.periodMonth}/${input.periodYear}`,
      );
    }

    return this.db.nominatedQuantity.upsert({
      where: {
        gasDetailId_periodYear_periodMonth: {
          gasDetailId: gasDetails.id,
          periodYear: input.periodYear,
          periodMonth: input.periodMonth,
        },
      },
      create: {
        gasDetailId: gasDetails.id,
        periodYear: input.periodYear,
        periodMonth: input.periodMonth,
        nominatedQty: input.nominatedQty,
        originalDcq: gasDetails.dcq,
        changeReason: input.changeReason,
        submittedBy,
        noticeDateSent: noticeSent,
      },
      update: {
        nominatedQty: input.nominatedQty,
        changeReason: input.changeReason,
        submittedBy,
        noticeDateSent: noticeSent,
        approvedAt: null,
        approvedBy: null,
      },
    });
  }

  // ─── Year-End Reconciliation (Gas) ────────────────────────────────────────

  async calculateYearEndReconciliation(contractId: string, periodYear: number, totalBilledAmount: string) {
    const contract = await this.db.contract.findFirst({
      where: { id: contractId, deletedAt: null, utilityType: 'GAS' },
      include: { gasDetails: true },
    });
    if (!contract?.gasDetails) throw new NotFoundError('Gas contract', contractId);

    const gasDetails = contract.gasDetails;

    // Sum actual annual consumption
    const startOfYear = new Date(periodYear, 0, 1);
    const endOfYear = new Date(periodYear, 11, 31, 23, 59, 59);

    const meters = await this.db.meter.findMany({ where: { contractId } });
    const meterIds = meters.map((m) => m.id);

    const aggResult = await this.db.meterDataPoint.aggregate({
      where: {
        meterId: { in: meterIds },
        periodStartUtc: { gte: startOfYear },
        periodEndUtc: { lte: endOfYear },
        qualityFlag: { in: ['GOOD', 'ESTIMATED'] },
      },
      _sum: { rawValue: true },
    });

    const actualQty = String(aggResult._sum.rawValue ?? '0');

    const params = {
      dcq: String(gasDetails.dcq),
      acq: String(gasDetails.acq),
      basePrice: String(gasDetails.basePrice),
      serviceCharge: String(gasDetails.serviceCharge),
      overtakeSurcharge: String(gasDetails.overtakeSurcharge),
      topThresholdPct: String(gasDetails.topThresholdPct),
      overtakeThresholdPct: String(gasDetails.overtakeThresholdPct),
      monthlyFlexPct: String(gasDetails.monthlyFlexPct),
      monthlyCapPct: String(gasDetails.monthlyCapPct),
      contractYear: gasDetails.contractYear,
      maxReductionPctYear1_2: String(gasDetails.maxReductionPctYear1_2),
      maxReductionPctAfter: String(gasDetails.maxReductionPctAfter),
      noticeRequiredDays: gasDetails.noticeRequiredDays,
      priceEscalationPct: String(gasDetails.priceEscalationPct),
    };

    const reconciliation = calculateYearEndReconciliation(params, periodYear, actualQty, totalBilledAmount);

    // Upsert the reconciliation record
    return this.db.yearEndReconciliation.upsert({
      where: { contractId_periodYear: { contractId, periodYear } },
      create: {
        contractId,
        periodYear,
        acqQty: reconciliation.acqQty.toString(),
        actualQty: reconciliation.actualQty.toString(),
        topThresholdQty: reconciliation.topThresholdQty.toString(),
        shortfallQty: reconciliation.shortfallQty.toString(),
        washUpAmt: reconciliation.washUpAmount.toString(),
        washDownAmt: reconciliation.washDownAmount.toString(),
        netPayableAmt: reconciliation.netPayableAmount.toString(),
        status: 'DRAFT',
      },
      update: {
        acqQty: reconciliation.acqQty.toString(),
        actualQty: reconciliation.actualQty.toString(),
        topThresholdQty: reconciliation.topThresholdQty.toString(),
        shortfallQty: reconciliation.shortfallQty.toString(),
        washUpAmt: reconciliation.washUpAmount.toString(),
        washDownAmt: reconciliation.washDownAmount.toString(),
        netPayableAmt: reconciliation.netPayableAmount.toString(),
      },
    });
  }
}
