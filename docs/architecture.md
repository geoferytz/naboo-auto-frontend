# Architecture and implementation record

## Version record (selected 2026-10-16)

| Component | Version | Notes |
| --- | --- | --- |
| Java (language level) | 21 LTS | `maven.compiler.release=21`; runtime image will be Temurin 21 |
| Spring Boot | 4.1.1 | Spring Framework 7, Spring Security 7, Spring for GraphQL 2.0, Jackson 3 |
| Hibernate ORM | 7.4.5 | via Boot BOM |
| graphql-java | 25.0 | via Boot BOM |
| Flyway | via Boot BOM | `flyway-database-postgresql` |
| Testcontainers | 2.0.5 | `postgres:17.6-alpine` |
| PostgreSQL | 17.6 | `postgres:17.6-alpine` |
| Angular / CLI | 21.2.x | Angular 22 requires Node >= 22.22.3; local Node is 22.13.1. Upgrade Node, then `ng update` |
| Angular Material / CDK | 21.2.14 | M3 theme, red primary palette |
| Apollo Angular | 14.2.0 | with `@apollo/client` 4.3.3, `graphql` 16.14.2 |
| Vitest | 4.x | Angular CLI default unit-test runner |

Dependencies were chosen to be at least ~7 days old at selection time.

## Layout

```
backend/   com.naboo.automotive
  auth/        JWT issuing (HS256, Nimbus), register/login/me, permissions, bootstrap admin
  users/       User + Role (roles seeded in V1)
  customers/   Customer records linked to user accounts
  audit/       AuditService (MANDATORY propagation: audit rows commit with the change)
  vehicles/    Listings, images, features, status history, enquiries/viewing requests
  services/    Service categories and services with price types
  contact/     Contact enquiries
  common/      Money, paging, identifiers, GraphQL error mapping
  config/      Security, GraphQL (DateTime scalar, depth/complexity limits), rate limiter, client IP
frontend/src/app
  core/        Api wrapper, auth service/guard/interceptor, queries, models, formatting, SEO, business details
  layout/      Header, footer, logo
  shared/      Vehicle card, placeholder art, load/empty/error state, form helpers
  pages/       Lazy-loaded route components
```

## Key decisions

- **Same-origin GraphQL.** The browser always calls `/graphql`; Angular's dev server proxies it to `:8080`, and Nginx will do
  the same in production. No CORS needed in production (CORS is configured for `APP_CORS_ORIGINS` anyway).
- **Authorisation.** `/graphql` is public at the HTTP layer; every protected resolver uses `@PreAuthorize` with expressions from
  `auth/Permissions`. Spring for GraphQL maps failures to `UNAUTHORIZED` / `FORBIDDEN` error classifications.
- **Tokens.** Stateless HS256 JWTs (default 120 min) with a `roles` claim. The frontend stores the token in `sessionStorage`.
  Refresh tokens, revocation and MFA for staff are planned for the admin milestone.
- **Money.** `NUMERIC(14,2)` + explicit `currency` (`TZS`). GraphQL exposes `Money { amount: String, currency }` - never floats.
  Inputs are decimal strings validated server-side (non-negative, max 2 decimals). The frontend formats with `BigInt`.
- **Public vs staff data.** Public queries return only published listings with status AVAILABLE/RESERVED (and SOLD when
  `includeSold`). `registrationNumber` and `statusHistory` are null on public queries. Enquiries are rejected for sold/unavailable
  vehicles; viewings only for AVAILABLE ones, 2 h - 90 days ahead.
- **Pagination.** Offset pagination (`page`, `size` capped at 50) with `totalCount`. The roadmap suggests cursor pagination for
  large catalogues; offset was chosen because the catalogue is small and numbered pages suit the UI. Revisit if it grows.
- **Enquiries.** General enquiries and viewing requests share `vehicle_enquiries` (`enquiry_type`), instead of two tables.
- **Errors.** Domain errors carry `extensions.code` (e.g. `VEHICLE_NOT_AVAILABLE`, `INVALID_AMOUNT`) and validation errors list
  `extensions.fields`. Unknown errors return a generic message.
- **Abuse protection.** Login, registration and public enquiry mutations are rate-limited per client IP (in-memory, 10/min).
  Replace with a shared store if the backend is scaled out. GraphQL query depth (12) and complexity (1000) are limited;
  introspection and GraphiQL are disabled outside `dev`.
- **Seed data.** `db/seed-dev/R__dev_seed.sql` is a repeatable, idempotent migration loaded only by the `dev` profile.
- **Contact details.** `frontend/src/app/core/business.ts` holds phone/email/address/hours as `null` until the business confirms
  them; null values are not rendered. These move to backend site settings in the admin milestone.

## Milestone status

