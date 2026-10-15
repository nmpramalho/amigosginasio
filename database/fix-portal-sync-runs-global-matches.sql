BEGIN;

ALTER TABLE public.portal_sync_runs
  DROP CONSTRAINT IF EXISTS portal_sync_runs_target_ck;

ALTER TABLE public.portal_sync_runs
  ADD CONSTRAINT portal_sync_runs_target_ck
  CHECK (
    (
      sync_scope = 'competitions'
      AND mapping_id IS NULL
      AND entry_id IS NULL
    )
    OR
    (
      sync_scope = 'team'
      AND mapping_id IS NOT NULL
      AND entry_id IS NULL
    )
    OR
    (
      sync_scope = 'competition'
      AND mapping_id IS NOT NULL
      AND entry_id IS NOT NULL
    )
    OR
    (
      sync_scope = 'matches'
      AND entry_id IS NULL
    )
  );

COMMIT;
