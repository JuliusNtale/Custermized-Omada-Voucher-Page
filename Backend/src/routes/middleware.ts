import { timingSafeEqual } from 'node:crypto';
import type { FastifyRequest } from 'fastify';
import { env } from '../config/env.js';
import { UnauthorizedError } from '../lib/errors.js';

/** Constant-time string compare (avoids leaking the key via response timing). */
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

/**
 * Minimal admin guard using a shared secret header. Now that /api/admin/* and
 * the /admin dashboard are reachable through the public Cloudflare tunnel, the
 * comparison is constant-time. A proper RBAC/roles system replaces this later.
 */
export function requireAdmin(request: FastifyRequest): void {
  if (!env.ADMIN_API_KEY) {
    throw new UnauthorizedError('Admin access is not configured (ADMIN_API_KEY)');
  }
  const supplied = request.headers['x-admin-key'];
  if (typeof supplied !== 'string' || !safeEqual(supplied, env.ADMIN_API_KEY)) {
    throw new UnauthorizedError('Invalid or missing admin key');
  }
}