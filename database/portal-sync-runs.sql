-- Portal Bilhar: auditoria das sincronizacoes.
-- Executar depois de team-portal-mappings.sql.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.portal_sync_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  season_id uuid NOT NULL REFERENCES public.seasons(id) ON DELETE RESTRICT,
  mapping_id uuid REFERENCES public.portal_team_mappings(id) ON DELETE RESTRICT,
  entry_id uuid REFERENCES public.portal_competition_entries(id) ON DELETE RESTRICT,

  sync_scope text NOT NULL,
  trigger_type text NOT NULL,
  status text NOT NULL DEFAULT 'running',

  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,

  discovered_count integer NOT NULL DEFAULT 0,
  inserted_count integer NOT NULL DEFAULT 0,
  updated_count integer NOT NULL DEFAULT 0,
  unchanged_count integer NOT NULL DEFAULT 0,
  missing_count integer NOT NULL DEFAULT 0,
  error_count integer NOT NULL DEFAULT 0,

  error_code text,
  error_message text,
  requested_by uuid REFERENCES public.users(id) ON DELETE SET NULL,

  CONSTRAINT portal_sync_runs_scope_ck
    CHECK (sync_scope IN ('competitions', 'team', 'competition', 'matches')),

  CONSTRAINT portal_sync_runs_trigger_ck
    CHECK (trigger_type IN ('manual', 'page_refresh', 'scheduled')),

  CONSTRAINT portal_sync_runs_status_ck
    CHECK (status IN ('running', 'completed', 'partial', 'failed')),

  CONSTRAINT portal_sync_runs_counts_ck
    CHECK (
      discovered_count >= 0
      AND inserted_count >= 0
      AND updated_count >= 0
      AND unchanged_count >= 0
      AND missing_count >= 0
      AND error_count >= 0
    ),

  CONSTRAINT portal_sync_runs_completion_ck
    CHECK (completed_at IS NULL OR completed_at >= started_at),

  CONSTRAINT portal_sync_runs_target_ck
    CHECK (
      (sync_scope = 'competitions' AND mapping_id IS NULL AND entry_id IS NULL)
      OR
      (sync_scope = 'team' AND mapping_id IS NOT NULL AND entry_id IS NULL)
      OR
      (sync_scope = 'competition' AND mapping_id IS NOT NULL AND entry_id IS NOT NULL)
      OR
      (sync_scope = 'matches' AND mapping_id IS NOT NULL)
    ),

  CONSTRAINT portal_sync_runs_finished_status_ck
    CHECK (
      (status = 'running' AND completed_at IS NULL)
      OR
      (status <> 'running' AND completed_at IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS portal_sync_runs_season_started_idx
  ON public.portal_sync_runs(season_id, started_at DESC);

CREATE INDEX IF NOT EXISTS portal_sync_runs_mapping_started_idx
  ON public.portal_sync_runs(mapping_id, started_at DESC)
  WHERE mapping_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS portal_sync_runs_entry_started_idx
  ON public.portal_sync_runs(entry_id, started_at DESC)
  WHERE entry_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS portal_sync_runs_status_started_idx
  ON public.portal_sync_runs(status, started_at DESC);

COMMIT;
