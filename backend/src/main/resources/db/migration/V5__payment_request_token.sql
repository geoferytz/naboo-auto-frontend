-- Idempotency for payment recording: a repeated submission returns the existing payment.
ALTER TABLE payments ADD COLUMN request_token UUID;

CREATE UNIQUE INDEX uq_payments_request_token ON payments (request_token)
    WHERE request_token IS NOT NULL;
