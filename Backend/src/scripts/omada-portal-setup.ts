/**
 * Provision the Omada captive portal for the External Portal Server flow (CLI).
 *
 *   Backend -> Omada Open API -> create/update a portal (authType=4) that
 *   redirects unauthenticated Wi-Fi clients to PORTAL_PUBLIC_URL.
 *
 * Idempotent: re-running updates the portal named "NeuralTale Portal" in place.
 *
 * Usage:
 *   npm run omada:portal                 # bind to PORTAL_SSID_IDS, or the sole open SSID
 *   npm run omada:portal -- --list       # just list SSIDs + portals, change nothing
 *   npm run omada:portal -- --ssid <id>[,<id>]
 *
 * Prerequisites:
 *   - OMADA_* configured and reachable (same as `npm run omada:connect`)
 *   - OMADA_SITE_ID set, PORTAL_PUBLIC_URL set
 *   - At least one SSID exists on the site. For a paid hotspot this should be
 *     an OPEN SSID (security = None) so clients can associate before paying;
 *     create it in the Omada UI when you adopt the EAP (see docs/PORTAL-SETUP.md).
 */
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { createOmadaClient } from '../modules/omada/create-omada-client.js';
import { OmadaPortalService } from '../modules/omada/omada.portal.service.js';

const PORTAL_NAME = 'NeuralTale Portal';

function parseSsidArg(): string[] | undefined {
  const i = process.argv.indexOf('--ssid');
  if (i !== -1 && process.argv[i + 1]) {
    return process.argv[i + 1].split(',').map((s) => s.trim()).filter(Boolean);
  }
  if (env.PORTAL_SSID_IDS) {
    return env.PORTAL_SSID_IDS.split(',').map((s) => s.trim()).filter(Boolean);
  }
  return undefined;
}

async function main(): Promise<void> {
  const siteId = env.OMADA_SITE_ID;
  if (!siteId) throw new Error('OMADA_SITE_ID is not set in Backend/.env');
  if (!env.PORTAL_PUBLIC_URL) throw new Error('PORTAL_PUBLIC_URL is not set in Backend/.env');

  const service = new OmadaPortalService(createOmadaClient(logger), logger);

  const ssids = await service.listSsids(siteId);
  logger.info(
    {
      event: 'omada.portal.setup.ssids',
      ssids: ssids.map((s) => ({ id: s.ssidId, name: s.name, security: s.security })),
    },
    `Found ${ssids.length} SSID(s) on the site`,
  );

  const listOnly = process.argv.includes('--list');
  if (listOnly) {
    const portals = await service.listPortals(siteId);
    logger.info({ event: 'omada.portal.setup.portals', portals }, `Found ${portals.length} portal(s)`);
    return;
  }

  let ssidIds = parseSsidArg();
  if (!ssidIds || ssidIds.length === 0) {
    const open = ssids.filter((s) => s.security === 0);
    if (open.length === 1) {
      ssidIds = [open[0].ssidId];
      logger.info(
        { event: 'omada.portal.setup.ssid_auto', ssidId: open[0].ssidId, name: open[0].name },
        `Auto-selected the only open SSID: "${open[0].name}"`,
      );
    } else {
      throw new Error(
        `Cannot pick an SSID automatically (${open.length} open SSIDs). ` +
          'Pass --ssid <id>[,<id>] or set PORTAL_SSID_IDS. Available: ' +
          ssids.map((s) => `${s.name}=${s.ssidId}(security ${s.security})`).join(', '),
      );
    }
  }

  const { portalId, created } = await service.ensureExternalPortal(siteId, {
    name: PORTAL_NAME,
    portalUrl: env.PORTAL_PUBLIC_URL,
    ssidIds,
  });

  const portals = await service.listPortals(siteId);
  logger.info(
    { event: 'omada.portal.setup.done', portalId, created, portals },
    `Portal "${PORTAL_NAME}" ${created ? 'created' : 'updated'} -> ${portalId}. ` +
      `Unauthenticated clients on the bound SSID(s) now redirect to ${env.PORTAL_PUBLIC_URL}`,
  );
}

main().catch((err) => {
  logger.fatal(
    { event: 'omada.portal.setup.failure', error: err instanceof Error ? err.message : String(err) },
    'Omada portal setup FAILED',
  );
  process.exit(1);
});
