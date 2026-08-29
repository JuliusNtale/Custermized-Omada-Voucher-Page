import type { Job } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { logger as defaultLogger, type Logger } from '../../lib/logger.js';
import { env } from '../../config/env.js';
import { PrismaJobRepository, type JobRepository } from './job.repository.js';
import { JOB_TYPES, type ProvisionVoucherPayload } from './job.types.js';
import { PrismaPaymentRepository } from '../payment/payment.repository.js';
import { PrismaPackageRepository } from '../catalog/package.repository.js';
import { PrismaPortalSessionRepository } from '../portal/portal-session.repository.js';
import { PrismaVoucherRepository } from '../voucher/voucher.repository.js';
import { VoucherProvisioningService } from '../voucher/voucher-provisioning.service.js';
import { OmadaVoucherService } from '../omada/omada.voucher.service.js';
import { createOmadaClient } from '../omada/create-omada-client.js';

export interface JobRunner {
  /** Claim and process one batch of due jobs. Returns how many were attempted. */
  runOnce(): Promise<number>;
  start(): void;
  stop(): void;
}

/**
 * The database-backed job queue worker (spec section 23). Each due job is
 * claimed atomically (job.repository.ts's `claimDue`), dispatched by type,
 * and retried with exponential backoff up to `Job.maxAttempts` on failure.
 *
 * The only job type is PROVISION_VOUCHER: create exactly one Omada voucher
 * for a payment that has already been independently verified SUCCESS. The
 * customer receives connectivity via the captive portal's auto-login
 * (POST /api/portal/authenticate) and the voucher code on-screen - there is
 * no SMS step.
 */
export function createJobRunner(logger: Logger = defaultLogger): JobRunner {
  const jobs: JobRepository = new PrismaJobRepository(prisma);
  const paymentRepo = new PrismaPaymentRepository(prisma);
  const packageRepo = new PrismaPackageRepository(prisma);
  const portalSessionRepo = new PrismaPortalSessionRepository(prisma);
  const voucherRepo = new PrismaVoucherRepository(prisma);

  const omadaClient = createOmadaClient(logger);
  const omadaVoucherService = new OmadaVoucherService(omadaClient, logger);
  const provisioning = new VoucherProvisioningService(
    paymentRepo,
    packageRepo,
    portalSessionRepo,
    voucherRepo,
    omadaVoucherService,
    logger,
  );

  async function handle(job: Job): Promise<void> {
    switch (job.type) {
      case JOB_TYPES.PROVISION_VOUCHER: {
        const payload = job.payload as unknown as ProvisionVoucherPayload;
        await provisioning.provision(payload.paymentId);
        return;
      }
      default:
        throw new Error(`Unknown job type: ${job.type}`);
    }
  }

  async function runOnce(): Promise<number> {
    const due = await jobs.claimDue(env.JOB_BATCH_SIZE);
    for (const job of due) {
      try {
        await handle(job);
        await jobs.markDone(job.id);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error(
          { event: 'job.failed', jobId: job.id, type: job.type, attempts: job.attempts, err: message },
          'Job execution failed',
        );
        // Alert-worthy once attempts are exhausted (spec section 17: "alert
        // administrator if necessary"). No alerting channel exists yet -
        // this structured log is the hook a real one would attach to.
        const backoffMs = Math.min(30_000, 1000 * 2 ** job.attempts);
        const updated = await jobs.markFailedOrRetry(job.id, message, backoffMs);
        if (updated.status === 'FAILED') {
          logger.error(
            { event: 'admin.alert', jobId: job.id, type: job.type, entityId: job.entityId },
            'Job exhausted all retries - administrator attention required',
          );
        }
      }
    }
    return due.length;
  }

  let timer: NodeJS.Timeout | undefined;
  function start(): void {
    if (timer) return;
    timer = setInterval(() => void runOnce(), env.JOB_POLL_INTERVAL_MS);
    timer.unref?.();
  }
  function stop(): void {
    if (timer) clearInterval(timer);
    timer = undefined;
  }

  return { runOnce, start, stop };
}
