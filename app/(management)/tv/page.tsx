import type { Metadata } from "next";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeading } from "@/components/ui/page-heading";

export const metadata: Metadata = { title: "TV do Clube" };

export default function Page() {
  return (
    <>
      <PageHeading title="TV do Clube" description="Transmissões em direto e arquivo de jogos do clube." />
      <EmptyState title="Módulo TV do Clube" description="As transmissões do Clube Amigos do Ginásio serão apresentadas aqui numa fase futura." />
    </>
  );
}
