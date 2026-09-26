-- Execute in the same Neon database/branch used by DATABASE_URL.
-- Do not drop existing tables. Do not delete historical seasons.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.seasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  start_year integer NOT NULL UNIQUE CHECK (start_year BETWEEN 1900 AND 2199),
  end_year integer NOT NULL CHECK (end_year = start_year + 1),
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT seasons_name_matches_years CHECK (name = start_year::text || '/' || end_year::text)
);

-- PostgreSQL enforces at most one active season, even under concurrent requests.
CREATE UNIQUE INDEX IF NOT EXISTS seasons_only_one_active_idx
  ON public.seasons (is_active) WHERE is_active = true;
