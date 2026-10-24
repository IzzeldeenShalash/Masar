import {useReducedMotion} from '../../src/accessibility/hooks';
import React from 'react';
import {Stack} from 'expo-router';
export default function UserStack(){const reduced=useReducedMotion();return <Stack screenOptions={{headerShown:false,animation:reduced?'none':'fade'}}/>;}
