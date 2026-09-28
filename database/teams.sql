-- Execute once on the same Neon branch/database as DATABASE_URL.
-- No change to existing players or seasons; historical memberships are retained.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE IF NOT EXISTS public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id uuid NOT NULL REFERENCES public.seasons(id) ON DELETE RESTRICT,
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 2 AND 120 AND name = btrim(name)),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT teams_id_season_unique UNIQUE (id, season_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS teams_season_name_unique_idx ON public.teams (season_id, lower(name));
CREATE TABLE IF NOT EXISTS public.team_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id uuid NOT NULL REFERENCES public.seasons(id) ON DELETE RESTRICT,
  team_id uuid NOT NULL,
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE RESTRICT,
  joined_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  CONSTRAINT membership_team_same_season_fk FOREIGN KEY (team_id, season_id)
    REFERENCES public.teams(id, season_id) ON DELETE RESTRICT,
  CONSTRAINT membership_valid_period CHECK (ended_at IS NULL OR ended_at >= joined_at)
);
-- A player can only have one current team within a season; old assignments remain recorded.
CREATE UNIQUE INDEX IF NOT EXISTS membership_one_current_team_per_season_idx
  ON public.team_memberships(season_id, player_id) WHERE ended_at IS NULL;
CREATE INDEX IF NOT EXISTS membership_team_current_idx ON public.team_memberships(team_id) WHERE ended_at IS NULL;
CREATE INDEX IF NOT EXISTS membership_player_history_idx ON public.team_memberships(player_id, season_id, joined_at);
