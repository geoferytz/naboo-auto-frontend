-- Milestone 5: workshop jobs, accessories & stock, orders, invoices & payments.

CREATE TABLE workshop_jobs (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    reference         varchar(24)  NOT NULL UNIQUE,
    booking_id        uuid REFERENCES service_bookings (id) ON DELETE SET NULL,
    vehicle_description varchar(200) NOT NULL,
    description       varchar(4000) NOT NULL,
    status            varchar(20)  NOT NULL DEFAULT 'SCHEDULED'
                        CHECK (status IN ('SCHEDULED','IN_PROGRESS','ON_HOLD','COMPLETED','CANCELLED')),
    assigned_to_user_id uuid REFERENCES users (id) ON DELETE SET NULL,
    scheduled_for     timestamptz,
    labor_notes       varchar(4000),
    created_at        timestamptz  NOT NULL DEFAULT now(),
    updated_at        timestamptz  NOT NULL DEFAULT now(),
    version           bigint       NOT NULL DEFAULT 0
);
CREATE INDEX workshop_jobs_status_idx ON workshop_jobs (status, scheduled_for);
CREATE INDEX workshop_jobs_assignee_idx ON workshop_jobs (assigned_to_user_id, status);

CREATE TABLE accessories (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    sku            varchar(30)  NOT NULL UNIQUE,
    name           varchar(120) NOT NULL,
    category       varchar(60),
    description    varchar(4000),
    price_amount   numeric(14,2) NOT NULL CHECK (price_amount >= 0),
    currency       varchar(3)   NOT NULL,
    stock_quantity integer      NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    active         boolean      NOT NULL DEFAULT true,
    created_at     timestamptz  NOT NULL DEFAULT now(),
    updated_at     timestamptz  NOT NULL DEFAULT now(),
    version        bigint       NOT NULL DEFAULT 0
);
CREATE INDEX accessories_active_idx ON accessories (active, category);

CREATE TABLE orders (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    reference   varchar(24)  NOT NULL UNIQUE,
    request_token uuid UNIQUE,
    customer_id uuid REFERENCES customers (id) ON DELETE SET NULL,
    full_name   varchar(120) NOT NULL,
    email       varchar(254) NOT NULL,
    phone       varchar(30)  NOT NULL,
    status      varchar(20)  NOT NULL DEFAULT 'PENDING'
                  CHECK (status IN ('PENDING','CONFIRMED','READY','COMPLETED','CANCELLED')),
    total_amount numeric(14,2) NOT NULL CHECK (total_amount >= 0),
    currency    varchar(3)   NOT NULL,
    notes       varchar(2000),
    created_at  timestamptz  NOT NULL DEFAULT now(),
    updated_at  timestamptz  NOT NULL DEFAULT now(),
    version     bigint       NOT NULL DEFAULT 0
);
CREATE INDEX orders_status_idx ON orders (status, created_at);
CREATE INDEX orders_customer_idx ON orders (customer_id, created_at);

CREATE TABLE order_items (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id     uuid NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
    accessory_id uuid NOT NULL REFERENCES accessories (id) ON DELETE RESTRICT,
    description  varchar(200) NOT NULL,
    unit_price_amount numeric(14,2) NOT NULL CHECK (unit_price_amount >= 0),
    quantity     integer NOT NULL CHECK (quantity > 0),
    line_total   numeric(14,2) NOT NULL CHECK (line_total >= 0),
    created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX order_items_order_idx ON order_items (order_id);

CREATE TABLE stock_movements (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    accessory_id  uuid NOT NULL REFERENCES accessories (id) ON DELETE CASCADE,
    delta         integer NOT NULL,
    reason        varchar(30) NOT NULL
                    CHECK (reason IN ('ORDER_PLACED','ORDER_CANCELLED','ADJUSTMENT','RESTOCK')),
    order_id      uuid REFERENCES orders (id) ON DELETE SET NULL,
    actor_user_id uuid REFERENCES users (id) ON DELETE SET NULL,
    note          varchar(500),
    created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX stock_movements_accessory_idx ON stock_movements (accessory_id, created_at);

CREATE TABLE invoices (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    reference     varchar(24) NOT NULL UNIQUE,
    customer_id   uuid REFERENCES customers (id) ON DELETE SET NULL,
    recipient_name  varchar(120) NOT NULL,
    recipient_email varchar(254) NOT NULL,
    booking_id    uuid REFERENCES service_bookings (id) ON DELETE SET NULL,
    order_id      uuid REFERENCES orders (id) ON DELETE SET NULL,
    quotation_id  uuid REFERENCES quotations (id) ON DELETE SET NULL,
    status        varchar(10) NOT NULL DEFAULT 'DRAFT'
                    CHECK (status IN ('DRAFT','ISSUED','PAID','VOID')),
    total_amount  numeric(14,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
    currency      varchar(3)  NOT NULL,
    due_date      date,
    issued_at     timestamptz,
    paid_at       timestamptz,
    notes         varchar(2000),
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now(),
    version       bigint      NOT NULL DEFAULT 0
);
CREATE INDEX invoices_status_idx ON invoices (status, due_date);
CREATE INDEX invoices_customer_idx ON invoices (customer_id, created_at);

CREATE TABLE invoice_items (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id  uuid NOT NULL REFERENCES invoices (id) ON DELETE CASCADE,
    description varchar(300) NOT NULL,
    quantity    integer NOT NULL CHECK (quantity > 0),
    unit_price  numeric(14,2) NOT NULL CHECK (unit_price >= 0),
    line_total  numeric(14,2) NOT NULL CHECK (line_total >= 0),
    created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX invoice_items_invoice_idx ON invoice_items (invoice_id);

CREATE TABLE payments (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    reference      varchar(60),
    invoice_id     uuid NOT NULL REFERENCES invoices (id) ON DELETE RESTRICT,
    amount         numeric(14,2) NOT NULL CHECK (amount > 0),
    currency       varchar(3) NOT NULL,
    method         varchar(20) NOT NULL
                     CHECK (method IN ('CASH','CARD','BANK_TRANSFER','MPESA','TIGOPESA','AIRTEL_MONEY')),
    paid_at        timestamptz NOT NULL,
    received_by_user_id uuid REFERENCES users (id) ON DELETE SET NULL,
    note           varchar(500),
    created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX payments_invoice_idx ON payments (invoice_id);
