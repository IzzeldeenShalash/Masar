import {useEffect,useRef,useState} from 'react';
import {io,type Socket} from 'socket.io-client';
import {apiUrl,request} from '../../api/client';
import {useAuth} from '../../auth/AuthProvider';
import {useScreenFocus} from '../resident/data';
export function useIssueLive(issueId:string,onChange:(kind:string)=>void){const {user}=useAuth();const focused=useScreenFocus();const callback=useRef(onChange);callback.current=onChange;const [state,setState]=useState<'connecting'|'live'|'offline'>('connecting');
  useEffect(()=>{if(!focused||!issueId)return;let stopped=false;let socket:Socket|undefined,timer:ReturnType<typeof setTimeout>;let attempts=0;const retry=()=>{if(stopped)return;setState('offline');timer=setTimeout(()=>void connect(),Math.min(15000,1000*2**Math.min(attempts++,4)));};
    async function connect(){if(stopped)return;setState('connecting');try{const {ticket}=await request<{ticket:string}>('/realtime/ticket','POST',{});if(stopped)return;socket=io(apiUrl,{auth:{ticket},withCredentials:true,reconnection:false,timeout:7000,transports:['websocket']});socket.on('connect',()=>{socket?.emit('thread:join',{issueId},(ack:{ok:boolean})=>{if(stopped)return;if(ack.ok){attempts=0;setState('live');callback.current('reconnect');}else{socket?.disconnect();retry();}});});socket.on('issue:changed',(event:{issueId:string;kind:string})=>{if(event.issueId===issueId)callback.current(event.kind);});socket.on('connect_error',()=>{socket?.removeAllListeners();socket?.disconnect();retry();});socket.on('disconnect',()=>{socket?.removeAllListeners();retry();});}catch{retry();}}
    void connect();return()=>{stopped=true;clearTimeout(timer);socket?.removeAllListeners();socket?.disconnect();};
  },[focused,issueId,user?.id,user?.agency?.id]);return state;}
