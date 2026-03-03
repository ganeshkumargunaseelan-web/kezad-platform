/** Generate KEZAD customer code: KZ-CUST-XXXXX */
export function generateCustomerCode(): string {
  const random = Math.floor(10000 + Math.random() * 90000);
  return `KZ-CUST-${random}`;
}

/** Generate contract number: KZ-GAS-2026-XXXXX */
export function generateContractNumber(utilityType: string, year?: number): string {
  const y = year ?? new Date().getFullYear();
  const type = utilityType.toUpperCase().replace('_', '').substring(0, 5);
  const random = Math.floor(10000 + Math.random() * 90000);
  return `KZ-${type}-${y}-${random}`;
}

/** Generate invoice number: INV-GAS-2026-000001 */
export function generateInvoiceNumber(utilityType: string, sequence: number): string {
  const y = new Date().getFullYear();
  const type = utilityType.toUpperCase().substring(0, 5);
  const seq = String(sequence).padStart(6, '0');
  return `INV-${type}-${y}-${seq}`;
}

/** Generate billing run code: BR-2026-03-001 */
export function generateBillingRunCode(year: number, month: number, sequence: number): string {
  const m = String(month).padStart(2, '0');
  const seq = String(sequence).padStart(3, '0');
  return `BR-${year}-${m}-${seq}`;
}

/** Generate service request number: SR-2026-XXXXX */
export function generateServiceRequestNumber(): string {
  const y = new Date().getFullYear();
  const random = Math.floor(10000 + Math.random() * 90000);
  return `SR-${y}-${random}`;
}

/** Generate dispute number: DISP-2026-XXXXX */
export function generateDisputeNumber(): string {
  const y = new Date().getFullYear();
  const random = Math.floor(10000 + Math.random() * 90000);
  return `DISP-${y}-${random}`;
}

/** Generate credit note number: CN-2026-XXXXX */
export function generateCreditNoteNumber(): string {
  const y = new Date().getFullYear();
  const random = Math.floor(10000 + Math.random() * 90000);
  return `CN-${y}-${random}`;
}

/** Generate meter code: MTR-GAS-XXXXX */
export function generateMeterCode(meterType: string): string {
  const type = meterType.toUpperCase().substring(0, 5);
  const random = Math.floor(10000 + Math.random() * 90000);
  return `MTR-${type}-${random}`;
}

