-- Run after database/teams.sql on the same Neon branch used by DATABASE_URL.
-- Each row stores one ordered snapshot for a team and a phase.
CREATE TABLE IF NOT EXISTS public.team_phase_orders (
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  phase text NOT NULL CHECK (phase IN ('first_leg','second_leg','qualification')),
  player_ids jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(player_ids) = 'array'),
  revision integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(team_id,phase)
);
-- Backfill teams that already contain players. Existing saved orders remain untouched.
INSERT INTO public.team_phase_orders(team_id,phase,player_ids)
SELECT t.id, ph.phase, COALESCE((
 SELECT jsonb_agg(m.player_id::text ORDER BY m.joined_at,m.id)
 FROM public.team_memberships m WHERE m.team_id=t.id AND m.ended_at IS NULL
), '[]'::jsonb)
FROM public.teams t CROSS JOIN (VALUES ('first_leg'),('second_leg'),('qualification')) AS ph(phase)
ON CONFLICT(team_id,phase) DO NOTHING;

-- A membership change updates all three lists in the SAME database transaction.
CREATE OR REPLACE FUNCTION public.sync_team_phase_membership() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE phase_name text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM 1 FROM public.teams WHERE id=NEW.team_id FOR UPDATE;
    FOREACH phase_name IN ARRAY ARRAY['first_leg','second_leg','qualification'] LOOP
      INSERT INTO public.team_phase_orders(team_id,phase,player_ids,revision)
      VALUES (NEW.team_id,phase_name,jsonb_build_array(NEW.player_id::text),1)
      ON CONFLICT(team_id,phase) DO UPDATE SET
        player_ids = CASE WHEN public.team_phase_orders.player_ids ? NEW.player_id::text
          THEN public.team_phase_orders.player_ids
          ELSE public.team_phase_orders.player_ids || jsonb_build_array(NEW.player_id::text) END,
        revision = public.team_phase_orders.revision + 1, updated_at=now();
    END LOOP;
  ELSIF TG_OP = 'UPDATE' AND OLD.ended_at IS NULL AND NEW.ended_at IS NOT NULL THEN
    PERFORM 1 FROM public.teams WHERE id=NEW.team_id FOR UPDATE;
    UPDATE public.team_phase_orders o SET
      player_ids = COALESCE((SELECT jsonb_agg(value ORDER BY ord)
        FROM jsonb_array_elements(o.player_ids) WITH ORDINALITY AS items(value,ord)
        WHERE value <> to_jsonb(NEW.player_id::text)), '[]'::jsonb),
      revision = o.revision + 1, updated_at=now()
    WHERE o.team_id=NEW.team_id;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS sync_team_phase_membership ON public.team_memberships;
CREATE TRIGGER sync_team_phase_membership
AFTER INSERT OR UPDATE OF ended_at ON public.team_memberships
FOR EACH ROW EXECUTE FUNCTION public.sync_team_phase_membership();

-- Atomic validation + update; returns false for stale revision or invalid permutation.
CREATE OR REPLACE FUNCTION public.save_team_phase_order(
 p_team uuid,p_season uuid,p_phase text,p_ids jsonb,p_revision integer
) RETURNS boolean LANGUAGE plpgsql AS $$
DECLARE member_count integer; unique_count integer; updated_count integer;
BEGIN
 IF p_phase NOT IN ('first_leg','second_leg','qualification')
    OR jsonb_typeof(p_ids) IS DISTINCT FROM 'array'
    OR jsonb_array_length(p_ids)>300 OR p_revision<0 THEN RETURN false; END IF;
 PERFORM 1 FROM public.teams WHERE id=p_team AND season_id=p_season FOR UPDATE;
 IF NOT FOUND THEN RETURN false; END IF;
 -- JSON elements must be valid UUIDs; caller validates syntax before calling.
 SELECT count(*),count(DISTINCT value) INTO member_count,unique_count
 FROM jsonb_array_elements_text(p_ids) AS ids(value);
 IF member_count<>unique_count OR member_count<>(
   SELECT count(*) FROM public.team_memberships
   WHERE team_id=p_team AND ended_at IS NULL
 ) OR EXISTS (
   SELECT value::uuid FROM jsonb_array_elements_text(p_ids) AS ids(value)
   EXCEPT SELECT player_id FROM public.team_memberships
   WHERE team_id=p_team AND ended_at IS NULL
 ) THEN RETURN false; END IF;
 UPDATE public.team_phase_orders SET player_ids=p_ids,revision=revision+1,updated_at=now()
 WHERE team_id=p_team AND phase=p_phase AND revision=p_revision;
 GET DIAGNOSTICS updated_count = ROW_COUNT;
 RETURN updated_count=1;
END $$;
