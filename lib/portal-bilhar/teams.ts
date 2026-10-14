import "server-only";
import { fetchPortalHtml } from "./client";
import { parseTeamCandidates, parseTeamDetails } from "./parser";
import {
  PORTAL_BASE_URL,
  type PortalTeamCandidate,
  type PortalTeamDetails,
} from "./types";

export function buildTeamUrl(code: string): string {
  const normalized = code.trim().toUpperCase();
  if (!/^EQP\d+$/.test(normalized)) throw new Error("Código federativo inválido.");
  const url = new URL("/Publico/BT/Publico_Eqp.aspx", PORTAL_BASE_URL);
  url.searchParams.set("Eqp", normalized);
  return url.toString();
}

export async function getPortalTeamDetails(code: string): Promise<PortalTeamDetails> {
  const url = buildTeamUrl(code);
  const response = await fetchPortalHtml(url);
  return parseTeamDetails(response.html, response.url);
}

export async function getCompetitionTeams(input: {
  url: string;
  competitionRef: string;
  competitionName: string;
  variant: string;
  phase?: string | null;
  series?: string | null;
}): Promise<PortalTeamCandidate[]> {
  const response = await fetchPortalHtml(input.url);
  return parseTeamCandidates(response.html, input);
}

export async function verifyPortalTeamCandidate(
  candidate: PortalTeamCandidate,
): Promise<PortalTeamDetails> {
  const details = await getPortalTeamDetails(candidate.code);
  if (details.code !== candidate.code) throw new Error("A equipa devolvida pelo portal não coincide com a seleção.");
  return details;
}
