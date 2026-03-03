/**
 * Billing Service — orchestrates tariff engine, billing calculations,
 * batch invoice generation (≥10,000/cycle), and reconciliation.
 */
import type { PrismaClient, Prisma } from '@kezad/database';
import type { CreateTariffInput, TriggerBillingRunInput, BillingAdjustmentInput, CreateCreditNoteInput } from '@kezad/types';
import { NotFoundError, BusinessRuleError } from '../../lib/errors.js';
import {
  Decimal,
  toDecimal,
  multiply,
  add,
  calculateVat,
  toFixed6,
  calculatePowerBilling,
  calculateWaterBilling,
  calculateCoolingBilling,
  calculateDailyGasBilling,
  prorateAmount,
  generateInvoiceNumber,
  generateBillingRunCode,
} from '@kezad/utils';
import { startOfMonth, endOfMonth, getDaysInMonth } from 'date-fns';

const VAT_PCT = new Decimal('5'); // UAE VAT 5%

export class BillingService {
  constructor(private readonly db: PrismaClient) {}

  // ─── Tariff Management ────────────────────────────────────────────────────

  async createTariff(input: CreateTariffInput, createdBy: string) {
    // Deactivate current active tariff for this utility type
    await this.db.tariff.updateMany({
      where: {
        utilityType: input.utilityType,
        isActive: true,
        effectiveTo: null,
        deletedAt: null,
      },
      data: { effectiveTo: new Date(input.effectiveFrom) },
    });

    return this.db.tariff.create({
      data: {
        utilityType: input.utilityType,
        tariffType: input.tariffType,
        name: input.name,
        description: input.description,
        currency: input.currency,
        effectiveFrom: new Date(input.effectiveFrom),
        effectiveTo: input.effectiveTo ? new Date(input.effectiveTo) : null,
        createdBy,
        rates: { createMany: { data: input.rates } },
        tiers: input.tiers ? { createMany: { data: input.tiers } } : undefined,
        touPeriods: input.touPeriods ? { createMany: { data: input.touPeriods } } : undefined,
      },
      include: { rates: true, tiers: true, touPeriods: true },
    });
  }

  async listTariffs(utilityType?: string) {
    return this.db.tariff.findMany({
      where: {
        deletedAt: null,
        ...(utilityType ? { utilityType: utilityType as Prisma.EnumUtilityTypeFilter } : {}),
      },
      include: { rates: true, tiers: true, touPeriods: true },
      orderBy: { effectiveFrom: 'desc' },
    });
  }

