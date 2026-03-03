/**
 * Regulatory Adapter Interface (ATLP / Maqta Gateway)
 * Handles gas contract regulatory submissions and approvals.
 */

export interface RegulatoryGasContractPayload {
  contractId: string;
  contractNumber: string;
  customerId: string;
  customerVatNo: string;
  dcqSmPerDay: number;
  acqSmPerYear: number;
  effectiveFrom: Date;
  effectiveTo: Date;
  utilityType: 'GAS';
}

export interface RegulatorySubmissionResult {
  success: boolean;
  submissionId?: string;
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';
  notes?: string;
  submittedAt: Date;
}

export interface IRegulatoryAdapter {
  submitGasContract(payload: RegulatoryGasContractPayload): Promise<RegulatorySubmissionResult>;
  getSubmissionStatus(submissionId: string): Promise<RegulatorySubmissionResult>;
  ping(): Promise<boolean>;
}
