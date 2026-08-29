# Captive portal + payment go-live

The backend implements the **External Portal Server** flow (Omada `authType=4`):

```
client joins open SSID
  -> Omada redirects to  https://portal.neuraltale.com/?clientMac=..&apMac=..&ssidName=..&site=..&originUrl=..
  -> customer picks a package + enters phone number
  -> POST /api/payments            (backend -> ClickPesa USSD-PUSH)
  -> customer approves on their phone
  -> ClickPesa -> POST https://webhooks.neuraltale.com/api/payments/webhook  (checksum-verified)
  -> background job creates ONE Omada voucher
  -> portal calls POST /api/portal/authenticate
       -> backend: POST .../hotspot/clients/{clientMac}/auth   (OMADA_PORTAL_AUTH_MODE=api)
  -> device is online; the voucher code is shown on-screen to reconnect later
```

There is **no SMS**.

## One-time setup

### 1. Hardware / Omada

1. **Adopt an EAP** (access point) into the `Dar Es Salaam_1` site. The ER605
   gateway alone cannot broadcast Wi-Fi or run a wireless portal.
2. **Create an OPEN SSID** for the paid hotspot (Omada UI →
   *Settings → Wireless Networks → Create*): security **None**, broadcast on.
   Clients must be able to associate *before* paying. (The existing
   `Unlimited_5G` SSID is WPA-Personal — leave it for private use.)
3. Note the new SSID's id: `npm run omada:portal -- --list`.
4. **Provision the portal:**
   ```bash
   # Backend/.env: PORTAL_PUBLIC_URL=https://portal.neuraltale.com
   #               PORTAL_SSID_IDS=<open-ssid-id>      (or pass --ssid)
   npm run omada:portal
   ```
   Idempotent — re-run any time to update. It creates/updates a portal named
   **"NeuralTale Portal"**, `authType=4`, bound to the SSID, pointing at
   `PORTAL_PUBLIC_URL`. Omada auto-allows pre-auth access to that URL (no
   walled-garden entry needed).
5. **Verify the redirect:** connect a phone to the open SSID → it should land
   on `portal.neuraltale.com` with `clientMac`/`ssidName`/`originUrl` in the
   query string.
6. **Verify auto-login:** complete a real low-value payment → the device
   should get internet with no code typing. If it does **not**, the Open API
   `hotspot/clients/{mac}/auth` call may not authorise clients under
   `authType=4` on this firmware — switch to the fallback:
   `OMADA_PORTAL_AUTH_MODE=portal` + `OMADA_PORTAL_AUTH_URL=...` (the
   `portal` branch in `portal.service.ts` still needs finishing once the exact
   external-portal form fields from a real redirect are known).

### 2. Cloudflare tunnel

`cloudflared/config.yml` already routes `portal.neuraltale.com` →
`backend:3000`. Add the DNS record once:

```bash
docker compose exec cloudflared cloudflared tunnel route dns \
  fde68d72-fc90-4345-bed6-b7f7ba287963 portal.neuraltale.com
```

(or add a CNAME `portal` → `fde68d72-fc90-4345-bed6-b7f7ba287963.cfargotunnel.com`
in the Cloudflare dashboard). Then `docker compose up -d cloudflared` and check
`https://portal.neuraltale.com/api/packages` responds.

### 3. ClickPesa

In the ClickPesa dashboard (**Settings → Developers → your app**):

1. **Enable checksums** and copy the **checksum key** →
   `Backend/.env` `CLICKPESA_CHECKSUM_SECRET=...`.
   The backend refuses to boot in production without it
   (`PAYMENT_PROVIDER=clickpesa`).
2. **Application Webhooks** → set
   `https://webhooks.neuraltale.com/api/payments/webhook`.
3. Confirm the app is approved for **live USSD-PUSH mobile-money collections**
   (not just sandbox) and note the min/max amount.
4. Flip `Backend/.env` `PAYMENT_PROVIDER=clickpesa`, `NODE_ENV=production`,
   redeploy, and run one real 500 TZS test purchase end-to-end.

Credential check (no money moves): `npm run clickpesa:connect`.
