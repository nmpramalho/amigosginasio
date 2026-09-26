-- Run once in the Neon SQL Editor before enabling Google sign-in.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  name text NOT NULL,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'captain', 'user')),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_email_normalized CHECK (email = lower(trim(email)))
);

CREATE TABLE IF NOT EXISTS access_attempts (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email text NOT NULL,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS access_attempts_created_at_idx ON access_attempts (created_at DESC);

-- Bootstrap the first administrator manually after replacing the example email.
-- INSERT INTO users (email, name, role) VALUES ('your-google-email@example.com', 'Administrator', 'admin');
