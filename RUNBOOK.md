# Hotspot Operations Runbook

_Reviewed 2026-09-02. Keep a copy off the Pi._

Every way this hotspot can fall over — power, internet, the Omada controller, the
backend, the tunnel, ClickPesa, the hardware, the SD card — what you actually see
when it happens, and the exact commands to bring it back.

**Stack:** Raspberry Pi 4 + Docker. Containers: `omada-controller`, `backend-api`,
`cloudflared-tunnel`. Gateway: TP-Link ER605. Payments: ClickPesa USSD. Repo on the
Pi: `~/Omada-Radius-Server` — run every `docker compose` from there.

**Severity:**
🔴 Critical — nobody connects, or money is owed · 🟠 Degraded — no new sales, existing
users fine · 🟡 Minor — recoverable annoyance.

---

## First response — run this before anything else

Nine times out of ten one of these tells you which box is unhappy, and half of them
are also the fix.

```bash
# 1. Is everything running?
docker ps

# 2. Backend + its database
curl -s localhost:3000/health ; echo
curl -s localhost:3000/ready  ; echo

# 3. Backend can reach the Omada controller?  (key: Backend/.env ADMIN_API_KEY)
curl -sk -X POST localhost:3000/api/omada/connectivity-test \
  -H "x-admin-key: $ADMIN_KEY" -d '{}' ; echo

# 4. Pi health + is the IP still 192.168.174.100 ?
free -m ; df -h / ; hostname -I

# 5. Bounce whatever looked wrong
cd ~/Omada-Radius-Server && docker compose restart <omada|backend|cloudflared>
```

If `docker ps` shows a container missing or looping, its own log says why:

```bash
docker logs backend-api      --tail 50
docker logs omada-controller --tail 50
docker logs cloudflared-tunnel --tail 30
```

---

## After a power cut — what heals itself

Docker is enabled in systemd, every container is `restart: unless-stopped`, the
images are already on the card, and both data volumes persist. When power returns the
whole stack comes back **with no action from you**. Rough timeline:

| Time | What |
|---|---|
| 0:00 | Power returns. ER605 and the Pi begin booting. |
| ~1:30 | ER605 up; WAN dials back in. |
| ~2:00 | Pi booted, Docker starting containers. `backend-api` listens ~15s later. |
| ~3:00 | EAP powered back, re-adopts, starts broadcasting `Unlimited_5G`. |
| 3–5:00 | `omada-controller` fully up (Java + Mongo are slow). Log may say "unclean shutdown, repairing" — normal, let it finish. |
| ~5:00 | `cloudflared` reconnects once the uplink is stable. Sales work again. |

If it's not all healthy after ~10 minutes, work the first-response list. The two
things a power cut can genuinely break — a corrupted SD card and the Pi landing on a
new IP — are **P2** and **P3** below.

---

## A · Power & hardware

### P1 · Site power cut — 🟠
**You see:** Everything dark. No Wi-Fi, nothing answers.
**Happening:** Pi, ER605 and EAP are all off.
**Fix:** Wait ~5–10 min after power returns (see the timeline), then run first-response.
Do **not** pull power from the Pi again while Omada is mid-repair.
**Prevent:** A small UPS on the Pi *and* the ER605 — even 20 minutes rules out the
SD-card corruption in P2. Boot the Pi from a USB SSD instead of microSD.

### P2 · SD card / database corruption after an abrupt cut — 🔴
**You see:** Pi won't boot, or boots read-only; or `backend-api` logs `SQLITE_CORRUPT`
/ `database disk image is malformed`; or Omada's Mongo refuses to start.
**Happening:** Power lost during a disk write left the filesystem or a DB file
inconsistent. The microSD card is the fragile part.
**Fix:**
```bash
# check the payment DB
docker exec backend-api sh -c \
 'apk add --no-cache sqlite >/dev/null 2>&1; \
  sqlite3 /data/wifi_business.db "PRAGMA integrity_check;"'
```
- **DB corrupt** → restore the latest backup copy (see D2), then `docker compose up -d backend`.
- **OS won't boot** → reflash a spare card from a saved image; `git clone` the repo;
  restore your offline copy of `Backend/.env`; restore the `backend-data` and
  `omada-data` volumes from backup; `docker compose up -d`.
