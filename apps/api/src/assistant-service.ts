import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {assistantOutputSchema,triageOutputSchema,type Account,type AssistantTurn,type TriageResult,type AssistantDraft} from '@masar/shared';
import type {z} from 'zod';
import type {assistantSendSchema,triageInputSchema} from '@masar/shared';
import type {Config} from './config';
import {Agency} from './db';
import {Incident,Photo} from './resident-db';
import {Conversation,AssistantTurnModel,IssueMessage,TriageAnalysis} from './stage8-db';
import {issueAccess,payloadDigest} from './community-service';
import {agencyCaseFilter} from './case-access';
import {ensure} from './workflow';
import {generateStructured,providerInfo,assistantSystem,ProviderError} from './assistant-provider';
export const masarFacts={purpose:'Fictional civic hackathon demonstration. No government integration or dispatch.',roles:['USER','AGENCY'],support:'Community support measures demand. It does not guarantee approval, priority or completion.',statuses:{submitted:'Awaiting agency review and acceptance; owner may be unassigned.',under_review:'Agency is reviewing the report.',in_progress:'Recorded work is in progress, not completed.',awaiting_citizen_confirmation:'The accepted lead submitted evidence; citizen confirmation is pending.',closed:'Citizen confirmed the resolution.',reopened:'Citizen requested further work with a reason.'},privacy:'Reports are private unless a separate community summary is shared. Precise location and private evidence are not public.',notifications:'In-app updates only; closed-app push is not implemented.'};
export function turnDto(turn:InstanceType<typeof AssistantTurnModel>):AssistantTurn{return{locale:turn.locale as 'ar'|'en',issueId:turn.issueId?String(turn.issueId):undefined,summarize:turn.summarize,id:turn.id,clientId:turn.clientId,text:turn.text??'',reply:turn.reply??'',draft:(turn.draft??null)as AssistantDraft|null,references:turn.references,state:turn.state as AssistantTurn['state'],provider:turn.provider??'',model:turn.model??'',createdAt:turn.createdAt.toISOString()};}
async function factsFor(account:Account,issueId?:string,summarize=false){
  const own=await Incident.find(account.role==='USER'?{userId:account.id}:await agencyCaseFilter(account.agency!.id)).sort({_id:-1}).limit(8).select('title caseNumber status kind agencyId');
  const records=own.map(r=>({reference:r.id,title:r.title,caseNumber:r.caseNumber,status:r.status,kind:r.kind,acceptedAgencyId:r.agencyId?String(r.agencyId):null}));
  let selected:unknown=null;let messages:unknown[]=[];
  if(issueId){const{issue,full}=await issueAccess(issueId,account);selected={reference:issue.id,title:issue.title,status:issue.status,description:full?issue.description:issue.publicSummary,acceptedAgencyId:issue.agencyId?String(issue.agencyId):null};if(summarize){const rows=await IssueMessage.find({issueId,hidden:false}).sort({_id:-1}).limit(40);messages=rows.reverse().map(m=>({text:m.text,role:m.role,date:m.createdAt}));}}
  return{applicationFacts:masarFacts,records,selected,discussion:summarize?{boundedToLatest:40,messages}:null,allowedReferences:[...new Set([...records.map(r=>r.reference),...(issueId?[issueId]:[])])]};
}
export async function assistantReply(config:Config,account:Account,conversationId:string,input:z.infer<typeof assistantSendSchema>){
  ensure(await Conversation.exists({_id:conversationId,userId:account.id}),'Conversation unavailable.',404);
  const digest=payloadDigest({conversationId,...input});let turn=await AssistantTurnModel.findOne({userId:account.id,clientId:input.clientId});
  if(turn){ensure(turn.inputDigest===digest,'Retry differs from the original message.',409);if(turn.state==='succeeded')return turnDto(turn);ensure(turn.state==='failed'||Date.now()-turn.updatedAt.getTime()>config.AI_TIMEOUT_MS+10000,'Reply is still processing. Refresh shortly.',409);const claimed=await AssistantTurnModel.updateOne({_id:turn._id,state:turn.state,updatedAt:turn.updatedAt},{$set:{state:'pending'}});ensure(claimed.modifiedCount===1,'Reply is already processing.',409);}
  else{try{turn=await AssistantTurnModel.create({conversationId,userId:account.id,clientId:input.clientId,text:input.text,locale:input.locale,issueId:input.issueId,summarize:input.summarize,inputDigest:digest,state:'pending'});}catch{ensure(false,'Message already received. Refresh this conversation.',409);}}
  try{
    const context=await factsFor(account,input.issueId,input.summarize);const previous=await AssistantTurnModel.find({conversationId,state:'succeeded',_id:{$lt:turn!._id}}).sort({_id:-1}).limit(12);
    const info=providerInfo(config);let output;
    if(info.provider==='mock'){
      output={reply:input.locale==='ar'?'محاكاة تطوير، وليست استجابة ذكاء اصطناعي حقيقية. راجع الحالة المسجلة والمعلومات أدناه. صف ما حدث والمكان وما إذا كنت تقترح إصلاحًا أو تحسينًا جديدًا.':'Development mock, not real AI. Review the recorded information below. Describe what happened, where, and whether this is a repair or a new improvement.',draft:input.text.length>=15&&!input.summarize?{kind:(/improv|new |need|إضافة|تحسين|نحتاج/.test(input.text)?'improvement':'problem')as 'problem'|'improvement',title:input.text.slice(0,100),description:input.text.slice(0,2000),category:'unsure' as const,missingInformation:[input.locale==='ar'?'تحقق من الموقع والفئة قبل الإرسال.':'Confirm location and category before sending.']}:null,references:context.allowedReferences};
      const selected=context.selected as {title:string;status:string}|null;if(selected)output.reply+='\n'+selected.title+': '+selected.status;
      if(input.summarize)output.reply+='\n'+(input.locale==='ar'?'المحاكاة لا تلخص النقاش. اختر مزودًا حقيقيًا.':'The mock does not summarize discussions. Configure a real provider.');
    }else output=await generateStructured(config,assistantOutputSchema,assistantSystem,{locale:input.locale,...context,conversation:previous.reverse().map(t=>({user:t.text,assistant:t.reply})),untrustedMessage:input.text});
    assistantOutputSchema.parse(output);if(output.references.some(id=>!context.allowedReferences.includes(id)))throw new ProviderError('invalid_output');
    await AssistantTurnModel.updateOne({_id:turn!._id},{$set:{...output,state:'succeeded',provider:info.provider,model:info.model}});await Conversation.updateOne({_id:conversationId,userId:account.id},{$set:{updatedAt:new Date()}});await Conversation.updateOne({_id:conversationId,userId:account.id,title:'Masar conversation'},{$set:{title:input.text.slice(0,60)}});return turnDto((await AssistantTurnModel.findById(turn!._id))!);
  }catch(error){await AssistantTurnModel.updateOne({_id:turn!._id},{$set:{state:'failed'}});throw error;}
}
export function validateTriage(output:unknown,departmentIds:string[],candidateIds:string[],hasImages:boolean):TriageResult{const parsed=triageOutputSchema.parse(output);if(parsed.departmentId&&!departmentIds.includes(parsed.departmentId)||parsed.duplicateIds.some(id=>!candidateIds.includes(id))||!hasImages&&parsed.imageObservations.length)throw new ProviderError('invalid_output');return parsed;}
export function triageDigest(input:{title:string;description:string;category:string;kind?:string;location:unknown;photoIds:string[]}){return payloadDigest({title:input.title,description:input.description,category:input.category,kind:input.kind??'problem',location:input.location,photoIds:input.photoIds});}
export async function triage(config:Config,account:Account,input:z.infer<typeof triageInputSchema>){
  const departments=await Agency.find().select('name nameAr');const lat=input.location.latitude,lon=input.location.longitude;
  // Category + location + recent time bound the candidate set BEFORE the model sees any records.
  const terms=[...new Set((input.title+' '+input.description).match(/[\p{L}\p{N}]{3,}/gu)??[])].filter(word=>!['the','and','that','this','there','with','near','from','need','needs','هذه','هذا','هناك'].includes(word.toLowerCase())).slice(0,8);const relevant=terms.length?{$and:[{$or:[{title:{$regex:terms.join('|'),$options:'i'}},{publicSummary:{$regex:terms.join('|'),$options:'i'}},{userId:account.id,description:{$regex:terms.join('|'),$options:'i'}}]}]}:{};
  const candidates=lat!==undefined&&lon!==undefined?await Incident.find({...relevant,$or:[{userId:account.id},{publicVisibility:true}],category:input.category,latitude:{$gte:lat-.025,$lte:lat+.025},longitude:{$gte:lon-.025,$lte:lon+.025},createdAt:{$gte:new Date(Date.now()-30*86400000)},status:{$ne:'closed'}}).sort({_id:-1}).limit(8):[];
  const bounded=candidates.map(r=>({id:r.id,title:r.title,description:String(r.userId)===account.id?r.description:r.publicSummary}));
  const info=providerInfo(config);const images:{mimeType:string;data:string}[]=[];
  if(input.photoIds.length){const photos=await Photo.find({_id:{$in:input.photoIds},userId:account.id,state:{$ne:'deleting'}});ensure(photos.length===new Set(input.photoIds).size,'Use your own photos.',403);if(info.images&&input.allowExternalImages)for(const photo of photos){ensure(/^[a-f\d-]{36}\.jpg$/i.test(photo.filename),'Photo unavailable.',400);const data=await readFile(resolve(config.UPLOAD_DIR,photo.filename));images.push({mimeType:'image/jpeg',data:data.toString('base64')});}}
  const output=info.provider==='mock'?{title:input.title,description:input.description,category:input.category,urgency:'routine',urgencyReason:'Development mock: no urgency inference performed. Staff review required.',departmentId:null,missingInformation:[],imageObservations:[],duplicateIds:[]}:await generateStructured(config,triageOutputSchema,assistantSystem,{task:'Suggest triage. urgency is non-emergency advisory only; routine, soon, or prompt_review. Staff decides. Do not equate support votes with urgency.',locale:input.locale,untrustedReport:input,departments:departments.map(a=>({id:a.id,name:a.name,nameAr:a.nameAr})),boundedCandidates:bounded,imagesProvided:images.length>0},images);
  const result=validateTriage(output,departments.map(a=>a.id),candidates.map(r=>r.id),images.length>0);const saved=await TriageAnalysis.create({userId:account.id,provider:info.provider,model:info.model,result,sourceDigest:triageDigest(input)});
  return{id:saved.id,result,provider:info.provider,label:info.label,model:info.model,imagesInspected:images.length>0,departments:departments.map(a=>({id:a.id,name:a.name,nameAr:a.nameAr})),candidates:bounded.map(r=>({id:r.id,title:r.title}))};
}
