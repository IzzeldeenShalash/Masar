import {AIAnalysis} from './ai-db';
import {analysisReview} from './ai-service';
import { Agency } from './db';
import { Incident, AgencyTask, TransferRequest } from './resident-db';
export async function reportDtos(records: Awaited<ReturnType<typeof Incident.find>>) {
  const ids=records.map(r=>r._id);
  const [agencies,tasks,transfers]=await Promise.all([Agency.find(),AgencyTask.find({incidentId:{$in:ids}}),TransferRequest.find({incidentId:{$in:ids}}).sort({createdAt:-1})]);
  const agency=(id:unknown)=>agencies.find(a=>a.id===String(id));
  return Promise.all(records.map(async r=>{
    const analysis=r.analysisId?await AIAnalysis.findOne({_id:r.analysisId,incidentId:r._id,status:'succeeded'}):null;const review=analysis?await analysisReview(analysis):null;const owner=agency(r.agencyId);const caseTasks=tasks.filter(t=>String(t.incidentId)===r.id);const caseTransfers=transfers.filter(t=>String(t.incidentId)===r.id);const pending=caseTransfers.some(t=>t.state==='pending');
    return {kind:r.kind,analysis:review,id:r.id,caseNumber:r.caseNumber,title:r.title??'',description:r.description??'',category:r.category,neighborhood:r.neighborhood??'',landmark:r.landmark??'',locationLabel:r.locationLabel,latitude:r.latitude??null,longitude:r.longitude??null,photoIds:r.photoIds.map(String),status:r.status,agency:owner?.name??null,agencyAr:owner?.nameAr??null,createdAt:r.createdAt.toISOString(),isDemo:r.isDemo,publicVisibility:r.publicVisibility,publicSummary:r.publicSummary,
      waitingSince:(r.waitingSince??r.createdAt).toISOString(),
      nextAction:r.status==='closed'?'none':r.status==='awaiting_citizen_confirmation'?'citizen_confirmation':r.citizenRequest?.awaiting?'citizen_response':pending?'transfer_decision':r.agencyId?'lead_update':'agency_review',
      citizenRequest:r.citizenRequest?.question?{question:r.citizenRequest.question,awaiting:r.citizenRequest.awaiting??false,requestedAt:r.citizenRequest.requestedAt?.toISOString()??r.updatedAt.toISOString()}:null,
      resolution:r.resolution?.summary?{summary:r.resolution.summary,photoIds:r.resolution.photoIds?.map(String)??[],submittedAt:r.resolution.submittedAt?.toISOString()??r.updatedAt.toISOString()}:null,
      tasks:caseTasks.map(t=>({id:t.id,agencyId:String(t.agencyId),agency:agency(t.agencyId)?.name??'',agencyAr:agency(t.agencyId)?.nameAr??'',title:t.title,required:t.required,state:t.state,note:t.note,photoIds:t.photoIds.map(String),updatedAt:t.updatedAt.toISOString()})),
      transfers:caseTransfers.map(t=>({id:t.id,fromAgencyId:String(t.fromAgencyId),toAgencyId:String(t.toAgencyId),fromAgency:agency(t.fromAgencyId)?.name??'',toAgency:agency(t.toAgencyId)?.name??'',fromAgencyAr:agency(t.fromAgencyId)?.nameAr??'',toAgencyAr:agency(t.toAgencyId)?.nameAr??'',reason:t.reason,responseReason:t.responseReason??'',state:t.state,createdAt:t.createdAt.toISOString(),updatedAt:t.updatedAt.toISOString()})),
      history:r.history.filter(h=>h.visibility!=='internal').map(h=>({message:h.message??'',messageAr:h.messageAr??'',date:h.date!.toISOString(),actor:h.actor??'Masar',type:h.type??'update',photoIds:h.photoIds.map(String)}))
    };
  }));
}
