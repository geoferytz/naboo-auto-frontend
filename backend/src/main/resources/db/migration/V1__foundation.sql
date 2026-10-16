-- Naboo Automotive: foundation schema (auth, customers, audit, vehicle sales, services, contact).
-- All timestamps are stored in UTC (timestamptz). Money uses NUMERIC(14,2) with explicit currency.

-- ---------------------------------------------------------------------------
-- Authentication
-- ---------------------------------------------------------------------------
CREATE TABLE roles (
    code        VARCHAR(40) PRIMARY KEY,
    description VARCHAR(200) NOT NULL
);

INSERT INTO roles (code, description) VALUES
    ('SUPER_ADMIN',       'Full configuration and access'),
    ('MANAGER',           'Operations, approvals, reports and oversight'),
    ('SALES_AGENT',       'Vehicle listings, enquiries and viewing requests'),
    ('RENTAL_AGENT',      'Rental reservations, handovers and returns'),
    ('SERVICE_ADVISOR',   'Appointments, inspections and quotations'),
    ('MECHANIC',          'Assigned workshop jobs and progress updates'),
    ('INVENTORY_MANAGER', 'Products, stock and parts'),
    ('FINANCE_OFFICER',   'Invoices, reconciliation and authorised refunds'),
    ('CUSTOMER',          'Own profile, bookings, quotations, orders and invoices');

CREATE TABLE users (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email          VARCHAR(254) NOT NULL,
    password_hash  VARCHAR(100) NOT NULL,
    full_name      VARCHAR(120) NOT NULL,
    phone          VARCHAR(30),
    enabled        BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at  TIMESTAMPTZ,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    version        BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT users_email_lowercase CHECK (email = lower(email))
);
CREATE UNIQUE INDEX users_email_uq ON users (email);

CREATE TABLE user_roles (
    user_id   UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    role_code VARCHAR(40) NOT NULL REFERENCES roles (code),
    PRIMARY KEY (user_id, role_code)
);

-- ---------------------------------------------------------------------------
-- Customers
-- ---------------------------------------------------------------------------
CREATE TABLE customers (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID UNIQUE REFERENCES users (id) ON DELETE SET NULL,
    full_name  VARCHAR(120) NOT NULL,
    email      VARCHAR(254) NOT NULL,
    phone      VARCHAR(30),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    version    BIGINT NOT NULL DEFAULT 0
);
CREATE INDEX customers_email_idx ON customers (email);

