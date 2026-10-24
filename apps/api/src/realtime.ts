import type {Server as HttpServer} from 'node:http';
import {Server} from 'socket.io';
import type {Account} from '@masar/shared';
import type {Config} from './config';
import {Session,User,Agency} from './db';
import {SocketTicket} from './stage8-db';
import {ResidentNotificationModel} from './resident-db';
import {digest} from './security';
import {issueAccess,issueEvents,saveMessage,safeFailure,validId,notifyStatusFollowers} from './community-service';
async function sessionAccount(sessionId:string):Promise<Account|null>{const session=await Session.findOne({_id:sessionId,expiresAt:{$gt:new Date()}});if(!session)return null;const user=await User.findById(session.userId);if(!user)return null;const ids=[user.agencyId,...user.agencyIds].filter(Boolean).map(String);const agencies=await Agency.find({_id:{$in:ids}});const active=agencies.find(a=>a.id===String(session.activeAgencyId??user.agencyId));if(user.role==='AGENCY'&&!active)return null;return{id:user.id,email:user.email,displayName:user.displayName,role:user.role as Account['role'],agency:active?{id:active.id,name:active.name,nameAr:active.nameAr}:null,agencies:agencies.map(a=>({id:a.id,name:a.name,nameAr:a.nameAr}))};}
export function attachRealtime(server:HttpServer,config:Config){
  const origins=config.WEB_ORIGINS.split(',');const io=new Server(server,{maxHttpBufferSize:16000,cors:{origin:origins,credentials:true},allowRequest:(req,done)=>done(null,!req.headers.origin||origins.includes(req.headers.origin))});
  io.use(async(socket,next)=>{try{const token=socket.handshake.auth?.ticket;if(typeof token!=='string'||token.length>256)throw new Error();const ticket=await SocketTicket.findOneAndDelete({digest:digest(token),expiresAt:{$gt:new Date()}});if(!ticket||!await sessionAccount(String(ticket.sessionId)))throw new Error();socket.data.sessionId=String(ticket.sessionId);socket.data.issues=new Set<string>();next();}catch{next(new Error('Unauthorized'));}});
  io.on('connection',socket=>{
    let joins=0;const account=async()=>{const current=await sessionAccount(socket.data.sessionId);if(!current){socket.disconnect(true);throw new Error('Session expired');}return current;};
    socket.on('thread:join',async(body,ack)=>{if(typeof ack!=='function')return;try{if(++joins>60||!validId(body?.issueId)||socket.data.issues.size>=5)throw new Error();await issueAccess(body.issueId,await account());socket.data.issues.add(body.issueId);ack({ok:true});}catch{ack({ok:false,error:'Issue unavailable.'});}});
    socket.on('thread:leave',body=>{if(validId(body?.issueId))socket.data.issues.delete(body.issueId);});
    socket.on('thread:send',async(body,ack)=>{if(typeof ack!=='function')return;try{if(!validId(body?.issueId)||!socket.data.issues.has(body.issueId))throw new Error();const message=await saveMessage(body.issueId,await account(),body.message);ack({ok:true,message});}catch(error){ack({ok:false,error:safeFailure(error).message});}});
  });
  // No private payload is placed in a broad room. Recheck each recipient, including revoked sessions and changed visibility.
  const broadcast=async(issueId:string,kind:string)=>{if(kind==='status')await notifyStatusFollowers(issueId);for(const socket of io.sockets.sockets.values()){try{const account=await sessionAccount(socket.data.sessionId);if(!account){socket.disconnect(true);continue;}await issueAccess(issueId,account);if(await ResidentNotificationModel.exists({userId:account.id,threadId:issueId}))socket.emit('notifications:changed');if(socket.data.issues?.has(issueId))socket.emit('issue:changed',{issueId,kind});}catch{socket.data.issues.delete(issueId);}}};
  const listener=(id:string,kind:string)=>{void broadcast(id,kind).catch(()=>undefined);};issueEvents.on('change',listener);
  server.once('close',()=>issueEvents.off('change',listener));return io;
}
