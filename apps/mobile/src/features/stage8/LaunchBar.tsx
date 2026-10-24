import React from 'react';
import {View,Pressable,Text} from 'react-native';
import {router} from 'expo-router';
import {Ionicons} from '@expo/vector-icons';
import {useAuth} from '../../auth/AuthProvider';
import {useLocale} from '../../i18n/LocaleProvider';
import {assistantPath} from './navigation';
export function LaunchBar(){const {user}=useAuth();const {locale}=useLocale();const ar=locale==='ar',agency=user?.role==='AGENCY';return <View style={{flexDirection:'row',gap:8,paddingVertical:3}}>{[{label:ar?'اسأل مسار':'Ask Masar',icon:'sparkles-outline',action:()=>router.push(assistantPath(agency))},{label:ar?'طلبات المجتمع':'Community requests',icon:'people-outline',action:()=>router.push(agency?'/agency-community':'/community-requests')}] .map(item=><Pressable key={item.label} accessibilityRole="button" onPress={item.action} style={({pressed})=>({flex:1,minHeight:46,borderRadius:14,borderWidth:1,borderColor:'#809496',flexDirection:'row',gap:8,justifyContent:'center',alignItems:'center',backgroundColor:pressed?'#E1F1EC':'#FFF'})}><Ionicons name={item.icon as 'sparkles-outline'|'people-outline'} size={19} color="#00676E"/><Text style={{fontSize:13,color:'#00676E',fontWeight:'600'}}>{item.label}</Text></Pressable>)}</View>;}