-- ---------------------------------------------------------------------------
-- Audit
-- ---------------------------------------------------------------------------
CREATE TABLE audit_logs (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_user_id UUID REFERENCES users (id) ON DELETE SET NULL,
    action        VARCHAR(80) NOT NULL,
    entity_type   VARCHAR(80) NOT NULL,
    entity_id     VARCHAR(80),
    details       TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX audit_logs_entity_idx ON audit_logs (entity_type, entity_id);
CREATE INDEX audit_logs_created_idx ON audit_logs (created_at DESC);

-- ---------------------------------------------------------------------------
-- Vehicle sales
-- ---------------------------------------------------------------------------
CREATE TABLE vehicles (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug                VARCHAR(160) NOT NULL UNIQUE,
    make                VARCHAR(60)  NOT NULL,
    model               VARCHAR(60)  NOT NULL,
    variant             VARCHAR(80),
    model_year          INTEGER      NOT NULL CHECK (model_year BETWEEN 1950 AND 2100),
    mileage_km          INTEGER      CHECK (mileage_km >= 0),
    fuel_type           VARCHAR(20)  NOT NULL CHECK (fuel_type IN ('PETROL','DIESEL','HYBRID','ELECTRIC','LPG')),
    transmission        VARCHAR(20)  NOT NULL CHECK (transmission IN ('MANUAL','AUTOMATIC')),
    body_type           VARCHAR(20)  NOT NULL CHECK (body_type IN ('SEDAN','HATCHBACK','SUV','PICKUP','VAN','COUPE','WAGON','OTHER')),
    color               VARCHAR(40),
    vehicle_condition   VARCHAR(20)  NOT NULL CHECK (vehicle_condition IN ('NEW','FOREIGN_USED','LOCALLY_USED')),
    engine_capacity_cc  INTEGER      CHECK (engine_capacity_cc > 0),
    description         TEXT,
    registration_number VARCHAR(20),
    price_amount        NUMERIC(14,2) NOT NULL CHECK (price_amount >= 0),
    currency            VARCHAR(3)   NOT NULL DEFAULT 'TZS',
    status              VARCHAR(20)  NOT NULL CHECK (status IN ('AVAILABLE','RESERVED','SOLD','UNAVAILABLE')),
    published           BOOLEAN      NOT NULL DEFAULT FALSE,
    published_at        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    version             BIGINT       NOT NULL DEFAULT 0
);
CREATE INDEX vehicles_public_idx ON vehicles (published, status);
CREATE INDEX vehicles_make_model_idx ON vehicles (lower(make), lower(model));
CREATE INDEX vehicles_price_idx ON vehicles (price_amount);
CREATE INDEX vehicles_year_idx ON vehicles (model_year);

CREATE TABLE vehicle_features (
    vehicle_id UUID NOT NULL REFERENCES vehicles (id) ON DELETE CASCADE,
    sort_order INTEGER NOT NULL,
    feature    VARCHAR(80) NOT NULL,
    PRIMARY KEY (vehicle_id, sort_order)
);

CREATE TABLE vehicle_images (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES vehicles (id) ON DELETE CASCADE,
    url        VARCHAR(500) NOT NULL,
    alt_text   VARCHAR(200) NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX vehicle_images_vehicle_idx ON vehicle_images (vehicle_id, sort_order);

CREATE TABLE vehicle_status_history (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id         UUID NOT NULL REFERENCES vehicles (id) ON DELETE CASCADE,
    from_status        VARCHAR(20),
    to_status          VARCHAR(20) NOT NULL,
    changed_by_user_id UUID REFERENCES users (id) ON DELETE SET NULL,
    changed_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX vehicle_status_history_vehicle_idx ON vehicle_status_history (vehicle_id, changed_at DESC);

-- General enquiries and viewing requests share one table, distinguished by enquiry_type.
CREATE TABLE vehicle_enquiries (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference             VARCHAR(20) NOT NULL UNIQUE,
    vehicle_id            UUID NOT NULL REFERENCES vehicles (id),
    customer_id           UUID REFERENCES customers (id) ON DELETE SET NULL,
    enquiry_type          VARCHAR(20) NOT NULL CHECK (enquiry_type IN ('GENERAL','VIEWING')),
    full_name             VARCHAR(120) NOT NULL,
    email                 VARCHAR(254) NOT NULL,
    phone                 VARCHAR(30)  NOT NULL,
    message               VARCHAR(2000),
    preferred_viewing_at  TIMESTAMPTZ,
    status                VARCHAR(30) NOT NULL CHECK (status IN ('NEW','CONTACTED','VIEWING_SCHEDULED','CLOSED_WON','CLOSED_LOST')),
    assigned_to_user_id   UUID REFERENCES users (id) ON DELETE SET NULL,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    version               BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT viewing_requires_time CHECK (enquiry_type <> 'VIEWING' OR preferred_viewing_at IS NOT NULL)
);
CREATE INDEX vehicle_enquiries_status_idx ON vehicle_enquiries (status, created_at DESC);
CREATE INDEX vehicle_enquiries_vehicle_idx ON vehicle_enquiries (vehicle_id);

-- ---------------------------------------------------------------------------
-- Services catalogue
-- ---------------------------------------------------------------------------
CREATE TABLE service_categories (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug        VARCHAR(80)  NOT NULL UNIQUE,
    name        VARCHAR(80)  NOT NULL,
    description VARCHAR(500),
    sort_order  INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    version     BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE services (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id      UUID NOT NULL REFERENCES service_categories (id),
    slug             VARCHAR(120) NOT NULL UNIQUE,
    name             VARCHAR(120) NOT NULL,
    summary          VARCHAR(300) NOT NULL,
    description      TEXT,
    price_type       VARCHAR(30) NOT NULL CHECK (price_type IN ('FIXED','STARTING_FROM','HOURLY','INSPECTION_REQUIRED','QUOTE_REQUIRED')),
    price_amount     NUMERIC(14,2) CHECK (price_amount >= 0),
    currency         VARCHAR(3) NOT NULL DEFAULT 'TZS',
    duration_minutes INTEGER CHECK (duration_minutes > 0),
    active           BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order       INTEGER NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    version          BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT services_price_required CHECK (
        price_type IN ('INSPECTION_REQUIRED','QUOTE_REQUIRED') OR price_amount IS NOT NULL)
);
CREATE INDEX services_category_idx ON services (category_id, active, sort_order);

-- ---------------------------------------------------------------------------
-- Contact enquiries
-- ---------------------------------------------------------------------------
CREATE TABLE contact_enquiries (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference   VARCHAR(20) NOT NULL UNIQUE,
    customer_id UUID REFERENCES customers (id) ON DELETE SET NULL,
    full_name   VARCHAR(120) NOT NULL,
    email       VARCHAR(254) NOT NULL,
    phone       VARCHAR(30),
    subject     VARCHAR(150) NOT NULL,
    message     VARCHAR(4000) NOT NULL,
    status      VARCHAR(20) NOT NULL CHECK (status IN ('NEW','IN_PROGRESS','RESOLVED')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    version     BIGINT NOT NULL DEFAULT 0
);
CREATE INDEX contact_enquiries_status_idx ON contact_enquiries (status, created_at DESC);
