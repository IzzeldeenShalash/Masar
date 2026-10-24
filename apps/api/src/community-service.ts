import mongoose from 'mongoose';
import {createHash} from 'node:crypto';
import {EventEmitter} from 'node:events';
import {threadSendSchema,type Account,type CommunityIssue,type ThreadMessage} from '@masar/shared';
import {Agency} from './db';
import {canReadAgencyCase} from './case-access';
import {Incident,ResidentNotificationModel,NotificationPreference} from './resident-db';
import {IssueMessage,Participation} from './stage8-db';
import {ensure,WorkflowError,claimEvidence} from './workflow';
export const issueEvents=new EventEmitter();
export const validId=(id:unknown):id is string=>typeof id==='string'&&/^[a-f\d]{24}$/i.test(id);
export const payloadDigest=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
export async function issueAccess(id:string,account:Account){
  ensure(validId(id),'Issue unavailable.',404);const issue=await Incident.findById(id);ensure(issue,'Issue unavailable.',404);
  const own=String(issue.userId)===account.id;
  const staff=account.role==='AGENCY'&&!!account.agency&&await canReadAgencyCase(id,account.agency.id);
  ensure(own||staff||issue.publicVisibility,'Issue unavailable.',404);
  return{issue,own,staff,full:own||staff};
}
export async function communityDto(id:string,account:Account):Promise<CommunityIssue>{
  const{issue,own,full,staff}=await issueAccess(id,account);
  const [supportCount,participation,agency]=await Promise.all([Participation.countDocuments({issueId:id,support:true}),Participation.findOne({issueId:id,userId:account.id}),issue.agencyId?Agency.findById(issue.agencyId):null]);
  return{id:issue.id,title:issue.title??'',summary:full?issue.description??'':issue.publicSummary??'',category:issue.category??'unsure',status:issue.status,kind:issue.kind as 'problem'|'improvement',supportCount,supported:participation?.support??false,following:participation?.following??false,own,canManage:staff,fullAccess:full,agency:agency?.name??null,urgency:full?issue.staffUrgency??null:null,
    history:issue.history.filter(h=>h.visibility!=='internal'&&['submitted','accepted','started','resolution_submitted','confirmed','reopened','transfer_accepted'].includes(h.type??'')).map(h=>({message:h.type??'update',date:h.date!.toISOString()}))};
}
export function messageDto(message:InstanceType<typeof IssueMessage>,account:Account,full:boolean):ThreadMessage{
  const own=String(message.userId)===account.id;return{id:message.id,text:message.hidden?'':message.text??'',author:message.role==='AGENCY'?'Agency member':'Resident',role:message.role as 'USER'|'AGENCY',own,hidden:message.hidden,photoIds:!message.hidden&&(own||full)?message.photoIds.map(String):[],createdAt:message.createdAt.toISOString()};
}
const budgets=new Map<string,{at:number;count:number}>();
export function messageBudget(userId:string){const now=Date.now();if(budgets.size>1000)for(const[k,v]of budgets)if(now-v.at>60000)budgets.delete(k);const value=budgets.get(userId);if(!value||now-value.at>60000){budgets.set(userId,{at:now,count:1});return;}ensure(++value.count<=25,'Too many messages. Wait a minute.',429);}
export async function saveMessage(id:string,account:Account,body:unknown){
  const parsed=threadSendSchema.safeParse(body);ensure(parsed.success,'Write a message or attach evidence.',400);const input=parsed.data;const{issue,full}=await issueAccess(id,account);
  const hash=payloadDigest(input),filter={userId:account.id,clientId:input.clientId};
  const existing=await IssueMessage.findOne(filter);if(existing){ensure(String(existing.issueId)===id&&existing.inputDigest===hash,'Message retry differs from the original.',409);return messageDto(existing,account,full);}
  messageBudget(account.id);let saved:InstanceType<typeof IssueMessage>|undefined;const session=await mongoose.startSession();
  try{await session.withTransaction(async()=>{
    const current=await Incident.findById(id).session(session);ensure(current,'Issue unavailable.',404);const stillStaff=account.role==='AGENCY'&&await canReadAgencyCase(id,account.agency!.id,session);ensure(String(current.userId)===account.id||stillStaff||current.publicVisibility,'Issue unavailable.',404);
    const messageId=new mongoose.Types.ObjectId();await claimEvidence(input.photoIds,account.id,account.role==='AGENCY'?account.agency!.id:null,issue._id,session);
    [saved]=await IssueMessage.create([{_id:messageId,...input,issueId:issue._id,userId:account.id,agencyId:account.role==='AGENCY'?account.agency!.id:null,role:account.role,inputDigest:hash}],{session});
    // Followers receive only a generic pointer. They must re-authorize before reading the thread.
    const followers=await Participation.find({issueId:id,following:true}).limit(500).session(session);const recipients=new Set([String(issue.userId),...followers.map(f=>String(f.userId))]);
    recipients.delete(account.id);for(const userId of recipients){const pref=await NotificationPreference.findOne({userId}).session(session);if(pref?.reportUpdates===false)continue;await ResidentNotificationModel.updateOne({userId,eventKey:`thread:${messageId}`},{$setOnInsert:{title:'New issue discussion message',titleAr:'رسالة جديدة في نقاش المشكلة',body:'Open the issue discussion to read the update.',bodyAr:'افتح نقاش المشكلة لقراءة التحديث.',threadId:issue._id}},{upsert:true,session});}
  });}catch(error){if(error instanceof mongoose.mongo.MongoServerError&&error.code===11000){const duplicate=await IssueMessage.findOne(filter);if(duplicate&&String(duplicate.issueId)===id&&duplicate.inputDigest===hash)return messageDto(duplicate,account,full);}throw error;}finally{await session.endSession();}
  issueEvents.emit('change',id,'message');return messageDto(saved!,account,full);
}
export function safeFailure(error:unknown){return error instanceof WorkflowError?{status:error.status,message:error.message}:{status:503,message:'Temporarily unavailable. Please retry.'};}
export async function notifyStatusFollowers(id:string){const issue=await Incident.findById(id);if(!issue)return;const followers=await Participation.find({issueId:id,following:true}).limit(500);for(const follower of followers){if(await NotificationPreference.exists({userId:follower.userId,reportUpdates:false}))continue;const allowed=String(follower.userId)===String(issue.userId)||issue.publicVisibility;if(!allowed)continue;await ResidentNotificationModel.updateOne({userId:follower.userId,eventKey:`thread-status:${id}:${issue.updatedAt.getTime()}`},{$setOnInsert:{title:'Issue status or progress updated',titleAr:'تحديث حالة المشكلة أو تقدمها',body:'Open the issue to view recorded progress.',bodyAr:'افتح المشكلة لعرض التقدم المسجل.',threadId:issue._id}},{upsert:true});}}