- **Mongo only** → usually self-repairs on next start; else `docker compose down omada && docker compose up -d omada`.

**Prevent:** everything in "Fix before it bites" — daily SQLite backup off the Pi, an
`omada-data` backup, USB-SSD boot, UPS.

### P3 · Pi comes back on a different IP — 🔴 (silent — sales just stop)
**You see:** The portal works when *you* test it, but customers say the page never
loads after connecting.
**Happening:** Omada redirects clients to `http://192.168.174.100:3000`. That address
is a DHCP lease from the ER605; after a reboot the Pi can land elsewhere and the
redirect points at nothing.
**Fix:**
```bash
hostname -I   # what did the Pi actually get?
```
If it isn't `192.168.174.100`: set it back (or reserve it, below) and re-point the
portal — edit `PI_IP` in `~/omada.sh`, run `bash ~/omada.sh local-portal`, then
`bash ~/omada.sh portal` to confirm.
**Prevent:** **Do this now.** Omada UI → Clients → the Pi → fix its IP / add a DHCP
reservation for its MAC.

### P4 · EAP down (unplugged, PoE fault, dead unit) — 🟠 / 🔴 if it's your only AP
**You see:** No Wi-Fi, or a dead zone with multiple APs. Wired VLAN 10 still works.
**Happening:** No PoE power, bad cable, or failed unit. It re-adopts and re-downloads
its config on its own once back.
**Fix:** Check the PoE injector/switch and cable; swap the injector; try another port.
Dead unit → fit a replacement, adopt it in the controller, it pulls the SSID config.
**Prevent:** Keep a spare EAP. Label every PoE injector.

### P5 · ER605 gateway down or dead — 🔴 (total)
**You see:** Total outage — no internet, no Wi-Fi, VLAN 10 clients get no IP.
**Happening:** The ER605 is the gateway, the DHCP server for the hotspot VLAN, and
half the captive-portal enforcement. Single point of failure.
**Fix:** Power-cycle. If dead: fit a replacement, adopt it — the controller re-pushes
the whole config. You need the WAN / PPPoE credentials on hand.
**Prevent:** Know your same-day source for another ER605. Keep a config export + ISP
credentials off the Pi.

---

## B · Internet & WAN

### N1 · Internet down, power and LAN fine — 🟠
**You see:** Connected customers lose internet. New customers still reach the portal
page, but it says "Payment not completed" the instant they submit.
**Happening:** The portal page is LAN-served, so it loads. Taking a payment needs the
backend to reach `api.clickpesa.com` — it can't, so the payment is marked FAILED. The
tunnel drops and keeps retrying.
**Fix:** Nothing on your side. When the line returns, cloudflared reconnects in ~30s.
Confirm the path:
```bash
docker exec backend-api node -e "fetch('https://api.clickpesa.com/third-parties/generate-token',\
{method:'POST',headers:{'client-id':process.env.CLICKPESA_CLIENT_ID,\
'api-key':process.env.CLICKPESA_API_KEY}}).then(r=>console.log('HTTP',r.status))"
```
Afterwards, open `/admin` and reconcile any "Abandoned" payments against the ClickPesa
dashboard.
**Prevent:** A backup WAN (mobile-data failover on the ER605) if uptime is worth it.

### N2 · Internet up but flaky — intermittent DNS / slow first connection — 🟡
**You see:** Some payments go through, some fail with "Failed to reach ClickPesa" or a
timeout; the first request after a quiet spell is slow.
**Happening:** The ER605's DNS forwarder drops external lookups, and the uplink is
slow to open a fresh connection. Containers are already pinned to `1.1.1.1` /
`8.8.8.8` and the ClickPesa timeout is 30s, which absorbs most of it.
**Fix:** If bad, set static DNS (`1.1.1.1`, `8.8.8.8`) on the ER605's **WAN** and
reboot it.
**Prevent:** A better uplink.

