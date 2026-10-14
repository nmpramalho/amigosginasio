-- Run on the same Neon branch as DATABASE_URL. No existing TV data is removed.
CREATE TABLE IF NOT EXISTS public.youtube_channel_connection (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  channel_id text NOT NULL CHECK (channel_id ~ '^UC[A-Za-z0-9_-]{22}$'),
  channel_title text NOT NULL,
  refresh_token_encrypted text NOT NULL,
  connected_by uuid NOT NULL REFERENCES public.users(id),
  connected_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
