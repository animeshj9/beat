CREATE EXTENSION IF NOT EXISTS postgis;
CREATE TABLE IF NOT EXISTS events (
  id text PRIMARY KEY,
  entity_id text NOT NULL,
  detected_at timestamptz NOT NULL,
  location geography(Point,4326) NOT NULL,
  payload jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS events_location ON events USING gist(location);
CREATE INDEX IF NOT EXISTS events_entity ON events(entity_id,detected_at DESC);
CREATE TABLE IF NOT EXISTS crawl_runs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  started_at timestamptz NOT NULL DEFAULT now(),
  place jsonb NOT NULL,
  accepted integer NOT NULL,
  rejected integer NOT NULL,
  status text NOT NULL
);
