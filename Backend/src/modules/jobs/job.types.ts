/** Background job types (spec section 23). One handler per type in job.runner.ts. */
export const JOB_TYPES = {
  PROVISION_VOUCHER: 'PROVISION_VOUCHER',
} as const;

export type JobType = (typeof JOB_TYPES)[keyof typeof JOB_TYPES];

export interface ProvisionVoucherPayload {
  paymentId: string;
}
