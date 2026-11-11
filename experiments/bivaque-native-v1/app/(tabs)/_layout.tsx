import React from 'react';
import {Tabs} from 'expo-router';
import {Ionicons} from '@expo/vector-icons';
import {C} from '../../src/theme';
const tabs=[{name:'index',title:'Início',icon:'home-outline',active:'home'},{name:'comunidade',title:'Comunidade',icon:'people-outline',active:'people'},{name:'mercado',title:'Mercado',icon:'bag-outline',active:'bag'},{name:'voce',title:'Você',icon:'person-outline',active:'person'}] as const;
export default function TabLayout(){return <Tabs screenOptions={{headerShown:false,tabBarHideOnKeyboard:true,tabBarActiveTintColor:C.deep,tabBarInactiveTintColor:'#7a8589',tabBarStyle:{backgroundColor:C.paper,borderTopColor:C.line,borderTopWidth:1,height:65,paddingTop:8,paddingBottom:5},tabBarLabelStyle:{fontSize:11,fontWeight:'700',marginTop:1}}}>{tabs.map(tab=><Tabs.Screen key={tab.name} name={tab.name} options={{title:tab.title,tabBarIcon:({color,size,focused})=><Ionicons name={focused?tab.active:tab.icon} color={color} size={size??23}/>}}/>)}</Tabs>}
