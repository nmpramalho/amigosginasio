import type { Metadata } from "next";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeading } from "@/components/ui/page-heading";

export const metadata: Metadata = { title: "Jogos" };

export default function Page() {
  return (
    <>
      <PageHeading title="Jogos" description="Calendário, resultados e informação dos encontros." />
      <EmptyState title="Módulo de jogos" description="A gestão de jogos estará disponível numa fase futura." />
    </>
  );
}
