import { describe, it, expect } from 'vitest';
import { calculatePowerBilling, calculateWaterBilling, calculateCoolingBilling, prorateAmount } from '../billing-engine.js';
import Decimal from 'decimal.js';

describe('calculatePowerBilling (TOU)', () => {
  it('should charge off-peak rate for off-peak consumption only', () => {
    const result = calculatePowerBilling({
      totalKwh: '1000',
      peakKwh: '0',
      offPeakKwh: '1000',
      peakRatePerKwh: '0.52',
      offPeakRatePerKwh: '0.35',
      contractedDemandKw: '100',
      demandChargePerKw: '12.00',
    });
    expect(new Decimal(result.consumptionCharge).toNumber()).toBeCloseTo(350, 2);
    expect(new Decimal(result.peakCharge).toNumber()).toBe(0);
  });

  it('should charge peak rate for peak consumption', () => {
    const result = calculatePowerBilling({
      totalKwh: '500',
      peakKwh: '500',
      offPeakKwh: '0',
      peakRatePerKwh: '0.52',
      offPeakRatePerKwh: '0.35',
      contractedDemandKw: '100',
      demandChargePerKw: '12.00',
    });
    expect(new Decimal(result.peakCharge).toNumber()).toBeCloseTo(260, 2);
    expect(new Decimal(result.consumptionCharge).toNumber()).toBe(0);
  });

  it('should include demand charge', () => {
    const result = calculatePowerBilling({
      totalKwh: '1000',
      peakKwh: '0',
      offPeakKwh: '1000',
      peakRatePerKwh: '0.52',
      offPeakRatePerKwh: '0.35',
      contractedDemandKw: '100',
      demandChargePerKw: '12.00',
    });
    expect(new Decimal(result.demandCharge).toNumber()).toBeCloseTo(1200, 2);
  });

  it('should calculate correct total', () => {
    const result = calculatePowerBilling({
      totalKwh: '1000',
      peakKwh: '400',
      offPeakKwh: '600',
      peakRatePerKwh: '0.52',
      offPeakRatePerKwh: '0.35',
      contractedDemandKw: '100',
      demandChargePerKw: '12.00',
    });
    const expectedTotal = 400 * 0.52 + 600 * 0.35 + 100 * 12.00;
    expect(new Decimal(result.totalBeforeVat).toNumber()).toBeCloseTo(expectedTotal, 2);
  });
});

describe('calculateWaterBilling (tiered)', () => {
  it('should charge tier 1 rate for consumption within tier 1 limit', () => {
    const result = calculateWaterBilling({
      consumptionM3: '100',
      tier1UpperLimitM3: '150',
      tier1RatePerM3: '4.50',
      tier2UpperLimitM3: '250',
      tier2RatePerM3: '6.75',
      tier3RatePerM3: '9.00',
      minimumMonthlyChargeAed: '1500',
    });
    expect(new Decimal(result.tier1Charge).toNumber()).toBeCloseTo(450, 2);
    expect(new Decimal(result.tier2Charge).toNumber()).toBe(0);
    expect(new Decimal(result.tier3Charge).toNumber()).toBe(0);
  });

  it('should apply minimum monthly charge when consumption is very low', () => {
    const result = calculateWaterBilling({
      consumptionM3: '10',
      tier1UpperLimitM3: '150',
      tier1RatePerM3: '4.50',
      tier2UpperLimitM3: '250',
      tier2RatePerM3: '6.75',
      tier3RatePerM3: '9.00',
      minimumMonthlyChargeAed: '1500',
    });
    // 10 × 4.50 = 45, less than 1500 minimum
    expect(new Decimal(result.totalBeforeVat).toNumber()).toBeCloseTo(1500, 2);
    expect(result.minimumApplied).toBe(true);
  });

  it('should correctly apply 3-tier pricing', () => {
    const result = calculateWaterBilling({
      consumptionM3: '300',
      tier1UpperLimitM3: '150',
      tier1RatePerM3: '4.50',
      tier2UpperLimitM3: '250',
      tier2RatePerM3: '6.75',
      tier3RatePerM3: '9.00',
      minimumMonthlyChargeAed: '1500',
    });
    // Tier 1: 150 × 4.50 = 675
    // Tier 2: 100 × 6.75 = 675
    // Tier 3: 50 × 9.00 = 450
    // Total: 1800
    expect(new Decimal(result.tier1Charge).toNumber()).toBeCloseTo(675, 2);
    expect(new Decimal(result.tier2Charge).toNumber()).toBeCloseTo(675, 2);
    expect(new Decimal(result.tier3Charge).toNumber()).toBeCloseTo(450, 2);
    expect(new Decimal(result.totalBeforeVat).toNumber()).toBeCloseTo(1800, 2);
  });
});

describe('calculateCoolingBilling (capacity + consumption)', () => {
  it('should calculate capacity charge based on contracted RT', () => {
    const result = calculateCoolingBilling({
      contractedRt: '500',
      capacityChargePerRtPerMonth: '85',
      actualTonHours: '12000',
      consumptionRatePerTonHour: '0.95',
    });
    expect(new Decimal(result.capacityCharge).toNumber()).toBeCloseTo(42500, 2);
    expect(new Decimal(result.consumptionCharge).toNumber()).toBeCloseTo(11400, 2);
  });

  it('should produce correct total', () => {
    const result = calculateCoolingBilling({
      contractedRt: '100',
      capacityChargePerRtPerMonth: '100',
      actualTonHours: '5000',
      consumptionRatePerTonHour: '1.00',
    });
    // Capacity: 100 × 100 = 10,000
    // Consumption: 5000 × 1.00 = 5,000
    // Total: 15,000
    expect(new Decimal(result.totalBeforeVat).toNumber()).toBeCloseTo(15000, 2);
  });
});

describe('prorateAmount', () => {
  it('should prorate for partial month (half month)', () => {
    const result = prorateAmount('3000', 31, 15);
    // 3000 × 15/31 ≈ 1451.61
    expect(parseFloat(result)).toBeCloseTo(1451.61, 1);
  });

  it('should return full amount for full period', () => {
    const result = prorateAmount('3000', 31, 31);
    expect(parseFloat(result)).toBeCloseTo(3000, 2);
  });

  it('should return zero for zero days', () => {
    const result = prorateAmount('3000', 31, 0);
    expect(parseFloat(result)).toBeCloseTo(0, 2);
  });
});
