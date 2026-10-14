import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/access";
import { exchangeCode, saveConnection, verifyOwnedChannel } from "@/lib/youtube-channel";

export const runtime = "nodejs";
const destination = "/administracao/youtube";
export async function GET(request: Request) {
  const admin = await requireAdmin();
  const url = new URL(request.url);
  const cookie = (await cookies()).get("youtube_oauth_state")?.value ?? "";
  const [expected, actor] = cookie.split(".");
  const state = url.searchParams.get("state") ?? "";
  const valid = expected && actor === admin.id && expected.length === state.length &&
    timingSafeEqual(Buffer.from(expected), Buffer.from(state));
  let status = "error";
  try {
    if (!valid) status = "invalid-state";
    else if (url.searchParams.has("error")) status = "cancelled";
    else {
      const code = url.searchParams.get("code");
      if (!code || code.length > 4096) status = "invalid-code";
      else {
        const tokens = await exchangeCode(code);
        const channel = await verifyOwnedChannel(tokens.accessToken);
        await saveConnection(channel, tokens.refreshToken, admin.id);
        status = "connected";
      }
    }
  } catch (error) {
    console.error("YouTube channel connection failed", error);
    status = "connection-failed";
  }
  const response = NextResponse.redirect(new URL(`${destination}?status=${status}`, request.url));
  response.cookies.set("youtube_oauth_state", "", { path: "/api/youtube", maxAge: 0 });
  return response;
}
