-- Naboo Automotive: rentals, service bookings and quotations.
-- Overlapping rental reservations are rejected by a PostgreSQL exclusion constraint;
-- workshop capacity is enforced by locking the single workshop_capacity row per transaction.

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ---------------------------------------------------------------------------
-- Rental fleet (kept separate from the sales catalogue: different pricing model)
-- ---------------------------------------------------------------------------
CREATE TABLE rental_vehicles (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug                VARCHAR(160) NOT NULL UNIQUE,
    make                VARCHAR(60)  NOT NULL,
    model               VARCHAR(60)  NOT NULL,
    variant             VARCHAR(80),
    model_year          INTEGER      NOT NULL CHECK (model_year BETWEEN 1950 AND 2100),
    seats               INTEGER      CHECK (seats BETWEEN 1 AND 60),
    fuel_type           VARCHAR(20)  NOT NULL CHECK (fuel_type IN ('PETROL','DIESEL','HYBRID','ELECTRIC','LPG')),
    transmission        VARCHAR(20)  NOT NULL CHECK (transmission IN ('MANUAL','AUTOMATIC')),
    body_type           VARCHAR(20)  NOT NULL CHECK (body_type IN ('SEDAN','HATCHBACK','SUV','PICKUP','VAN','COUPE','WAGON','OTHER')),
    color               VARCHAR(40),
    description         TEXT,
    registration_number VARCHAR(20),
    daily_rate_amount   NUMERIC(14,2) NOT NULL CHECK (daily_rate_amount >= 0),
    deposit_amount      NUMERIC(14,2) CHECK (deposit_amount >= 0),
    currency            VARCHAR(3)   NOT NULL DEFAULT 'TZS',
    status              VARCHAR(20)  NOT NULL CHECK (status IN ('AVAILABLE','UNAVAILABLE')),
    published           BOOLEAN      NOT NULL DEFAULT FALSE,
    published_at        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    version             BIGINT       NOT NULL DEFAULT 0
);
CREATE INDEX rental_vehicles_public_idx ON rental_vehicles (published, status);

