import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { getDatabase } from "@/lib/db";

const channelIdPattern = /^UC[A-Za-z0-9_-]{22}$/;
const scope = "https://www.googleapis.com/auth/youtube.readonly";
export const channelHandle = "BilharGCS";

type Connection = { channel_id: string; channel_title: string; refresh_token_encrypted: string };
export type ChannelStatus = { channelId: string; title: string } | null;

function config() {
  const id = process.env.YOUTUBE_OAUTH_CLIENT_ID;
  const secret = process.env.YOUTUBE_OAUTH_CLIENT_SECRET;
  const redirect = process.env.YOUTUBE_OAUTH_REDIRECT_URI;
  if (!id || !secret || !redirect || !/^https:\/\/[^/]+\/api\/youtube\/callback$|^http:\/\/localhost:3000\/api\/youtube\/callback$/.test(redirect))
    throw new Error("Configuração OAuth do YouTube incompleta ou redirect inválido.");
  return { id, secret, redirect };
}
function encryptionKey(): Buffer {
  const hex = process.env.YOUTUBE_TOKEN_ENCRYPTION_KEY;
  if (!hex || !/^[a-f0-9]{64}$/i.test(hex)) throw new Error("YOUTUBE_TOKEN_ENCRYPTION_KEY deve ter 64 caracteres hexadecimais.");
  return Buffer.from(hex, "hex");
}
export function encryptToken(token: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const body = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), body].map(part => part.toString("base64url")).join(".");
}
function decryptToken(value: string): string {
  const pieces = value.split(".");
  if (pieces.length !== 3) throw new Error("Token cifrado inválido.");
  const [iv, tag, body] = pieces.map(part => Buffer.from(part, "base64url"));
  if (iv.length !== 12 || tag.length !== 16) throw new Error("Token cifrado inválido.");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(body), decipher.final()]).toString("utf8");
}
export function authorizationUrl(state: string): string {
  const { id, redirect } = config();
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  for (const [key, value] of Object.entries({ client_id: id, redirect_uri: redirect,
    response_type: "code", scope, access_type: "offline", prompt: "consent select_account", state }))
    url.searchParams.set(key, value);
  return url.toString();
}
async function tokenRequest(data: Record<string, string>): Promise<Record<string, unknown>> {
  const { id, secret } = config();
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ ...data, client_id: id, client_secret: secret }),
    cache: "no-store", signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new Error(`Google OAuth HTTP ${response.status}`);
  return await response.json() as Record<string, unknown>;
}
export async function exchangeCode(code: string): Promise<{ accessToken: string; refreshToken: string }> {
  const tokens = await tokenRequest({ code, redirect_uri: config().redirect, grant_type: "authorization_code" });
  if (typeof tokens.access_token !== "string" || typeof tokens.refresh_token !== "string" ||
      typeof tokens.scope !== "string" || !tokens.scope.split(" ").includes(scope))
    throw new Error("Google não devolveu autorização offline de leitura do YouTube.");
  return { accessToken: tokens.access_token, refreshToken: tokens.refresh_token };
}
export async function getConnection(): Promise<Connection | null> {
  const sql = getDatabase();
  const rows = await sql`SELECT channel_id, channel_title, refresh_token_encrypted
    FROM public.youtube_channel_connection WHERE id = 1`;
  return (rows[0] as Connection | undefined) ?? null;
}
export async function getChannelStatus(): Promise<ChannelStatus> {
  const connection = await getConnection();
  return connection ? { channelId: connection.channel_id, title: connection.channel_title } : null;
}
export async function getAccessToken(connection: Connection): Promise<string> {
  const tokens = await tokenRequest({ refresh_token: decryptToken(connection.refresh_token_encrypted), grant_type: "refresh_token" });
  if (typeof tokens.access_token !== "string") throw new Error("Não foi possível renovar o acesso ao canal.");
  return tokens.access_token;
}
export async function youtubeOwned(path: string, params: Record<string, string>, accessToken: string): Promise<Record<string, unknown>> {
  const url = new URL(`https://www.googleapis.com/youtube/v3/${path}`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store", signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error(`YouTube API HTTP ${response.status}`);
  return await response.json() as Record<string, unknown>;
}
function channelItems(data: Record<string, unknown>): { id: string; title: string }[] {
  if (!Array.isArray(data.items)) return [];
  return data.items.flatMap((item: unknown) => {
    if (!item || typeof item !== "object") return [];
    const row = item as { id?: unknown; snippet?: { title?: unknown } };
    return typeof row.id === "string" && channelIdPattern.test(row.id) &&
      typeof row.snippet?.title === "string" ? [{ id: row.id, title: row.snippet.title }] : [];
  });
}
export async function verifyOwnedChannel(accessToken: string): Promise<{ id: string; title: string }> {
  const [expected, mine] = await Promise.all([
    youtubeOwned("channels", { part: "snippet", forHandle: channelHandle }, accessToken),
    youtubeOwned("channels", { part: "snippet", mine: "true" }, accessToken),
  ]);
  const target = channelItems(expected)[0];
  if (!target || !channelItems(mine).some(item => item.id === target.id))
    throw new Error("A conta selecionada não autorizou o canal @BilharGCS.");
  return target;
}
export async function saveConnection(channel: { id: string; title: string }, refreshToken: string, actorId: string) {
  const encrypted = encryptToken(refreshToken);
  const sql = getDatabase();
  await sql`INSERT INTO public.youtube_channel_connection
    (id, channel_id, channel_title, refresh_token_encrypted, connected_by)
    VALUES (1, ${channel.id}, ${channel.title}, ${encrypted}, ${actorId}::uuid)
    ON CONFLICT (id) DO UPDATE SET channel_id = EXCLUDED.channel_id,
      channel_title = EXCLUDED.channel_title, refresh_token_encrypted = EXCLUDED.refresh_token_encrypted,
      connected_by = EXCLUDED.connected_by, connected_at = now(), updated_at = now()`;
  await sql`UPDATE public.club_tv_live_cache SET checked_at = NULL WHERE id = 1`;
}
export async function disconnectChannel() {
  const sql = getDatabase();
  await sql`DELETE FROM public.youtube_channel_connection WHERE id = 1`;
  await sql`UPDATE public.club_tv_live_cache SET videos = '[]'::jsonb, upcoming = '[]'::jsonb,
    checked_at = NULL, last_error = NULL WHERE id = 1`;
}
