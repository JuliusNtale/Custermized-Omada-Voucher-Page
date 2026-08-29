import type { Logger } from '../../lib/logger.js';
import { OmadaApiError } from '../../lib/errors.js';
import type { IOmadaClient } from './omada.client.js';
import { OMADA_PATHS } from './omada.paths.js';
import type {
  OmadaGrid,
  OmadaPortalSetting,
  OmadaPortalSummary,
  OmadaSsidInfo,
} from './omada.types.js';

interface WlanGroup {
  wlanId: string;
  name?: string;
  primary?: boolean;
}

export interface EnsureExternalPortalInput {
  /** Portal name (also the idempotency key - an existing portal with this name is updated in place). */
  name: string;
  /** Public HTTPS URL of the captive portal, e.g. https://portal.neuraltale.com */
  portalUrl: string;
  /** SSID ids to bind this portal to. */
  ssidIds: string[];
  /** Nominal session timeout - real duration is enforced by the voucher. Default 8 hours. */
  authTimeoutHours?: number;
}

/**
 * Creates / updates the Omada captive-portal configuration for the
 * External Portal Server (authType=4) flow.
 *
 * VERIFIED live against the running controller (v5.15.24.19):
 *   GET   .../portals            -> summary rows (id, name, enable, ssidList, authType)
 *   POST  .../portal             -> result: <portalId>   (requires pageType + portalCustomize
 *                                    even though those fields are cosmetic for an external page)
 *   PATCH .../portal/{portalId}  -> update in place
 *   DELETE .../portal/{portalId}
 * The controller auto-allows pre-auth access to `externalPortal.serverUrl`,
 * so there is no separate walled-garden / free-authentication call.
 */
export class OmadaPortalService {
  constructor(
    private readonly client: IOmadaClient,
    private readonly logger: Logger,
  ) {}

  private get omadacId(): string {
    return this.client.cfg.omadaId;
  }

  /**
   * Every SSID on the site, with security mode. Walks each WLAN group because
   * the flat `.../wireless-network/ssids` endpoint omits `security`, which we
   * need to tell an open hotspot SSID from a WPA one.
   */
  async listSsids(siteId: string): Promise<OmadaSsidInfo[]> {
    const groups = await this.client.request<WlanGroup[]>(
      OMADA_PATHS.wlans(this.omadacId, siteId),
      { method: 'GET' },
    );
    const all: OmadaSsidInfo[] = [];
    for (const group of groups ?? []) {
      const grid = await this.client.request<OmadaGrid<OmadaSsidInfo>>(
        OMADA_PATHS.wlanSsids(this.omadacId, siteId, group.wlanId),
        { method: 'GET', query: { page: 1, pageSize: 1000 } },
      );
      for (const s of grid?.data ?? []) all.push({ ...s, wlanId: group.wlanId });
    }
    return all;
  }

  async listPortals(siteId: string): Promise<OmadaPortalSummary[]> {
    const path = OMADA_PATHS.portals(this.omadacId, siteId);
    const result = await this.client.request<OmadaPortalSummary[] | { data?: OmadaPortalSummary[] }>(path, {
      method: 'GET',
    });
    return Array.isArray(result) ? result : (result?.data ?? []);
  }

  /** Build the `PortalSetting` body for an External Portal Server. */
  private buildSetting(input: EnsureExternalPortalInput): OmadaPortalSetting {
    const url = new URL(input.portalUrl);
    const scheme = url.protocol.replace(':', '') || 'https';
    // serverUrl must NOT carry the scheme; keep host (+ path if any).
    const serverUrl = `${url.host}${url.pathname === '/' ? '' : url.pathname}`;

    return {
      name: input.name,
      enable: true,
      ssidList: input.ssidIds,
      authType: 4,
      authTimeout: { customTimeout: input.authTimeoutHours ?? 8, customTimeoutUnit: 2 },
      httpsRedirectEnable: true,
      landingPage: 1,
      pageType: 1,
      externalPortal: { hostType: 2, serverUrlScheme: scheme, serverUrl },
      portalCustomize: {
        defaultLanguage: 1,
        logoDisplay: true,
        welcomeEnable: false,
        termsOfServiceEnable: false,
        copyrightEnable: false,
      },
    };
  }

  /** Idempotently create or update the portal identified by `input.name`. */
  async ensureExternalPortal(
    siteId: string,
    input: EnsureExternalPortalInput,
  ): Promise<{ portalId: string; created: boolean }> {
    if (input.ssidIds.length === 0) {
      throw new OmadaApiError('Refusing to create a portal bound to zero SSIDs', {
        siteId,
      });
    }
    const setting = this.buildSetting(input);
    const existing = (await this.listPortals(siteId)).find((p) => p.name === input.name);

    if (existing) {
      await this.client.request<unknown>(
        OMADA_PATHS.portalById(this.omadacId, siteId, existing.id),
        { method: 'PATCH', json: setting },
      );
      this.logger.info(
        { event: 'omada.portal.updated', portalId: existing.id, siteId, ssidCount: input.ssidIds.length },
        'Updated Omada external captive portal',
      );
      return { portalId: existing.id, created: false };
    }

    const portalId = await this.client.request<string>(
      OMADA_PATHS.portal(this.omadacId, siteId),
      { method: 'POST', json: setting },
    );
    this.logger.info(
      { event: 'omada.portal.created', portalId, siteId, ssidCount: input.ssidIds.length },
      'Created Omada external captive portal',
    );
    return { portalId, created: true };
  }

  async deletePortal(siteId: string, portalId: string): Promise<void> {
    await this.client.request<unknown>(
      OMADA_PATHS.portalById(this.omadacId, siteId, portalId),
      { method: 'DELETE' },
    );
    this.logger.info({ event: 'omada.portal.deleted', portalId, siteId }, 'Deleted Omada portal');
  }
}
