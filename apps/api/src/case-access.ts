import type { ClientSession } from 'mongoose';
import { AgencyTask, Incident, TransferRequest } from './resident-db';
export async function canReadAgencyCase(incidentId: string, agencyId: string, session?: ClientSession) {
  const report = await Incident.findById(incidentId).session(session ?? null);
  if (!report) return false;
  if (String(report.agencyId) === agencyId || (!report.agencyId && ['submitted','under_review','reopened'].includes(report.status))) return true;
  return !!await AgencyTask.exists({ incidentId, agencyId }).session(session ?? null) || !!await TransferRequest.exists({ incidentId, toAgencyId: agencyId, state:'pending' }).session(session ?? null);
}
export async function agencyCaseFilter(agencyId: string) {
  const [tasks, transfers] = await Promise.all([AgencyTask.distinct('incidentId',{agencyId}),TransferRequest.distinct('incidentId',{toAgencyId:agencyId,state:'pending'})]);
  return { $or: [{agencyId},{agencyId:null,status:{$in:['submitted','under_review','reopened']}},{_id:{$in:[...tasks,...transfers]}}] };
}
