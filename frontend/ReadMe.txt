# NABOO AUTOMOTIVE — MASTER DEVELOPMENT INSTRUCTION

## Project mission

Build a complete, production-ready automotive business platform for **Naboo Automotive**, targeting customers in Tanzania.

The platform must combine:
1. Vehicle sales and customer enquiries.
2. Car rental, date-based availability and reservations.
3. Vehicle repair and maintenance bookings.
4. Car painting and color-change services.
5. Car accessories catalogue, inventory and orders.
6. Vehicle restoration, detailing and custom quotations.
7. Workshop scheduling and job management.
8. Payments, invoices, notifications and reporting.
9. Customer self-service portal.
10. Secure administration dashboard.

## Mandatory technology stack

- Frontend: Angular standalone, TypeScript and responsive CSS.
- UI: Angular Material or a polished reusable component system.
- GraphQL: Apollo Angular and Spring for GraphQL.
- Backend: Java and Spring Boot.
- Persistence: Spring Data JPA, Hibernate and PostgreSQL.
- Database migrations: Flyway.
- Security: Spring Security and role-based authorization.
- Infrastructure: Docker, Docker Compose and Nginx.
- Production: HTTPS, environment-based configuration, monitoring and automated backups.

Select mutually compatible stable dependencies and document their versions.

## Brand and design

Use the name Naboo Automotive.

Visual identity:
- Premium black and charcoal backgrounds.
- White text and clean light surfaces.
- Automotive red accent, approximately #E52B36.
- Modern sans-serif typography.
- Professional automotive photography.
- Clean cards, strong visual hierarchy and consistent spacing.
- Smooth but restrained animations.
- Mobile-first responsive design.
- Clear calls to action and accessible forms.

Do not create a generic template. Design a cohesive automotive brand experience.

## Functional requirements

Implement all public pages, customer workflows, backend operations and administrative modules described in the supplied Naboo Automotive specification.

All core interactions must be functional. Do not use hardcoded mock data as a substitute for backend functionality in the production implementation.

Vehicle catalogues, prices, service definitions, availability, inventory, quotations and booking statuses must come from the backend.

Implement:
- Search, filters, pagination and vehicle detail pages.
- Rental quotes and collision-safe reservations.
- Service appointment availability and workshop capacity checks.
- Quotation creation, customer approval and job-card workflows.
- Accessory product inventory and order management.
- Secure customer registration, login and account management.
- Admin dashboard with granular role-based permissions.
- Invoices, payment records and reconciliation.
- Email/SMS notification interfaces with retry handling.
- Audit logs for sensitive business operations.
- Customer booking references and secure booking tracking.

## Pricing and booking integrity

All monetary calculations must occur on the backend.

Use TZS as the default currency. Persist price breakdowns, applicable fees, discounts, deposits and payment status.

Never trust prices, totals, availability or payment-success claims submitted by the browser.

Prevent overlapping vehicle reservations and workshop overbooking using appropriate database constraints, transactions and concurrency controls.

Use idempotency for reservation creation, order creation and payment callbacks.

Clearly distinguish estimated prices from confirmed quotations and fixed-price services.

## Security

Enforce authorization on the backend for every protected operation.

Protect customer data, private uploads, payment records and administrative functions.

Implement secure authentication, input validation, upload restrictions, rate limiting, audit logging and production-safe error handling.

Never commit secrets to source control.

Do not expose PostgreSQL or internal backend ports publicly without an explicitly justified and secured architecture.

## Required deliverables

1. Complete Angular source code.
2. Complete Spring Boot source code.
3. GraphQL schema and operation documentation.
4. PostgreSQL database model and Flyway migrations.
5. Functional responsive public website.
6. Functional customer portal.
7. Functional administrative dashboard.
8. Rental and service booking engines.
9. Configurable pricing and quotation workflows.
10. Payment-provider integration abstraction and documented setup.
11. Dockerfiles and Docker Compose configuration.
12. Nginx HTTPS and reverse-proxy configuration.
13. `.env.example` containing placeholders only.
14. Automated tests for critical business workflows.
15. README with local setup, development and production deployment instructions.
16. API, database, security and operations documentation.
17. Seed data for development and demonstration, clearly separated from production data.
18. Backup, restore, deployment and rollback instructions.

## Implementation process

Work in milestones.

Milestone 1: Inspect the existing repository, identify the current framework versions and produce an implementation plan. Preserve existing working code unless a justified change is required.

Milestone 2: Establish project structure, design tokens, database schema, migrations, authentication and role permissions.

Milestone 3: Implement the public website and vehicle/service catalogues.

Milestone 4: Implement rental availability, price calculations, reservations, service bookings and quotations.

Milestone 5: Implement workshop operations, accessories inventory, orders, invoices and payment workflows.

Milestone 6: Complete the administration dashboard, customer portal, notifications and reporting.

Milestone 7: Implement Docker deployment, HTTPS routing, monitoring, backups and recovery procedures.

Milestone 8: Run tests, fix defects, verify mobile responsiveness and produce complete documentation.

After each milestone:
- Run the relevant tests and builds.
- Report completed functionality and remaining work.
- Identify any missing credentials or external integrations.
- Document migrations and configuration changes.
- Do not claim that a feature works until it has been tested.

## Deployment requirements

Prepare the application for Docker Compose deployment behind the existing Nginx reverse proxy.

The intended public domain is https://naboo.co.tz, with www.naboo.co.tz configured consistently.

Do not overwrite or disrupt other existing services on the server. Inspect port usage and current proxy configuration before changing infrastructure.

Use versioned images, secure environment variables, database persistence, HTTPS and tested backups.

## Final acceptance

The completed application must build successfully, start using the documented procedure, pass its automated tests, enforce permissions, preserve booking/payment integrity and work on mobile devices.

Provide a final report listing implemented features, test results, setup commands, deployment instructions, environment variables, external integration requirements and any outstanding limitations.

Prioritize a working, secure and maintainable business system over visual mockups or unfinished features.