import type { Metadata } from "next";
import { requireUser } from "@/lib/access";
import { getDatabase } from "@/lib/db";
import { PageHeading } from "@/components/ui/page-heading";

export const metadata: Metadata = { title: "Estatísticas" };

type Season = { id: string; name: string; is_active: boolean };
type Team = { id: string; name: string; division: number | null };
type Game = {
  match_id: string; team_id: string; team_name: string;
  player_id: string; player_name: string; position: number;
  local_caroms: number; opponent_caroms: number;
  local_innings: number; opponent_innings: number;
};
type Totals = { played: number; won: number; drawn: number; lost: number;
  caroms: number; innings: number };
type Row = { id: string; name: string; totals: Totals };
const empty = (): Totals => ({ played: 0, won: 0, drawn: 0, lost: 0, caroms: 0, innings: 0 });
const average = (t: Totals) => t.innings > 0
  ? (t.caroms / t.innings).toLocaleString("pt-PT", { minimumFractionDigits: 3, maximumFractionDigits: 3 })
  : "—";
function Table({ title, rows, kind }: { title: string; rows: Row[]; kind: "equipa" | "jogador" }) {
  return <section className="rounded-xl border border-[var(--border)] bg-white p-5">
    <h2 className="mb-3 text-lg font-semibold">{title}</h2>
    {rows.length === 0 ? <p className="text-sm text-[var(--muted)]">Sem resultados completos para estes filtros.</p> :
      <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm">
        <thead><tr className="border-b border-[var(--border)] text-[var(--muted)]">
          <th scope="col" className="p-3">{kind === "equipa" ? "Equipa" : "Jogador"}</th>
          <th scope="col" className="p-3 text-right">{kind === "equipa" ? "Encontros" : "Partidas"}</th>
          <th scope="col" className="p-3 text-right">V</th><th scope="col" className="p-3 text-right">E</th>
          <th scope="col" className="p-3 text-right">D</th><th scope="col" className="p-3 text-right">Bolas</th>
          <th scope="col" className="p-3 text-right">Entradas</th><th scope="col" className="p-3 text-right">Média</th>
        </tr></thead><tbody>{rows.map(({ id, name, totals: t }) =>
          <tr key={id} className="border-b border-[var(--border)] last:border-0">
            <th scope="row" className="p-3 font-medium">{name}</th>
            <td className="p-3 text-right">{t.played}</td><td className="p-3 text-right">{t.won}</td>
            <td className="p-3 text-right">{t.drawn}</td><td className="p-3 text-right">{t.lost}</td>
            <td className="p-3 text-right">{t.caroms}</td><td className="p-3 text-right">{t.innings}</td>
            <td className="p-3 text-right font-semibold">{average(t)}</td>
          </tr>)}</tbody>
      </table></div>}
  </section>;
}

