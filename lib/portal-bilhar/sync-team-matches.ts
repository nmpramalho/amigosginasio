import "server-only";
import { getDatabase } from "@/lib/db";
import { getPortalTeamMatches } from "./matches";
export type SyncTrigger="scheduled"|"manual";
export type SyncSummary={runId:string|null;status:"completed"|"partial"|"failed"|"locked";discovered:number;inserted:number;updated:number;unchanged:number;errors:string[]};
const LOCK=75882026;
function completed(score:string|null){return Boolean(score&&score.replace(/\s/g,"")!=="0(0)-0(0)"&&score.replace(/\s/g,"")!=="0-0");}
export async function syncPortalMatches(input:{triggerType:SyncTrigger;requestedBy?:string|null}):Promise<SyncSummary>{
 const sql=getDatabase();const [lock]=await sql`SELECT pg_try_advisory_lock(${LOCK}) AS acquired` as {acquired:boolean}[];
 if(!lock?.acquired)return{runId:null,status:"locked",discovered:0,inserted:0,updated:0,unchanged:0,errors:[]};
 let runId:string|null=null,discovered=0,inserted=0,updated=0,unchanged=0;const errors:string[]=[];
 try{
  const [season]=await sql`SELECT id FROM public.seasons WHERE is_active=true ORDER BY start_year DESC LIMIT 1` as {id:string}[];
  if(!season)throw new Error("Não existe época ativa.");
  const [run]=await sql`INSERT INTO public.portal_sync_runs(season_id,sync_scope,trigger_type,status,requested_by) VALUES(${season.id}::uuid,'matches',${input.triggerType},'running',${input.requestedBy??null}::uuid) RETURNING id` as {id:string}[];runId=run.id;
  const mappings=await sql`SELECT t.id AS team_id,t.name AS team_name,t.division,pm.id AS mapping_id,pm.portal_team_code,pm.portal_team_name,pm.portal_team_url FROM public.teams t JOIN public.portal_team_mappings pm ON pm.team_id=t.id AND pm.is_active WHERE t.season_id=${season.id}::uuid` as {team_id:string;team_name:string;division:number|null;mapping_id:string;portal_team_code:string;portal_team_name:string;portal_team_url:string}[];
  for(const mapping of mappings){
   try{
    const matches=await getPortalTeamMatches(mapping.portal_team_code,mapping.portal_team_name);discovered+=matches.length;
    let [entry]=await sql`SELECT id FROM public.portal_competition_entries WHERE mapping_id=${mapping.mapping_id}::uuid AND portal_competition_ref='team-calendar' LIMIT 1` as {id:string}[];
    if(!entry){[entry]=await sql`INSERT INTO public.portal_competition_entries(mapping_id,portal_competition_ref,portal_competition_name,portal_competition_url,variant,phase,series,portal_status) VALUES(${mapping.mapping_id}::uuid,'team-calendar','Calendário da equipa',${mapping.portal_team_url},'Carambola',NULL,NULL,'active') RETURNING id` as {id:string}[];}
    for(const match of matches){
     const [existing]=await sql`SELECT id,scheduled_at,opponent_name,is_home,status,portal_home_score,portal_away_score FROM public.team_matches WHERE source='portal' AND external_ref=${match.externalRef} LIMIT 1` as {id:string;scheduled_at:Date;opponent_name:string;is_home:boolean;status:string;portal_home_score:number|null;portal_away_score:number|null}[];
     const status=completed(match.score)?"completed":"scheduled";const scores=match.score?.match(/^\s*(\d+).*?-\s*(\d+)/);const homeScore=scores?Number(scores[1]):null,awayScore=scores?Number(scores[2]):null;
     if(!existing){await sql`INSERT INTO public.team_matches(season_id,team_id,opponent_name,division,phase,round_label,is_home,original_at,scheduled_at,venue,status,source,external_ref,portal_entry_id,portal_match_ref,portal_match_url,portal_competition_name,portal_phase,portal_series,portal_round,portal_home_team_code,portal_home_team_name,portal_away_team_code,portal_away_team_name,portal_status,portal_home_score,portal_away_score,portal_first_seen_at,portal_last_seen_at,portal_last_synced_at,portal_sync_status) VALUES(${season.id}::uuid,${mapping.team_id}::uuid,${match.opponentName},${mapping.division??1},'first_leg',${match.round??match.externalRef},${match.isHome},${match.scheduledAt}::timestamp AT TIME ZONE 'Europe/Lisbon',${match.scheduledAt}::timestamp AT TIME ZONE 'Europe/Lisbon',NULL,${status},'portal',${match.externalRef},${entry.id}::uuid,${match.externalRef},${match.sourceUrl},${match.competitionName},${match.phase},${match.series},${match.round},${match.isHome?mapping.portal_team_code:match.opponentCode},${match.homeTeamName},${match.isHome?match.opponentCode:mapping.portal_team_code},${match.awayTeamName},${status},${homeScore},${awayScore},now(),now(),now(),'current')`;inserted++;continue;}
     const changed=new Date(existing.scheduled_at).toISOString().slice(0,16)!==new Date(match.scheduledAt).toISOString().slice(0,16)||existing.opponent_name!==match.opponentName||existing.is_home!==match.isHome||existing.status!==status||existing.portal_home_score!==homeScore||existing.portal_away_score!==awayScore;
     if(changed){for(const [field,oldValue,newValue] of [["scheduled_at",existing.scheduled_at,match.scheduledAt],["status",existing.status,status],["home_score",existing.portal_home_score,homeScore],["away_score",existing.portal_away_score,awayScore]] as const){if(String(oldValue??"")!==String(newValue??""))await sql`INSERT INTO public.team_match_portal_changes(match_id,sync_run_id,field_name,previous_value,new_value) VALUES(${existing.id}::uuid,${runId}::uuid,${field},${String(oldValue??"")},${String(newValue??"")})`;}
      await sql`UPDATE public.team_matches SET opponent_name=${match.opponentName},is_home=${match.isHome},scheduled_at=${match.scheduledAt}::timestamp AT TIME ZONE 'Europe/Lisbon',status=${status},portal_home_team_name=${match.homeTeamName},portal_away_team_name=${match.awayTeamName},portal_home_score=${homeScore},portal_away_score=${awayScore},portal_last_seen_at=now(),portal_last_synced_at=now(),portal_sync_status='current',updated_at=now() WHERE id=${existing.id}::uuid`;updated++;}else{await sql`UPDATE public.team_matches SET portal_last_seen_at=now(),portal_last_synced_at=now(),portal_sync_status='current' WHERE id=${existing.id}::uuid`;unchanged++;}
    }
   }catch(error){errors.push(`${mapping.team_name}: ${error instanceof Error?error.message:"Erro desconhecido"}`);}
  }
  const status=errors.length?"partial":"completed";await sql`UPDATE public.portal_sync_runs SET status=${status},completed_at=now(),discovered_count=${discovered},inserted_count=${inserted},updated_count=${updated},unchanged_count=${unchanged},error_count=${errors.length},error_message=${errors.join("\n")||null} WHERE id=${runId}::uuid`;
  return{runId,status,discovered,inserted,updated,unchanged,errors};
 }catch(error){errors.push(error instanceof Error?error.message:"Erro desconhecido");if(runId)await sql`UPDATE public.portal_sync_runs SET status='failed',completed_at=now(),error_count=${errors.length},error_message=${errors.join("\n")} WHERE id=${runId}::uuid`;return{runId,status:"failed",discovered,inserted,updated,unchanged,errors};}
 finally{await sql`SELECT pg_advisory_unlock(${LOCK})`;}
}
