-- Portal Bilhar: extensao dos encontros oficiais e historico de alteracoes.
-- Executar depois de team-matches.sql, team-portal-mappings.sql e portal-sync-runs.sql.

BEGIN;

ALTER TABLE public.team_matches
  ADD COLUMN IF NOT EXISTS portal_entry_id uuid,
  ADD COLUMN IF NOT EXISTS portal_match_ref text,
  ADD COLUMN IF NOT EXISTS portal_match_url text,
  ADD COLUMN IF NOT EXISTS portal_competition_name text,
  ADD COLUMN IF NOT EXISTS portal_phase text,
  ADD COLUMN IF NOT EXISTS portal_series text,
  ADD COLUMN IF NOT EXISTS portal_round text,
  ADD COLUMN IF NOT EXISTS portal_home_team_code text,
  ADD COLUMN IF NOT EXISTS portal_home_team_name text,
  ADD COLUMN IF NOT EXISTS portal_away_team_code text,
  ADD COLUMN IF NOT EXISTS portal_away_team_name text,
  ADD COLUMN IF NOT EXISTS portal_venue text,
  ADD COLUMN IF NOT EXISTS portal_status text,
  ADD COLUMN IF NOT EXISTS portal_home_score smallint,
  ADD COLUMN IF NOT EXISTS portal_away_score smallint,
  ADD COLUMN IF NOT EXISTS portal_first_seen_at timestamptz,
  ADD COLUMN IF NOT EXISTS portal_last_seen_at timestamptz,
  ADD COLUMN IF NOT EXISTS portal_last_synced_at timestamptz,
  ADD COLUMN IF NOT EXISTS portal_payload_hash text,
  ADD COLUMN IF NOT EXISTS portal_missing_since timestamptz,
  ADD COLUMN IF NOT EXISTS portal_sync_status text,
  ADD COLUMN IF NOT EXISTS portal_sync_error text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.team_matches'::regclass
      AND conname = 'team_matches_portal_entry_fk'
  ) THEN
    ALTER TABLE public.team_matches
      ADD CONSTRAINT team_matches_portal_entry_fk
      FOREIGN KEY (portal_entry_id)
      REFERENCES public.portal_competition_entries(id)
      ON DELETE RESTRICT;
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.team_matches'::regclass
      AND conname = 'team_matches_portal_sync_status_ck'
  ) THEN
    ALTER TABLE public.team_matches
      ADD CONSTRAINT team_matches_portal_sync_status_ck
      CHECK (
        portal_sync_status IS NULL
        OR portal_sync_status IN ('current', 'changed', 'missing', 'error')
      );
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.team_matches'::regclass
      AND conname = 'team_matches_portal_scores_ck'
  ) THEN
    ALTER TABLE public.team_matches
      ADD CONSTRAINT team_matches_portal_scores_ck
      CHECK (
        (portal_home_score IS NULL OR portal_home_score BETWEEN 0 AND 99)
        AND
        (portal_away_score IS NULL OR portal_away_score BETWEEN 0 AND 99)
      );
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.team_matches'::regclass
      AND conname = 'team_matches_portal_dates_ck'
  ) THEN
    ALTER TABLE public.team_matches
      ADD CONSTRAINT team_matches_portal_dates_ck
      CHECK (
        portal_last_seen_at IS NULL
        OR portal_first_seen_at IS NULL
        OR portal_last_seen_at >= portal_first_seen_at
      );
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.team_matches'::regclass
      AND conname = 'team_matches_portal_source_ck'
  ) THEN
    ALTER TABLE public.team_matches
      ADD CONSTRAINT team_matches_portal_source_ck
      CHECK (
        source <> 'portal'
        OR (
          portal_entry_id IS NOT NULL
          AND portal_match_ref IS NOT NULL
          AND portal_match_url IS NOT NULL
          AND portal_first_seen_at IS NOT NULL
          AND portal_last_seen_at IS NOT NULL
          AND portal_last_synced_at IS NOT NULL
          AND portal_sync_status IS NOT NULL
        )
      ) NOT VALID;
  END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS team_matches_portal_match_uidx
  ON public.team_matches(portal_entry_id, portal_match_ref)
  WHERE source = 'portal' AND portal_match_ref IS NOT NULL;

CREATE INDEX IF NOT EXISTS team_matches_portal_entry_schedule_idx
  ON public.team_matches(portal_entry_id, scheduled_at)
  WHERE source = 'portal';

CREATE INDEX IF NOT EXISTS team_matches_portal_sync_status_idx
  ON public.team_matches(portal_sync_status, portal_last_synced_at DESC)
  WHERE source = 'portal';

CREATE INDEX IF NOT EXISTS team_matches_portal_missing_idx
  ON public.team_matches(portal_missing_since)
  WHERE source = 'portal' AND portal_missing_since IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.team_match_portal_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  match_id uuid NOT NULL
    REFERENCES public.team_matches(id)
    ON DELETE CASCADE,

  sync_run_id uuid
    REFERENCES public.portal_sync_runs(id)
    ON DELETE SET NULL,

  field_name text NOT NULL,
  previous_value text,
  new_value text,
  detected_at timestamptz NOT NULL DEFAULT now(),

  acknowledged_at timestamptz,
  acknowledged_by uuid REFERENCES public.users(id) ON DELETE SET NULL,

  CONSTRAINT team_match_portal_changes_field_ck
    CHECK (
      field_name IN (
        'scheduled_at',
        'competition',
        'phase',
        'series',
        'round',
        'home_team',
        'away_team',
        'venue',
        'status',
        'home_score',
        'away_score'
      )
    ),

  CONSTRAINT team_match_portal_changes_difference_ck
    CHECK (previous_value IS DISTINCT FROM new_value),

  CONSTRAINT team_match_portal_changes_acknowledgement_ck
    CHECK (
      (acknowledged_at IS NULL AND acknowledged_by IS NULL)
      OR
      (acknowledged_at IS NOT NULL AND acknowledged_by IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS team_match_portal_changes_match_idx
  ON public.team_match_portal_changes(match_id, detected_at DESC);

CREATE INDEX IF NOT EXISTS team_match_portal_changes_sync_run_idx
  ON public.team_match_portal_changes(sync_run_id)
  WHERE sync_run_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS team_match_portal_changes_unacknowledged_idx
  ON public.team_match_portal_changes(detected_at DESC)
  WHERE acknowledged_at IS NULL;

COMMIT;

-- A validacao desta restricao deve ser feita depois de o codigo da aplicacao
-- preencher todos os campos obrigatorios dos jogos com source = 'portal':
-- ALTER TABLE public.team_matches
--   VALIDATE CONSTRAINT team_matches_portal_source_ck;
