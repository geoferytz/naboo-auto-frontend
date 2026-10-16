# Agent notes - Naboo Automotive

Monorepo: `backend/` (Spring Boot 4.1, Java 21 target, Maven wrapper) and `frontend/` (Angular 21, Material, Apollo).
Read `docs/architecture.md` before changing architecture; the brief is in `ReadMe.txt` and the roadmap `.txt`.

## Commands (verified)

- Dev DB: `docker compose -f docker-compose.dev.yml --env-file .env up -d` (Postgres on `127.0.0.1:5433`)
- Backend run: `cd backend && ./mvnw spring-boot:run` (default profile `dev`, reads `../.env`)
- Backend tests: `cd backend && ./mvnw test` (Testcontainers, Docker required)
- Frontend run: `cd frontend && npx ng serve` (proxy `/graphql` -> `:8080`)
- Frontend tests: `cd frontend && npx ng test --watch=false` (Vitest)
- Frontend build: `cd frontend && npx ng build`

## Environment quirks

- Local Node is 22.13.1, so Angular 22 cannot be used until Node is upgraded (>= 22.22.3).
- Local JDK is 23; code compiles with `--release 21`.
- Port 5432 is used by a native PostgreSQL service; another project runs containers from `E:\Naboo-website` (do not touch).

## Conventions

- Every protected GraphQL resolver needs `@PreAuthorize(Permissions.X)`; add tests for anonymous/forbidden access.
- Money: `NUMERIC(14,2)` + currency in DB, `Money { amount: String }` in GraphQL. Never use floats.
- Schema changes: new Flyway `V{n}__*.sql`; never edit applied migrations. `ddl-auto=validate`.
- Dev-only data goes in `db/seed-dev` (repeatable, idempotent).
- Frontend: standalone components, signals + `rxResource`, `Api` wrapper (`network-only`), lazy routes.
