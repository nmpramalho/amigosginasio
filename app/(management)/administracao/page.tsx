import type { Metadata } from "next";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeading } from "@/components/ui/page-heading";

export const metadata: Metadata = { title: "Administração" };

export default function Page() {
  return (
    <>
      <PageHeading title="Administração" description="Configuração geral e gestão de acessos à plataforma." />
      <EmptyState title="Módulo de administração" description="As configurações e a gestão de acessos estarão disponíveis numa fase futura." />
    </>
  );
}
