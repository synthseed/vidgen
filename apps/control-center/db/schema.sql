-- OpenClaw Control Center Phase 1 schema (Timescale-ready)
-- Apply on PostgreSQL with TimescaleDB extension enabled.

CREATE EXTENSION IF NOT EXISTS timescaledb;

CREATE TABLE IF NOT EXISTS metric_series (
  id BIGSERIAL PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  source TEXT NOT NULL,
  unit TEXT NOT NULL,
  tags_schema JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS metric_points (
  time TIMESTAMPTZ NOT NULL,
  series_id BIGINT NOT NULL REFERENCES metric_series(id) ON DELETE CASCADE,
  value_double DOUBLE PRECISION,
  value_int BIGINT,
  value_bool BOOLEAN,
  value_text TEXT,
  tags JSONB NOT NULL DEFAULT '{}'::jsonb,
  quality TEXT NOT NULL DEFAULT 'ok',
  tags_hash TEXT NOT NULL,
  PRIMARY KEY (time, series_id, tags_hash)
);

SELECT create_hypertable('metric_points', 'time', if_not_exists => TRUE);

CREATE TABLE IF NOT EXISTS events (
  id BIGSERIAL PRIMARY KEY,
  time TIMESTAMPTZ NOT NULL DEFAULT now(),
  type TEXT NOT NULL,
  severity TEXT NOT NULL,
  source TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS snapshots (
  id BIGSERIAL PRIMARY KEY,
  time TIMESTAMPTZ NOT NULL DEFAULT now(),
  source TEXT NOT NULL,
  payload JSONB NOT NULL
);
