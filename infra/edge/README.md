# Shared edge proxy

The one Caddy instance for the whole VPS — not part of any single project's own repo or deploy. Deploy this **once per server**, before any individual project.

## First-time setup on a fresh VPS

```bash
mkdir -p ~/infra/edge
# copy docker-compose.yml and Caddyfile from this directory into ~/infra/edge on the VPS
cd ~/infra/edge
docker compose up -d
```

This creates the `edge` Docker network and starts Caddy, listening on 80/443. It won't successfully serve anything yet — there's nothing behind it until a project is deployed and joins the network.

## Deploying a project behind it

Each project (botimi, or whatever comes next):
1. References the `edge` network as `external: true` in its own `docker-compose.yml` (see `botimi/docker-compose.yml` for the working example) — it does **not** run its own Caddy or bind ports 80/443.
2. Pins its own Compose project `name:` explicitly (also in that same file) — Caddy addresses containers as `<project-name>-<service-name>-1`, which only stays correct if the project name doesn't silently change based on what folder someone clones it into.
3. Gets its own site block added to `Caddyfile` here in `infra/edge`, pointing at those container names.

After adding or editing a site block:
```bash
cd ~/infra/edge
docker compose restart caddy
```
No rebuild needed — Caddy just re-reads its config on restart.

## Why this is separate from any project's own deploy

Only one process on the machine can bind ports 80 and 443. If every project ran its own Caddy, only the first one to start would actually get those ports — the rest would fail outright. One shared instance, one shared network, each project just joins it.
