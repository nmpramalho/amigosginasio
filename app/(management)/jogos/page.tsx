import type { Metadata } from "next";
import { requireUser } from "@/lib/access";
import { getDatabase } from "@/lib/db";
import { PageHeading } from "@/components/ui/page-heading";
import { MatchesView, type MatchRow, type TeamRow, type PlayerRow, type GameRow } from "./matches-view";
export const metadata:Metadata={title:"Jogos por equipas"};
type Season={id:string;name:string;is_active:boolean};
export default async function Page({searchParams}:{searchParams:Promise<{season?:string;status?:string;match?:string}>}){
 const user=await requireUser(),sql=getDatabase(),q=await searchParams;
 const seasons=(await sql`SELECT id,name,is_active FROM public.seasons ORDER BY start_year DESC`) as Season[];
 const season=seasons.find(s=>s.id===q.season)??seasons.find(s=>s.is_active)??seasons[0];
 const teams=season?(await sql`SELECT id,name,division FROM public.teams WHERE season_id=${season.id}::uuid ORDER BY name`) as TeamRow[]:[];
 const matches=season?(await sql`SELECT m.id,m.season_id,m.team_id,t.name AS team_name,m.opponent_name,m.division,m.phase,m.round_label,m.is_home,m.original_at,m.scheduled_at,m.venue,m.status
 FROM public.team_matches m JOIN public.teams t ON t.id=m.team_id WHERE m.season_id=${season.id}::uuid ORDER BY m.scheduled_at DESC,m.id`) as MatchRow[]:[];
 const ids=matches.map(m=>m.id);
 const games=ids.length?(await sql`SELECT match_id,position,player_id,player_name,opponent_player_name,local_caroms,opponent_caroms,local_innings,opponent_innings
 FROM public.team_match_games WHERE match_id=ANY(${ids}::uuid[]) ORDER BY match_id,position`) as GameRow[]:[];
 const players=season&&user.role==="admin"?(await sql`SELECT o.team_id,o.phase,p.id,p.name,x.position FROM public.team_phase_orders o
 CROSS JOIN LATERAL jsonb_array_elements_text(o.player_ids) WITH ORDINALITY AS x(player_id,position)
 JOIN public.players p ON p.id=x.player_id::uuid JOIN public.team_memberships tm ON tm.team_id=o.team_id AND tm.player_id=p.id AND tm.season_id=${season.id}::uuid AND tm.ended_at IS NULL
 WHERE p.is_active AND o.team_id IN (SELECT id FROM public.teams WHERE season_id=${season.id}::uuid) ORDER BY o.team_id,o.phase,x.position`) as PlayerRow[]:[];
 return <><PageHeading title="Jogos por equipas" description="Consulta e edição dos encontros do Campeonato Nacional."/>
 {q.status&&<p role={q.status==="saved"||q.status==="created"||q.status==="deleted"?"status":"alert"} className="mb-4 rounded-lg border bg-white p-3 text-sm">{{
  saved:"Encontro gravado.",created:"Encontro criado.",deleted:"Encontro eliminado; histórico preservado na auditoria.","missing-or-lineup":"O encontro já não está disponível para edição sem convocatória. Atualiza a página.",
  order:"A convocatória não respeita a ordem dos jogadores definida na equipa para esta fase. Confirma também que a ordem da fase está guardada.",
  membership:"Um dos jogadores já não está ativo ou inscrito nesta equipa e época.",
  score:"Preenche as bolas e entradas de ambos os lados e o nome do adversário em cada partida com resultado.",
  team:"A equipa escolhida não pertence à época ou não tem divisão definida.",
  missing:"O encontro já não existe.",
  invalid:"Não foi possível gravar. Verifica os campos obrigatórios, a data e a hora."
 }[q.status]??"Não foi possível gravar. Verifica os dados do encontro."}</p>}
 <form method="get" className="mb-4 flex items-end gap-2"><label className="text-sm">Época<select name="season" defaultValue={season?.id??""} className="mt-1 block rounded-lg border bg-white p-2">{seasons.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label><button className="rounded-lg border px-3 py-2 text-sm">Ver</button></form>
 <MatchesView key={season?.id??"none"} seasonId={season?.id??""} admin={user.role==="admin"} teams={teams} matches={matches} games={games} players={players} initialMatch={q.status&&!(["saved","created","deleted"].includes(q.status)) ? (q.match??"") : ""} saveError={q.status&&!(["saved","created"].includes(q.status)) ? ({
  order:"A convocatória não respeita a ordem definida para esta fase. Confirma a ordem na equipa.",
  membership:"Um dos jogadores já não está ativo ou inscrito nesta equipa e época.",
  score:"Preenche os quatro valores e o nome do adversário nas partidas com resultado.",
  team:"A equipa não pertence à época ou não tem divisão definida.",
  missing:"O encontro já não existe.",
  invalid:"Confirma os campos obrigatórios, a data e a hora."
 }[q.status]??"Não foi possível gravar o jogo.") : ""}/></>;
}
