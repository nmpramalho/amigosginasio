export const PORTAL_BASE_URL = "https://www.portalbilhar.pt";
export const PORTAL_TEAMS_PATH = "/Publico/BT/Publico_P_Eqp.aspx";

export type PortalCompetition = {
  ref: string;
  name: string;
  variant: string;
  phase: string | null;
  series: string | null;
  url: string;
};

export type PortalTeamCandidate = {
  code: string;
  name: string;
  status: string | null;
  district: string | null;
  url: string;
  competitionRef: string;
  competitionName: string;
  variant: string;
  phase: string | null;
  series: string | null;
};

export type PortalTeamDetails = {
  code: string;
  name: string;
  clubName: string | null;
  district: string | null;
  status: string | null;
  url: string;
};

export type PortalMatchStatus =
  | "scheduled"
  | "postponed"
  | "completed"
  | "cancelled"
  | "unknown";

export type PortalMatch = {
  externalRef: string;
  sourceUrl: string;
  competitionRef: string;
  competitionName: string;
  phase: string | null;
  series: string | null;
  round: string | null;
  scheduledAt: string | null;
  homeTeamCode: string | null;
  homeTeamName: string;
  awayTeamCode: string | null;
  awayTeamName: string;
  venue: string | null;
  status: PortalMatchStatus;
  portalStatus: string | null;
  homeScore: number | null;
  awayScore: number | null;
};

export type PortalSyncResult = {
  discovered: number;
  inserted: number;
  updated: number;
  unchanged: number;
  missing: number;
  errors: string[];
};

export class PortalBilharError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "INVALID_ARGUMENT"
      | "HTTP_ERROR"
      | "TIMEOUT"
      | "UNEXPECTED_CONTENT"
      | "PARSE_ERROR",
    public readonly httpStatus?: number,
  ) {
    super(message);
    this.name = "PortalBilharError";
  }
}
