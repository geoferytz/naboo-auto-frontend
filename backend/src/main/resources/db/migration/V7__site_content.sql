-- Milestone: admin-managed public site content (homepage, contact details, branding).
-- A single JSON document edited from the admin area; the frontend merges it over
-- built-in defaults so missing keys always render sensibly.

CREATE TABLE site_content (
    id         smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    content    jsonb       NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now(),
    updated_by uuid REFERENCES users (id)
);
