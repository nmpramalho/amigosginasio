-- Portal Bilhar: mapeamento de equipas locais e inscricoes federativas.
-- Executar depois de auth.sql, seasons.sql, teams.sql e team-division.sql.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.portal_team_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id uuid NOT NULL REFERENCES public.seasons(id) ON DELETE RESTRICT,
  team_id uuid NOT NULL,

  portal_team_code text NOT NULL,
  portal_team_name text NOT NULL,
  portal_team_url text NOT NULL,

  verification_status text NOT NULL DEFAULT 'confirmed',
  verification_error text,
  confirmed_at timestamptz NOT NULL DEFAULT now(),
  confirmed_by uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  last_verified_at timestamptz,

  is_active boolean NOT NULL DEFAULT true,
  disconnected_at timestamptz,
  disconnected_by uuid REFERENCES public.users(id) ON DELETE SET NULL,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT portal_team_mappings_team_season_fk
    FOREIGN KEY (team_id, season_id)
    REFERENCES public.teams(id, season_id)
    ON DELETE RESTRICT,

  CONSTRAINT portal_team_mappings_code_format_ck
    CHECK (portal_team_code ~ '^EQP[0-9]+$'),

  CONSTRAINT portal_team_mappings_name_ck
    CHECK (
      portal_team_name = btrim(portal_team_name)
      AND length(portal_team_name) BETWEEN 2 AND 160
    ),

  CONSTRAINT portal_team_mappings_url_ck
    CHECK (
      portal_team_url = btrim(portal_team_url)
      AND portal_team_url LIKE 'https://www.portalbilhar.pt/%'
    ),

  CONSTRAINT portal_team_mappings_verification_status_ck
    CHECK (verification_status IN ('confirmed', 'verified', 'not_found', 'error')),

  CONSTRAINT portal_team_mappings_disconnect_ck
    CHECK (
      (is_active AND disconnected_at IS NULL)
      OR
      (NOT is_active AND disconnected_at IS NOT NULL)
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS portal_team_mappings_one_active_per_team_uidx
  ON public.portal_team_mappings(team_id)
  WHERE is_active;

CREATE UNIQUE INDEX IF NOT EXISTS portal_team_mappings_one_active_code_per_season_uidx
  ON public.portal_team_mappings(season_id, portal_team_code)
  WHERE is_active;

CREATE INDEX IF NOT EXISTS portal_team_mappings_season_idx
  ON public.portal_team_mappings(season_id, is_active);

CREATE INDEX IF NOT EXISTS portal_team_mappings_verification_idx
  ON public.portal_team_mappings(verification_status, last_verified_at);

CREATE TABLE IF NOT EXISTS public.portal_competition_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mapping_id uuid NOT NULL
    REFERENCES public.portal_team_mappings(id)
    ON DELETE RESTRICT,

  portal_competition_ref text NOT NULL,
  portal_competition_name text NOT NULL,
  portal_competition_url text NOT NULL,
  portal_entry_ref text,

  variant text NOT NULL DEFAULT 'Carambola',
  division smallint,
  zone text,
  phase text,
  series text,
  portal_status text,

  is_active boolean NOT NULL DEFAULT true,
  discovered_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  last_synced_at timestamptz,
  deactivated_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT portal_competition_entries_ref_ck
    CHECK (
      portal_competition_ref = btrim(portal_competition_ref)
      AND length(portal_competition_ref) BETWEEN 1 AND 200
    ),

  CONSTRAINT portal_competition_entries_name_ck
    CHECK (
      portal_competition_name = btrim(portal_competition_name)
      AND length(portal_competition_name) BETWEEN 2 AND 240
    ),

  CONSTRAINT portal_competition_entries_url_ck
    CHECK (
      portal_competition_url = btrim(portal_competition_url)
      AND portal_competition_url LIKE 'https://www.portalbilhar.pt/%'
    ),

  CONSTRAINT portal_competition_entries_variant_ck
    CHECK (
      variant = btrim(variant)
      AND length(variant) BETWEEN 2 AND 80
    ),

  CONSTRAINT portal_competition_entries_division_ck
    CHECK (division IS NULL OR division BETWEEN 1 AND 20),

  CONSTRAINT portal_competition_entries_seen_ck
    CHECK (last_seen_at >= discovered_at),

  CONSTRAINT portal_competition_entries_deactivated_ck
    CHECK (
      (is_active AND deactivated_at IS NULL)
      OR
      (NOT is_active AND deactivated_at IS NOT NULL)
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS portal_competition_entries_identity_uidx
  ON public.portal_competition_entries(
    mapping_id,
    portal_competition_ref,
    COALESCE(phase, ''),
    COALESCE(series, '')
  );

CREATE UNIQUE INDEX IF NOT EXISTS portal_competition_entries_external_ref_uidx
  ON public.portal_competition_entries(mapping_id, portal_entry_ref)
  WHERE portal_entry_ref IS NOT NULL;

CREATE INDEX IF NOT EXISTS portal_competition_entries_mapping_idx
  ON public.portal_competition_entries(mapping_id, is_active);

CREATE INDEX IF NOT EXISTS portal_competition_entries_last_seen_idx
  ON public.portal_competition_entries(last_seen_at DESC)
  WHERE is_active;

CREATE OR REPLACE FUNCTION public.touch_portal_team_mapping_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS portal_team_mappings_touch_updated_at
  ON public.portal_team_mappings;

CREATE TRIGGER portal_team_mappings_touch_updated_at
BEFORE UPDATE ON public.portal_team_mappings
FOR EACH ROW
EXECUTE FUNCTION public.touch_portal_team_mapping_updated_at();

CREATE OR REPLACE FUNCTION public.touch_portal_competition_entry_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS portal_competition_entries_touch_updated_at
  ON public.portal_competition_entries;

CREATE TRIGGER portal_competition_entries_touch_updated_at
BEFORE UPDATE ON public.portal_competition_entries
FOR EACH ROW
EXECUTE FUNCTION public.touch_portal_competition_entry_updated_at();

COMMIT;
