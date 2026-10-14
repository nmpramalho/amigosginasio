import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/access";
import { loadPortalSelection } from "@/lib/portal-bilhar/webforms";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  await requireAdmin();
  try {
    const result = await loadPortalSelection({ competition: request.nextUrl.searchParams.get("competition") || undefined, phase: request.nextUrl.searchParams.get("phase") || undefined });
    return NextResponse.json({ competitions: result.competitions, phases: result.phases, series: result.series },{headers:{"Cache-Control":"no-store"}});
  } catch (error) { return NextResponse.json({error:error instanceof Error?error.message:"Falha ao consultar o Portal Bilhar."},{status:502}); }
}
