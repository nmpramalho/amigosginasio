import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, CalendarDays, CheckCircle2, Shield, Users } from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { PageHeading } from "@/components/ui/page-heading";
import { requireUser } from "@/lib/access";
import { getDatabase } from "@/lib/db";
import { refreshTv } from "@/lib/club-tv";

export const metadata: Metadata = { title: "Início" };

type Season = { id: string; name: string };
type Match = {
  id: string; team_id: string; team_name: string; opponent_name: string;
  scheduled_at: string | Date; venue: string | null; is_home: boolean;
  phase: string; round_label: string; games_count: number;
  wins: number; draws: number; losses: number; complete: boolean;
};
type TeamSummary = {
  id: string; name: string; division: number | null;
  scheduled: number; played: number; wins: number; draws: number; losses: number;
};
const dateTime = (value: string | Date) => new Intl.DateTimeFormat("pt-PT", {
  timeZone: "Europe/Lisbon", day: "2-digit", month: "2-digit", year: "numeric",
  hour: "2-digit", minute: "2-digit", hourCycle: "h23",
}).format(new Date(value));
const phaseName: Record<string, string> = {
  first_leg: "1.ª volta", second_leg: "2.ª volta", qualification: "Apuramento",
};
function result(m: Match) {
  if (m.wins > m.losses) return "Vitória";
  if (m.wins < m.losses) return "Derrota";
  return "Empate";
}
function MatchList({ title, matches, empty, recent = false }: {
  title: string; matches: Match[]; empty: string; recent?: boolean;
}) {
  return <section className="rounded-xl border border-[var(--border)] bg-white p-5 sm:p-6">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
      <h2 className="text-lg font-semibold">{title}</h2>
      <Link href="/jogos" className="text-sm font-medium text-[var(--club-green-700)] hover:underline">Ver jogos</Link>
    </div>
    {matches.length === 0 ? <p className="text-sm text-[var(--muted)]">{empty}</p> :
      <ul className="divide-y divide-[var(--border)]">{matches.map(m =>
        <li key={m.id} className="flex flex-wrap items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
          <div>
            <p className="font-medium">{m.team_name} vs {m.opponent_name}</p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {dateTime(m.scheduled_at)} · {m.is_home ? "Casa" : "Fora"}
              {m.venue ? ` · ${m.venue}` : ""}
            </p>
            <p className="mt-1 text-xs text-[var(--muted)]">
              {phaseName[m.phase] ?? m.phase} · Jornada {m.round_label}
            </p>
          </div>
          {recent ? <span className="rounded-full bg-[var(--club-green-50)] px-3 py-1 text-sm font-medium text-[var(--club-green-700)]">
            {result(m)} · {m.wins}V {m.draws}E {m.losses}D
          </span> : <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
            {m.games_count === 4 ? "Convocatória definida" : "Por convocar"}
          </span>}
        </li>)}</ul>}
  </section>;
}

