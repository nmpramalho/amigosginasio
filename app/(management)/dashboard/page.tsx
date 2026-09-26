import type { Metadata } from "next";
import { CalendarDays, Shield, Tv, Users } from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { PageHeading } from "@/components/ui/page-heading";

export const metadata: Metadata = { title: "Início" };

const dashboardCards = [
  { label: "Próximos Jogos", value: "0", description: "Jogos agendados", icon: CalendarDays },
  { label: "Jogadores Ativos", value: "0", description: "Jogadores registados", icon: Users },
  { label: "Equipas", value: "0", description: "Equipas da época", icon: Shield },
  { label: "Transmissões", value: "0", description: "Transmissões disponíveis", icon: Tv },
];

export default function DashboardPage() {
  return (
    <>
      <PageHeading title="Início" description="Visão geral da atividade desportiva da Associação dos Amigos do Ginásio." />
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Indicadores gerais">
        {dashboardCards.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </section>

      <section className="mt-6 rounded-xl border border-[var(--border)] bg-white p-6">
        <h3 className="text-base font-semibold text-[var(--foreground)]">Atividade recente</h3>
        <div className="mt-5 flex min-h-48 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50/60 px-6 text-center">
          <p className="text-sm text-[var(--muted)]">A atividade da associação será apresentada aqui numa fase futura.</p>
        </div>
      </section>
    </>
  );
}
