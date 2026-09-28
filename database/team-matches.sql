-- Executar depois de teams.sql e team-phase-orders.sql, na mesma Neon DATABASE_URL.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE IF NOT EXISTS public.team_matches (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 season_id uuid NOT NULL REFERENCES public.seasons(id) ON DELETE RESTRICT,
 team_id uuid NOT NULL,
 opponent_name text NOT NULL CHECK (length(btrim(opponent_name)) BETWEEN 2 AND 120),
 division smallint NOT NULL CHECK (division IN (1,2)),
 phase text NOT NULL CHECK (phase IN ('first_leg','second_leg','qualification')),
 round_label text NOT NULL CHECK (length(btrim(round_label)) BETWEEN 1 AND 80),
 is_home boolean NOT NULL,
 original_at timestamptz NOT NULL,
 scheduled_at timestamptz NOT NULL,
 venue text,
 status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','completed')),
 source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','portal')),
 external_ref text,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT team_matches_team_season_fk FOREIGN KEY(team_id,season_id)
 REFERENCES public.teams(id,season_id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS team_matches_calendar_idx ON public.team_matches(season_id,scheduled_at);
CREATE UNIQUE INDEX IF NOT EXISTS team_matches_external_idx ON public.team_matches(source,external_ref) WHERE external_ref IS NOT NULL;
CREATE TABLE IF NOT EXISTS public.team_match_games (
 match_id uuid NOT NULL REFERENCES public.team_matches(id) ON DELETE RESTRICT,
 position smallint NOT NULL CHECK(position BETWEEN 1 AND 4),
 player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE RESTRICT,
 player_name text NOT NULL,
 opponent_player_name text,
 local_caroms smallint,
 opponent_caroms smallint,
 local_innings smallint,
 opponent_innings smallint,
 local_max_run smallint,
 opponent_max_run smallint,
 updated_at timestamptz NOT NULL DEFAULT now(),
 updated_by uuid REFERENCES public.users(id) ON DELETE RESTRICT,
 PRIMARY KEY(match_id,position), UNIQUE(match_id,player_id),
 CONSTRAINT game_values_nonnegative CHECK (
 (local_caroms IS NULL OR local_caroms BETWEEN 0 AND 999) AND
 (opponent_caroms IS NULL OR opponent_caroms BETWEEN 0 AND 999) AND
 (local_innings IS NULL OR local_innings BETWEEN 1 AND 999) AND
 (opponent_innings IS NULL OR opponent_innings BETWEEN 1 AND 999) AND
 (local_max_run IS NULL OR local_max_run BETWEEN 0 AND 999) AND
 (opponent_max_run IS NULL OR opponent_max_run BETWEEN 0 AND 999))
);
CREATE TABLE IF NOT EXISTS public.team_match_game_audit (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 match_id uuid NOT NULL REFERENCES public.team_matches(id) ON DELETE RESTRICT,
 position smallint NOT NULL,
 changed_at timestamptz NOT NULL DEFAULT now(),
 changed_by uuid REFERENCES public.users(id) ON DELETE RESTRICT,
 before_value jsonb NOT NULL, after_value jsonb NOT NULL
);
CREATE OR REPLACE FUNCTION public.audit_team_match_game() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 INSERT INTO public.team_match_game_audit(match_id,position,changed_by,before_value,after_value)
 VALUES(NEW.match_id,NEW.position,NEW.updated_by,to_jsonb(OLD),to_jsonb(NEW));
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS audit_team_match_game ON public.team_match_games;
CREATE TRIGGER audit_team_match_game AFTER UPDATE ON public.team_match_games
 FOR EACH ROW EXECUTE FUNCTION public.audit_team_match_game();
-- Locks the match and team to serialize lineup against membership/order changes.
-- A lineup is a snapshot: once saved, no overwrite is allowed in V1.
CREATE OR REPLACE FUNCTION public.set_team_match_lineup(p_match uuid,p_ids uuid[])
RETURNS boolean LANGUAGE plpgsql AS $$
DECLARE m public.team_matches%ROWTYPE; ord jsonb; ranks integer[];
BEGIN
 IF cardinality(p_ids) IS DISTINCT FROM 4 OR array_position(p_ids,NULL) IS NOT NULL OR
    (SELECT count(DISTINCT id) FROM unnest(p_ids) AS u(id)) <> 4 THEN RETURN false; END IF;
 SELECT * INTO m FROM public.team_matches WHERE id=p_match FOR UPDATE;
 IF NOT FOUND OR m.status <> 'scheduled' OR EXISTS(SELECT 1 FROM public.team_match_games WHERE match_id=p_match) THEN RETURN false; END IF;
 PERFORM 1 FROM public.teams WHERE id=m.team_id FOR UPDATE;
 SELECT player_ids INTO ord FROM public.team_phase_orders WHERE team_id=m.team_id AND phase=m.phase;
 IF ord IS NULL THEN RETURN false; END IF;
 SELECT array_agg((SELECT o.n::integer FROM jsonb_array_elements_text(ord) WITH ORDINALITY AS o(value,n)
    WHERE o.value=p_ids[idx.i]::text) ORDER BY idx.i) INTO ranks
 FROM generate_subscripts(p_ids,1) AS idx(i);
 IF ranks[1] IS NULL OR ranks[2] IS NULL OR ranks[3] IS NULL OR ranks[4] IS NULL OR
 NOT(ranks[1]<ranks[2] AND ranks[2]<ranks[3] AND ranks[3]<ranks[4]) OR
 (SELECT count(*) FROM public.team_memberships tm JOIN public.players p ON p.id=tm.player_id
 WHERE tm.team_id=m.team_id AND tm.season_id=m.season_id AND tm.ended_at IS NULL
 AND p.is_active=true AND tm.player_id=ANY(p_ids)) <> 4 THEN RETURN false; END IF;
 INSERT INTO public.team_match_games(match_id,position,player_id,player_name)
 SELECT p_match,idx.i,p.id,p.name FROM generate_subscripts(p_ids,1) AS idx(i)
 JOIN public.players p ON p.id=p_ids[idx.i];
 RETURN true;
END $$;
-- Guarded score update: division-specific caps, immutable lineup and completed match.
CREATE OR REPLACE FUNCTION public.save_team_match_game(p_match uuid,p_position smallint,p_opponent text,
 p_lc smallint,p_oc smallint,p_li smallint,p_oi smallint,p_lmax smallint,p_omax smallint,p_actor uuid)
RETURNS boolean LANGUAGE plpgsql AS $$
DECLARE m public.team_matches%ROWTYPE;
BEGIN
 SELECT * INTO m FROM public.team_matches WHERE id=p_match FOR UPDATE;
 IF NOT FOUND OR m.status<>'scheduled' OR p_position NOT BETWEEN 1 AND 4 OR
 p_opponent IS NULL OR length(btrim(p_opponent)) NOT BETWEEN 2 AND 120 OR
 p_lc IS NULL OR p_oc IS NULL OR p_li IS NULL OR p_oi IS NULL OR
 p_lc NOT BETWEEN 0 AND 999 OR
 p_oc NOT BETWEEN 0 AND 999 OR
 p_li NOT BETWEEN 1 AND 999 OR
 p_oi NOT BETWEEN 1 AND 999 OR
 (p_lmax IS NOT NULL AND p_lmax NOT BETWEEN 0 AND p_lc) OR
 (p_omax IS NOT NULL AND p_omax NOT BETWEEN 0 AND p_oc) THEN RETURN false; END IF;
 UPDATE public.team_match_games SET opponent_player_name=btrim(p_opponent),local_caroms=p_lc,
 opponent_caroms=p_oc,local_innings=p_li,opponent_innings=p_oi,local_max_run=p_lmax,
 opponent_max_run=p_omax,updated_by=p_actor,updated_at=now()
 WHERE match_id=p_match AND position=p_position;
 RETURN FOUND;
END $$;
CREATE OR REPLACE FUNCTION public.finish_team_match(p_match uuid) RETURNS boolean LANGUAGE plpgsql AS $$
DECLARE m public.team_matches%ROWTYPE;
BEGIN
 SELECT * INTO m FROM public.team_matches WHERE id=p_match FOR UPDATE;
 IF NOT FOUND OR m.status<>'scheduled' OR
 (SELECT count(*) FROM public.team_match_games g WHERE g.match_id=p_match
 AND g.opponent_player_name IS NOT NULL AND g.local_caroms IS NOT NULL AND g.opponent_caroms IS NOT NULL
 AND g.local_innings IS NOT NULL AND g.opponent_innings IS NOT NULL
)<>4
 THEN RETURN false; END IF;
 UPDATE public.team_matches SET status='completed',updated_at=now() WHERE id=p_match;
 RETURN true;
END $$;
