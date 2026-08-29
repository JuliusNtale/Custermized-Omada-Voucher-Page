import { describe, it, expect } from 'vitest';
import { logger } from '../src/lib/logger.js';
import { PaymentService } from '../src/modules/payment/payment.service.js';
import { PaymentWebhookService } from '../src/modules/payment/payment.webhook.service.js';
import { VoucherProvisioningService } from '../src/modules/voucher/voucher-provisioning.service.js';
import { FakePaymentProvider } from '../src/modules/payment/providers/fake-payment.provider.js';
import { OmadaVoucherService } from '../src/modules/omada/omada.voucher.service.js';
import { MockOmadaClient } from '../src/modules/omada/omada.mock-client.js';
import { JOB_TYPES } from '../src/modules/jobs/job.types.js';
import type { IOmadaClient } from '../src/modules/omada/omada.client.js';
import {
  makeFakeCustomerRepository,
  makeFakeJobRepository,
  makeFakePackageRepository,
  makeFakePaymentRepository,
  makeFakePortalSessionRepository,
  makeFakeVoucherRepository,
  makePackage,
} from './support/fakes.js';

const WEBHOOK_SECRET = 'test-webhook-secret';

function buildHarness(omadaClient: IOmadaClient = new MockOmadaClient(
  {
    baseUrl: 'https://omada.invalid:8043',
    clientId: 'c',
    clientSecret: 's',
    omadaId: 'mock-omada-1',
    timeoutMs: 5000,
    tokenTtlSafetySeconds: 60,
    tlsRejectUnauthorized: false,
  },
  logger,
)) {
  const packages = makeFakePackageRepository([makePackage()]);
  const customers = makeFakeCustomerRepository();
  const payments = makeFakePaymentRepository();
  const portalSessions = makeFakePortalSessionRepository();
  const vouchers = makeFakeVoucherRepository();
  const jobs = makeFakeJobRepository();

  const paymentProvider = new FakePaymentProvider(WEBHOOK_SECRET, logger);

  const paymentService = new PaymentService(packages, customers, payments, portalSessions, paymentProvider, logger);
  const webhookService = new PaymentWebhookService(payments, jobs, paymentProvider, logger);
  const omadaVoucherService = new OmadaVoucherService(omadaClient, logger);
  const provisioningService = new VoucherProvisioningService(
    payments,
    packages,
    portalSessions,
    vouchers,
    omadaVoucherService,
    logger,
  );

  return {
    packages,
    payments,
    vouchers,
    jobs,
    paymentProvider,
    paymentService,
    webhookService,
    provisioningService,
  };
}

async function runOneJob(h: ReturnType<typeof buildHarness>) {
  const [job] = await h.jobs.claimDue(1);
  if (!job) return null;
  try {
    if (job.type === JOB_TYPES.PROVISION_VOUCHER) {
      await h.provisioningService.provision((job.payload as { paymentId: string }).paymentId);
    }
    await h.jobs.markDone(job.id);
  } catch (err) {
    await h.jobs.markFailedOrRetry(job.id, err instanceof Error ? err.message : String(err), 0);
    throw err;
  }
  return job;
}

const purchaseInput = {
  packageId: 'package_3_hours',
  phoneNumber: '0712345678',
  clientMac: 'AA:BB:CC:DD:EE:FF',
  siteId: 'mock-site-1',
};

