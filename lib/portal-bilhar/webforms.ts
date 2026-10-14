import "server-only";
import { PORTAL_BASE_URL, PORTAL_TEAMS_PATH, PortalBilharError } from "./types";

const PORTAL_PAGE_URL: string = new globalThis.URL(
  `${PORTAL_TEAMS_PATH}?Variante=Carambola&org=112`,
  PORTAL_BASE_URL,
).toString();

const control = (name: string) => `ctl00$SampleContent$${name}`;
export type PortalOption = { value: string; label: string; selected: boolean };
export type PortalSelection = {
  html: string;
  competitions: PortalOption[];
  phases: PortalOption[];
  series: PortalOption[];
};

type Session = { cookie: string; html: string };

function entities(value: string) {
  return value
    .replace(/&#(\d+);/g, (_, number: string) => String.fromCodePoint(Number(number)))
    .replace(/&#x([0-9a-f]+);/gi, (_, number: string) => String.fromCodePoint(parseInt(number, 16)))
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function plain(value: string) {
  return entities(value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

function options(html: string, id: string): PortalOption[] {
  const select = html.match(
    new RegExp(
      `<select[^>]*(?:id|name)=["'][^"']*${id}[^"']*["'][^>]*>([\\s\\S]*?)<\\/select>`,
      "i",
    ),
  );
  if (!select) return [];
  return [
    ...select[1].matchAll(
      /<option([^>]*)value=["']([^"']*)["'][^>]*>([\s\S]*?)<\/option>/gi,
    ),
  ].map((match) => ({
    value: entities(match[2]),
    label: plain(match[3]),
    selected: /selected/i.test(match[1]),
  }));
}

function hidden(html: string, name: string): string {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = html.match(
    new RegExp(
      `<input[^>]*name=["']${escaped}["'][^>]*value=["']([^"']*)["']`,
      "i",
    ),
  );
  return match ? entities(match[1]) : "";
}

function form(
  html: string,
  eventTarget: string,
  values: Record<string, string>,
  asyncPost = false,
) {
  const data = new URLSearchParams();
  for (const name of [
    "__EVENTTARGET",
    "__EVENTARGUMENT",
    "__LASTFOCUS",
    "__VIEWSTATE",
    "__VIEWSTATEGENERATOR",
    "__EVENTVALIDATION",
    "__PREVIOUSPAGE",
  ]) {
    data.set(
      name,
      name === "__EVENTTARGET"
        ? eventTarget
        : name.startsWith("__EVENT") || name === "__LASTFOCUS"
          ? ""
          : hidden(html, name),
    );
  }
  data.set(control("hf_exporta"), "0");
  data.set(control("dd_variante"), "Carambola");
  for (const [key, value] of Object.entries(values)) data.set(control(key), value);
  if (asyncPost) {
    data.set(control("ctl00"), `${control("UpdatePanel1")}|${eventTarget}`);
    data.set("__ASYNCPOST", "true");
  }
  return data;
}

async function request(
  method: "GET" | "POST",
  body?: URLSearchParams,
  cookie = "",
): Promise<Session> {
  const response = await fetch(PORTAL_PAGE_URL, {
    method,
    cache: "no-store",
    redirect: "follow",
    headers: {
      Accept: "text/html,application/xhtml+xml,*/*",
      "Accept-Language": "pt-PT,pt;q=0.9",
      "User-Agent": "Mozilla/5.0",
      ...(cookie ? { Cookie: cookie } : {}),
      ...(body
        ? {
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            Referer: PORTAL_PAGE_URL,
          }
        : {}),
    },
    body,
  });
  if (!response.ok) {
    throw new PortalBilharError(
      `O Portal Bilhar respondeu com HTTP ${response.status}.`,
      "HTTP_ERROR",
      response.status,
    );
  }
  const setCookie = response.headers.get("set-cookie");
  return {
    html: await response.text(),
    cookie: setCookie
      ? setCookie
          .split(",")
          .map((item) => item.split(";")[0])
          .join("; ")
      : cookie,
  };
}

async function post(
  session: Session,
  target: string,
  values: Record<string, string>,
  asyncPost = false,
): Promise<Session> {
  const next = await request(
    "POST",
    form(session.html, target, values, asyncPost),
    session.cookie,
  );
  return { html: next.html, cookie: next.cookie || session.cookie };
}

export async function loadPortalSelection(input: {
  competition?: string;
  phase?: string;
  series?: string;
}): Promise<PortalSelection> {
  let session = await request("GET");
  let competitions = options(session.html, "dd_competicao");
  const competition =
    input.competition ||
    competitions.find((item) => item.selected)?.value ||
    competitions[0]?.value;

  if (input.competition && competition) {
    session = await post(session, control("dd_competicao"), {
      dd_competicao: competition,
      dd_fase: "1",
      dd_serie: "1",
    });
  }

  let phases = options(session.html, "dd_fase");
  const phase =
    input.phase || phases.find((item) => item.selected)?.value || phases[0]?.value;

  if (input.phase && phase && !phases.find((item) => item.value === phase)?.selected) {
    session = await post(session, control("dd_fase"), {
      dd_competicao: competition || "",
      dd_fase: phase,
      dd_serie: "1",
    });
  }

  let series = options(session.html, "dd_serie");
  const seriesValue =
    input.series || series.find((item) => item.selected)?.value || series[0]?.value;

  if (
    input.series &&
    seriesValue &&
    !series.find((item) => item.value === seriesValue)?.selected
  ) {
    session = await post(
      session,
      control("dd_serie"),
      {
        dd_competicao: competition || "",
        dd_fase: phase || "",
        dd_serie: seriesValue,
      },
      true,
    );
  }

  const finalCompetitions = options(session.html, "dd_competicao");
  const finalPhases = options(session.html, "dd_fase");
  const finalSeries = options(session.html, "dd_serie");

  competitions = finalCompetitions.length ? finalCompetitions : competitions;
  phases = finalPhases.length ? finalPhases : phases;
  series = finalSeries.length ? finalSeries : series;

  return { html: session.html, competitions, phases, series };
}
