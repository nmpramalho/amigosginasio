-- Apply after team-matches.sql and team-division.sql on a test Neon branch.
-- Atomic modal save, preserving team and division; audited by existing game UPDATE trigger.
CREATE OR REPLACE FUNCTION public.save_team_match_modal(
 p_match uuid, p_opponent text, p_at timestamp, p_venue text,
 p_games jsonb, p_actor uuid
) RETURNS boolean LANGUAGE plpgsql AS $$
DECLARE m public.team_matches%ROWTYPE; item jsonb; pos integer; player uuid;
        lc integer; oc integer; li integer; oi integer; opp text;
        ids uuid[] := ARRAY[]::uuid[]; ranks integer[]; ord jsonb;
BEGIN
 SELECT * INTO m FROM public.team_matches WHERE id=p_match FOR UPDATE;
 IF NOT FOUND OR m.status<>'scheduled' OR p_at IS NULL OR
    p_opponent IS NULL OR length(btrim(p_opponent)) NOT BETWEEN 2 AND 120 OR
    p_venue IS NULL OR length(btrim(p_venue))>120 OR
    jsonb_typeof(p_games) IS DISTINCT FROM 'array' OR jsonb_array_length(p_games)<>4
 THEN RETURN false; END IF;
 PERFORM 1 FROM public.teams WHERE id=m.team_id FOR UPDATE;
 SELECT player_ids INTO ord FROM public.team_phase_orders WHERE team_id=m.team_id AND phase=m.phase;
 IF ord IS NULL THEN RETURN false; END IF;
 FOR pos IN 1..4 LOOP
  item := p_games->(pos-1);
  IF jsonb_typeof(item) IS DISTINCT FROM 'object' OR item->>'position' IS DISTINCT FROM pos::text OR
     COALESCE(item->>'playerId','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  THEN RETURN false; END IF;
  player := (item->>'playerId')::uuid;
  ids := array_append(ids,player);
  opp := NULLIF(btrim(COALESCE(item->>'opponentPlayer','')), '');
  IF opp IS NOT NULL AND length(opp)>120 THEN RETURN false; END IF;
  IF NULLIF(item->>'localCaroms','') IS NOT NULL OR NULLIF(item->>'opponentCaroms','') IS NOT NULL OR
     NULLIF(item->>'localInnings','') IS NOT NULL OR NULLIF(item->>'opponentInnings','') IS NOT NULL THEN
   IF COALESCE(item->>'localCaroms','') !~ '^[0-9]{1,3}$' OR
      COALESCE(item->>'opponentCaroms','') !~ '^[0-9]{1,3}$' OR
      COALESCE(item->>'localInnings','') !~ '^[0-9]{1,3}$' OR
      COALESCE(item->>'opponentInnings','') !~ '^[0-9]{1,3}$' OR opp IS NULL THEN RETURN false; END IF;
   lc := (item->>'localCaroms')::integer; oc := (item->>'opponentCaroms')::integer;
   li := (item->>'localInnings')::integer; oi := (item->>'opponentInnings')::integer;
   IF lc NOT BETWEEN 0 AND 999 OR oc NOT BETWEEN 0 AND 999 OR
      li NOT BETWEEN 1 AND 999 OR oi NOT BETWEEN 1 AND 999 THEN RETURN false; END IF;
  ELSE lc:=NULL; oc:=NULL; li:=NULL; oi:=NULL; END IF;
 END LOOP;
 IF (SELECT count(DISTINCT x) FROM unnest(ids) x)<>4 THEN RETURN false; END IF;
 IF (SELECT count(*) FROM public.team_match_games WHERE match_id=p_match)>0 THEN
  IF (SELECT count(*) FROM public.team_match_games g
      WHERE g.match_id=p_match AND g.player_id=ids[g.position])<>4 THEN RETURN false; END IF;
 ELSE
  SELECT array_agg((SELECT e.n::integer FROM jsonb_array_elements_text(ord)
       WITH ORDINALITY e(value,n) WHERE e.value=ids[i]::text) ORDER BY i)
    INTO ranks FROM generate_subscripts(ids,1) i;
  IF ranks[1] IS NULL OR ranks[2] IS NULL OR ranks[3] IS NULL OR ranks[4] IS NULL OR
     NOT (ranks[1]<ranks[2] AND ranks[2]<ranks[3] AND ranks[3]<ranks[4]) OR
     (SELECT count(*) FROM public.team_memberships tm JOIN public.players p ON p.id=tm.player_id
      WHERE tm.team_id=m.team_id AND tm.season_id=m.season_id AND tm.ended_at IS NULL
        AND p.is_active AND tm.player_id=ANY(ids))<>4 THEN RETURN false; END IF;
  INSERT INTO public.team_match_games(match_id,position,player_id,player_name)
  SELECT p_match,i,p.id,p.name FROM generate_subscripts(ids,1) i JOIN public.players p ON p.id=ids[i];
 END IF;
 FOR pos IN 1..4 LOOP
  item:=p_games->(pos-1);
  opp:=NULLIF(btrim(COALESCE(item->>'opponentPlayer','')), '');
  lc:=NULLIF(item->>'localCaroms','')::integer; oc:=NULLIF(item->>'opponentCaroms','')::integer;
  li:=NULLIF(item->>'localInnings','')::integer; oi:=NULLIF(item->>'opponentInnings','')::integer;
  UPDATE public.team_match_games SET opponent_player_name=opp,local_caroms=lc,
    opponent_caroms=oc,local_innings=li,opponent_innings=oi,updated_at=now(),updated_by=p_actor
  WHERE match_id=p_match AND position=pos;
 END LOOP;
 UPDATE public.team_matches SET opponent_name=btrim(p_opponent),scheduled_at=p_at AT TIME ZONE 'Europe/Lisbon',
 venue=NULLIF(btrim(p_venue),''),updated_at=now() WHERE id=p_match;
 RETURN true;
END $$;
