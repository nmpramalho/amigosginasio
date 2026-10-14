import {
  PORTAL_BASE_URL,
  PortalBilharError,
  type PortalTeamCandidate,
  type PortalTeamDetails,
} from "./types";

function decodeEntities(value: string): string {
  const named: Record<string, string> = {
    amp: "&", quot: '"', apos: "'", lt: "<", gt: ">", nbsp: " ",
    aacute: "á", Aacute: "Á", agrave: "à", Agrave: "À", atilde: "ã", Atilde: "Ã",
    acirc: "â", Acirc: "Â", eacute: "é", Eacute: "É", ecirc: "ê", Ecirc: "Ê",
    iacute: "í", Iacute: "Í", oacute: "ó", Oacute: "Ó", otilde: "õ", Otilde: "Õ",
    ocirc: "ô", Ocirc: "Ô", uacute: "ú", Uacute: "Ú", ccedil: "ç", Ccedil: "Ç",
  };
  return value
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n: string) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (entity, name: string) => named[name] ?? entity);
}

function text(html: string): string {
  return decodeEntities(
    html
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

function absolutePortalUrl(href: string): string {
  return new URL(decodeEntities(href), PORTAL_BASE_URL).toString();
}

export function extractPortalTeamCode(value: string): string | null {
  try {
    const url = new URL(value, PORTAL_BASE_URL);
    const code = url.searchParams.get("Eqp")?.toUpperCase() ?? null;
    return code && /^EQP\d+$/.test(code) ? code : null;
  } catch {
    return null;
  }
}

export function parseTeamCandidates(
  html: string,
  context: {
    competitionRef: string;
    competitionName: string;
    variant: string;
    phase?: string | null;
    series?: string | null;
  },
): PortalTeamCandidate[] {
  const rows = html.match(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi) ?? [];
  const found = new Map<string, PortalTeamCandidate>();

  for (const row of rows) {
    const link = row.match(
      /<a\b[^>]*href=["']([^"']*Publico_Eqp\.aspx\?[^"']*Eqp=EQP\d+[^"']*)["'][^>]*>([\s\S]*?)<\/a>/i,
    );
    if (!link) continue;
    const code = extractPortalTeamCode(link[1]);
    const name = text(link[2]);
    if (!code || !name) continue;

    const cells = [...row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map((m) => text(m[1]));
    const tail = cells.filter(Boolean).filter((cell) => cell !== name);
    const status = tail.find((cell) => /confirmado|pendente|cancelado|inactivo|inativo/i.test(cell)) ?? null;
    const district = tail.find((cell) => cell !== status) ?? null;

    found.set(code, {
      code,
      name,
      status,
      district,
      url: absolutePortalUrl(link[1]),
      competitionRef: context.competitionRef,
      competitionName: context.competitionName,
      variant: context.variant,
      phase: context.phase ?? null,
      series: context.series ?? null,
    });
  }

  return [...found.values()].sort((a, b) => a.name.localeCompare(b.name, "pt-PT"));
}

export function parseTeamDetails(html: string, sourceUrl: string): PortalTeamDetails {
  const code = extractPortalTeamCode(sourceUrl);
  if (!code) {
    throw new PortalBilharError("A ficha federativa não contém um código de equipa válido.", "PARSE_ERROR");
  }

  const heading = html.match(/<h[1-4]\b[^>]*>([\s\S]*?)<\/h[1-4]>/i);
  const title = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  const name = text(heading?.[1] ?? title?.[1] ?? "");
  if (!name) {
    throw new PortalBilharError("Não foi possível identificar o nome da equipa.", "PARSE_ERROR");
  }

  const body = text(html);
  const district = body.match(/Distrito\s*:?\s*([\p{L} .'-]{2,80})/iu)?.[1]?.trim() ?? null;
  const status = body.match(/Estado\s*:?\s*(Confirmado|Pendente|Cancelado|Inativo|Inactivo)/i)?.[1] ?? null;
  const clubName = body.match(/Clube\s*:?\s*([\p{L}\d .,'/&()-]{2,160})/iu)?.[1]?.trim() ?? null;

  return { code, name, clubName, district, status, url: sourceUrl };
}
