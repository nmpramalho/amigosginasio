import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, CheckCircle2, Shield, Users } from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { PageHeading } from "@/components/ui/page-heading";
import { requireUser } from "@/lib/access";
import { getDatabase } from "@/lib/db";

export const metadata: Metadata = { title: "Início" };

type Season = { id: string; name: string };
type DashboardMatch = {
  id: string;
  team_id: string;
  team_name: string;
  scheduled_at: Date;
  status: string;
  portal_home_team_name: string;
  portal_away_team_name: string;
  portal_home_score: number | null;
  portal_away_score: number | null;
};

function stamp(value: Date) {
  return new Intl.DateTimeFormat("pt-PT", {
    timeZone: "Europe/Lisbon",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

function MatchCard({ match }: { match: DashboardMatch }) {
  const hasResult = match.status === "completed";
  return (
    <div className="rounded-lg border border-[var(--border)] p-3">
      <p className="text-xs font-semibold text-[var(--club-green-700)]">{match.team_name}</p>
      <p className="mt-1 text-sm font-semibold">
        {match.portal_home_team_name} vs {match.portal_away_team_name}
      </p>
      <p className="mt-1 text-xs text-[var(--muted)]">
        {stamp(match.scheduled_at)}
        {hasResult
          ? ` · ${match.portal_home_score ?? 0} - ${match.portal_away_score ?? 0}`
          : ""}
      </p>
    </div>
  );
}

export default async function DashboardPage() {
  await requireUser();
  const sql = getDatabase();

  const [season] = (await sql`
    SELECT id, name
    FROM public.seasons
    WHERE is_active = true
    ORDER BY start_year DESC
    LIMIT 1
  `) as Season[];

  const [clock] = (await sql`SELECT now() AS current_time`) as { current_time: Date }[];
  const now = clock.current_time;

  const upcoming = season
    ? ((await sql`
        SELECT DISTINCT ON (m.team_id)
          m.id,
          m.team_id,
          t.name AS team_name,
          m.scheduled_at,
          m.status,
          m.portal_home_team_name,
          m.portal_away_team_name,
          m.portal_home_score,
          m.portal_away_score
        FROM public.team_matches m
        JOIN public.teams t ON t.id = m.team_id
        WHERE m.season_id = ${season.id}::uuid
          AND m.source = 'portal'
          AND m.scheduled_at >= ${now}
        ORDER BY m.team_id, m.scheduled_at ASC, m.id ASC
      `) as DashboardMatch[])
    : [];

  const recent = season
    ? ((await sql`
        SELECT DISTINCT ON (m.team_id)
          m.id,
          m.team_id,
          t.name AS team_name,
          m.scheduled_at,
          m.status,
          m.portal_home_team_name,
          m.portal_away_team_name,
          m.portal_home_score,
          m.portal_away_score
        FROM public.team_matches m
        JOIN public.teams t ON t.id = m.team_id
        WHERE m.season_id = ${season.id}::uuid
          AND m.source = 'portal'
          AND m.status = 'completed'
          AND m.scheduled_at < ${now}
        ORDER BY m.team_id, m.scheduled_at DESC, m.id DESC
      `) as DashboardMatch[])
    : [];

  const [counts] = season
    ? ((await sql`
        SELECT
          (SELECT count(*)::int FROM public.players WHERE is_active = true) AS players,
          (SELECT count(*)::int FROM public.teams WHERE season_id = ${season.id}::uuid) AS teams
      `) as { players: number; teams: number }[])
    : [{ players: 0, teams: 0 }];

  return (
    <>
      <PageHeading
        title="Início"
        description={
          season
            ? `Visão geral da atividade desportiva · Época ${season.name}`
            : "Visão geral da atividade desportiva"
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Próximos jogos"
          value={String(upcoming.length)}
          description="Próximo encontro sincronizado de cada equipa"
          icon={CalendarDays}
        />
        <StatCard
          label="Jogadores ativos"
          value={String(counts.players)}
          description="Jogadores ativos registados"
          icon={Users}
        />
        <StatCard
          label="Equipas"
          value={String(counts.teams)}
          description={season ? `Época ${season.name}` : "Sem época ativa"}
          icon={Shield}
        />
        <StatCard
          label="Resultados"
          value={String(recent.length)}
          description="Último resultado sincronizado de cada equipa"
          icon={CheckCircle2}
        />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <section className="rounded-xl border border-[var(--border)] bg-white p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Próximos jogos</h2>
            <Link href="/jogos" className="text-sm font-medium text-[var(--club-green-700)] hover:underline">
              Ver jogos
            </Link>
          </div>
          <div className="space-y-3">
            {upcoming.length ? (
              upcoming.map((match) => <MatchCard key={match.id} match={match} />)
            ) : (
              <p className="text-sm text-[var(--muted)]">Não existem jogos futuros sincronizados.</p>
            )}
          </div>
        </section>

        <section className="rounded-xl border border-[var(--border)] bg-white p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Resultados recentes</h2>
            <Link href="/jogos" className="text-sm font-medium text-[var(--club-green-700)] hover:underline">
              Ver jogos
            </Link>
          </div>
          <div className="space-y-3">
            {recent.length ? (
              recent.map((match) => <MatchCard key={match.id} match={match} />)
            ) : (
              <p className="text-sm text-[var(--muted)]">Ainda não existem resultados oficiais sincronizados.</p>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
