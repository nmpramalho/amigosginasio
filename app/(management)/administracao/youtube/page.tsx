import type { Metadata } from "next";
import Link from "next/link";
import { PageHeading } from "@/components/ui/page-heading";
import { requireAdmin } from "@/lib/access";
import { getChannelStatus } from "@/lib/youtube-channel";
import { disconnectYouTube } from "./actions";
export const metadata: Metadata = { title: "Canal YouTube" };
export const dynamic = "force-dynamic";
const messages: Record<string, string> = {
  connected: "Canal ligado. Usa Verificar agora na TV do Clube para atualizar as transmissões.",
  disconnected: "Canal desligado. A pesquisa pública continua disponível.",
  "invalid-state": "A ligação expirou ou foi iniciada noutro navegador. Tenta novamente.",
  "invalid-code": "A Google não devolveu um código de autorização válido.",
  cancelled: "Autorização cancelada.",
  "connection-failed": "Não foi possível ligar o canal. Confirma a conta ou canal escolhido e consulta os logs do servidor.",
};
export default async function YouTubeAdministration({ searchParams }: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireAdmin();
  const connection = await getChannelStatus();
  const { status } = await searchParams;
  return <>
    <PageHeading title="Canal YouTube" description="Ligação de leitura para detetar transmissões não listadas automaticamente." />
    <Link href="/administracao" className="text-sm text-[var(--club-green-700)] underline">Voltar à Administração</Link>
    {status && messages[status] && <p role="status" className="my-5 rounded-lg border border-[var(--border)] bg-white p-4 text-sm">{messages[status]}</p>}
    <section className="mt-5 rounded-xl border border-[var(--border)] bg-white p-6">
      <h2 className="text-lg font-semibold">{connection ? "Canal ligado" : "Canal por ligar"}</h2>
      <p className="mt-2 text-sm text-[var(--muted)]">{connection
        ? `${connection.title} · ${connection.channelId}`
        : "Autoriza a conta que gere @BilharGCS. Escolhe o canal correto quando a Google o solicitar."}</p>
      <p className="mt-3 text-sm text-[var(--muted)]">A ligação não altera o login dos utilizadores e apenas permite consultar as transmissões do canal.</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <a href="/api/youtube/connect" className="rounded-lg bg-[var(--club-green-700)] px-4 py-2 text-sm font-semibold text-white">{connection ? "Voltar a ligar canal" : "Ligar canal YouTube"}</a>
        {connection && <form action={disconnectYouTube}><button type="submit" className="rounded-lg border border-red-200 px-4 py-2 text-sm text-red-700">Desligar canal</button></form>}
      </div>
    </section>
    <p className="mt-4 text-sm text-[var(--muted)]">Enquanto o projeto OAuth do YouTube estiver em Testing, a autorização poderá expirar ao fim de sete dias. Se a sincronização falhar, volta a ligar o canal.</p>
  </>;
}
