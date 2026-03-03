/**
 * Multi-Utility Billing Calculation Engine
 * Handles: Power (TOU), Water (tiered), District Cooling (dual structure)
 */
import Decimal from 'decimal.js';
import { toDecimal, multiply, subtract, sum, divide } from './decimal';

// ─── Power (TOU) Billing ──────────────────────────────────────────────────────

export interface TouPeriod {
  periodName: string;   // peak | off_peak | shoulder
  startTime: string;   // "06:00"
  endTime: string;     // "22:00"
  daysOfWeek: number[]; // 1=Mon..7=Sun
  rate: string;         // AED/kWh
}

export interface TouConsumptionRecord {
  timestamp: string;    // ISO UTC
  kwhConsumed: string;
}

export interface PowerBillingResult {
  totalKwh: Decimal;
  periodBreakdown: Array<{
    periodName: string;
    qty: Decimal;
    rate: Decimal;
    amount: Decimal;
  }>;
  totalAmount: Decimal;
}

export function calculatePowerBilling(
  records: TouConsumptionRecord[],
  touPeriods: TouPeriod[],
  defaultRate: string,
): PowerBillingResult {
  const periodTotals = new Map<string, { qty: Decimal; rate: Decimal }>();

  for (const record of records) {
    const dt = new Date(record.timestamp);
    const dayOfWeek = dt.getDay() === 0 ? 7 : dt.getDay(); // 1=Mon, 7=Sun
    const timeStr = `${String(dt.getUTCHours()).padStart(2, '0')}:${String(dt.getUTCMinutes()).padStart(2, '0')}`;

    const matchedPeriod = touPeriods.find(
      (p) =>
        p.daysOfWeek.includes(dayOfWeek) &&
        timeStr >= p.startTime &&
        timeStr < p.endTime,
    );

    const periodName = matchedPeriod?.periodName ?? 'default';
    const rate = matchedPeriod?.rate ?? defaultRate;
    const qty = toDecimal(record.kwhConsumed);

    const existing = periodTotals.get(periodName);
    if (existing) {
      existing.qty = existing.qty.plus(qty);
    } else {
      periodTotals.set(periodName, { qty, rate: toDecimal(rate) });
    }
  }

  const periodBreakdown = Array.from(periodTotals.entries()).map(([periodName, { qty, rate }]) => ({
    periodName,
    qty,
    rate,
    amount: multiply(qty, rate.toString()),
  }));

  const totalKwh = sum(periodBreakdown.map((p) => p.qty));
  const totalAmount = sum(periodBreakdown.map((p) => p.amount));

  return { totalKwh, periodBreakdown, totalAmount };
}

// ─── Water (Tiered) Billing ───────────────────────────────────────────────────

export interface WaterTier {
  tierNumber: number;
  fromQty: string;      // m³
  toQty?: string;       // m³, null = unlimited
  rate: string;         // AED/m³
}

export interface WaterBillingResult {
  totalM3: Decimal;
  tierBreakdown: Array<{
    tierNumber: number;
    qty: Decimal;
    rate: Decimal;
    amount: Decimal;
  }>;
  totalAmount: Decimal;
}

export function calculateWaterBilling(
  totalM3: string,
  tiers: WaterTier[],
): WaterBillingResult {
  const total = toDecimal(totalM3);
  let remaining = total;
  const tierBreakdown: WaterBillingResult['tierBreakdown'] = [];

  const sortedTiers = [...tiers].sort((a, b) => a.tierNumber - b.tierNumber);

  for (const tier of sortedTiers) {
    if (remaining.isZero() || remaining.isNegative()) break;

    const tierFrom = toDecimal(tier.fromQty);
    const tierTo = tier.toQty ? toDecimal(tier.toQty) : null;
    const tierSize = tierTo ? subtract(tierTo, tierFrom) : remaining;
    const qtyInTier = remaining.lessThan(tierSize) ? remaining : tierSize;

    if (qtyInTier.isPositive()) {
      const rate = toDecimal(tier.rate);
      tierBreakdown.push({
        tierNumber: tier.tierNumber,
        qty: qtyInTier,
        rate,
        amount: multiply(qtyInTier, rate.toString()),
      });
      remaining = subtract(remaining, qtyInTier);
    }
  }

  return {
    totalM3: total,
    tierBreakdown,
    totalAmount: sum(tierBreakdown.map((t) => t.amount)),
  };
}

// ─── District Cooling (Dual Structure) Billing ────────────────────────────────

export interface CoolingBillingResult {
  capacityCharge: {
    contractedRt: Decimal;
    ratePerRt: Decimal;
    amount: Decimal;
  };
  consumptionCharge: {
    actualTonHours: Decimal;
    ratePerTonHour: Decimal;
    amount: Decimal;
  };
  totalAmount: Decimal;
}

export function calculateCoolingBilling(
  contractedRt: string,
  actualTonHours: string,
  capacityChargePerRt: string,    // AED/RT/month
  consumptionChargePerTh: string,  // AED/ton-hour
): CoolingBillingResult {
  const rt = toDecimal(contractedRt);
  const tonHours = toDecimal(actualTonHours);
  const capacityRate = toDecimal(capacityChargePerRt);
  const consumptionRate = toDecimal(consumptionChargePerTh);

  const capacityAmount = multiply(rt, capacityRate.toString());
  const consumptionAmount = multiply(tonHours, consumptionRate.toString());

  return {
    capacityCharge: {
      contractedRt: rt,
      ratePerRt: capacityRate,
      amount: capacityAmount,
    },
    consumptionCharge: {
      actualTonHours: tonHours,
      ratePerTonHour: consumptionRate,
      amount: consumptionAmount,
    },
    totalAmount: capacityAmount.plus(consumptionAmount),
  };
}

// ─── Prorated billing helper ──────────────────────────────────────────────────

/**
 * Calculate the prorated fraction of a monthly amount.
 * e.g., contract starts on the 15th → 17/31 of the month
 */
export function prorateAmount(
  fullAmount: Decimal,
  activeDays: number,
  totalDaysInMonth: number,
): Decimal {
  const fraction = divide(activeDays.toString(), totalDaysInMonth.toString());
  return multiply(fullAmount, fraction);
}
