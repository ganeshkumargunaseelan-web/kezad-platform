import type { IRegulatoryAdapter, RegulatoryGasContractPayload, RegulatorySubmissionResult } from './regulatory.interface.js';

const submissions = new Map<string, RegulatorySubmissionResult>();

export class MockRegulatoryAdapter implements IRegulatoryAdapter {
  async submitGasContract(payload: RegulatoryGasContractPayload): Promise<RegulatorySubmissionResult> {
    const submissionId = `ATLP-${Date.now()}-${payload.contractNumber}`;
    const result: RegulatorySubmissionResult = {
      success: true,
      submissionId,
      status: 'PENDING',
      submittedAt: new Date(),
    };

    submissions.set(submissionId, result);

    // Simulate async approval after 5 seconds
    setTimeout(() => {
      const updated = { ...result, status: 'APPROVED' as const };
      submissions.set(submissionId, updated);
      console.log('[MockRegulatory] Contract approved:', submissionId);
    }, 5000);

    console.log('[MockRegulatory] Gas contract submitted:', { contractNumber: payload.contractNumber, submissionId });
    return result;
  }

  async getSubmissionStatus(submissionId: string): Promise<RegulatorySubmissionResult> {
    return submissions.get(submissionId) ?? {
      success: false,
      submissionId,
      status: 'PENDING',
      notes: 'Submission not found',
      submittedAt: new Date(),
    };
  }

  async ping(): Promise<boolean> {
    return true;
  }
}