CREATE TABLE rental_vehicle_images (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rental_vehicle_id UUID NOT NULL REFERENCES rental_vehicles (id) ON DELETE CASCADE,
    url               VARCHAR(500) NOT NULL,
    alt_text          VARCHAR(200) NOT NULL,
    sort_order        INTEGER NOT NULL DEFAULT 0,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX rental_vehicle_images_vehicle_idx ON rental_vehicle_images (rental_vehicle_id, sort_order);

-- ---------------------------------------------------------------------------
-- Rental reservations
-- Half-open date range [start_date, end_date): a vehicle returned on Monday morning can
-- be collected by the next customer the same day.
-- ---------------------------------------------------------------------------
CREATE TABLE rental_reservations (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference         VARCHAR(20) NOT NULL UNIQUE,
    request_token     UUID UNIQUE,
    rental_vehicle_id UUID NOT NULL REFERENCES rental_vehicles (id),
    customer_id       UUID REFERENCES customers (id) ON DELETE SET NULL,
    full_name         VARCHAR(120) NOT NULL,
    email             VARCHAR(254) NOT NULL,
    phone             VARCHAR(30)  NOT NULL,
    start_date        DATE NOT NULL,
    end_date          DATE NOT NULL,
    status            VARCHAR(20) NOT NULL CHECK (status IN ('PENDING','CONFIRMED','ACTIVE','COMPLETED','CANCELLED')),
    daily_rate_amount NUMERIC(14,2) NOT NULL CHECK (daily_rate_amount >= 0),
    total_amount      NUMERIC(14,2) NOT NULL CHECK (total_amount >= 0),
    currency          VARCHAR(3) NOT NULL DEFAULT 'TZS',
    notes             VARCHAR(2000),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    version           BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT rental_dates_valid CHECK (end_date > start_date),
    CONSTRAINT rental_length_limit CHECK (end_date - start_date <= 60)
);
CREATE INDEX rental_reservations_status_idx ON rental_reservations (status, start_date);
CREATE INDEX rental_reservations_vehicle_idx ON rental_reservations (rental_vehicle_id, start_date);

ALTER TABLE rental_reservations ADD CONSTRAINT rental_no_overlap
    EXCLUDE USING gist (
        rental_vehicle_id WITH =,
        daterange(start_date, end_date) WITH &&
    ) WHERE (status IN ('PENDING','CONFIRMED','ACTIVE'));

-- ---------------------------------------------------------------------------
-- Workshop bookings. Concurrency: booking transactions lock the single
-- workshop_capacity row, then count overlapping active bookings.
-- ---------------------------------------------------------------------------
CREATE TABLE workshop_capacity (
    id                  SMALLINT PRIMARY KEY CHECK (id = 1),
    max_concurrent_jobs INTEGER NOT NULL CHECK (max_concurrent_jobs > 0)
);
INSERT INTO workshop_capacity (id, max_concurrent_jobs) VALUES (1, 2);

CREATE TABLE service_bookings (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference           VARCHAR(20) NOT NULL UNIQUE,
    request_token       UUID UNIQUE,
    service_id          UUID NOT NULL REFERENCES services (id),
    customer_id         UUID REFERENCES customers (id) ON DELETE SET NULL,
    full_name           VARCHAR(120) NOT NULL,
    email               VARCHAR(254) NOT NULL,
    phone               VARCHAR(30)  NOT NULL,
    vehicle_description VARCHAR(200) NOT NULL,
    scheduled_start     TIMESTAMPTZ NOT NULL,
    scheduled_end       TIMESTAMPTZ NOT NULL,
    status              VARCHAR(20) NOT NULL CHECK (status IN ('PENDING','CONFIRMED','IN_PROGRESS','COMPLETED','CANCELLED','NO_SHOW')),
    notes               VARCHAR(2000),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    version             BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT booking_times_valid CHECK (scheduled_end > scheduled_start)
);
CREATE INDEX service_bookings_status_idx ON service_bookings (status, scheduled_start);
CREATE INDEX service_bookings_window_idx ON service_bookings (scheduled_start, scheduled_end);

-- ---------------------------------------------------------------------------
-- Quotations for priced-on-request work (painting, restoration, detailing, repairs)
-- ---------------------------------------------------------------------------
CREATE TABLE quotations (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference           VARCHAR(20) NOT NULL UNIQUE,
    request_token       UUID UNIQUE,
    service_id          UUID REFERENCES services (id) ON DELETE SET NULL,
    customer_id         UUID REFERENCES customers (id) ON DELETE SET NULL,
    user_id             UUID REFERENCES users (id) ON DELETE SET NULL,
    full_name           VARCHAR(120) NOT NULL,
    email               VARCHAR(254) NOT NULL,
    phone               VARCHAR(30)  NOT NULL,
    work_type           VARCHAR(30) NOT NULL CHECK (work_type IN ('PAINTING','COLOUR_CHANGE','DETAILING','RESTORATION','REPAIR','MAINTENANCE','ACCESSORIES','OTHER')),
    vehicle_description VARCHAR(200) NOT NULL,
    description         VARCHAR(4000) NOT NULL,
    status              VARCHAR(20) NOT NULL CHECK (status IN ('REQUESTED','QUOTED','ACCEPTED','DECLINED','EXPIRED','CANCELLED')),
    quoted_amount       NUMERIC(14,2) CHECK (quoted_amount >= 0),
    currency            VARCHAR(3) NOT NULL DEFAULT 'TZS',
    valid_until         DATE,
    staff_notes         VARCHAR(2000),
    created_by_user_id  UUID REFERENCES users (id) ON DELETE SET NULL,
    decided_at          TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    version             BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT quoted_requires_amount CHECK (status <> 'QUOTED' OR (quoted_amount IS NOT NULL AND valid_until IS NOT NULL))
);
CREATE INDEX quotations_status_idx ON quotations (status, created_at DESC);
CREATE INDEX quotations_customer_idx ON quotations (customer_id);