---

## C · Omada controller

### C1 · Controller container down or crashed — 🔴
**You see:** Existing customers stay online, but anyone who **pays now** gets stuck on
"activating your access". `/admin` shows "Failed jobs" climbing; logs show
`voucher.provision.failed` / `Omada API error`.
**Happening:** The EAP keeps broadcasting and enforcing the portal from cached config
even with the controller offline — so people still connect and pay — but the backend
needs the controller's API to create the voucher *and* authorize the device. Both
fail; the job retries 3× then logs `admin.alert`.
**Fix:**
```bash
cd ~/Omada-Radius-Server && docker compose restart omada   # wait 3–5 min
curl -sk -X POST localhost:3000/api/omada/connectivity-test \
  -H "x-admin-key: $ADMIN_KEY" -d '{}'                      # expect "success":true
```
Then re-run each stuck payment's provisioning (jobs don't auto-retry past 3 attempts):
```bash
docker exec backend-api node -e '
const {PrismaClient}=require("@prisma/client");const p=new PrismaClient();
(async()=>{const id="<paymentId>";
 await p.voucher.update({where:{paymentId:id},
   data:{status:"NOT_CREATED",voucherCode:null,omadaVoucherId:null}});
 await p.job.updateMany({where:{entityId:id,type:"PROVISION_VOUCHER"},
   data:{status:"PENDING",attempts:0,runAt:new Date(),lastError:null}});
 console.log("requeued");await p.$disconnect();})();'
```
The worker picks it up in seconds; the customer's page then connects on its own, or
force it: `bash ~/omada.sh auth <CLIENT-MAC>`.

Won't start? `docker logs omada-controller --tail 50`. Usual causes: Mongo repair
(wait), disk full (`df -h`), OOM (`dmesg | tail`). Then
`docker compose down omada && docker compose up -d omada`.
**Prevent:** Enable the memory cgroup + `mem_limit` (DEPLOY.md). Back up `omada-data`.
Build a "retry failed jobs" action into `/admin`.

### C2 · Controller up, but the backend can't authenticate to it — 🟠
**You see:** The connectivity test returns 401; logs show `OmadaAuthenticationError`.
**Happening:** The Open API credentials in `Backend/.env` (`OMADA_CLIENT_ID` /
`OMADA_CLIENT_SECRET` / `OMADA_ID`) no longer match the controller — the Open API app
was deleted/regenerated, or the controller was restored from an older backup.
**Fix:** Omada UI → Settings → Platform Integration → Open API → open or recreate the
"WiFi Business Backend" app, copy Client ID / Secret / Omadac ID into `Backend/.env`,
then `docker compose up -d backend`.

### C3 · Someone edited the Omada config in the UI — 🟠
**You see:** The redirect stops working, or clients can't join, right after a change
in the Omada dashboard.
**Happening:** The paid SSID's security got flipped off "None", the portal got
unbound, the VLAN changed, or the portal's server IP was edited.
**Fix:** Intended state — open SSID `Unlimited_5G` on VLAN 10; one External Portal
("NeuralTale Portal", authType 4) bound to that SSID *and* the VLAN 10 network,
pointing at `http://192.168.174.100:3000`. Re-apply + verify:
```bash
bash ~/omada.sh local-portal
bash ~/omada.sh portal
```
**Prevent:** Treat the Omada UI as read-only for the hotspot SSID/portal; change it
through `~/omada.sh`.

---

## D · Backend & portal

### B1 · Backend container down or crash-looping — 🔴
**You see:** Customers connect, get redirected, portal page shows "can't be reached".
No new sales. Existing users stay online.
**Happening:** The page and every `/api` route *are* the backend. It auto-restarts
unless it's crash-looping on bad config or a broken image.
**Fix:**
1. `docker ps` — is `backend-api` up? `docker logs backend-api --tail 50`.
2. Common: a required var missing/invalid in `Backend/.env` (Zod names it), DB file
   unreadable, disk full.
