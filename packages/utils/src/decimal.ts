/**
 * Financial arithmetic utilities using decimal.js
 * NEVER use native JS arithmetic for financial calculations.
 * All monetary values stored and passed as strings, computed as Decimal.
 */
import Decimal from 'decimal.js';

// Configure Decimal globally
Decimal.set({
  precision: 28,       // 28 significant digits
  rounding: Decimal.ROUND_HALF_UP,
  toExpPos: 20,
  toExpNeg: -7,
});

export { Decimal };

/** Parse a string/number to Decimal safely */
export function toDecimal(value: string | number | Decimal): Decimal {
  return new Decimal(value);
}

/** Serialize Decimal to string with exactly 6 decimal places */
export function toFixed6(value: Decimal | string | number): string {
  return new Decimal(value).toFixed(6);
}

/** Serialize Decimal to string with exactly 2 decimal places (display) */
export function toFixed2(value: Decimal | string | number): string {
  return new Decimal(value).toFixed(2);
}

/** Add two decimal values */
export function add(a: string | Decimal, b: string | Decimal): Decimal {
  return new Decimal(a).plus(new Decimal(b));
}

/** Subtract two decimal values */
export function subtract(a: string | Decimal, b: string | Decimal): Decimal {
  return new Decimal(a).minus(new Decimal(b));
}

/** Multiply two decimal values */
export function multiply(a: string | Decimal, b: string | Decimal): Decimal {
  return new Decimal(a).times(new Decimal(b));
}

/** Divide two decimal values */
export function divide(a: string | Decimal, b: string | Decimal): Decimal {
  if (new Decimal(b).isZero()) throw new Error('Division by zero');
  return new Decimal(a).dividedBy(new Decimal(b));
}

/** Calculate percentage of a value */
export function percentage(value: string | Decimal, pct: string | Decimal): Decimal {
  return multiply(value, divide(pct, '100'));
}

/** Sum an array of decimal values */
export function sum(values: Array<string | Decimal>): Decimal {
  return values.reduce<Decimal>((acc, v) => add(acc, v), new Decimal(0));
}

/** Is value greater than zero */
export function isPositive(value: string | Decimal): boolean {
  return new Decimal(value).greaterThan(0);
}

/** Clamp value between min and max */
export function clamp(value: Decimal, min: Decimal, max: Decimal): Decimal {
  if (value.lessThan(min)) return min;
  if (value.greaterThan(max)) return max;
  return value;
}

/** Calculate VAT amount (default UAE 5%) */
export function calculateVat(amount: Decimal, vatPct: Decimal = new Decimal('5')): Decimal {
  return multiply(amount, divide(vatPct, '100'));
}

/** Round to n decimal places using ROUND_HALF_UP */
export function round(value: Decimal, decimals: number = 6): Decimal {
  return value.toDecimalPlaces(decimals, Decimal.ROUND_HALF_UP);
}
