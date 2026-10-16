# Production deployment — naboo.co.tz

Target: a single VPS running Docker Engine + Compose. The stack is five services:

| Service | Image | Purpose |
| --- | --- | --- |
| `web` | built (`deploy/Dockerfile.web`) | Nginx: TLS, static Angular bundle, API proxy, security headers, 10 r/s API rate limit |
| `backend` | built (`backend/Dockerfile`) | Spring Boot app, prod profile, runs as a non-root user |
| `db` | postgres:17-alpine | PostgreSQL 17, `db-data` volume |
| `certbot` | certbot/certbot | Renews the Let's Encrypt certificate every 12 h |
| `backup` | postgres:17-alpine | Nightly `pg_dump` to the `backups` volume, 30-day retention |

Networks: `edge` (only `web`, publishes 80/443) and `internal` (`internal: true` — no outbound
internet) for db/backend/certbot/backup. The database port is never published.

## 1. Prepare the server

```sh
sudo apt update && sudo apt install -y docker.io docker-compose-v2
git clone <repo-url> /opt/naboo && cd /opt/naboo
cp deploy/env.prod.example .env.prod   # then fill it in
```

Generate secrets:

```sh
openssl rand -hex 24   # POSTGRES_PASSWORD
openssl rand -hex 48   # JWT_SECRET
```

Point both `naboo.co.tz` and `www.naboo.co.tz` A/AAAA records at the server before the next step.

## 2. First certificate (Let's Encrypt)

The shipped `deploy/nginx.conf` expects certificates under `/etc/letsencrypt/live/naboo.co.tz/`.
Until they exist, build the web image with the HTTP-only bootstrap config:

```sh
NGINX_CONF=deploy/nginx-bootstrap.conf \
  docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build

docker compose -f docker-compose.prod.yml --env-file .env.prod run --rm certbot \
  certbot certonly --webroot -w /var/www/certbot \
    -d naboo.co.tz -d www.naboo.co.tz \
    --email <admin-email> --agree-tos --no-eff-email

# Now rebuild web with the real TLS config:
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build web
```

Certbot's `renew` runs inside the running `certbot` container every 12 hours against the shared
`certbot-webroot` volume — no further action needed. Reload nginx after renewals if you notice a
stale cert: `docker compose … exec web nginx -s reload`.

## 3. Verify

```sh
curl -sI https://naboo.co.tz/          # 200, HSTS header present
curl -sI https://www.naboo.co.tz/      # 301 -> apex
curl -s  https://naboo.co.tz/graphql -o /dev/null -w '%{http_code}'   # 400/405 (GET not allowed)
docker compose -f docker-compose.prod.yml ps   # all services Up (healthy)
```

## 4. Backups

The `backup` service writes `pg_dump` custom-format files to the `backups` volume
(`/var/lib/docker/volumes/naboo-automotive_backups/_data`) daily at container start, pruning dumps
older than `BACKUP_RETENTION_DAYS` (default 30). Copy dumps off-box for real redundancy, e.g. a
cron job `rsync`ing that directory elsewhere.

Manual dump:

```sh
docker compose -f docker-compose.prod.yml --env-file .env.prod exec backup /usr/local/bin/backup.sh
```

Restore (new empty database):

```sh
docker compose -f docker-compose.prod.yml exec db \
  pg_restore -U naboo_app -d naboo_automotive --clean /backups/<file>.dump
```

## 5. Upgrades

```sh
cd /opt/naboo && git pull
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

Flyway migrates the schema on backend startup. `docker compose` rolls `backend` while `web` stays
up; nginx will briefly 502 during the restart window.

## Hard notes

- **GraphiQL and schema introspection are disabled** in the `prod` profile (`application-prod.yml`).
- Uploaded media lives on the `uploads` volume and is served by the backend at `/uploads/public/**`;
  the proxy caches it for 30 days (filenames are content-unique UUIDs).
- `APP_CORS_ORIGINS` is already set to the two HTTPS origins in compose — keep it in sync if the
  domain changes. Browsers do not actually need CORS (same-origin requests), but the allowlist is
  kept for correctness.
- The compose stack intentionally has **no public database port** — take dumps via `exec`, not TCP.
