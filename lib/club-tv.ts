import "server-only";
import { randomUUID } from "node:crypto";
import { getDatabase } from "@/lib/db";

const CHANNEL_HANDLE = "BilharGCS";
export const CLUB_CHANNEL_URL = "https://www.youtube.com/@BilharGCS/streams";

export type LiveVideo = { id: string; title: string; publishedAt: string };
export type ScheduledVideo = { id: string; title: string; scheduledAt: string };
type CacheRow = {
  channel_id: string | null; videos: unknown; upcoming: unknown; checked_at: string | Date | null;
  claim_active: boolean; fresh: boolean; today: string; last_error: string | null;
};
export type TvState = { videos: LiveVideo[]; upcoming: ScheduledVideo[]; checkedAt: string | null; today: string; error: string | null };
const idPattern = /^[A-Za-z0-9_-]{11}$/;
const channelPattern = /^UC[A-Za-z0-9_-]{22}$/;
function cleanVideos(value: unknown): LiveVideo[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is LiveVideo =>
    typeof v === "object" && v !== null &&
    "id" in v && typeof v.id === "string" && idPattern.test(v.id) &&
    "title" in v && typeof v.title === "string" && v.title.length <= 200 &&
    "publishedAt" in v && typeof v.publishedAt === "string");
}
function cleanUpcoming(value: unknown): ScheduledVideo[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is ScheduledVideo =>
    typeof v === "object" && v !== null &&
    "id" in v && typeof v.id === "string" && idPattern.test(v.id) &&
    "title" in v && typeof v.title === "string" && v.title.length <= 200 &&
    "scheduledAt" in v && typeof v.scheduledAt === "string" &&
    Number.isFinite(Date.parse(v.scheduledAt)));
}
async function readCache(): Promise<CacheRow> {
  const sql = getDatabase();
  const rows = await sql`SELECT channel_id, videos, upcoming, checked_at, last_error,
    to_char(now() AT TIME ZONE 'Europe/Lisbon', 'YYYY-MM-DD') AS today,
    (checked_at > now() - interval '62 minutes') AS fresh,
    (claim_at > now() - interval '90 seconds') AS claim_active
    FROM public.club_tv_live_cache WHERE id = 1`;
  if (!rows[0]) throw new Error("TV migration not applied: database/tv-live.sql");
  return rows[0] as CacheRow;
}
function state(row: CacheRow): TvState {
  // Never advertise an old broadcast after a failed check or an hour of staleness.
  return {
    videos: row.fresh && !row.last_error ? cleanVideos(row.videos) : [],
    upcoming: row.fresh && !row.last_error ? cleanUpcoming(row.upcoming) : [],
    checkedAt: row.checked_at ? new Date(row.checked_at).toISOString() : null,
    today: row.today,
    error: row.last_error,
  };
}
export async function readTvState(): Promise<TvState> { return state(await readCache()); }

