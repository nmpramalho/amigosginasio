import type { Metadata } from "next";
import { requireUser } from "@/lib/access";
import { CLUB_CHANNEL_URL, refreshTv } from "@/lib/club-tv";
import { PageHeading } from "@/components/ui/page-heading";
import { forceTvCheck } from "./actions";
import { TvAutoRefresh } from "./tv-auto-refresh";
import { ScheduledBroadcasts } from "./scheduled-broadcasts";

export const metadata: Metadata = { title: "TV do Clube" };
export const dynamic = "force-dynamic";
export default async function TvPage({ searchParams }: {
  searchParams: Promise<{ status?: string }>;
}) {
  const user = await requireUser();
  const { status } = await searchParams;
  const { state: tv } = await refreshTv();
  return <>
    <PageHeading title="TV do Clube" description="Transmissões em direto e agendadas do canal Bilhar Ginásio Clube do Sul." />
    <TvAutoRefresh />
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-white p-4">
      <p className="text-sm text-[var(--muted)]">{tv.checkedAt
        ? `Última verificação: ${new Intl.DateTimeFormat("pt-PT", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Lisbon" }).format(new Date(tv.checkedAt))}`
        : "Ainda não foi feita uma verificação."}</p>
      {user.role === "admin" && <form action={forceTvCheck}>
        <button type="submit" className="rounded-lg bg-[var(--club-green-700)] px-4 py-2 text-sm font-semibold text-white">
          Verificar agora
        </button>
      </form>}
    </div>
    {status === "cached" && <p role="status" className="mb-4 rounded-lg border bg-white p-3 text-sm">Verificação recente: aguarda 5 minutos para forçar outra.</p>}
    {status === "busy" && <p role="status" className="mb-4 rounded-lg border bg-white p-3 text-sm">Já está a decorrer uma verificação.</p>}
    {status === "updated" && <p role="status" className="mb-4 rounded-lg border bg-white p-3 text-sm">Verificação concluída.</p>}
    {tv.error && user.role === "admin" && <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{tv.error}</p>}
    {tv.videos.length ? <div className="space-y-6">{tv.videos.map(video =>
      <section key={video.id} className="overflow-hidden rounded-xl border border-[var(--border)] bg-white">
        <div className="flex items-center gap-3 p-4"><span className="rounded-full bg-red-600 px-3 py-1 text-xs font-bold text-white">EM DIRETO</span>
          <h2 className="text-lg font-semibold">{video.title}</h2></div>
        <div className="aspect-video bg-black"><iframe
          src={`https://www.youtube-nocookie.com/embed/${video.id}`}
          title={video.title} loading="lazy" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen referrerPolicy="strict-origin-when-cross-origin"
          className="h-full w-full" /></div>
      </section>)}</div> : <section className="rounded-xl border border-[var(--border)] bg-white p-8 text-center">
        <h2 className="text-xl font-semibold">Sem transmissões em direto</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">{tv.error ? "Não foi possível confirmar o estado do canal. Tenta mais tarde." : "Quando o canal iniciar uma transmissão pública, aparecerá aqui após a próxima verificação."}</p>
      </section>}
    <ScheduledBroadcasts videos={tv.upcoming} today={tv.today} />
    <a href={CLUB_CHANNEL_URL} target="_blank" rel="noopener noreferrer"
      className="mt-5 inline-block text-sm font-semibold text-[var(--club-green-700)] underline">Visitar o canal no YouTube</a>
  </>;
}
