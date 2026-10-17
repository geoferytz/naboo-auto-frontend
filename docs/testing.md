# Testing & security review

Roadmap Phase 13 deliverables. Commands:

```bash
cd backend && ./mvnw test        # integration tests vs a disposable Testcontainers PostgreSQL
cd frontend && npx ng test --watch=false
```

## Coverage map — roadmap "required critical tests"

| Required test | Status / location |
| --- | --- |
| Two customers attempt overlapping rental reservations | Covered — `RentalBookingQuotationTests.rentalReservationIsIdempotentAndCannotOverlap` (a Postgres `daterange` exclusion constraint makes the overlap impossible, not just unlikely) |
| Two customers attempt the final workshop slot | Covered — `workshopCapacityPreventsOverbooking` (capacity row lock + count, second booking rejected) |
| A user changes a price in the browser | Covered — `SecurityHardeningTests.pricesCannotBeInjectedThroughOrderInput` (the schema has no price input; a forged field fails validation, totals are server-computed). All money flows are server-side: order totals, rental quotes, invoice totals |
| A payment callback is delivered repeatedly | Covered — `SecurityHardeningTests.paymentRecordingIsIdempotentAndFinanceOnly` (`PaymentInput.requestToken` + unique index, plus `NOT_PAYABLE` once `PAID` and `OVERPAYMENT` beyond the balance) |
| A customer requests another customer's booking/order | Covered — `NotificationTests` (stranger cannot mark a notification) and `SecurityHardeningTests` (`cancelMyOrder` on another customer's order → `NOT_FOUND`). All `my*` queries are scoped to the caller's customer profile |
| A vehicle is marked sold / under maintenance | Covered — `VehicleApiTests.soldVehiclesAreMarkedAndRejectEnquiries` |
| A quotation expires or is rejected | Covered — `RentalBookingQuotationTests.quotationLifecycleFromRequestToDecision` (lazy `EXPIRED`, `DECLINED`) |
| A notification provider fails | N/A by design — notifications are in-app rows written in the same transaction as the business event, so there is no external provider to fail. An external email/SMS integration (deferred) must be added asynchronously so a provider outage never rolls back business state |
| An unauthorized employee attempts a refund | Covered — `SecurityHardeningTests` (a `MECHANIC` token cannot `recordPayment` → `FORBIDDEN`). There is no refund mutation at all; refund handling is a business procedure, not a code path |
| A migration or deployment fails | Documented — `docs/deployment.md` (Flyway fails the backend startup, `web` keeps serving the last static bundle, rollback = redeploy previous image) |
| Rate limits | Covered — `RateLimiterTests` (fixed-window, per action + client IP, resets per minute). Wired on login, registration, enquiries, bookings; Nginx adds a second layer (10 r/s per IP) in production |
| Injection | Covered — `SecurityHardeningTests.injectionStringsInPublicQueriesAreHandledSafely` (parameterised JPA + GraphQL variables; injection strings are inert literals) |
| Upload restrictions | Covered — `AdminApiTests.photoUploadIsValidatedReEncodedAndServed` (content sniffed and re-encoded, fake images rejected, unauthenticated → 401/403) |
| Booking/inventory concurrency | Covered — pessimistic row locks on accessories (id-ordered to avoid deadlocks), capacity row lock for workshop slots, exclusion constraint for rentals |

## Backend suite: 28 tests across 9 classes

`AdminApiTests` (4) · `AuthApiTests` (4) · `NotificationTests` (1) · `RentalBookingQuotationTests` (4) ·
`SecurityHardeningTests` (3) · `ServiceAndContactApiTests` (2) · `VehicleApiTests` (5) ·
`WorkshopInventoryBillingTests` (4) · `config.RateLimiterTests` (1)

## Frontend suite: 9 unit tests (Vitest)

## Security review findings

- **Authorisation** is enforced server-side on every protected resolver and endpoint; frontend guards are
  convenience only. Customer queries resolve the customer profile from the authenticated JWT — no client-supplied
  customer id exists anywhere.
- **Secrets**: JWT signing requires ≥32-byte base64 key or the app refuses to boot; all prod secrets are env-only.
- **GraphiQL and introspection are disabled** in the `prod` profile; `/actuator` is blocked at the Nginx edge.
- **Payments are manual records**, not provider webhooks — there is no forged-callback surface today. When mobile
  money integration is added, callbacks must be authenticated/verified before any state change.
- **Rate limiting is in-memory per instance** — correct at one backend replica; replace with a shared store
  (or rely on the Nginx edge limit) if the backend scales horizontally.
- **JWT sessions are 2h access tokens with no refresh token** — re-login required after expiry. If long-lived
  sessions are wanted, add refresh tokens rather than extending the TTL.
- **Guest bookings/orders can't be notified** — no user account exists; see `docs/architecture.md`.

## Known remaining risks / deferred work

- No browser-level E2E suite (Playwright/Cypress) — API-level integration coverage is thorough, but a real-browser
  pass over checkout and admin flows is recommended before launch.
- The shared Testcontainers database means tests must use unique resources/time slots (see
  `WorkshopInventoryBillingTests` comments).
- Multi-instance deployments need a shared rate-limit store and a sticky-free session model (JWT is already
  stateless).