async function youtube(path: string, params: Record<string, string>): Promise<unknown> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) throw new Error("Configura YOUTUBE_API_KEY na Vercel e em .env.local");
  const url = new URL(`https://www.googleapis.com/youtube/v3/${path}`);
  for (const [name, value] of Object.entries({ ...params, key })) url.searchParams.set(name, value);
  const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error(`YouTube API HTTP ${response.status}`);
  return response.json();
}
function entries(value: unknown): unknown[] {
  if (!value || typeof value !== "object" || !("items" in value) ||
      !Array.isArray(value.items)) throw new Error("Resposta inválida da API do YouTube");
  return value.items;
}
type YoutubeSearch = { id?: { videoId?: string }; snippet?: { channelId?: string; title?: string; publishedAt?: string } };
function searchItems(value: unknown, channel: string): YoutubeSearch[] {
  return entries(value).filter((entry): entry is YoutubeSearch => {
    if (!entry || typeof entry !== "object") return false;
    const item = entry as YoutubeSearch;
    return item.snippet?.channelId === channel &&
      typeof item.id?.videoId === "string" && idPattern.test(item.id.videoId) &&
      typeof item.snippet.title === "string";
  });
}
async function fetchLive(knownChannel: string | null): Promise<{ channel: string; videos: LiveVideo[]; upcoming: ScheduledVideo[] }> {
  let channel = knownChannel;
  if (!channel || !channelPattern.test(channel)) {
    const result = entries(await youtube("channels", { part: "id", forHandle: CHANNEL_HANDLE }));
    const first = result[0];
    const candidate = first && typeof first === "object" && "id" in first ? first.id : null;
    if (typeof candidate !== "string" || !channelPattern.test(candidate))
      throw new Error("Canal @BilharGCS não encontrado");
    channel = candidate;
  }
  const result = entries(await youtube("search", {
    part: "snippet", channelId: channel, eventType: "live", type: "video",
    videoEmbeddable: "true", maxResults: "25",
  }));
  const videos: LiveVideo[] = [];
  for (const entry of result) {
    if (!entry || typeof entry !== "object" || !("id" in entry) || !("snippet" in entry)) continue;
    const id = entry.id;
    const snippet = entry.snippet;
    if (!id || typeof id !== "object" || !("videoId" in id) ||
        !snippet || typeof snippet !== "object" ||
        !("channelId" in snippet) || snippet.channelId !== channel ||
        !("title" in snippet) || typeof snippet.title !== "string" ||
        !("publishedAt" in snippet) || typeof snippet.publishedAt !== "string" ||
        typeof id.videoId !== "string" || !idPattern.test(id.videoId)) continue;
    videos.push({ id: id.videoId, title: snippet.title.slice(0, 200),
      publishedAt: snippet.publishedAt });
  }
  // Upcoming search returns publication time, not the scheduled start.
  const candidates = searchItems(await youtube("search", {
    part: "snippet", channelId: channel, eventType: "upcoming", type: "video",
    videoEmbeddable: "true", maxResults: "50",
  }), channel);
  const ids = [...new Set(candidates.map(item => item.id!.videoId!))];
  const upcoming: ScheduledVideo[] = [];
  if (ids.length) {
    const details = entries(await youtube("videos", {
      part: "snippet,liveStreamingDetails,status", id: ids.join(","),
    }));
    for (const raw of details) {
      if (!raw || typeof raw !== "object") continue;
      const video = raw as { id?: string; snippet?: { channelId?: string; title?: string; liveBroadcastContent?: string };
        status?: { embeddable?: boolean; privacyStatus?: string };
        liveStreamingDetails?: { scheduledStartTime?: string } };
      const start = video.liveStreamingDetails?.scheduledStartTime;
      if (typeof video.id !== "string" || !idPattern.test(video.id) ||
          video.snippet?.channelId !== channel || video.snippet.liveBroadcastContent !== "upcoming" ||
          video.status?.privacyStatus !== "public" || video.status?.embeddable !== true ||
          typeof video.snippet.title !== "string" || typeof start !== "string" ||
          !Number.isFinite(Date.parse(start))) continue;
      upcoming.push({ id: video.id, title: video.snippet.title.slice(0, 200), scheduledAt: start });
    }
  }
  upcoming.sort((a, b) => Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt));
  return { channel, videos, upcoming };
}

export async function refreshTv(force = false): Promise<{ status: "updated" | "cached" | "busy" | "error"; state: TvState }> {
  const sql = getDatabase();
  const claim = randomUUID();
  // A database lease prevents multiple visitors or administrators spending API quota simultaneously.
  const claimed = await sql`UPDATE public.club_tv_live_cache
    SET claim_id = ${claim}::uuid, claim_at = now()
    WHERE id = 1
      AND (claim_at IS NULL OR claim_at < now() - interval '90 seconds')
      AND (checked_at IS NULL OR checked_at < now() -
        (CASE WHEN ${force}::boolean THEN interval '5 minutes' ELSE interval '1 hour' END))
    RETURNING channel_id`;
  if (!claimed.length) {
    const row = await readCache();
    return { status: row.claim_active
      ? "busy" : "cached", state: state(row) };
  }
  try {
    const result = await fetchLive(claimed[0].channel_id as string | null);
    await sql`UPDATE public.club_tv_live_cache
      SET channel_id = ${result.channel}, videos = ${JSON.stringify(result.videos)}::jsonb,
        upcoming = ${JSON.stringify(result.upcoming)}::jsonb,
        checked_at = now(), last_error = NULL, claim_id = NULL, claim_at = NULL
      WHERE id = 1 AND claim_id = ${claim}::uuid`;
    return { status: "updated", state: await readTvState() };
  } catch (error) {
    console.error("TV YouTube refresh failed", error);
    const message = error instanceof Error && error.message.startsWith("Configura YOUTUBE_API_KEY")
      ? "Falta configurar a chave da API do YouTube." : "Não foi possível consultar o YouTube.";
    await sql`UPDATE public.club_tv_live_cache
      SET videos = '[]'::jsonb, upcoming = '[]'::jsonb, checked_at = now(), last_error = ${message},
        claim_id = NULL, claim_at = NULL
      WHERE id = 1 AND claim_id = ${claim}::uuid`;
    return { status: "error", state: await readTvState() };
  }
}
