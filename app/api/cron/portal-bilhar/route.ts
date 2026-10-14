import { NextRequest, NextResponse } from "next/server";
import { syncPortalMatches } from "@/lib/portal-bilhar/sync-team-matches";
export const dynamic="force-dynamic";export const maxDuration=300;
export async function GET(request:NextRequest){if(!process.env.CRON_SECRET||request.headers.get("authorization")!==`Bearer ${process.env.CRON_SECRET}`)return NextResponse.json({error:"Não autorizado."},{status:401});const result=await syncPortalMatches({triggerType:"scheduled"});return NextResponse.json(result,{status:result.status==="failed"?500:200});}
