import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, ChevronLeft } from "lucide-react";
import { requireAdmin } from "@/lib/access";
import { getDatabase } from "@/lib/db";
import { PageHeading } from "@/components/ui/page-heading";
import { activateSeason, createSeason } from "./actions";

export const metadata: Metadata = { title: "Épocas" };

type SeasonRow = {
  id: string;
  name: string;
  is_active: boolean;
};

const notices: Record<string, { text: string; error?: boolean }> = {
  created: { text: "Época criada. Para a tornar atual, seleciona Ativar." },
  activated: { text: "Época atualizada com sucesso." },
  duplicate: { text: "Essa época já existe.", error: true },
  invalid: { text: "Indica um ano válido entre 1900 e 2199.", error: true },
  missing: { text: "A época selecionada já não existe.", error: true },
  "already-active": { text: "Esta época já está ativa." },
  conflict: { text: "Outra ativação ocorreu em simultâneo. Atualiza a página e tenta novamente.", error: true },
};

export default async function SeasonsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireAdmin();
  const sql = getDatabase();
  const seasons = (await sql`
    SELECT id, name, is_active
    FROM public.seasons ORDER BY start_year DESC
  `) as SeasonRow[];
  const { status } = await searchParams;
  const notice = status ? notices[status] : undefined;

  return (
    <>
      <Link href="/administracao" className="mb-5 inline-flex items-center gap-1 text-sm font-medium text-[var(--club-green-700)] hover:underline">
        <ChevronLeft size={17} strokeWidth={1.8} aria-hidden="true" /> Administração
      </Link>
      <PageHeading title="Épocas" description="Cria épocas desportivas e seleciona a época atual. O histórico é preservado." />
      {notice && (
        <p role={notice.error ? "alert" : "status"} className={`mb-5 rounded-lg p-3 text-sm ${notice.error ? "bg-red-50 text-red-700" : "bg-[var(--club-green-50)] text-[var(--club-green-700)]"}`}>
          {notice.text}
        </p>
      )}
      <section className="rounded-xl border border-[var(--border)] bg-white p-5 sm:p-6">
        <h2 className="text-lg font-semibold">Nova época</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">Introduz o ano inicial. Por exemplo, 2026 cria 2026/2027.</p>
        <form action={createSeason} className="mt-5 flex flex-wrap items-end gap-3">
          <label htmlFor="startYear" className="text-sm font-medium">
            Ano inicial
            <input id="startYear" name="startYear" type="number" min="1900" max="2199" step="1" required
              className="mt-2 block h-10 w-40 rounded-lg border border-[var(--border)] px-3" placeholder="2026" />
          </label>
          <button type="submit" className="h-10 rounded-lg bg-[var(--club-green-700)] px-5 text-sm font-medium text-white hover:bg-[var(--club-green-800)]">
            Criar época
          </button>
        </form>
      </section>
      <section className="mt-6 rounded-xl border border-[var(--border)] bg-white p-5 sm:p-6">
        <h2 className="text-lg font-semibold">Épocas registadas</h2>
        {seasons.length === 0 ? (
          <div className="mt-5 flex min-h-40 items-center justify-center rounded-lg border border-dashed border-[var(--border)] px-5 text-center text-sm text-[var(--muted)]">
            Ainda não existem épocas registadas.
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-[var(--border)]">
            {seasons.map((season) => (
              <li key={season.id} className="flex flex-wrap items-center gap-3 py-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--club-green-50)] text-[var(--club-green-700)]">
                  <CalendarDays size={20} strokeWidth={1.8} aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{season.name}</p>
                  <p className="text-xs text-[var(--muted)]">Época desportiva</p>
                </div>
                {season.is_active ? (
                  <span className="rounded-full bg-[var(--club-green-50)] px-3 py-1 text-xs font-semibold text-[var(--club-green-700)]">Atual</span>
                ) : (
                  <form action={activateSeason}>
                    <input type="hidden" name="seasonId" value={season.id} />
                    <button type="submit" className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium hover:bg-slate-50">
                      Ativar
                    </button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
