import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/access";
import { loadPortalSelection } from "@/lib/portal-bilhar/webforms";
import { parseTeamCandidates } from "@/lib/portal-bilhar/parser";
import { normalizePortalName, sortPortalCandidates } from "@/lib/portal-bilhar/mapping";
import type { PortalTeamCandidate } from "@/lib/portal-bilhar/types";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  await requireAdmin();
  const query=request.nextUrl.searchParams.get("q")?.trim()??"";
  const local=request.nextUrl.searchParams.get("localTeamName")?.trim()||query;
  if(query.length<2||query.length>120)return NextResponse.json({error:"Introduz pelo menos dois caracteres do nome da equipa."},{status:400});
  try{
    const initial=await loadPortalSelection({});
    const expected=normalizePortalName(query);
    const found=new Map<string,PortalTeamCandidate>();
    for(const competition of initial.competitions){
      const selectedCompetition=await loadPortalSelection({competition:competition.value});
      const phases=selectedCompetition.phases.length?selectedCompetition.phases:[{value:"1",label:"",selected:true}];
      for(const phase of phases){
        const selectedPhase=await loadPortalSelection({competition:competition.value,phase:phase.value});
        const series=selectedPhase.series.length?selectedPhase.series:[{value:"1",label:"",selected:true}];
        for(const serie of series){
          const selection=await loadPortalSelection({competition:competition.value,phase:phase.value,series:serie.value});
          const candidates=parseTeamCandidates(selection.html,{competitionRef:competition.value,competitionName:competition.label,variant:"Carambola",phase:phase.label||null,series:serie.label||null});
          for(const candidate of candidates){
            if(!normalizePortalName(candidate.name).includes(expected))continue;
            if (candidate.status && candidate.status.toLocaleLowerCase("pt-PT") !== "confirmado") continue;
            if (!found.has(candidate.code)) found.set(candidate.code, candidate);
          }
        }
      }
    }
    return NextResponse.json({teams:sortPortalCandidates(local,[...found.values()])},{headers:{"Cache-Control":"no-store"}});
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Não foi possível pesquisar as equipas."},{status:502});}
}
