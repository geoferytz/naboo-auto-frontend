-- Milestone 6: in-app notifications.

CREATE TABLE notifications (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    type        varchar(40)  NOT NULL,
    title       varchar(200) NOT NULL,
    body        varchar(1000) NOT NULL,
    link        varchar(300),
    entity_type varchar(40),
    entity_id   uuid,
    read_at     timestamptz,
    created_at  timestamptz  NOT NULL DEFAULT now()
);
CREATE INDEX notifications_user_unread_idx ON notifications (user_id, created_at) WHERE read_at IS NULL;
