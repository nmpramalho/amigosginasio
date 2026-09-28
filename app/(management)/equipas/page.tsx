import type { Metadata } from "next";
import { requireUser } from "@/lib/access";
import { getDatabase } from "@/lib/db";
import { PageHeading } from "@/components/ui/page-heading";
import { TeamsView, type Season, type Team, type PlayerOption, type Membership, type PhaseOrder } from "./teams-view";
import { createTeam, renameTeam, deleteTeam, addMembership, endMembership, savePhaseOrder } from "./actions";

export const metadata: Metadata = { title: "Equipas" };
const notices: Record<string, string> = {
  created: "Equipa criada.", renamed: "Nome da equipa atualizado.", deleted: "Equipa eliminada.",
  added: "Jogador adicionado às três listas.", removed: "Jogador removido; o histórico foi preservado.",
  "order-saved": "Ordem guardada nesta fase.",
  "order-conflict": "A equipa ou a ordem mudou entretanto. Atualiza a página e tenta novamente.",
  "invalid-order": "A lista deve conter todos os jogadores da equipa, uma vez cada.",
  duplicate: "Já existe uma equipa com esse nome nesta época.",
  "division-locked": "Não é possível mudar a divisão de uma equipa que já tenha encontros registados.",
  invalid: "Verifica os dados introduzidos.", missing: "O registo já não existe.",
  related: "Não é possível eliminar uma equipa com histórico de jogadores.",
  "invalid-player": "Seleciona um jogador ativo e uma equipa válida.",
  "already-assigned": "O jogador já pertence a uma equipa nesta época. Remove-o primeiro da equipa atual.",
};
export default async function TeamsPage({ searchParams }: {
  searchParams: Promise<{ season?: string; team?: string; status?: string }>;
}) {
  const user = await requireUser();
  const sql = getDatabase();
  const seasons = (await sql`SELECT id, name, is_active FROM public.seasons ORDER BY start_year DESC`) as Season[];
  const query = await searchParams;
  const selectedSeason = seasons.find((s) => s.id === query.season)
    ?? seasons.find((s) => s.is_active) ?? seasons[0];
  const seasonId = selectedSeason?.id ?? null;
  const teams = seasonId ? (await sql`SELECT id, name, division FROM public.teams
    WHERE season_id = ${seasonId}::uuid ORDER BY name`) as Team[] : [];
  const teamId = (teams.find((t) => t.id === query.team) ?? teams[0])?.id ?? null;
  const [memberships, orders, players] = await Promise.all([
    teamId ? sql`SELECT m.id, m.player_id, p.name AS player_name,
      m.ended_at IS NOT NULL AS historical FROM public.team_memberships m
      JOIN public.players p ON p.id = m.player_id WHERE m.team_id = ${teamId}::uuid
      ORDER BY m.joined_at, m.id` : Promise.resolve([]),
    teamId ? sql`SELECT phase, player_ids, revision FROM public.team_phase_orders
      WHERE team_id = ${teamId}::uuid` : Promise.resolve([]),
    user.role === "admin" && seasonId ? sql`SELECT p.id, p.name FROM public.players p
      WHERE p.is_active = true AND NOT EXISTS (
        SELECT 1 FROM public.team_memberships m WHERE m.player_id = p.id
          AND m.season_id = ${seasonId}::uuid AND m.ended_at IS NULL)
      ORDER BY p.name, p.id` : Promise.resolve([]),
  ]);
  return <>
    <PageHeading title="Equipas" description="Compara a ordem dos jogadores nas três fases da época." />
    {query.status && notices[query.status] && <p role="status"
      className="mb-5 rounded-lg border border-[var(--border)] bg-white p-3 text-sm">{notices[query.status]}</p>}
    <TeamsView key={`${seasonId}:${teamId}:${(memberships as Membership[]).map((m) => m.id + m.historical).join(",")}:${(orders as PhaseOrder[]).map((o) => o.phase + o.revision).join(",")}`}
      seasons={seasons} selectedSeasonId={seasonId} teams={teams} selectedTeamId={teamId}
      memberships={memberships as Membership[]} orders={orders as PhaseOrder[]}
      players={players as PlayerOption[]} isAdmin={user.role === "admin"}
      createTeam={createTeam} renameTeam={renameTeam} deleteTeam={deleteTeam}
      addMembership={addMembership} endMembership={endMembership} savePhaseOrder={savePhaseOrder} />
  </>;
}
