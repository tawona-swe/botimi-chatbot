# Deploying botimi to a Contabo VPS

## Architecture

One public domain, three containers behind Caddy:

```
                    ┌─────────────┐
  Internet ──443──▶ │    Caddy    │  (auto HTTPS, only exposed container)
                    └──────┬──────┘
                 /api/*    │    everything else
                 ┌─────────┴─────────┐
                 ▼                   ▼
          ┌────────────┐      ┌────────────┐
          │  backend   │      │  frontend  │
          │  (Express) │      │  (Next.js) │
          └─────┬──────┘      └────────────┘
                │
                ▼
        ┌───────────────┐        ┌─────────────┐
        │ botimi_data    │◀──────▶│ litestream  │──▶ S3-compatible storage
        │ (named volume, │        │ (continuous │    (off-box backup)
        │  the SQLite db)│        │  replicate) │
        └───────────────┘        └─────────────┘
```

The backend and frontend are never exposed to the internet directly — only Caddy is (see `docker-compose.yml`'s `ports` vs `expose`). Caddy splits traffic by path: `/api/*` to the backend, everything else to the frontend — this matches how the browser actually calls the API directly via `NEXT_PUBLIC_API_URL` (see `frontend/lib/api.js`), not through Next.js's own server.

**Database:** kept as SQLite (`better-sqlite3`) for this deployment — see project memory for the full reasoning. It scales fine on a single VPS for real growth; the ceiling is horizontal scaling (multiple app servers), not write throughput or data size, and that's a future migration to make when actually needed, not now. Litestream gives real off-box durability in the meantime without that migration.

## One-time VPS setup

1. Buy the Contabo VPS, get root SSH access.
2. `ssh root@your-vps-ip`, then run `deploy/setup-vps.sh` (copy its contents in, or `scp` it up first). Installs Docker, sets up the firewall (only SSH/80/443 reachable), enables fail2ban and automatic security updates.
3. Follow the script's own printed next steps: create a non-root user, disable root/password SSH login, point your domain's DNS A record at the VPS's IP.

## First deploy

```bash
git clone <your-repo-url> botimi
cd botimi
cp .env.example .env
nano .env   # fill in every value -- see comments in the file for what each one needs
docker compose up -d --build
docker compose logs -f caddy   # watch for the certificate to issue successfully
```

Caddy needs the domain's DNS to already resolve to this VPS before it can get a certificate — if `docker compose logs caddy` shows certificate errors, check DNS propagation first (`dig +short yourdomain.com` from your own machine should show the VPS IP).

Once it's up: visit `https://yourdomain.com`, sign up a real account, and do one real smoke-test pass end to end (signup → onboarding → train a bot → embed it → send it a message → a payment checkout) before calling this live. Dev and production differ in ways that occasionally surface something new — verify it here rather than assuming everything that worked locally still works.

## Everyday operations

**Deploying a code change:**
```bash
git pull
docker compose up -d --build
```
This rebuilds only what changed and restarts those containers — `botimi_data` (the database) is untouched, since it's a named volume, not baked into either image.

**Viewing logs:**
```bash
docker compose logs -f backend    # or frontend, caddy, litestream
```

**Restarting everything:**
```bash
docker compose restart
```

## Backups and restore

Litestream replicates continuously in the background — nothing to run manually for it to work, once `LITESTREAM_*` env vars are filled in. Confirm it's actually running clean, don't just assume:
```bash
docker compose logs litestream
```

**Manual snapshot** (e.g. right before a risky migration), on top of what Litestream already does automatically:
```bash
docker compose exec backend sqlite3 /app/data/botimi.db ".backup /app/data/manual-backup-$(date +%F).db"
docker compose cp backend:/app/data/manual-backup-$(date +%F).db ./
```

**Restoring from Litestream** after data loss (only do this if `botimi_data` is actually gone or corrupted — this replaces the live database):
```bash
docker compose stop backend
docker run --rm -v botimi_data:/app/data --env-file .env litestream/litestream:0.5 \
  restore -o /app/data/botimi.db /app/data/botimi.db
docker compose start backend
```

## Things that only work correctly once deployed here (not in local dev)

- The WhatsApp webhook and Pesepay's `resultUrl` callback both need `BACKEND_URL`/`FRONTEND_URL` to be this real public domain — set them to `https://yourdomain.com` in `.env`, not left as `localhost`.
- Real email sending turns on automatically here, since `NODE_ENV=production` (see project memory on `config.isDev` gating `sendEmail()`) — verify a real email actually lands somewhere once live, the same way everything else in this project has been verified against real behavior rather than assumed.
- Switch `PESEPAY_ENV` to `production` with live keys only once you're actually ready to accept real customer payments — leaving it on `sandbox` after going live would mean no real vendor could actually pay you.
