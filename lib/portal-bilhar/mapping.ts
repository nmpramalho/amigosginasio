import type { PortalTeamCandidate, PortalTeamDetails } from "./types";

export function normalizePortalTeamCode(value: string): string {
  const code = value.trim().toUpperCase();
  if (!/^EQP\d+$/.test(code)) throw new Error("Código federativo inválido.");
  return code;
}

export function normalizePortalName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-PT")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function portalCandidateKey(candidate: PortalTeamCandidate): string {
  return [
    candidate.code,
    candidate.competitionRef,
    candidate.phase ?? "",
    candidate.series ?? "",
  ].join("|");
}

export function comparePortalCandidate(
  localTeamName: string,
  candidate: PortalTeamCandidate,
): number {
  const local = normalizePortalName(localTeamName);
  const remote = normalizePortalName(candidate.name);
  if (local === remote) return 100;
  if (remote.includes(local) || local.includes(remote)) return 80;

  const localWords = new Set(local.split(" ").filter(Boolean));
  const remoteWords = new Set(remote.split(" ").filter(Boolean));
  const common = [...localWords].filter((word) => remoteWords.has(word)).length;
  return localWords.size ? Math.round((common / localWords.size) * 60) : 0;
}

export function sortPortalCandidates(
  localTeamName: string,
  candidates: PortalTeamCandidate[],
): PortalTeamCandidate[] {
  return [...candidates].sort((left, right) => {
    const score = comparePortalCandidate(localTeamName, right) - comparePortalCandidate(localTeamName, left);
    return score || left.name.localeCompare(right.name, "pt-PT");
  });
}

export function assertCandidateMatchesDetails(
  candidate: PortalTeamCandidate,
  details: PortalTeamDetails,
): void {
  if (candidate.code !== details.code) {
    throw new Error("A ficha federativa não corresponde à equipa selecionada.");
  }
}
