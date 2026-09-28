-- Apply on the same Neon branch/database as DATABASE_URL. Safe for Players V1.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE IF NOT EXISTS public.players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 2 AND 120),
  federation_number text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS contact_email text;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS mobile_phone text;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS photo_key text;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS user_id uuid;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'players_user_id_fkey' AND conrelid = 'public.players'::regclass) THEN
    ALTER TABLE public.players ADD CONSTRAINT players_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE RESTRICT;
  END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS players_user_id_unique_idx ON public.players(user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS players_federation_number_unique_idx
  ON public.players(lower(federation_number)) WHERE federation_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS players_name_idx ON public.players(name);
-- Future membership tables must reference players(id) ON DELETE RESTRICT (or NO ACTION).
