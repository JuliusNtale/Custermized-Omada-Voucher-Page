# Architecture & Omada API Verification

## Proposed system architecture

```
Customer phone
  |  Wi-Fi
  v
TP-Link EAP225
  |
  v
TP-Link ER605
  |
  v
Omada Controller (Docker)      https://omada:8043  (service name, shared network)
  |  external captive portal redirect
  v
Captive Portal (Next.js, separate repo)   -- before: static HTML template in ./Captive Portal
  |
  v
Backend API (this repo)   [Fastify + PostgreSQL + Pino + Zod]
  |
  +--------------------+
  |                    |
  v                    v
Payment provider     Omada Open API
(ClickPesa USSD)     (voucher + hotspot client auth)
  |                    |
  +--------------------+--> voucher provisioning -> client auth
  v
verified payment only -> create Omada voucher -> auto-authenticate client
```

## Payment / provisioning ordering rule

```
PAYMENT_CREATED -> PAYMENT_PENDING -> PAYMENT_SUCCESS
  -> CREATE_OMADA_VOUCHER  (ONLY after verified SUCCESS)
  -> VOUCHER_CREATED -> client auto-authenticated + code shown -> COMPLETED
```

(No SMS step - removed. The captive portal auto-authenticates the client via
`POST /api/portal/authenticate` and displays the voucher code on-screen.)

The backend must verify payment via the provider API/webhook; it **never trusts the
frontend** to confirm payment, and it **never creates a voucher before the payment is
verified SUCCESS** (with duplicate-webhook / idempotency guards).

> SMS was removed from the flow (2026-08). The customer gets connectivity via the
> portal's auto-login and the voucher code on-screen; no "voucher ready" SMS.

## Milestone roadmap

1. ✅ Project setup (TS, Fastify, Docker, Postgres scaffold, env)
2. ✅ Database schema & migrations (Prisma), package seed, catalog API (`/api/packages`, `/ready`)
3. ✅ Omada API client: auth + token + connectivity probe (paths verified against `/v3/api-docs`)
4. ✅ Omada site/client/voucher services (voucher-group schema verified against `omada-openapi.json`)
5. ✅ Fake payment provider (`PAYMENT_PROVIDER=fake`)
6. ✅ Payment state machine + idempotent, signature-verified webhook
7. ✅ Voucher provisioning after verified payment (DB-backed job queue, `OMADA_MODE=mock` for dev)
8. ✅ End-to-end simulated purchase (see Backend/README.md "Local end-to-end purchase")
9. ✅ Real payment provider - `ClickPesaProvider` implemented against ClickPesa's own docs
   (USSD-PUSH, checksum, `PAYMENT RECEIVED`/`PAYMENT FAILED` webhooks); credentials verified
   live. Going live needs the checksum key + webhook URL registered in the dashboard.
10. ✅ External Portal Server captive-portal flow: static portal in `Backend/public/` served at
    `portal.neuraltale.com` (Cloudflare tunnel), `/api/portal/*` routes,
    `src/scripts/omada-portal-setup.ts` provisions the Omada portal (authType=4) + open SSID.
    End-to-end Wi-Fi test blocked on a physical EAP being adopted.
11. ~~Real SMS provider~~ — **removed**. Portal auto-login + on-screen voucher code replace it.
12. ✅ Real Omada authentication flow — `npm run omada:connect` succeeds against the live
    controller; portal client-auth (`/api/portal/authenticate`) implemented, not yet exercised
    against a real connected Wi-Fi client (`OMADA_PORTAL_AUTH_MODE=api`, `portal` fallback stubbed)
13. Production Docker Compose
14. Multi-tenant / RBAC admin

## Omada API verification checklist (do this against the running controller)

Endpoints come from the controller's own Online API Documentation
(`https://{controller}:8043/v3/api-docs`, "Omada Open API" v0.1). Resource base path:
**`/openapi/v1`**, `omadacId` a PATH segment. The token endpoint lives OUTSIDE that base
(`/openapi/authorize/token`) and is documented separately, embedded in the same spec file
under `x-openapi.x-setting.homeCustomLocation` (the "Open API Access Guide") rather than in
the regular `paths` listing - grep the raw spec JSON, don't just search `paths` keys, or you
will miss it (see `Backend/README.md`'s live-verification section for the full story).

Verified paths (reflected in `src/modules/omada/omada.paths.ts`):
- [x] Token: `POST /openapi/authorize/token?grant_type=client_credentials`, JSON body
      `{ omadacId, client_id, client_secret }`. Auth header on all other calls is
      `Authorization: AccessToken=<token>`, not `Bearer`.
- [x] Sites listing: `GET /openapi/v1/{omadacId}/sites?page=1&pageSize=...` (page/pageSize
      required; response is a grid `{ data: [...] }`, id field is `siteId`)
- [x] Site clients: `GET /openapi/v1/{omadacId}/sites/{siteId}/clients`
- [x] Hotspot client auth (external-portal flow): `.../hotspot/clients/{clientMac}/auth` / `unauth`
- [x] Voucher-group model paths: `.../hotspot/voucher-groups` (+ sub-paths), `.../hotspot/vouchers/{id}`
- [x] Voucher CREATE request schema (`CreateVoucherGroupOpenApiVO`) — diffed field-for-field
      against `components.schemas` in the spec
- [x] Voucher **get**/**list**/**delete** schemas — confirmed
- [ ] Client **MAC binding** requirements for vouchers — not yet exercised against a real client
- [x] **Site ID** value/style — confirmed live (`siteId` is a Mongo ObjectId-style string)

### Live milestone: ACHIEVED
`npm run omada:connect` succeeds against the real controller. Getting here required fixing
three real bugs in this codebase, not resolving a controller-side blocker - see
`Backend/README.md`'s live-verification section for the full root-cause writeup:
1. The token endpoint path was simply wrong (`/openapi/v1/oauth2/token` never existed).
2. HTTP-level errors without an Omada envelope `errorCode` were silently treated as success.
3. The sites endpoint requires `page`/`pageSize`; omitting them is a 400, not an empty list.

## Secrets handling

- All secrets come from environment variables (see `Backend/.env.example`).
- Never commit `.env` (`.gitignore` now covers it; the previously committed root
  `.env` should be removed from history with `git rm --cached .env`).
- The frontend never holds payment/Omada/SMS credentials — they remain server-side.
- Structured logs redact secret keys; phone numbers are treated as personal data.

## Multi-tenancy (future)

The schema is designed to be extensible (Tenant → Sites → Packages → Customers →
Payments → Vouchers). The MVP keeps a single-tenant default; no complex tenancy is
implemented yet, but nothing is hard-coded to one location.