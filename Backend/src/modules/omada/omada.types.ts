/**
 * Omada Open API types.
 *
 * These models are derived from the documented Omada Open API (OAuth2
 * client-credentials) envelope: every response is `{ code, message, result }`
 * where `code === 0` means success.
 */

export interface OmadaConfig {
  /** e.g. https://omada:8043 when running in Docker Compose, or https://<host>:8043 */
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  /** omadacId identifying the Omada controller the app belongs to */
  omadaId: string;
  siteId?: string;
  timeoutMs: number;
  /** Buffer subtracted from the provider `expiresIn` to avoid expiry races */
  tokenTtlSafetySeconds: number;
  /** Omada controllers use self-signed TLS certs; disable CA verification only for them */
  tlsRejectUnauthorized: boolean;
}

export interface OmadaTokenResult {
  accessToken: string;
  /** epoch ms */
  expiresAt: number;
}

/** Standard Omada Open API envelope.
 *
 * VERIFIED against the installed controller (v5.15.24.19, "Omada Open API" v0.1):
 * every operation response is `{ errorCode, msg, result }` where `errorCode === 0`
 * is success. (`code`/`message` are kept as fallbacks for robustness, but the
 * authoritative fields are `errorCode`/`msg`.)
 */
export interface OmadaEnvelope<T = unknown> {
  errorCode?: number;
  code?: number;
  msg?: string;
  message?: string;
  result?: T;
}

/** Grid/pagination container used by list endpoints. */
export interface OmadaGrid<T> {
  totalRows?: number;
  currentPage?: number;
  currentSize?: number;
  data?: T[];
}

/**
 * Voucher models - VERIFIED from the installed controller's OpenAPI
 * (`components/schemas/CreateVoucherGroupOpenApiVO`, `VoucherGroupOpenApiVO`,
 * `SimpleVoucherOpenApiVO`, `VoucherOpenApiVO`).
 *
 * Note: voucher durations are expressed in MINUTES in the API.
 */

/** Rate limit object required by CreateVoucherGroupOpenApiVO. */
export interface OmadaRateLimit {
  /** 0: customRateLimit, 1: rateLimitProfileId */
  mode: 0 | 1;
  rateLimitProfileId?: string;
  customRateLimit?: OmadaCustomRateLimit;
}

export interface OmadaCustomRateLimit {
  downLimitEnable: boolean;
  /** Kbps */
  downLimit?: number;
  upLimitEnable: boolean;
  /** Kbps */
  upLimit?: number;
}

/** Request body for `POST .../hotspot/voucher-groups` (CreateVoucherGroupOpenApiVO). */
export interface CreateVoucherGroupRequest {
  name: string; // 1-32 chars
  amount: number; // vouchers to generate (1-5000)
  codeLength: number; // 6-10
  codeForm: number[]; // 0=Number, 1=Letter, e.g. [0]
  limitType: number; // 0=Limited Usage Counts, 1=Limited Online Users, 2=Unlimited
  limitNum?: number;
  durationType: number; // 0=Client duration, 1=Voucher duration
  duration: number; // MINUTES of one use (1-14400000)
  timingType: number; // 0=Timing by time, 1=Timing by usage
  rateLimit: OmadaRateLimit;
  trafficLimitEnable: boolean;
  trafficLimit?: number; // MB
  trafficLimitFrequency?: number; // 0..3
  applyToAllPortals: boolean;
  portals?: string[];
  unitPrice?: number;
  currency?: string;
  expirationTime?: number; // epoch ms
  effectiveTime?: number; // epoch ms
  logout?: boolean;
  description?: string;
  printComments?: string;
  validityType?: number; // 0..2
}

