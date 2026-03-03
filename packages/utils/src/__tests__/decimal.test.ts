import { describe, it, expect } from 'vitest';
import { toDecimal, toFixed6, toFixed2, add, subtract, multiply, divide, calculateVat } from '../decimal.js';

describe('toDecimal', () => {
  it('should convert string to Decimal', () => {
    const d = toDecimal('12.345678');
    expect(d.toString()).toBe('12.345678');
  });

  it('should handle integer input', () => {
    const d = toDecimal(42);
    expect(d.toNumber()).toBe(42);
  });
});

describe('toFixed6 / toFixed2', () => {
  it('should format to 6 decimal places', () => {
    expect(toFixed6('12.3')).toBe('12.300000');
  });

  it('should format to 2 decimal places', () => {
    expect(toFixed2('12.345678')).toBe('12.35');
  });
});

describe('add / subtract / multiply / divide', () => {
  it('should add without floating point errors', () => {
    // Classic JS float issue: 0.1 + 0.2 !== 0.3
    const result = add('0.1', '0.2');
    expect(result).toBe('0.300000');
  });

  it('should subtract correctly', () => {
    const result = subtract('10.00', '3.33');
    expect(result).toBe('6.670000');
  });

  it('should multiply with precision', () => {
    const result = multiply('1250.123456', '5.000000');
    expect(result).toBe('6250.617280');
  });

  it('should divide with precision', () => {
    const result = divide('100', '3');
    expect(result).toBe('33.333333');
  });

  it('should throw on division by zero', () => {
    expect(() => divide('100', '0')).toThrow();
  });
});

describe('calculateVat', () => {
  it('should calculate 5% UAE VAT correctly', () => {
    const { vatAmount, totalWithVat } = calculateVat('1000.00', '5');
    expect(vatAmount).toBe('50.000000');
    expect(totalWithVat).toBe('1050.000000');
  });

  it('should handle fractional amounts', () => {
    const { vatAmount } = calculateVat('12345.678900', '5');
    // 12345.6789 × 0.05 = 617.283945
    expect(parseFloat(vatAmount)).toBeCloseTo(617.283945, 4);
  });
});
