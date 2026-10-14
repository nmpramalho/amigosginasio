import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/access";
import { getPortalTeamDetails } from "@/lib/portal-bilhar/teams";
import { PortalBilharError } from "@/lib/portal-bilhar/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  await requireAdmin();
  const code = request.nextUrl.searchParams.get("code")?.trim().toUpperCase();
  if (!code || !/^EQP\d+$/.test(code)) {
    return NextResponse.json({ error: "Código federativo inválido." }, { status: 400 });
  }

  try {
    const team = await getPortalTeamDetails(code);
    return NextResponse.json({ team }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof PortalBilharError) {
      const status = error.httpStatus === 404 ? 404 : 502;
      return NextResponse.json({ error: error.message, code: error.code }, { status });
    }
    return NextResponse.json({ error: "Não foi possível consultar a equipa federativa." }, { status: 500 });
  }
}
