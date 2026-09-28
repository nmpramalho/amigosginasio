-- Apply after the TV V1 migration on the same Neon branch as DATABASE_URL.
-- Existing live cache, users and games remain unchanged.
ALTER TABLE public.club_tv_live_cache
  ADD COLUMN IF NOT EXISTS upcoming jsonb NOT NULL DEFAULT '[]'::jsonb;
