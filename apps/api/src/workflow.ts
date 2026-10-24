import mongoose, { type ClientSession } from 'mongoose';
import { randomUUID } from 'node:crypto';
import { Agency, User } from './db';
import { AgencyTask, Incident, NotificationPreference, Photo, ReportDraftModel, ResidentNotificationModel, TransferRequest } from './resident-db';
export class WorkflowError extends Error { constructor(public status:number,message:string){super(message);} }
export function ensure(ok:unknown,message='This action is not permitted in the current state.',status=409):asserts ok{if(!ok)throw new WorkflowError(status,message);}
export const openStates=['submitted','under_review','in_progress','reopened'];
export async function claimEvidence(ids:string[],userId:string,agencyId:string|null,incidentId:mongoose.Types.ObjectId,session:ClientSession){
  ensure(new Set(ids).size===ids.length,'Duplicate evidence IDs.',400);
  ensure(!await ReportDraftModel.exists({userId,'data.photoIds':{$in:ids}}).session(session),'These photos belong to a saved draft. Upload separate evidence for this update.');
  const claimed=await Photo.updateMany({_id:{$in:ids},userId,agencyId,state:'unattached'},{$set:{state:'attached',incidentId},$unset:{expiresAt:''}},{session});ensure(claimed.matchedCount===ids.length,'Evidence must be your own unattached photos.',400);
}
export async function notifyUser(userId:mongoose.Types.ObjectId,reportId:mongoose.Types.ObjectId,eventKey:string,title:string,titleAr:string,session:ClientSession,agencyId:mongoose.Types.ObjectId|null=null){
  const prefs=await NotificationPreference.findOne({userId}).session(session);if(prefs?.reportUpdates===false)return;
  await ResidentNotificationModel.updateOne({userId,eventKey},{$setOnInsert:{title:title.slice(0,180),titleAr:titleAr.slice(0,180),body:'Case update',bodyAr:'تحديث البلاغ',reportId,agencyId}},{upsert:true,session});
}
export async function notifyAgency(agencyId:mongoose.Types.ObjectId,reportId:mongoose.Types.ObjectId,event:string,title:string,titleAr:string,session:ClientSession){
  const members=await User.find({role:'AGENCY',$or:[{agencyId},{agencyIds:agencyId}]}).session(session);
  for(const member of members)await notifyUser(member._id,reportId,`${event}:${agencyId}`,title,titleAr,session,agencyId);
}
export async function leadGuard(report:InstanceType<typeof Incident>,agencyId:string,session:ClientSession){ensure(String(report.agencyId)===agencyId,'Only the accepted lead agency can do this.',403);ensure(openStates.includes(report.status));return await TransferRequest.findOne({incidentId:report._id,state:'pending'}).session(session);}
export async function requiredTasksComplete(incidentId:mongoose.Types.ObjectId,session:ClientSession){return !await AgencyTask.exists({incidentId,required:true,state:{$ne:'completed'}}).session(session);}
export async function agencyNames(){return Agency.find().select('name nameAr');}
export const eventId=()=>randomUUID();
