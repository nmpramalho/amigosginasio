import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/access";
import { authorizationUrl } from "@/lib/youtube-channel";

export const runtime = "nodejs";
export async function GET() {
  const admin = await requireAdmin();
  const state = randomBytes(32).toString("base64url");
  const url = authorizationUrl(state);
  const response = NextResponse.redirect(url);
  response.cookies.set("youtube_oauth_state", `${state}.${admin.id}`, {
    httpOnly: true, sameSite: "lax", secure: process.env.YOUTUBE_OAUTH_REDIRECT_URI?.startsWith("https://") === true,
    path: "/api/youtube", maxAge: 600,
  });
  return response;
}
