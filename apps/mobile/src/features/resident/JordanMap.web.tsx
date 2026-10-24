import {useScreenFocus} from './data';
import React, { useEffect, useRef, useState } from 'react';
import { mapHtml } from './map-html';
import { mapPayload, readMapMessage, type MapProps } from './map-contract';
import { useLocale } from '../../i18n/LocaleProvider';
export default function JordanMap(props: MapProps) {
  const focused=useScreenFocus(); const { locale } = useLocale(); const [revision, setRevision] = useState(0); const frame=useRef<HTMLIFrameElement>(null); const first=useRef(props);
  const html=React.useMemo(()=>mapHtml(first.current,locale),[locale]);
  const payload=mapPayload(props,locale);
  const sync=()=>frame.current?.contentWindow?.postMessage(JSON.stringify({source:'masar-update',payload:JSON.parse(payload)}),'*');
  useEffect(sync,[payload]);
  useEffect(()=>{const listener=(event:MessageEvent)=>{if(event.source===frame.current?.contentWindow&&typeof event.data==='string')readMapMessage(event.data,props);};window.addEventListener('message',listener);return()=>window.removeEventListener('message',listener);},[props]);
  if(!focused)return <div style={{flex:1}}/>;
  return <div style={{flex:1,width:'100%',height:'100%',minHeight:props.interactive===false?70:100,pointerEvents:props.interactive===false?'none':'auto',position:'relative'}}><iframe key={revision} ref={frame} onLoad={sync} title={locale==='ar'?'خريطة الأردن':'Jordan map'} sandbox="allow-scripts allow-popups" srcDoc={html} style={{width:'100%',height:'100%',border:0,borderRadius:18}}/>{props.interactive!==false&&<button aria-label={locale==='ar'?'إعادة تحميل الخريطة':'Reload map'} onClick={()=>setRevision(v=>v+1)} style={{position:'absolute',top:8,right:8,width:44,height:44,border:0,borderRadius:12,color:'#087F82',background:'white',fontSize:24,cursor:'pointer'}}>↻</button>}</div>;
}
