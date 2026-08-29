/**
 * DB status "enums".
 *
 * SQLite (via Prisma) has no native enum type, so `Payment.status`,
 * `Voucher.status` and `Job.status` are plain `String` columns. This module is
 * the single source of truth for the allowed values and their TS union types -
 * previously these were Prisma `enum`s re-exported from `@prisma/client`.
 *
 * Import the type AND the const from here; never hard-code a status literal in
 * more than one place.
 */

export const PaymentStatus = {
  CREATED: 'CREATED',
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
  EXPIRED: 'EXPIRED',
} as const;
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export const VoucherStatus = {
  NOT_CREATED: 'NOT_CREATED',
  CREATING: 'CREATING',
  CREATED: 'CREATED',
  FAILED: 'FAILED',
} as const;
export type VoucherStatus = (typeof VoucherStatus)[keyof typeof VoucherStatus];

export const JobStatus = {
  PENDING: 'PENDING',
  RUNNING: 'RUNNING',
  DONE: 'DONE',
  FAILED: 'FAILED',
} as const;
export type JobStatus = (typeof JobStatus)[keyof typeof JobStatus];
