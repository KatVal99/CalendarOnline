-- V1 Initial Schema for CalendarOnline (PostgreSQL)

CREATE TABLE IF NOT EXISTS app_users (
    email VARCHAR(255) PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    reset_token VARCHAR(255),
    reset_token_expiry TIMESTAMP WITHOUT TIME ZONE
);

CREATE TABLE IF NOT EXISTS budget_events (
    id VARCHAR(255) PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    type VARCHAR(64) NOT NULL,
    amount NUMERIC(12, 2),
    label VARCHAR(255),
    event_date DATE NOT NULL,
    year_month VARCHAR(7),
    duration_months INTEGER
);

CREATE TABLE IF NOT EXISTS calendar_events (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    event_date DATE NOT NULL,
    event_time TIME WITHOUT TIME ZONE,
    title VARCHAR(255) NOT NULL,
    event_type VARCHAR(64),
    reminder_minutes INTEGER,
    created_at TIMESTAMP WITHOUT TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_budget_events_username ON budget_events(username);
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_date ON calendar_events(username, event_date);
