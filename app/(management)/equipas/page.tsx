import type { Metadata } from "next";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeading } from "@/components/ui/page-heading";

export const metadata: Metadata = { title: "Equipas" };

export default function Page() {
  return (
    <>
      <PageHeading title="Equipas" description="Organização das equipas por época desportiva." />
      <EmptyState title="Módulo de equipas" description="A gestão de equipas e respetivos plantéis estará disponível numa fase futura." />
    </>
  );
}
