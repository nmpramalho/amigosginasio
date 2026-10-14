import { ExternalLink, Link2 } from "lucide-react";

export type PortalMapping = {
  id: string;
  portal_team_code: string;
  portal_team_name: string;
  portal_team_url: string;
  verification_status: "confirmed" | "verified" | "not_found" | "error";
  verification_error: string | null;
  confirmed_at: string;
  last_verified_at: string | null;
};

export function PortalTeamMappingStatus({ mapping }: { mapping: PortalMapping | null }) {
  if (!mapping) {
    return <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
      <Link2 size={16} aria-hidden="true" /> Portal Bilhar: não associado
    </div>;
  }

  const label = mapping.verification_status === "verified" ? "Verificada"
    : mapping.verification_status === "not_found" ? "Não encontrada"
    : mapping.verification_status === "error" ? "Erro de verificação"
    : "Confirmada";

  return <div className="space-y-1 text-sm">
    <div className="flex flex-wrap items-center gap-2">
      <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800">
        Portal Bilhar · {label}
      </span>
      <strong>{mapping.portal_team_name}</strong>
      <span className="text-[var(--muted)]">{mapping.portal_team_code}</span>
      <a href={mapping.portal_team_url} target="_blank" rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-[var(--club-green-700)] underline">
        Abrir ficha <ExternalLink size={13} aria-hidden="true" />
      </a>
    </div>
    {mapping.verification_error && <p className="text-xs text-red-700">{mapping.verification_error}</p>}
  </div>;
}
