import type { Metadata } from "next";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeading } from "@/components/ui/page-heading";

export const metadata: Metadata = { title: "Jogadores" };

export default function Page() {
  return (
    <>
      <PageHeading title="Jogadores" description="Consulta e gestão dos jogadores do Clube Amigos do Ginásio." />
      <EmptyState title="Módulo de jogadores" description="A gestão de jogadores estará disponível numa fase futura." />
    </>
  );
}
