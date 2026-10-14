import "server-only";
import { fetchPortalHtml } from "./client";
import { PORTAL_BASE_URL, PORTAL_TEAMS_PATH } from "./types";

export const DEFAULT_PORTAL_VARIANT = "Carambola";
export const DEFAULT_PORTAL_ORGANIZATION = "112";

export function buildCompetitionsUrl(
  variant = DEFAULT_PORTAL_VARIANT,
  organization = DEFAULT_PORTAL_ORGANIZATION,
): string {
  const url = new URL(PORTAL_TEAMS_PATH, PORTAL_BASE_URL);
  url.searchParams.set("Variante", variant);
  url.searchParams.set("org", organization);
  return url.toString();
}

export async function getCompetitionsPage(
  variant = DEFAULT_PORTAL_VARIANT,
  organization = DEFAULT_PORTAL_ORGANIZATION,
): Promise<{ html: string; url: string }> {
  return fetchPortalHtml(buildCompetitionsUrl(variant, organization));
}
