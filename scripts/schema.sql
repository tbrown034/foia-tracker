-- FOIA Tracker schema
-- Source of truth. Run `pnpm tsx scripts/apply-schema.ts` to apply.
-- All ingest scripts upsert via ON CONFLICT against these primary keys.

CREATE TABLE IF NOT EXISTS foia_annual (
  agency text NOT NULL,
  component text NOT NULL,
  fiscal_year int NOT NULL,
  pending_start int,
  received int,
  processed int,
  pending_end int,
  ingested_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (agency, component, fiscal_year)
);

CREATE INDEX IF NOT EXISTS foia_annual_year_idx ON foia_annual (fiscal_year);
CREATE INDEX IF NOT EXISTS foia_annual_agency_idx ON foia_annual (agency);

CREATE TABLE IF NOT EXISTS foia_oldest_pending (
  agency text NOT NULL,
  component text NOT NULL,
  fiscal_year int NOT NULL,
  rank int NOT NULL,
  date_received date,
  days_pending int,
  ingested_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (agency, component, fiscal_year, rank)
);

CREATE TABLE IF NOT EXISTS foia_exemptions (
  agency text NOT NULL,
  component text NOT NULL,
  fiscal_year int NOT NULL,
  exemption text NOT NULL,
  invocations int,
  ingested_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (agency, component, fiscal_year, exemption)
);

CREATE TABLE IF NOT EXISTS foia_personnel (
  agency text NOT NULL,
  component text NOT NULL,
  fiscal_year int NOT NULL,
  full_time int,
  equivalent_fte numeric,
  total_fte numeric,
  ingested_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (agency, component, fiscal_year)
);

CREATE TABLE IF NOT EXISTS foia_processing_time (
  agency text NOT NULL,
  component text NOT NULL,
  fiscal_year int NOT NULL,
  request_type text NOT NULL,
  median_days numeric,
  avg_days numeric,
  ingested_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (agency, component, fiscal_year, request_type)
);

CREATE TABLE IF NOT EXISTS foia_quarterly (
  agency text NOT NULL,
  component text NOT NULL,
  fiscal_year int NOT NULL,
  fiscal_quarter int NOT NULL,
  received int,
  processed int,
  backlog int,
  ingested_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (agency, component, fiscal_year, fiscal_quarter)
);

CREATE INDEX IF NOT EXISTS foia_quarterly_period_idx
  ON foia_quarterly (fiscal_year DESC, fiscal_quarter DESC);

CREATE TABLE IF NOT EXISTS sync_log (
  id bigserial PRIMARY KEY,
  source text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  records int,
  status text,
  error text
);

CREATE INDEX IF NOT EXISTS sync_log_source_idx ON sync_log (source, started_at DESC);
