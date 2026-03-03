/**
 * Gas Contract Calculation Engine
 *
 * Implements all complex industrial gas billing rules:
 * - DCQ / ACQ management
 * - Nominated Quantity constraints
 * - Take-or-Pay (95% threshold)
 * - Overtake surcharge (>105% DCQ)
 * - Year-end wash-up / wash-down
 * - 140-day advance notice enforcement
 * - Price escalation
 */
import Decimal from 'decimal.js';
import { toDecimal, multiply, subtract, divide, percentage, sum } from './decimal';

export interface GasContractParams {
  dcq: string;                    // Daily Contract Quantity (MMBTU/day)
  acq: string;                    // Annual Contract Quantity (MMBTU/year)
  basePrice: string;              // AED/MMBTU
  serviceCharge: string;          // AED/MMBTU
  overtakeSurcharge: string;      // AED/MMBTU additional for overtake
  topThresholdPct: string;        // default '95.000000'
  overtakeThresholdPct: string;   // default '105.000000'
  monthlyFlexPct: string;         // default '10.000000'
  monthlyCapPct: string;          // default '105.000000'
  contractYear: number;           // 1, 2, 3...
  maxReductionPctYear1_2: string; // default '25.000000'
  maxReductionPctAfter: string;   // default '15.000000'
  noticeRequiredDays: number;     // default 140
  priceEscalationPct: string;     // per annum %
}

export interface DailyConsumptionResult {
  date: string;
  actualQty: Decimal;
  dcqQty: Decimal;
  isOvertake: boolean;
  overtakeQty: Decimal;
  baseAmount: Decimal;
  overtakeAmount: Decimal;
  totalAmount: Decimal;
}

export interface MonthlyBillingResult {
  periodYear: number;
  periodMonth: number;
  totalQty: Decimal;
  nominatedQty: Decimal;
  baseAmount: Decimal;
  serviceAmount: Decimal;
  overtakeAmount: Decimal;
  grossAmount: Decimal;
}

export interface TopShortfallResult {
  periodYear: number;
  acqQty: Decimal;
  actualQty: Decimal;
  topThresholdQty: Decimal;
  shortfallQty: Decimal;
  shortfallAmount: Decimal;
  hasShortfall: boolean;
}

export interface WashUpDownResult {
  periodYear: number;
  acqQty: Decimal;
  actualQty: Decimal;
  topThresholdQty: Decimal;
  shortfallQty: Decimal;
  washUpAmount: Decimal;
  washDownAmount: Decimal;
  netPayableAmount: Decimal;
}

/**
 * Validate a nominated quantity change request.
 * Returns an error string if invalid, or null if valid.
 */
