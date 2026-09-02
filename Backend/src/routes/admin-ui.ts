import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

/**
 * Serves the admin dashboard shell at GET /admin (and /admin/).
 *
 * The HTML/CSS/JS carry NO data - the page prompts for the admin key, keeps it
 * in sessionStorage, and sends it as `x-admin-key` when it fetches
 * /api/admin/stats (which IS guarded). So this route is deliberately
 * unauthenticated: a browser navigating to /admin cannot attach a custom
 * header, and there is nothing sensitive in the shell itself.
 *
 * Registered separately from adminRoutes precisely because that plugin gates
 * every route behind requireAdmin. `reply.sendFile` comes from @fastify/static,
 * which is registered in app.ts with root = Backend/public.
 */
export async function adminUiRoutes(app: FastifyInstance): Promise<void> {
  const send = (_req: FastifyRequest, reply: FastifyReply): FastifyReply =>
    reply.sendFile('admin.html');
  app.get('/admin', send);
  app.get('/admin/', send);
}