3. `docker compose up -d backend`.
4. Bad deploy? Roll back to the previous image:
```bash
docker pull ghcr.io/neuraltaletechnologies/omada-radius-server-backend:sha-<prev>
docker tag  ghcr.io/neuraltaletechnologies/omada-radius-server-backend:sha-<prev> \
            ghcr.io/neuraltaletechnologies/omada-radius-server-backend:latest
docker compose up -d backend
```
**Prevent:** Note the last known-good image sha after each deploy. `Backend/public/`
is bind-mounted — a bad portal-page edit is undone by editing the file back.

### B2 · Portal loads but shows "Something went wrong" / no packages — 🟠
**You see:** The page opens but can't list packages, or every action errors.
**Happening:** Backend up but can't reach its database, or the catalog is empty.
**Fix:** `curl -s localhost:3000/ready` (200 = DB OK). Else `docker logs backend-api`.
`docker compose restart backend` re-runs migrations + the idempotent seed. Corrupt
file → restore backup (D2).

### B3 · Customer paid but is stuck on "still activating" forever — 🔴 (money owed)
**You see:** Payment went through on their phone; the portal sits on "taking longer
than usual" and they never connect.
**Happening:** Payment is SUCCESS but voucher provisioning failed — almost always the
controller was unreachable at that moment (C1). After 3 tries the job stops.
**Fix:**
1. Find the payment — `/admin` → recent, or by phone in the DB.
2. Fix the root cause (usually: bring the controller back — C1).
3. Re-run provisioning (snippet in C1), *or* authorize the device directly:
   `bash ~/omada.sh auth <CLIENT-MAC>` — the MAC is on the portal URL as `clientMac=`
   and in the `PortalSession` row.
**Prevent:** The failed-job auto-retry gap.

---

## E · Cloudflare tunnel

### E1 · Tunnel down — 🔴
**You see:** The portal page still works, customers get the USSD prompt and approve
it, but the page hangs on "check your phone" then times out with "no payment received"
— **even though they paid**.
**Happening:** ClickPesa confirms a payment by calling
`https://webhooks.neuraltale.com/api/payments/webhook`, which only reaches the backend
through the tunnel. Tunnel down = the confirmation never arrives; the payment stays
PENDING. ClickPesa retries the webhook for a few hours.
**Fix:**
```bash
docker compose restart cloudflared
docker logs cloudflared-tunnel --tail 30
```
- Common: an outdated-version warning, Cloudflare edge unreachable (fix internet first
  — N1), or a missing credentials file.
- Once it's back, ClickPesa's retries deliver the backlog and stuck payments complete
  on their own (customers may need to reopen the portal).
- Anyone who already left: look them up in `/admin`, confirm "collected" in the
  ClickPesa dashboard, then provision manually + `bash ~/omada.sh auth <mac>`.

**Prevent:** **Add a fallback poll** — the backend should ask ClickPesa directly about
any payment still PENDING after ~60s, instead of relying only on the webhook.

### E2 · The neuraltale.com hostnames stop resolving — 🟠
**You see:** Webhooks fail. (The portal itself is fine — served by IP, not name.)
**Happening:** A DNS record was removed, the domain expired, or a Cloudflare account
issue.
**Fix:** Check the domain isn't expired. In Cloudflare, confirm the `CNAME`s for
`portal` and `webhooks` point at `<tunnel-id>.cfargotunnel.com`. Re-create:
```bash
docker compose exec cloudflared cloudflared tunnel \
  route dns <tunnel-id> webhooks.neuraltale.com
```
**Prevent:** Auto-renew the domain. Keep the tunnel ID with your other constants.

---

## F · ClickPesa payments

### F1 · USSD push fails for every customer — 🔴
**You see:** Submit → instant "Payment not completed", no prompt on any phone, nothing
in the ClickPesa dashboard.
**Happening:** ClickPesa is rejecting the backend's call — auth token, account status
(suspended, API access revoked), or the request shape — or it's the internet / DNS
(N1–N2).
**Fix:**
1. Token test (in N1). Non-200 or `success:false` → account/credential problem → check
   the ClickPesa dashboard: API access on, account active.