export function validateNominatedQtyChange(
  params: GasContractParams,
  currentDcq: Decimal,
  proposedDcq: Decimal,
  noticeDateSent: Date,
  effectiveDate: Date,
): string | null {
  // Check notice period (140 days)
  const daysDiff = Math.floor(
    (effectiveDate.getTime() - noticeDateSent.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (daysDiff < params.noticeRequiredDays) {
    return `Insufficient notice: ${daysDiff} days given, ${params.noticeRequiredDays} days required`;
  }

  // Check maximum reduction percentage
  const maxReductionPct =
    params.contractYear <= 2
      ? toDecimal(params.maxReductionPctYear1_2)
      : toDecimal(params.maxReductionPctAfter);

  const reduction = subtract(currentDcq, proposedDcq);
  if (reduction.greaterThan(0)) {
    const reductionPct = multiply(divide(reduction, currentDcq), '100');
    if (reductionPct.greaterThan(maxReductionPct)) {
      return `Reduction of ${reductionPct.toFixed(2)}% exceeds maximum ${maxReductionPct.toFixed(2)}% for contract year ${params.contractYear}`;
    }
  }

  return null;
}

/**
 * Calculate daily gas billing including overtake detection.
 */
export function calculateDailyGasBilling(
  params: GasContractParams,
  date: string,
  actualQty: string, // MMBTU
): DailyConsumptionResult {
  const actual = toDecimal(actualQty);
  const dcq = toDecimal(params.dcq);
  const overtakeThreshold = multiply(dcq, divide(params.overtakeThresholdPct, '100'));

  const isOvertake = actual.greaterThan(overtakeThreshold);
  const overtakeQty = isOvertake ? subtract(actual, overtakeThreshold) : toDecimal('0');

  // Base billing (up to overtake threshold)
  const billedBaseQty = isOvertake ? overtakeThreshold : actual;
  const totalRate = add_decimal(params.basePrice, params.serviceCharge);
  const baseAmount = multiply(billedBaseQty, totalRate);

  // Overtake billing
  const overtakeTotalRate = sum([params.basePrice, params.serviceCharge, params.overtakeSurcharge]);
  const overtakeAmount = multiply(overtakeQty, overtakeTotalRate);

  const totalAmount = baseAmount.plus(overtakeAmount);

  return {
    date,
    actualQty: actual,
    dcqQty: dcq,
    isOvertake,
    overtakeQty,
    baseAmount,
    overtakeAmount,
    totalAmount,
  };
}

/**
 * Calculate annual Take-or-Pay shortfall.
 */
export function calculateTopShortfall(
  params: GasContractParams,
  periodYear: number,
  annualActualQty: string,
): TopShortfallResult {
  const acqQty = toDecimal(params.acq);
  const actualQty = toDecimal(annualActualQty);
  const topThresholdQty = multiply(acqQty, divide(params.topThresholdPct, '100'));

  const shortfallQty = topThresholdQty.greaterThan(actualQty)
    ? subtract(topThresholdQty, actualQty)
    : toDecimal('0');

  const basePrice = applyEscalation(
    toDecimal(params.basePrice),
    toDecimal(params.priceEscalationPct),
    periodYear - 1,
  );
  const shortfallAmount = multiply(shortfallQty, basePrice);

  return {
    periodYear,
    acqQty,
    actualQty,
    topThresholdQty,
    shortfallQty,
    shortfallAmount,
    hasShortfall: shortfallQty.greaterThan(0),
  };
}

/**
 * Calculate year-end wash-up / wash-down amounts.
 * Wash-up = customer pays shortfall below 95% ACQ
 * Wash-down = customer receives credit for excess paid (rare edge case)
 */
export function calculateYearEndReconciliation(
  params: GasContractParams,
  periodYear: number,
  annualActualQty: string,
  totalBilledAmount: string,
): WashUpDownResult {
  const topResult = calculateTopShortfall(params, periodYear, annualActualQty);
  const billed = toDecimal(totalBilledAmount);

  // Wash-up: customer owes shortfall amount
  const washUpAmount = topResult.hasShortfall ? topResult.shortfallAmount : toDecimal('0');

  // Wash-down: if customer was over-billed (edge case)
  const washDownAmount = toDecimal('0'); // Implement if contract has wash-down clause

  const netPayableAmount = subtract(washUpAmount, washDownAmount);

  return {
    periodYear,
    acqQty: topResult.acqQty,
    actualQty: topResult.actualQty,
    topThresholdQty: topResult.topThresholdQty,
    shortfallQty: topResult.shortfallQty,
    washUpAmount,
    washDownAmount,
    netPayableAmount,
  };
}

/**
 * Apply annual price escalation.
 * escalationPct is per annum percentage, yearsElapsed is number of complete years.
 */
export function applyEscalation(
  basePrice: Decimal,
  escalationPct: Decimal,
  yearsElapsed: number,
): Decimal {
  if (yearsElapsed <= 0 || escalationPct.isZero()) return basePrice;
  const multiplier = new Decimal(1).plus(divide(escalationPct, '100')).pow(yearsElapsed);
  return multiply(basePrice, multiplier);
}

/** Validate monthly nominated quantity against ±10% flexibility rule */
export function validateMonthlyNomination(
  params: GasContractParams,
  originalDcqForMonth: string,
  proposedMonthlyQty: string,
  daysInMonth: number,
): string | null {
  const originalDcq = toDecimal(originalDcqForMonth);
  const proposed = toDecimal(proposedMonthlyQty);
  const monthlyBase = multiply(originalDcq, daysInMonth.toString());

  const flexPct = toDecimal(params.monthlyFlexPct);
  const capPct = toDecimal(params.monthlyCapPct);

  const minAllowed = multiply(monthlyBase, subtract('100', flexPct.toString()).dividedBy(100));
  const maxAllowed = multiply(monthlyBase, divide(capPct, '100'));

  if (proposed.lessThan(minAllowed)) {
    return `Proposed quantity ${proposed.toFixed(2)} is below minimum allowed ${minAllowed.toFixed(2)}`;
  }
  if (proposed.greaterThan(maxAllowed)) {
    return `Proposed quantity ${proposed.toFixed(2)} exceeds maximum allowed ${maxAllowed.toFixed(2)} (${capPct.toFixed(0)}% of base)`;
  }

  return null;
}

// Internal helper
function add_decimal(a: string, b: string): Decimal {
  return new Decimal(a).plus(new Decimal(b));
}