/** A voucher group (VoucherGroupOpenApiVO). */
export interface OmadaVoucherGroup {
  id?: string;
  name?: string;
  createdTime?: number;
  limitType?: number;
  durationType?: number;
  /** minutes */
  duration?: number;
  timingType?: number;
  rateLimit?: OmadaRateLimit;
  trafficLimitEnable?: boolean;
  unitPrice?: string;
  currency?: string;
  applyToAllPortals?: boolean;
  unusedCount?: number;
  usedCount?: number;
  inUseCount?: number;
  totalCount?: number;
  /** generated vouchers (page data) */
  data?: OmadaSimpleVoucher[];
  [key: string]: unknown;
}

/** A generated voucher within a group (SimpleVoucherOpenApiVO). */
export interface OmadaSimpleVoucher {
  id?: string;
  code?: string;
  status?: number; // 0=unused, 1=in use, 2=expired
  timeLeftSec?: number;
  [key: string]: unknown;
}

/** A single voucher (VoucherOpenApiVO). */
export interface OmadaVoucher {
  id?: string;
  code?: string;
  valid?: boolean;
  /** minutes */
  duration?: number;
  durationType?: number;
  limitType?: number;
  used?: number;
  [key: string]: unknown;
}

/**
 * Normalised from the wire schema `SiteSummaryInfo` (components.schemas in
 * the spec), whose id field is `siteId` - `OmadaClient.getSites()` maps that
 * to `id` here so callers don't need to know the wire field name.
 */
export interface OmadaSite {
  id: string;
  name: string;
  type?: string;
}

export interface OmadaClientInfo {
  mac: string;
  ip?: string;
  hostname?: string;
  ssid?: string;
  apMac?: string;
  isGuest?: boolean;
  [key: string]: unknown;
}

/**
 * Captive-portal config - subset of the controller's `PortalSetting` schema
 * we actually set for an External Portal Server (authType=4). VERIFIED live:
 * `authType`, `authTimeout`, `httpsRedirectEnable`, `landingPage`, `name`,
 * `pageType` and `portalCustomize` are all required by the create validator
 * even though most `portalCustomize` fields are cosmetic and unused when the
 * portal page is hosted externally.
 */
export interface OmadaExternalServerPortal {
  /** 2: URL (we always use URL, not IP). */
  hostType?: 1 | 2;
  /** 'http' | 'https' */
  serverUrlScheme?: string;
  /** hostname (+ optional path), WITHOUT the scheme, e.g. 'portal.example.com'. */
  serverUrl?: string;
}

export interface OmadaPortalAuthTimeout {
  customTimeout?: number;
  /** 1: min, 2: hour, 3: day */
  customTimeoutUnit?: 1 | 2 | 3;
}

export interface OmadaPortalCustomize {
  /** 1 = en_US */
  defaultLanguage: number;
  logoDisplay: boolean;
  welcomeEnable: boolean;
  termsOfServiceEnable: boolean;
  copyrightEnable: boolean;
}

export interface OmadaPortalSetting {
  name: string;
  enable: boolean;
  /** SSID ids this portal is bound to. */
  ssidList?: string[];
  networkList?: string[];
  /** 0: No Auth, 1: Simple Password, 2: External RADIUS, 4: External Portal Server, 11: Hotspot. */
  authType: number;
  authTimeout: OmadaPortalAuthTimeout;
  httpsRedirectEnable: boolean;
  /** 1: original URL, 2: promotional URL, 3: logout page. */
  landingPage: number;
  /** 1: default page, 2: uploaded page. */
  pageType?: number;
  externalPortal?: OmadaExternalServerPortal;
  portalCustomize?: OmadaPortalCustomize;
}

/** A row from `GET .../portals`. */
export interface OmadaPortalSummary {
  id: string;
  name: string;
  enable: boolean;
  ssidList?: string[];
  networkList?: string[];
  authType: number;
}

/** A row from `GET .../wireless-network/ssids`. */
export interface OmadaSsidInfo {
  ssidId: string;
  name: string;
  wlanId?: string;
  band?: number;
  /** 0: None (open), 3: WPA-Personal, ... */
  security?: number;
  [key: string]: unknown;
}