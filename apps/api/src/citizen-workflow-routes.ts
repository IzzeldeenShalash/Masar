import type { Express } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { Incident, ResidentNotificationModel } from './resident-db';
import { claimEvidence, ensure, eventId, notifyAgency, WorkflowError } from './workflow';
const id=z.string().regex(/^[a-f\d]{24}$/i);
export function registerCitizenWorkflow(app:Express){
  app.get('/resident/notifications',async(req,res)=>{const items=await ResidentNotificationModel.find({userId:req.account!.id,agencyId:null}).sort({createdAt:-1}).limit(100);res.json({items:items.map(n=>({id:n.id,title:n.title,titleAr:n.titleAr,body:n.body,bodyAr:n.bodyAr,date:n.createdAt,read:n.read,reportId:n.reportId?.toString()??null,alertId:n.alertId?.toString()??null}))});});
  for(const route of ['action','respond'] as const)app.post(`/resident/reports/:id/${route}`,async(req,res)=>{
    const actionSchema=z.object({action:z.enum(['confirm','reopen']),reason:z.string().trim().min(5).max(500)}).strict();const responseSchema=z.object({message:z.string().trim().min(5).max(2000),photoIds:z.array(id).max(3)}).strict();
    const parsed=route==='action'?actionSchema.safeParse(req.body):responseSchema.safeParse(req.body);if(!parsed.success||!id.safeParse(req.params.id).success)return res.status(400).json({error:{code:'VALIDATION',message:'Check your response.'}});
    const session=await mongoose.startSession();
    try{await session.withTransaction(async()=>{
      const report=await Incident.findOne({_id:req.params.id,userId:req.account!.id}).session(session);ensure(report,'Case unavailable.',404);const key=eventId();let message:string,messageAr:string,type:string;
      if(route==='action'){
        const data=actionSchema.parse(req.body);ensure(data.action==='confirm'?report.status==='awaiting_citizen_confirmation':['closed','awaiting_citizen_confirmation'].includes(report.status));report.status=data.action==='confirm'?'closed':'reopened';message=`Citizen ${data.action==='confirm'?'confirmed resolution':'reopened report'}: ${data.reason}`;messageAr=`${data.action==='confirm'?'أكد المواطن الحل':'أعاد المواطن فتح البلاغ'}: ${data.reason}`;type=data.action==='confirm'?'closed':'reopened';
      }else{const data=responseSchema.parse(req.body);ensure(report.citizenRequest?.awaiting,'There is no pending information request.');await claimEvidence(data.photoIds,req.account!.id,null,report._id,session);report.citizenRequest.awaiting=false;message=`Citizen response: ${data.message}`;messageAr=`رد المواطن: ${data.message}`;type='citizen_response';}
      const evidence=route==='respond'?responseSchema.parse(req.body).photoIds:[];report.history.push({message,messageAr,type,actor:req.account!.displayName,photoIds:evidence,visibility:'reporter',date:new Date(),metadata:{actorUserId:req.account!.id,eventId:key}});report.workflowVersion+=1;report.waitingSince=new Date();await report.save({session});
      if(report.agencyId)await notifyAgency(report.agencyId,report._id,key,message,messageAr,session);
    });res.json({saved:true});}catch(error){if(error instanceof WorkflowError)return res.status(error.status).json({error:{code:error.status===404?'FORBIDDEN':'VALIDATION',message:error.message}});throw error;}finally{await session.endSession();}
  });
}