2. 200 token but push still rejected → check `Backend/.env` `CLICKPESA_CHECKSUM_SECRET`
   still matches the dashboard's checksum key, and live collections are still enabled.
3. Watch a real attempt: `docker logs -f backend-api | grep -i "clickpesa\|payment"`.
**Prevent:** Keep the account funded for fees. Never rotate the checksum key without
updating `.env` and redeploying in the same change.

### F2 · Payment shows FAILED but the customer was charged — 🔴
**You see:** The customer insists they paid; the portal said it failed.
**Happening:** Rare — a verification mismatch, or they approved after the portal's
3-minute wait gave up.
**Fix:** Look up the order reference in the ClickPesa dashboard. If genuinely
collected: refund via ClickPesa, *or* deliver access — provision a voucher,
`bash ~/omada.sh auth <mac>`, and mark the payment SUCCESS in the DB.
**Prevent:** The webhook fallback poll (gaps).

### F3 · The smallest package fails more than the others — 🟡
**You see:** 500 TZS payments come back FAILED noticeably more often than 1,000 TZS.
**Happening:** 500 TZS is near/under ClickPesa's minimum on some channels — the
initiate call returns `status: FAILED` straight away.
**Fix / Prevent:** Make **1,000 TZS the entry package**, or confirm the current minimum
with ClickPesa and price every package above it.

---

## G · Data, disk & runtime

### D1 · Disk full on the Pi — 🟠
**You see:** Containers crash or won't start, DB writes fail, image pulls fail.
`df -h /` near 100%.
**Happening:** Container logs and Omada's Mongo grow unbounded.
**Fix:**
```bash
docker system prune -af
du -sh /var/lib/docker/containers/*/*-json.log | sort -h | tail
```
**Prevent:** Set log rotation — `/etc/docker/daemon.json`:
```json
{ "log-driver": "json-file", "log-opts": { "max-size": "10m", "max-file": "3" } }
```
then `sudo systemctl restart docker`.

### D2 · Losing the whole Pi (theft, dead board, unrecoverable card) — 🔴
**Recovery, in order:**
1. A Pi (or any box) with Docker.
2. `git clone` the repo — it's on GitHub.
3. Restore `Backend/.env` from your **offline copy** (password manager).
4. Restore the `backend-data` volume from the latest SQLite backup, and `omada-data`
   from its backup.
5. `docker compose up -d`. Base images re-pull; migrations run themselves.
6. Set the Pi's IP back to `192.168.174.100` (P3).

**Prevent — all of these, now:**
- Automated daily SQLite backup, copied *off* the Pi.
- An `omada-data` volume backup (nothing backs it up today — losing it means
  re-adopting every device and rebuilding the portal).
- `Backend/.env` in a password manager.
- The repo is already on GitHub — good.