export default async function Page({ searchParams }: {
  searchParams: Promise<{ season?: string; team?: string }>;
}) {
  await requireUser();
  const sql = getDatabase();
  const query = await searchParams;
  const seasons = (await sql`SELECT id, name, is_active FROM public.seasons ORDER BY start_year DESC`) as Season[];
  const season = seasons.find(s => s.id === query.season)
    ?? seasons.find(s => s.is_active) ?? seasons[0];
  const teams = season ? (await sql`SELECT id, name, division FROM public.teams
    WHERE season_id = ${season.id}::uuid ORDER BY name, id`) as Team[] : [];
  const team = teams.find(t => t.id === query.team);
  // Only encounters with all four complete games are counted; status is not used
  // because games currently remain editable and are not marked "completed".
  const games = season ? (await sql`
    WITH complete_matches AS (
      SELECT m.id FROM public.team_matches m
      JOIN public.team_match_games g ON g.match_id = m.id
      WHERE m.season_id = ${season.id}::uuid
      GROUP BY m.id
      HAVING COUNT(*) = 4 AND COUNT(DISTINCT g.position) = 4
        AND COUNT(g.opponent_player_name) = 4
        AND COUNT(g.local_caroms) = 4 AND COUNT(g.opponent_caroms) = 4
        AND COUNT(g.local_innings) = 4 AND COUNT(g.opponent_innings) = 4
    )
    SELECT m.id AS match_id, m.team_id, t.name AS team_name,
      g.player_id, g.player_name, g.position,
      g.local_caroms, g.opponent_caroms, g.local_innings, g.opponent_innings
    FROM complete_matches cm
    JOIN public.team_matches m ON m.id = cm.id
    JOIN public.teams t ON t.id = m.team_id
    JOIN public.team_match_games g ON g.match_id = m.id
    WHERE (${team?.id ?? null}::uuid IS NULL OR m.team_id = ${team?.id ?? null}::uuid)
    ORDER BY m.scheduled_at, m.id, g.position
  `) as Game[] : [];
  const teamRows = new Map<string, Row>();
  const playerRows = new Map<string, Row>();
  const matchScores = new Map<string, { teamId: string; wins: number; losses: number }>();
  const total = empty();
  for (const game of games) {
    const club = teamRows.get(game.team_id) ?? { id: game.team_id, name: game.team_name, totals: empty() };
    const player = playerRows.get(game.player_id) ?? { id: game.player_id, name: game.player_name, totals: empty() };
    const match = matchScores.get(game.match_id) ?? { teamId: game.team_id, wins: 0, losses: 0 };
    const caroms = Number(game.local_caroms);
    const opponentCaroms = Number(game.opponent_caroms);
    const innings = Number(game.local_innings);
    club.totals.caroms += caroms; club.totals.innings += innings;
    player.totals.played++; player.totals.caroms += caroms; player.totals.innings += innings;
    total.caroms += caroms; total.innings += innings;
    if (caroms > opponentCaroms) { player.totals.won++; match.wins++; }
    else if (caroms < opponentCaroms) { player.totals.lost++; match.losses++; }
    else player.totals.drawn++;
    teamRows.set(game.team_id, club);
    playerRows.set(game.player_id, player);
    matchScores.set(game.match_id, match);
  }
  for (const match of matchScores.values()) {
    const t = teamRows.get(match.teamId)?.totals;
    if (!t) continue;
    t.played++;
    if (match.wins > match.losses) t.won++;
    else if (match.wins < match.losses) t.lost++;
    else t.drawn++;
  }
  const sortedTeams = [...teamRows.values()].sort((a, b) =>
    b.totals.won - a.totals.won || a.name.localeCompare(b.name, "pt-PT"));
  const sortedPlayers = [...playerRows.values()].sort((a, b) =>
    b.totals.won - a.totals.won || a.name.localeCompare(b.name, "pt-PT"));
  return <>
    <PageHeading title="Estatísticas" description="Desempenho das equipas e dos jogadores por época." />
    <form method="get" className="mb-5 flex flex-wrap items-end gap-4 rounded-xl border border-[var(--border)] bg-white p-5">
      <label className="text-sm font-medium">Época
        <select name="season" defaultValue={season?.id ?? ""} className="mt-1 block h-10 rounded-lg border border-[var(--border)] bg-white px-3">
          {seasons.length === 0 && <option value="">Sem épocas</option>}
          {seasons.map(s => <option key={s.id} value={s.id}>{s.name}{s.is_active ? " (atual)" : ""}</option>)}
        </select>
      </label>
      <label className="text-sm font-medium">Equipa
        <select name="team" defaultValue={team?.id ?? ""} className="mt-1 block h-10 rounded-lg border border-[var(--border)] bg-white px-3">
          <option value="">Todas as equipas</option>
          {teams.map(t => <option key={t.id} value={t.id}>{t.name}{t.division ? ` · ${t.division}.ª divisão` : ""}</option>)}
        </select>
      </label>
      <button type="submit" className="h-10 rounded-lg bg-[var(--club-green-700)] px-4 text-sm font-semibold text-white">Aplicar filtros</button>
    </form>
    <div className="mb-5 grid gap-3 sm:grid-cols-3">
      <div className="rounded-xl border border-[var(--border)] bg-white p-5"><p className="text-sm text-[var(--muted)]">Encontros com resultado completo</p><p className="mt-1 text-2xl font-semibold">{matchScores.size}</p></div>
      <div className="rounded-xl border border-[var(--border)] bg-white p-5"><p className="text-sm text-[var(--muted)]">Partidas registadas</p><p className="mt-1 text-2xl font-semibold">{games.length}</p></div>
      <div className="rounded-xl border border-[var(--border)] bg-white p-5"><p className="text-sm text-[var(--muted)]">Média geral</p><p className="mt-1 text-2xl font-semibold">{average(total)}</p></div>
    </div>
    <p className="mb-5 text-sm text-[var(--muted)]">Só entram encontros com quatro partidas e resultados completos. V/E/D = vitórias/empates/derrotas; para equipas contam encontros, para jogadores contam partidas. Média = total de bolas ÷ total de entradas. O resultado do encontro é determinado pela comparação das partidas ganhas e perdidas; não são aplicadas regras federativas de pontuação.</p>
    <div className="space-y-5">
      <Table title="Equipas" rows={sortedTeams} kind="equipa" />
      <Table title="Jogadores" rows={sortedPlayers} kind="jogador" />
    </div>
  </>;
}