| Milestone | Status |
| --- | --- |
| 1 Discovery & setup | Done: monorepo, versions, dev compose, docs |
| 2 Foundation | Done: schema V1, auth, roles, audit, design tokens |
| 3 Public site & catalogues + staff admin | Done: public site, vehicle/service catalogues, staff dashboard, vehicle CRUD with photo uploads, enquiries, users, audit UI |
| 4 Rentals, service booking, quotations | Done: `V2` migration, rental fleet + reservations (Postgres exclusion constraint against double-booking, idempotent `requestToken`s, server-computed totals, 180-day lead / 60-day max limits), workshop bookings (capacity serialized by row lock, 08:00–17:00 business window, 2h–90d window), quotation lifecycle (REQUESTED → QUOTED → ACCEPTED/DECLINED with lazy expiry). Public `/rentals` pages, booking/quotation forms on service pages, `my-account` self-service, admin fleet/reservations/bookings/quotations screens |
| 5 Workshop, accessories, orders, invoices, payments | Done: `V3` migration, workshop job cards (booking-linked, mechanic-capable), accessories catalogue + stock ledger, accessory orders with locked stock movement, draft→issued→paid invoices with partial payments and overpayment guards. Admin screens for jobs/accessories/orders/invoices; public shop with cart; orders+invoices in `my-account` |
| 6 Admin dashboard, customer portal, notifications, reporting | Done: in-app notifications (`V4`) wired into reservation/booking/order/invoice/job/quotation transitions; bell badge in header; notifications, orders, invoices in `my-account`; dashboard reports queues, low stock, revenue this month, outstanding receivables |
| 7 Docker production deployment, Nginx, HTTPS, backups | Done: `docker-compose.prod.yml` + `deploy/` (Nginx TLS for naboo.co.tz, certbot renewal, nightly pg_dump backups). See `docs/deployment.md` |
| 8 Hardening, e2e tests, full documentation | Not started |

## Rentals, bookings, quotations (Milestone 4 notes)

- `rental_reservations` uses a `daterange` exclusion constraint (`rental_no_overlap`) so overlapping blocking
  (PENDING/CONFIRMED/ACTIVE) reservations for the same vehicle are impossible — the database is the guard of last resort
  against races. Cancellations free dates automatically because the constraint covers only blocking statuses.
- Reservation totals are computed server-side from the vehicle's daily rate snapshot; later price changes do not affect
  existing reservations. `requestRental`, `bookService` and `requestQuotation` accept an optional `requestToken` for
  client-side retry safety.
- `service_bookings` capacity is enforced by locking the `workshop_capacity` row (`PESSIMISTIC_WRITE`) then counting
  overlapping blocking bookings — the check and insert are atomic. Working hours are 08:00–17:00
  `Africa/Dar_es_Salaam`, bookings must end the same day, start ≥2h ahead and ≤90 days out.
- Quotations: `REQUESTED → QUOTED (staff attaches amount + validUntil) → ACCEPTED/DECLINED`; a sent quote expires
  lazily once `validUntil` passes. Customers see only their own records via `myQuotations`/`myServiceBookings`/
  `myRentalReservations`; all staff operations require `RENTAL_MANAGE`, `BOOKING_MANAGE` or `QUOTATION_MANAGE` roles.
- A `Date` scalar (ISO `YYYY-MM-DD`) was added next to `DateTime` in `GraphQlConfig` for rental windows and quotation
  validity.

## Workshop, inventory, billing (Milestone 5 notes)

- Workshop jobs carry a `SCHEDULED → IN_PROGRESS ⇄ ON_HOLD → COMPLETED` lifecycle (any open state → CANCELLED) and may
  be raised from a confirmed booking or standalone. `WORKSHOP_MANAGE` includes mechanics.
- Orders decrement stock at placement inside `PESSIMISTIC_WRITE` row locks (accessories locked in id order); staff or
  customer cancellation restores stock. Every change is logged to `stock_movements` for a full audit trail.
- Invoices are DRAFT → ISSUED → PAID / VOID. Items are editable only in DRAFT; payments only on ISSUED, capped at the
  outstanding balance (row-locked during recording); `paidAt` is set when fully covered. Payment methods cover cash,
  card, bank transfer and the common Tanzanian mobile-money rails (M-Pesa, Tigo Pesa, Airtel Money) — recording only;
  real payment-provider integration is a later decision.
- Orders and invoices are tied to customer accounts; `placeOrder` requires sign-in and is idempotent via `requestToken`.

## Notifications & reporting (Milestone 6 notes)

- Notifications are written in the same transaction as the business event, so a notification can never describe a
  change that rolled back. Recipients are resolved customer → user account; guest bookings/orders produce no
  notification (there is no user account to attach it to — email/SMS delivery is a later milestone).
- The header polls `unreadNotificationCount` every 60s for signed-in users and shows a badge linking to
  `/my-account`, where notifications can be marked read individually or in bulk. A stranger cannot mark another
  user's notification (verified by test).
- The staff dashboard (`adminDashboard`, `Permissions.STAFF`) reports enquiry queues, fleet status, operational
  queues (pending reservations/bookings/quotations/orders, active jobs), low stock (<5 units), revenue this month
  (sum of payments), and outstanding receivables (sum of issued invoices).

## Known gaps / next steps

1. Sitemap generation for vehicle/service/rental pages (static `robots.txt` is in place).
2. Business must supply real contact details, opening hours, service catalogue and prices, and legal review of policy pages.
3. Accessories, payments and notifications per the roadmap.
4. Workshop opening hours and capacity rules are fixed constants (`WorkshopBookingService`); move to configurable
   settings when the business supplies real hours.