### D3 · A container gets OOM-killed at random — 🟡
**You see:** Omada or the backend dies for no obvious reason. `dmesg | tail` shows
"Out of memory: Killed process".
**Happening:** No memory limits (the Pi's cgroup controller ships off), so a spike
makes the kernel kill the biggest process — usually Mongo or the JVM.
**Fix:** `docker compose up -d` restarts whatever was killed.
**Prevent:** Add `cgroup_enable=memory cgroup_memory=1` to
`/boot/firmware/cmdline.txt`, reboot, uncomment the `mem_limit` lines in
`docker-compose.yml` (DEPLOY.md).

### D4 · Clock drift — 🟡
**You see:** Sudden auth failures everywhere — ClickPesa token "expired", Omada token
math off; voucher end-times wrong; log lines out of order.
**Happening:** The Pi's clock is wrong — NTP hasn't re-synced after a long spell
offline.
**Fix:** `timedatectl` — check "System clock synchronized: yes".
`sudo systemctl restart systemd-timesyncd`.
**Prevent:** Make sure UDP 123 outbound isn't blocked on the ER605.

---

## Fix before it bites

Standing weaknesses. None are on fire; each turns a future incident from "minutes with
a runbook" into "an evening" or "lost data".

| # | Item | Why | Refs |
|---|---|---|---|
| 01 | DHCP reservation for the Pi | One reboot silently kills all sales | P3 |
| 02 | Automated daily SQLite backup, off the Pi | Today it's a manual command | P2, D2 |
| 03 | Back up the `omada-data` volume | Nothing does. Losing it = re-adopt every device | C1, D2 |
| 04 | `Backend/.env` in a password manager | Only copy of Omada + ClickPesa + admin secrets | D2 |
| 05 | Docker log rotation | Logs grow until the disk fills | D1 |
| 06 | Memory cgroup + `mem_limit` | Stops a spike from OOM-killing Mongo | C1, D3 |
| 07 | Backend polls ClickPesa for still-PENDING payments | Webhook fallback so a tunnel blip doesn't strand a paid customer | E1, F2 |
| 08 | `/admin` "retry failed jobs" button | Paid-but-not-provisioned recovers without DB surgery | C1, B3 |
| 09 | Boot the Pi from a USB SSD, not microSD | The single biggest reliability win | P2 |
| 10 | UPS on the Pi and the ER605 | 20 min is enough to rule out corruption on a cut | P1, P2 |

---

## Checking system state

```bash
# Containers — all three up, none restarting?
docker ps

# Backend + database
curl -s localhost:3000/health      # {"status":"ok", ...}
curl -s localhost:3000/ready       # 200 = DB reachable

# Backend -> Omada controller
curl -sk -X POST localhost:3000/api/omada/connectivity-test \
  -H "x-admin-key: $ADMIN_KEY" -d '{}'

# Pi health
free -m ; df -h / ; uptime ; dmesg | tail
hostname -I                        # must be 192.168.174.100
timedatectl                        # clock synchronized?

# Omada state
bash ~/omada.sh portal
bash ~/omada.sh devices
bash ~/omada.sh clients

# Logs (add -f to follow)
docker logs backend-api        --tail 50
docker logs omada-controller   --tail 50
docker logs cloudflared-tunnel --tail 30

# Dashboard: portal.neuraltale.com/admin  ->  Failed jobs / Abandoned tiles

# Redeploy the backend (after a push to main + CI build)
cd ~/Omada-Radius-Server && docker compose pull backend && docker compose up -d backend

# Bounce one service
docker compose restart <omada|backend|cloudflared>
```

---

## The constants

| | |
|---|---|
| Repo on the Pi | `~/Omada-Radius-Server` — run every `docker compose` from here |
| Containers | `omada-controller` · `backend-api` · `cloudflared-tunnel` |
| Pi LAN IP | `192.168.174.100` — the portal redirect target; **must not change** |
| Hotspot VLAN | VLAN 10 · `192.168.10.0/24` · DHCP served by the ER605 |
| Gateway | TP-Link ER605 @ `192.168.174.1` |
| Omada UI | `https://192.168.174.100:8043` |
| Backend | `http://192.168.174.100:3000` — `/health`, portal, `/admin`, `/api/*` |
| Public (tunnel) | `portal.neuraltale.com` (portal + `/admin`) · `webhooks.neuraltale.com` (ClickPesa callback) |
| Secrets | `Backend/.env` — git-ignored, Pi only. Omada creds, ClickPesa creds, `ADMIN_API_KEY` |
| Payment DB | `backend-data` volume → `/data/wifi_business.db` (SQLite, one file) |
| Omada data | `omada-data` volume |
| Helper script | `~/omada.sh` — `portal` · `local-portal` · `auth <mac>` · `devices` · `clients` |
| Deploy | push to `main` → CI builds arm64 (~1 min) → `docker compose pull backend && docker compose up -d backend` |
| Config changes | `.env` / compose edits need `docker compose up -d` — a plain `restart` does not reload them |
