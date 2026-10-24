import {useEffect,useState} from 'react';
import {AccessibilityInfo,Platform} from 'react-native';
export function useReducedMotion(){const [reduced,setReduced]=useState(true);useEffect(()=>{let active=true;void AccessibilityInfo.isReduceMotionEnabled().then(value=>{if(active)setReduced(value);}).catch(()=>undefined);const event=AccessibilityInfo.addEventListener('reduceMotionChanged',setReduced);return()=>{active=false;event.remove();};},[]);return reduced;}
export function focusStyle(focused:boolean){return Platform.OS==='web'&&focused?{outlineWidth:2,outlineColor:'#142B38',outlineOffset:3}:undefined;}
