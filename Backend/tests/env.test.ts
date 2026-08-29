import { describe, it, expect } from 'vitest';
import { assertEnvConsistency, parseEnv } from '../src/config/env.js';
import { ValidationError } from '../src/lib/errors.js';

const required = {
  OMADA_BASE_URL: 'https://omada:8043',
  OMADA_CLIENT_ID: 'client-1',
  OMADA_CLIENT_SECRET: 'secret-1',
  OMADA_ID: 'omada-1',
};

describe('parseEnv', () => {
  it('accepts a valid minimum config with defaults', () => {
    const env = parseEnv({ ...required });
    expect(env.PORT).toBe(3000);
    expect(env.HOST).toBe('localhost');
    expect(env.NODE_ENV).toBe('development');
    expect(env.OMADA_TLS_REJECT_UNAUTHORIZED).toBe(false);
    expect(env.OMADA_MODE).toBe('real');
  });

  it('rejects when OMADA_CLIENT_SECRET is missing', () => {
    const { OMADA_CLIENT_SECRET: _omitted, ...rest } = required;
    expect(() => parseEnv(rest)).toThrow(ValidationError);
  });

  it('rejects when OMADA_ID is missing', () => {
    const { OMADA_ID: _omitted, ...rest } = required;
    expect(() => parseEnv(rest)).toThrow(ValidationError);
  });

  it('coerces PORT and TLS flag', () => {
    const env = parseEnv({
      ...required,
      PORT: '8080',
      OMADA_TLS_REJECT_UNAUTHORIZED: 'true',
    });
    expect(env.PORT).toBe(8080);
    expect(env.OMADA_TLS_REJECT_UNAUTHORIZED).toBe(true);
  });

  it('rejects an invalid OMADA_PROVIDER value', () => {
    expect(() => parseEnv({ ...required, OMADA_MODE: 'bogus' })).toThrow(
      ValidationError,
    );
  });
});

describe('assertEnvConsistency', () => {
  it('rejects production + clickpesa without a checksum secret', () => {
    const env = parseEnv({
      ...required,
      NODE_ENV: 'production',
      PAYMENT_PROVIDER: 'clickpesa',
      CLICKPESA_CLIENT_ID: 'x',
      CLICKPESA_API_KEY: 'y',
    });
    expect(() => assertEnvConsistency(env)).toThrow(ValidationError);
  });

  it('allows production + clickpesa once the checksum secret is set', () => {
    const env = parseEnv({
      ...required,
      NODE_ENV: 'production',
      PAYMENT_PROVIDER: 'clickpesa',
      CLICKPESA_CHECKSUM_SECRET: 'sekret',
    });
    expect(() => assertEnvConsistency(env)).not.toThrow();
  });

  it('allows fake payments in production without any ClickPesa config', () => {
    const env = parseEnv({ ...required, NODE_ENV: 'production', PAYMENT_PROVIDER: 'fake' });
    expect(() => assertEnvConsistency(env)).not.toThrow();
  });

  it('requires OMADA_PORTAL_AUTH_URL when auth mode is portal', () => {
    const env = parseEnv({ ...required, OMADA_PORTAL_AUTH_MODE: 'portal' });
    expect(() => assertEnvConsistency(env)).toThrow(ValidationError);
  });
});