  async getTariffForDate(utilityType: string, date: Date) {
    const tariff = await this.db.tariff.findFirst({
      where: {
        utilityType: utilityType as never,
        isActive: true,
        deletedAt: null,
        effectiveFrom: { lte: date },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: date } }],
      },
      include: { rates: true, tiers: true, touPeriods: true },
      orderBy: { effectiveFrom: 'desc' },
    });
    return tariff;
  }

  // ─── Trigger Billing Run ──────────────────────────────────────────────────

  async triggerBillingRun(input: TriggerBillingRunInput, triggeredBy: string) {
    const periodFrom = new Date(input.periodFrom);
    const periodTo = new Date(input.periodTo);

    // Get next sequence number for billing run code
    const count = await this.db.billingRun.count();
    const runCode = generateBillingRunCode(
      periodFrom.getFullYear(),
      periodFrom.getMonth() + 1,
      count + 1,
    );

    const billingRun = await this.db.billingRun.create({
      data: {
        runCode,
        periodFrom,
        periodTo,
        utilityTypes: input.utilityTypes,
        status: 'RUNNING',
        triggeredBy,
        startedAt: new Date(),
      },
    });

    // Get active contracts to bill
    const contracts = await this.db.contract.findMany({
      where: {
        status: 'ACTIVE',
        deletedAt: null,
        utilityType: { in: input.utilityTypes },
        ...(input.contractIds ? { id: { in: input.contractIds } } : {}),
      },
      include: {
        gasDetails: true,
        powerDetails: true,
        waterDetails: true,
        coolingDetails: true,
        meters: { where: { isActive: true } },
      },
    });

    let successCount = 0;
    let failCount = 0;
    const errors: Array<{ contractId: string; error: string }> = [];

    // Process each contract
    for (const contract of contracts) {
      try {
        await this.generateInvoiceForContract(contract, billingRun.id, periodFrom, periodTo);
        successCount++;
      } catch (err) {
        failCount++;
        errors.push({
          contractId: contract.id,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    // Update billing run status
    const totalAmount = await this.db.invoice.aggregate({
      where: { billingRunId: billingRun.id },
      _sum: { totalAmount: true },
    });

    await this.db.billingRun.update({
      where: { id: billingRun.id },
      data: {
        status: failCount === 0 ? 'COMPLETED' : failCount === contracts.length ? 'FAILED' : 'PARTIAL',
        totalInvoices: successCount,
        failedCount: failCount,
        totalAmount: String(totalAmount._sum.totalAmount ?? '0'),
        completedAt: new Date(),
        errorLog: errors.length > 0 ? errors : undefined,
      },
    });

    return { runCode, totalContracts: contracts.length, successCount, failCount, errors };
  }

  // ─── Generate Invoice for Contract ───────────────────────────────────────

  private async generateInvoiceForContract(
    contract: { id: string; utilityType: string; customerId: string; startDate: Date; meters: { id: string }[]; gasDetails?: { acq: Prisma.Decimal; dcq: Prisma.Decimal; basePrice: Prisma.Decimal; serviceCharge: Prisma.Decimal; overtakeSurcharge: Prisma.Decimal } | null; coolingDetails?: { contractedRt: Prisma.Decimal; contractedTonHours: Prisma.Decimal; capacityChargePerRt: Prisma.Decimal; consumptionChargePerTh: Prisma.Decimal } | null },
    billingRunId: string,
    periodFrom: Date,
    periodTo: Date,
  ) {
    const tariff = await this.getTariffForDate(contract.utilityType, periodFrom);
    const meterIds = contract.meters.map((m) => m.id);

    // Fetch consumption data for period
    const consumption = await this.db.meterDataPoint.aggregate({
      where: {
        meterId: { in: meterIds },
        periodStartUtc: { gte: periodFrom },
        periodEndUtc: { lte: periodTo },
        qualityFlag: { in: ['GOOD', 'ESTIMATED'] },
      },
      _sum: { rawValue: true },
    });

    const totalQty = toDecimal(String(consumption._sum.rawValue ?? '0'));
    const rates = Object.fromEntries(tariff?.rates.map((r) => [r.rateKey, r.rate.toString()]) ?? []);
    const invoiceCount = await this.db.invoice.count();

    let subtotal = new Decimal(0);
    const lineItems: Array<{
      description: string;
      lineType: string;
      quantity: string;
      unit: string;
      rate: string;
      amount: string;
    }> = [];

    if (contract.utilityType === 'GAS' && contract.gasDetails) {
      const gas = contract.gasDetails;
      const baseRate = String(gas.basePrice);
      const serviceRate = String(gas.serviceCharge);
      const baseAmount = multiply(totalQty, add(baseRate, serviceRate).toString());
      subtotal = subtotal.plus(baseAmount);
      lineItems.push({
        description: 'Gas Consumption (Base + Service Charge)',
        lineType: 'consumption',
        quantity: totalQty.toFixed(6),
        unit: 'MMBTU',
        rate: add(baseRate, serviceRate).toFixed(6),
        amount: baseAmount.toFixed(6),
      });
    } else if (contract.utilityType === 'WATER' && rates['base']) {
      const waterAmount = multiply(totalQty, rates['base']!);
      subtotal = subtotal.plus(waterAmount);
      lineItems.push({
        description: 'Water Consumption',
        lineType: 'consumption',
        quantity: totalQty.toFixed(6),
        unit: 'M3',
        rate: rates['base']!,
        amount: waterAmount.toFixed(6),
      });
    } else if (contract.utilityType === 'DISTRICT_COOLING' && contract.coolingDetails) {
      const cd = contract.coolingDetails;
      const coolingResult = calculateCoolingBilling(
        String(cd.contractedRt),
        totalQty.toFixed(6),
        String(cd.capacityChargePerRt),
        String(cd.consumptionChargePerTh),
      );
      subtotal = coolingResult.totalAmount;
      lineItems.push(
        {
          description: 'Cooling Capacity Charge',
          lineType: 'capacity',
          quantity: coolingResult.capacityCharge.contractedRt.toFixed(6),
          unit: 'RT',
          rate: coolingResult.capacityCharge.ratePerRt.toFixed(6),
          amount: coolingResult.capacityCharge.amount.toFixed(6),
        },
        {
          description: 'Cooling Consumption Charge',
          lineType: 'consumption',
          quantity: coolingResult.consumptionCharge.actualTonHours.toFixed(6),
          unit: 'TON_HOUR',
          rate: coolingResult.consumptionCharge.ratePerTonHour.toFixed(6),
          amount: coolingResult.consumptionCharge.amount.toFixed(6),
        },
      );
    } else if (contract.utilityType === 'POWER' && rates['peak']) {
      const powerAmount = multiply(totalQty, rates['base'] ?? rates['peak']!);
      subtotal = subtotal.plus(powerAmount);
      lineItems.push({
        description: 'Power Consumption',
        lineType: 'consumption',
        quantity: totalQty.toFixed(6),
        unit: 'KWH',
        rate: rates['base'] ?? rates['peak']!,
        amount: powerAmount.toFixed(6),
      });
    }

    const vatAmount = calculateVat(subtotal, VAT_PCT);
    const totalAmount = subtotal.plus(vatAmount);
    const invoiceNumber = generateInvoiceNumber(contract.utilityType, invoiceCount + 1);

    await this.db.invoice.create({
      data: {
        invoiceNumber,
        contractId: contract.id,
        billingRunId,
        utilityType: contract.utilityType as never,
        status: 'DRAFT',
        periodFrom,
        periodTo,
        issueDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        subtotal: subtotal.toFixed(6),
        vatPct: VAT_PCT.toFixed(6),
        vatAmount: vatAmount.toFixed(6),
        totalAmount: totalAmount.toFixed(6),
        outstandingAmount: totalAmount.toFixed(6),
        lineItems: { createMany: { data: lineItems } },
      },
    });
  }

  // ─── Invoice CRUD ─────────────────────────────────────────────────────────

  async getInvoice(id: string) {
    const invoice = await this.db.invoice.findFirst({
      where: { id, deletedAt: null },
      include: { lineItems: true, payments: true, adjustments: true, creditNotes: true, contract: { select: { contractNumber: true, customer: { select: { companyName: true, customerCode: true } } } } },
    });
    if (!invoice) throw new NotFoundError('Invoice', id);
    return invoice;
  }

  // ─── Invoice Adjustments ──────────────────────────────────────────────────

  async adjustInvoice(invoiceId: string, input: BillingAdjustmentInput, adjustedBy: string) {
    const invoice = await this.db.invoice.findFirst({ where: { id: invoiceId, deletedAt: null } });
    if (!invoice) throw new NotFoundError('Invoice', invoiceId);
    if (['VOID', 'CANCELLED'].includes(invoice.status)) {
      throw new BusinessRuleError('Cannot adjust a voided or cancelled invoice');
    }
    const adjustment = await this.db.billingAdjustment.create({
      data: { invoiceId, description: input.description, amount: input.amount, reason: input.reason, adjustedBy },
    });
    // Recalculate outstanding amount
    const allAdjustments = await this.db.billingAdjustment.findMany({ where: { invoiceId } });
    const totalAdj = allAdjustments.reduce((s, a) => s.plus(a.amount.toString()), new Decimal(0));
    const newOutstanding = toDecimal(invoice.outstandingAmount.toString()).plus(totalAdj);
    await this.db.invoice.update({
      where: { id: invoiceId },
      data: { outstandingAmount: newOutstanding.toFixed(6) },
    });
    return adjustment;
  }

  async listAdjustments(invoiceId: string) {
    return this.db.billingAdjustment.findMany({
      where: { invoiceId },
      orderBy: { adjustedAt: 'desc' },
    });
  }

  // ─── Credit Notes ─────────────────────────────────────────────────────────

  async createCreditNote(input: CreateCreditNoteInput, issuedBy: string) {
    const invoice = await this.db.invoice.findFirst({ where: { id: input.invoiceId, deletedAt: null } });
    if (!invoice) throw new NotFoundError('Invoice', input.invoiceId);
    const count = await this.db.creditNote.count();
    const creditNoteNo = `CN-${String(count + 1).padStart(6, '0')}`;
    const creditNote = await this.db.creditNote.create({
      data: { creditNoteNo, invoiceId: input.invoiceId, amount: input.amount, reason: input.reason, issuedBy },
    });
    // Reduce outstanding amount
    const newOutstanding = toDecimal(invoice.outstandingAmount.toString()).minus(input.amount);
    const clampedOutstanding = newOutstanding.isNegative() ? new Decimal(0) : newOutstanding;
    await this.db.invoice.update({
      where: { id: input.invoiceId },
      data: {
        outstandingAmount: clampedOutstanding.toFixed(6),
        paidAmount: toDecimal(invoice.paidAmount.toString()).plus(input.amount).toFixed(6),
        status: clampedOutstanding.isZero() ? 'PAID' : invoice.status,
      },
    });
    return creditNote;
  }

  async listInvoices(filter: {
    contractId?: string;
    customerId?: string;
    status?: string;
    cursor?: string;
    limit: number;
  }) {
    const where: Prisma.InvoiceWhereInput = {
      deletedAt: null,
      ...(filter.contractId ? { contractId: filter.contractId } : {}),
      ...(filter.status ? { status: filter.status as never } : {}),
    };

    const total = await this.db.invoice.count({ where });
    const items = await this.db.invoice.findMany({
      where,
      include: {
        contract: { select: { contractNumber: true, customer: { select: { companyName: true } } } },
        _count: { select: { payments: true, lineItems: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: filter.limit + 1,
    });

    return { data: items.slice(0, filter.limit), meta: { total, limit: filter.limit, hasMore: items.length > filter.limit, nextCursor: items.length > filter.limit ? items[filter.limit - 1]?.id ?? null : null } };
  }
}
