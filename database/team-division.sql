-- Aplicar depois de database/team-matches.sql, no mesmo branch Neon da aplicacao.
-- Equipas existentes sem divisao ficam NULL ate serem classificadas manualmente.
-- Nunca inferir a divisao a partir do nome A/B/C nem escolher um valor por defeito.
BEGIN;
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS division smallint;
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='teams_division_valid' AND conrelid='public.teams'::regclass) THEN
  ALTER TABLE public.teams ADD CONSTRAINT teams_division_valid CHECK (division IN (1,2));
 END IF;
END $$;
-- Se houver encontros anteriores, preencher apenas divisao inequivoca.
UPDATE public.teams t SET division = existing.division
FROM (SELECT team_id, MIN(division) AS division FROM public.team_matches
      GROUP BY team_id HAVING COUNT(DISTINCT division)=1) existing
WHERE t.id=existing.team_id AND t.division IS NULL;
-- Abort migration if existing matches disagree on division for a team.
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM public.team_matches m JOIN public.teams t ON t.id=m.team_id
            WHERE t.division IS NULL OR m.division IS DISTINCT FROM t.division) THEN
  RAISE EXCEPTION 'Existing matches conflict with team division. Resolve data manually before applying migration.';
 END IF;
END $$;
-- Database guard prevents a manually supplied match division from differing.
CREATE OR REPLACE FUNCTION public.check_team_match_division() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE team_division smallint;
BEGIN
 SELECT division INTO team_division FROM public.teams WHERE id=NEW.team_id AND season_id=NEW.season_id FOR UPDATE;
 IF team_division IS NULL OR NEW.division IS DISTINCT FROM team_division THEN
  RAISE EXCEPTION 'Match division must equal the team division' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS team_match_division_guard ON public.team_matches;
CREATE TRIGGER team_match_division_guard BEFORE INSERT OR UPDATE OF team_id,season_id,division
 ON public.team_matches FOR EACH ROW EXECUTE FUNCTION public.check_team_match_division();
-- Division changes after the first match would rewrite the meaning of historical matches.
CREATE OR REPLACE FUNCTION public.check_team_division_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF OLD.division IS DISTINCT FROM NEW.division AND
    EXISTS (SELECT 1 FROM public.team_matches WHERE team_id=OLD.id) THEN
  RAISE EXCEPTION 'Cannot change division of a team with matches' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS team_division_change_guard ON public.teams;
CREATE TRIGGER team_division_change_guard BEFORE UPDATE OF division
 ON public.teams FOR EACH ROW EXECUTE FUNCTION public.check_team_division_change();
COMMIT;