describe('End-to-end simulated purchase (spec section 32/37 phase 9)', () => {
  it('drives payment -> verified webhook -> voucher CREATED to completion', async () => {
    const h = buildHarness();

    const created = await h.paymentService.createPayment(purchaseInput);
    expect(created.status).toBe('PENDING');

    const payment = await h.payments.findById(created.paymentId);
    expect(payment?.providerTransactionId).toMatch(/^fake_/);

    const { body, headers } = h.paymentProvider.buildWebhookPayload(
      payment!.transactionReference,
      payment!.providerTransactionId!,
      'SUCCESS',
    );
    const result = await h.webhookService.handle({ headers, rawBody: body });
    expect(result.httpStatus).toBe(200);

    const paidPayment = await h.payments.findById(created.paymentId);
    expect(paidPayment?.status).toBe('SUCCESS');
    expect(paidPayment?.paidAt).not.toBeNull();

    // ProvisionVoucherJob
    const voucherJob = await runOneJob(h);
    expect(voucherJob?.type).toBe(JOB_TYPES.PROVISION_VOUCHER);
    const voucher = await h.vouchers.findByPaymentId(created.paymentId);
    expect(voucher?.status).toBe('CREATED');
    expect(voucher?.voucherCode).toBeTruthy();

    // No more jobs left - the portal auto-authenticates the client and shows
    // the code; there is no SMS step.
    expect(await runOneJob(h)).toBeNull();
  });

  it('is idempotent under a duplicate webhook: one payment, one voucher, one provisioning job', async () => {
    const h = buildHarness();
    const created = await h.paymentService.createPayment(purchaseInput);
    const payment = await h.payments.findById(created.paymentId);

    const { body, headers } = h.paymentProvider.buildWebhookPayload(
      payment!.transactionReference,
      payment!.providerTransactionId!,
      'SUCCESS',
    );

    const first = await h.webhookService.handle({ headers, rawBody: body });
    const second = await h.webhookService.handle({ headers, rawBody: body });
    const third = await h.webhookService.handle({ headers, rawBody: body });

    expect(first.httpStatus).toBe(200);
    expect(second.body.duplicate).toBe(true);
    expect(third.body.duplicate).toBe(true);

    // Only one PROVISION_VOUCHER job exists no matter how many webhooks arrived.
    const jobs = await h.jobs.claimDue(10);
    const provisionJobs = jobs.filter((j) => j.type === JOB_TYPES.PROVISION_VOUCHER);
    expect(provisionJobs).toHaveLength(1);

    await h.provisioningService.provision(created.paymentId);
    await h.provisioningService.provision(created.paymentId); // re-running must not create a 2nd voucher

    const voucher = await h.vouchers.findByPaymentId(created.paymentId);
    expect(voucher?.status).toBe('CREATED');
  });

  it('rejects a webhook with an invalid signature and does not touch the payment', async () => {
    const h = buildHarness();
    const created = await h.paymentService.createPayment(purchaseInput);
    const payment = await h.payments.findById(created.paymentId);

    const result = await h.webhookService.handle({
      headers: { 'x-fake-signature': 'deadbeef' },
      rawBody: Buffer.from(
        JSON.stringify({
          transactionReference: payment!.transactionReference,
          providerTransactionId: payment!.providerTransactionId,
          status: 'SUCCESS',
        }),
      ),
    });

    expect(result.httpStatus).toBe(400);
    const stillPending = await h.payments.findById(created.paymentId);
    expect(stillPending?.status).toBe('PENDING');
  });

  it('failed payment flow: FAILED webhook never enqueues voucher provisioning', async () => {
    const h = buildHarness();
    const created = await h.paymentService.createPayment(purchaseInput);
    const payment = await h.payments.findById(created.paymentId);

    const { body, headers } = h.paymentProvider.buildWebhookPayload(
      payment!.transactionReference,
      payment!.providerTransactionId!,
      'FAILED',
    );
    const result = await h.webhookService.handle({ headers, rawBody: body });
    expect(result.httpStatus).toBe(200);

    const failedPayment = await h.payments.findById(created.paymentId);
    expect(failedPayment?.status).toBe('FAILED');

    const jobs = await h.jobs.claimDue(10);
    expect(jobs).toHaveLength(0);
  });

  it('prevents a duplicate in-flight payment for the same customer+package', async () => {
    const h = buildHarness();
    const first = await h.paymentService.createPayment(purchaseInput);
    const second = await h.paymentService.createPayment(purchaseInput);
    expect(second.paymentId).toBe(first.paymentId);
  });

  it('Omada failure after payment: voucher ends FAILED, no extra work is queued', async () => {
    const failingOmada: IOmadaClient = {
      cfg: {
        baseUrl: 'x',
        clientId: 'x',
        clientSecret: 'x',
        omadaId: 'x',
        timeoutMs: 1,
        tokenTtlSafetySeconds: 0,
        tlsRejectUnauthorized: false,
      },
      async request() {
        throw new Error('Omada controller unreachable');
      },
      async getSites() {
        return [];
      },
      async getClients() {
        return [];
      },
    };
    const h = buildHarness(failingOmada);
    const created = await h.paymentService.createPayment(purchaseInput);
    const payment = await h.payments.findById(created.paymentId);
    const { body, headers } = h.paymentProvider.buildWebhookPayload(
      payment!.transactionReference,
      payment!.providerTransactionId!,
      'SUCCESS',
    );
    await h.webhookService.handle({ headers, rawBody: body });

    await expect(runOneJob(h)).rejects.toThrow();

    const voucher = await h.vouchers.findByPaymentId(created.paymentId);
    expect(voucher?.status).toBe('FAILED');

    // The only job is the (now-retrying) provisioning job - nothing new spawned.
    const jobs = await h.jobs.claimDue(10);
    expect(jobs.every((j) => j.type === JOB_TYPES.PROVISION_VOUCHER)).toBe(true);
  });
});

describe('FakePaymentProvider signature verification', () => {
  it('signs and verifies consistently, and rejects a tampered body', async () => {
    const provider = new FakePaymentProvider(WEBHOOK_SECRET, logger);
    const { body, headers } = provider.buildWebhookPayload('TXN-1', 'fake_1', 'SUCCESS');
    const ok = await provider.verifyWebhook({ headers, rawBody: body });
    expect(ok.valid).toBe(true);

    const tampered = Buffer.from(body.toString('utf8').replace('SUCCESS', 'FAILED'));
    const bad = await provider.verifyWebhook({ headers, rawBody: tampered });
    expect(bad.valid).toBe(false);
  });
});
