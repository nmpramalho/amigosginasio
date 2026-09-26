import type { Metadata } from "next";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeading } from "@/components/ui/page-heading";

export const metadata: Metadata = { title: "TV do Clube" };

export default function Page() {
  return (
    <>
      <PageHeading title="TV do Clube" description="Transmissões em direto e arquivo de jogos da associação." />
      <EmptyState title="Módulo TV do Clube" description="As transmissões da Associação dos Amigos do Ginásio serão apresentadas aqui numa fase futura." />
    </>
  );
}
