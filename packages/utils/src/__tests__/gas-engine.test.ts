import { describe, it, expect } from 'vitest';
import {
  validateNominatedQtyChange,
  calculateDailyGasBilling,
  calculateTopShortfall,
  calculateYearEndReconciliation,
  applyEscalation,
  validateMonthlyNomination,
} from '../gas-engine.js';
import Decimal from 'decimal.js';

describe('validateNominatedQtyChange', () => {
  it('should allow changes within ±10% of DCQ', () => {
    const result = validateNominatedQtyChange('1000', '1050', 1);
    expect(result.valid).toBe(true);
  });

  it('should reject increases above +10% of DCQ', () => {
    const result = validateNominatedQtyChange('1000', '1150', 1);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('10%');
  });

  it('should reject reductions above 25% in year 1-2', () => {
    const result = validateNominatedQtyChange('1000', '700', 1);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('25%');
  });

  it('should reject reductions above 15% in subsequent years', () => {
    const result = validateNominatedQtyChange('1000', '840', 3);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('15%');
  });

  it('should allow reductions within 15% after year 2', () => {
    const result = validateNominatedQtyChange('1000', '860', 3);
    expect(result.valid).toBe(true);
  });
});

describe('calculateDailyGasBilling', () => {
  it('should charge basic rate for consumption below DCQ', () => {
    const result = calculateDailyGasBilling('1000', '800', '10.00', '1.00', '14.00', '105');
    expect(new Decimal(result.basicCharge).toNumber()).toBeCloseTo(8000, 0);
    expect(result.overtakeCharge).toBe('0.000000');
  });

  it('should charge basic rate for consumption equal to DCQ', () => {
    const result = calculateDailyGasBilling('1000', '1000', '10.00', '1.00', '14.00', '105');
    expect(new Decimal(result.basicCharge).toNumber()).toBeCloseTo(10000, 0);
    expect(result.overtakeCharge).toBe('0.000000');
  });

  it('should apply overtake surcharge above 105% DCQ', () => {
    const result = calculateDailyGasBilling('1000', '1200', '10.00', '1.00', '14.00', '105');
    // 1000-1050 charged at basic rate, 1050-1200 at overtake rate
    const basicCharge = new Decimal(result.basicCharge).toNumber();
    const overtakeCharge = new Decimal(result.overtakeCharge).toNumber();
    expect(basicCharge).toBeCloseTo(10500, 0);  // 1050 × 10.00
    expect(overtakeCharge).toBeCloseTo(2100, 0); // 150 × 14.00
  });

  it('should add service charges', () => {
    const result = calculateDailyGasBilling('1000', '800', '10.00', '1.50', '14.00', '105');
    const serviceCharge = new Decimal(result.serviceCharge).toNumber();
    expect(serviceCharge).toBeCloseTo(1200, 0); // 800 × 1.50
  });
});

describe('calculateTopShortfall', () => {
  it('should return zero shortfall when consumption meets threshold', () => {
    const result = calculateTopShortfall('1000', '970', '95', '10.00', '1.00');
    expect(result.shortfallUnits).toBe('0.000000');
    expect(result.shortfallCharge).toBe('0.000000');
  });

  it('should calculate shortfall when consumption is below 95% of DCQ', () => {
    const result = calculateTopShortfall('1000', '900', '95', '10.00', '1.00');
    // Minimum = 950, consumed = 900, shortfall = 50
    const shortfall = new Decimal(result.shortfallUnits).toNumber();
    const charge = new Decimal(result.shortfallCharge).toNumber();
    expect(shortfall).toBeCloseTo(50, 0);
    expect(charge).toBeCloseTo(550, 0); // 50 × (10.00 + 1.00)
  });

  it('should handle exactly at threshold', () => {
    const result = calculateTopShortfall('1000', '950', '95', '10.00', '1.00');
    expect(result.shortfallUnits).toBe('0.000000');
    expect(result.shortfallCharge).toBe('0.000000');
  });
});

describe('calculateYearEndReconciliation', () => {
  it('should calculate wash-up when annual consumption exceeds ACQ', () => {
    const result = calculateYearEndReconciliation('18000000', '18500000', '12.00', '1.50', '16.00', '105');
    // 500,000 units above ACQ at overtake rate
    expect(result.scenario).toBe('WASH_UP');
    const charge = new Decimal(result.adjustmentAmount).toNumber();
    expect(charge).toBeGreaterThan(0);
  });

  it('should calculate wash-down when annual consumption is below ToP threshold', () => {
    const result = calculateYearEndReconciliation('18000000', '16000000', '12.00', '1.50', '16.00', '105');
    // Below 95% of 18,000,000 = 17,100,000
    expect(result.scenario).toBe('WASH_DOWN');
    const charge = new Decimal(result.adjustmentAmount).toNumber();
    expect(charge).toBeGreaterThan(0);
  });

  it('should produce zero adjustment when within ToP threshold and below ACQ', () => {
    const result = calculateYearEndReconciliation('18000000', '17500000', '12.00', '1.50', '16.00', '105');
    // 17.5M is above 95% threshold and below ACQ — no adjustment
    expect(result.scenario).toBe('NO_ADJUSTMENT');
    expect(result.adjustmentAmount).toBe('0.000000');
  });
});

describe('applyEscalation', () => {
  it('should increase rate by the given percentage', () => {
    const result = applyEscalation('10.00', '3.00');
    expect(parseFloat(result)).toBeCloseTo(10.30, 4);
  });

  it('should handle zero escalation', () => {
    const result = applyEscalation('12.50', '0.00');
    expect(parseFloat(result)).toBeCloseTo(12.50, 4);
  });
});

describe('validateMonthlyNomination', () => {
  it('should accept nomination within monthly cap', () => {
    const result = validateMonthlyNomination('30000', '30000', '105');
    expect(result.valid).toBe(true);
  });

  it('should reject nomination exceeding 105% of monthly DCQ', () => {
    const result = validateMonthlyNomination('30000', '32000', '105');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('105%');
  });
});