export default async function DashboardPage() {
  await requireUser();
  const { state: tv } = await refreshTv();
  const sql = getDatabase();
  const seasonRows = (await sql`SELECT id, name FROM public.seasons
    WHERE is_active = true LIMIT 1`) as Season[];
  const season = seasonRows[0];
  const [playerRows, teamRows, matchRows, clockRows] = await Promise.all([
    sql`SELECT COUNT(*)::integer AS total FROM public.players WHERE is_active = true`,
    season ? sql`SELECT id, name, division FROM public.teams
      WHERE season_id = ${season.id}::uuid ORDER BY name, id` : Promise.resolve([]),
    season ? sql`
      SELECT m.id, m.team_id, t.name AS team_name, m.opponent_name,
        m.scheduled_at, m.venue, m.is_home, m.phase, m.round_label,
        COALESCE(g.games_count, 0)::integer AS games_count,
        COALESCE(g.wins, 0)::integer AS wins,
        COALESCE(g.draws, 0)::integer AS draws,
        COALESCE(g.losses, 0)::integer AS losses,
        (COALESCE(g.games_count, 0) = 4 AND COALESCE(g.scored, 0) = 4)::boolean AS complete
      FROM public.team_matches m
      JOIN public.teams t ON t.id = m.team_id
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::integer AS games_count,
          COUNT(*) FILTER (WHERE opponent_player_name IS NOT NULL
            AND length(btrim(opponent_player_name)) >= 2
            AND local_caroms IS NOT NULL AND opponent_caroms IS NOT NULL
            AND local_innings IS NOT NULL AND opponent_innings IS NOT NULL)::integer AS scored,
          COUNT(*) FILTER (WHERE local_caroms > opponent_caroms)::integer AS wins,
          COUNT(*) FILTER (WHERE local_caroms = opponent_caroms
            AND local_caroms IS NOT NULL)::integer AS draws,
          COUNT(*) FILTER (WHERE local_caroms < opponent_caroms)::integer AS losses
        FROM public.team_match_games WHERE match_id = m.id
      ) g ON true
      WHERE m.season_id = ${season.id}::uuid
      ORDER BY m.scheduled_at DESC, m.id DESC
    ` : Promise.resolve([]),
    sql`SELECT now() AS current_time`,
  ]);
  const teams = teamRows as TeamSummary[];
  const matches = matchRows as Match[];
  const now = new Date(clockRows[0].current_time as string | Date).getTime();
  const upcoming = matches.filter(m => !m.complete && new Date(m.scheduled_at).getTime() >= now)
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime() || a.id.localeCompare(b.id));
  const recent = matches.filter(m => m.complete && new Date(m.scheduled_at).getTime() <= now)
    .sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime() || b.id.localeCompare(a.id));
  const summary = teams.map(team => {
    const own = matches.filter(m => m.team_id === team.id);
    const played = own.filter(m => m.complete && new Date(m.scheduled_at).getTime() <= now);
    return {
      ...team,
      scheduled: own.filter(m => !m.complete && new Date(m.scheduled_at).getTime() >= now).length,
      played: played.length,
      wins: played.filter(m => m.wins > m.losses).length,
      draws: played.filter(m => m.wins === m.losses).length,
      losses: played.filter(m => m.wins < m.losses).length,
    };
  });
  const cards = [
    { label: "Próximos jogos", value: String(upcoming.length), description: "Encontros futuros sem resultado completo", icon: CalendarDays },
    { label: "Jogadores ativos", value: String(playerRows[0]?.total ?? 0), description: "Jogadores ativos registados", icon: Users },
    { label: "Equipas", value: String(teams.length), description: season ? `Época ${season.name}` : "Sem época ativa", icon: Shield },
    { label: "Resultados", value: String(recent.length), description: "Encontros realizados com quatro resultados", icon: CheckCircle2 },
  ];
  return <>
    {tv.videos.length > 0 && <Link href="/tv" className="mb-5 block rounded-xl border border-red-200 bg-red-50 p-5 hover:bg-red-100">
      <span className="font-bold text-red-700">● EM DIRETO · TV do Clube</span>
      <span className="mt-1 block text-sm text-slate-800">{tv.videos.length === 1 ? tv.videos[0].title : `${tv.videos.length} transmissões em direto`}</span>
      <span className="mt-2 block text-sm font-semibold text-[var(--club-green-700)]">Ver transmissão →</span>
    </Link>}

    <PageHeading title="Início" description={season
      ? `Visão geral da atividade desportiva · Época ${season.name}`
      : "Visão geral da atividade desportiva · Sem época ativa"} />
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Indicadores gerais">
      {cards.map(card => <StatCard key={card.label} {...card} />)}
    </section>
    <div className="mt-6 grid gap-5 xl:grid-cols-2">
      <MatchList title="Próximos jogos" matches={upcoming.slice(0, 5)}
        empty={season ? "Não existem jogos futuros sem resultado completo." : "Ativa uma época para consultar os jogos."} />
      <MatchList title="Resultados recentes" matches={recent.slice(0, 5)} recent
        empty={season ? "Ainda não existem encontros passados com quatro resultados completos." : "Ativa uma época para consultar os resultados."} />
    </div>
    <section className="mt-5 rounded-xl border border-[var(--border)] bg-white p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Resumo por equipa</h2>
        <Link href="/estatisticas" className="inline-flex items-center gap-1 text-sm font-medium text-[var(--club-green-700)] hover:underline">
          <BarChart3 size={16} aria-hidden="true" /> Ver estatísticas
        </Link>
      </div>
      {summary.length === 0 ? <p className="text-sm text-[var(--muted)]">Ainda não existem equipas na época ativa.</p> :
        <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-sm">
          <thead><tr className="border-b border-[var(--border)] text-left text-[var(--muted)]">
            <th scope="col" className="p-3">Equipa</th>
            <th scope="col" className="p-3 text-right">Próximos</th>
            <th scope="col" className="p-3 text-right">Realizados</th>
            <th scope="col" className="p-3 text-right">V</th>
            <th scope="col" className="p-3 text-right">E</th>
            <th scope="col" className="p-3 text-right">D</th>
          </tr></thead>
          <tbody>{summary.map(team => <tr key={team.id} className="border-b border-[var(--border)] last:border-0">
            <th scope="row" className="p-3 text-left font-medium">{team.name}{team.division ? ` · ${team.division}.ª divisão` : ""}</th>
            <td className="p-3 text-right">{team.scheduled}</td>
            <td className="p-3 text-right">{team.played}</td>
            <td className="p-3 text-right">{team.wins}</td>
            <td className="p-3 text-right">{team.draws}</td>
            <td className="p-3 text-right">{team.losses}</td>
          </tr>)}</tbody>
        </table></div>}
      <p className="mt-4 text-xs text-[var(--muted)]">Só contam como realizados encontros passados com quatro partidas e resultados completos. V/E/D refere-se a encontros, não a partidas; não é pontuação federativa.</p>
    </section>
  </>;
}
