import {useReducedMotion} from '../../src/accessibility/hooks';
import React from 'react';
import {Stack} from 'expo-router';
import {View,useWindowDimensions} from 'react-native';
import {AgencySidebar} from '../../src/features/landing/AgencySidebar';
import {useLocale} from '../../src/i18n/LocaleProvider';
export default function AgencyStack(){const reduced=useReducedMotion();const {width}=useWindowDimensions();const {locale}=useLocale();return <View style={{flex:1,direction:'ltr',flexDirection:locale==='ar'?'row-reverse':'row',backgroundColor:'#F6F7F4'}}>{width>=1000&&<AgencySidebar/>}<View style={{flex:1,minWidth:0}}><Stack screenOptions={{headerShown:false,animation:reduced?'none':'fade'}}/></View></View>;}
