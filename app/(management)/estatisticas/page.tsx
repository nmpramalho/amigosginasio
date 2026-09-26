import type { Metadata } from "next";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeading } from "@/components/ui/page-heading";

export const metadata: Metadata = { title: "Estatísticas" };

export default function Page() {
  return (
    <>
      <PageHeading title="Estatísticas" description="Análise do desempenho das equipas e dos jogadores." />
      <EmptyState title="Módulo de estatísticas" description="As estatísticas desportivas serão apresentadas aqui numa fase futura." />
    </>
  );
}
