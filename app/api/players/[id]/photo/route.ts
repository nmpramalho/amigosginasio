import { get } from "@vercel/blob";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { findAuthorizedUser } from "@/lib/access-lookup";
import { getDatabase } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return new NextResponse("Não autorizado", { status: 401 });
  const user = await findAuthorizedUser(email);
  if (!user?.active) return new NextResponse("Não autorizado", { status: 403 });
  const { id } = await context.params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))
    return new NextResponse("Não encontrado", { status: 404 });
  const sql = getDatabase();
  const rows = await sql`SELECT photo_key FROM public.players WHERE id = ${id}::uuid LIMIT 1`;
  const key = rows[0]?.photo_key as string | null | undefined;
  if (!key) return new NextResponse("Não encontrado", { status: 404 });
  const result = await get(key, { access: "private" });
  if (result?.statusCode !== 200) return new NextResponse("Não encontrado", { status: 404 });
  return new NextResponse(result.stream, {
    headers: { "Content-Type": result.blob.contentType || "application/octet-stream",
      "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" },
  });
}
