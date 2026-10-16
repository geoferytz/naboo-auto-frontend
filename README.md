# Naboo Automotive

Vehicle sales, rentals, workshop jobs, accessories shop, orders, invoices and quotations platform for
Naboo Automotive, Tanzania — with a customer portal, in-app notifications and a staff back office.

| Part | Stack |
| --- | --- |
| `frontend/` | Angular 21 (standalone, zoneless, signals), Angular Material 21, Apollo Angular 14 |
| `backend/` | Java 21, Spring Boot 4.1, Spring for GraphQL, Spring Security (JWT), Spring Data JPA / Hibernate 7, Flyway |
| Database | PostgreSQL 17 |
| Dev infra | Docker Compose (`docker-compose.dev.yml`) |
| Prod infra | `docker-compose.prod.yml` + `deploy/` — Nginx TLS, certbot, daily backups |

See [`docs/architecture.md`](docs/architecture.md) for the architecture, version record, decisions and milestone status.
The original brief is in `ReadMe.txt` and `Naboo_Automotive_Website_Building_Roadmap.txt`.

## Prerequisites

- JDK 21+ (code targets Java 21; JDK 23 also works for local builds)
- Node.js `^20.19 || ^22.12 || >=24`
- Docker Desktop (dev database and backend integration tests via Testcontainers)

## First-time setup

```bash
cp .env.example .env          # then replace every placeholder
# generate secrets, e.g.:
#   POSTGRES_PASSWORD -> openssl rand -hex 24
#   JWT_SECRET        -> openssl rand -base64 48
# optional: APP_BOOTSTRAP_ADMIN_EMAIL / APP_BOOTSTRAP_ADMIN_PASSWORD (>= 12 chars) creates the first SUPER_ADMIN
docker compose -f docker-compose.dev.yml --env-file .env up -d
cd frontend && npm ci
```

## Run locally

```bash
# terminal 1 - backend on :8080 (profile "dev": reads ../.env, applies dev seed data, enables GraphiQL at /graphiql)
cd backend && ./mvnw spring-boot:run

# terminal 2 - frontend on :4200 (proxies /graphql and /api to :8080)
cd frontend && npm start
```

Open http://localhost:4200. Dev seed data (demo vehicles and services, clearly marked) lives in
`backend/src/main/resources/db/seed-dev` and is loaded **only** with the `dev` profile.

## Production deployment

Dockerised stack for `https://naboo.co.tz` (and `www.`): Postgres, backend, and a single Nginx
container that terminates TLS, serves the Angular bundle and proxies `/graphql`, `/api` and
`/uploads` to the backend. A `certbot` container renews the Let's Encrypt certificate, and a
`backup` container runs a daily `pg_dump` with retention.

```bash
cp deploy/env.prod.example .env.prod    # fill in secrets
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

Full runbook — including the first-boot certificate issuance step — in
[`docs/deployment.md`](docs/deployment.md).

## Test and build

```bash
cd backend && ./mvnw test           # integration tests against a disposable PostgreSQL container (Docker required)
cd frontend && npx ng test --watch=false
cd frontend && npx ng build         # production build -> frontend/dist/naboo-frontend
```

## Security notes

- Never commit `.env`. `.env.example` contains placeholders only.
- The dev database binds to `127.0.0.1:5433` only (5432 is taken by a local PostgreSQL service on this machine).
- All authorisation is enforced on the backend with method security; hiding UI controls is never relied upon.
