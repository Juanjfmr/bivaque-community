import React, {useEffect} from 'react';
import {Platform, Pressable, ScrollView, StyleSheet, Text, View, Modal} from 'react-native';
import Animated, {FadeIn, SlideInDown, useAnimatedStyle, useSharedValue, withSpring, runOnJS} from 'react-native-reanimated';
import {GestureDetector, usePanGesture} from 'react-native-gesture-handler';
import {Ionicons} from '@expo/vector-icons';
import {C} from './theme';
export type IconName=React.ComponentProps<typeof Ionicons>['name'];
export const I=({name,size=20,color=C.ink}:{name:IconName;size?:number;color?:string})=><Ionicons name={name} size={size} color={color}/>;
export function Hit({children,onPress,style,accessibilityLabel,disabled=false}:React.PropsWithChildren<{onPress:()=>void;style?:any;accessibilityLabel?:string;disabled?:boolean}>) {
 const scale=useSharedValue(1);
 const anim=useAnimatedStyle(()=>({transform:[{scale:scale.value}]}));
 return <Animated.View style={anim}><Pressable disabled={disabled} onPress={onPress} onPressIn={()=>{scale.value=withSpring(.975)}} onPressOut={()=>{scale.value=withSpring(1)}} accessibilityRole="button" accessibilityLabel={accessibilityLabel} style={style}>{children}</Pressable></Animated.View>;
}
export const Eyebrow=({children,color=C.muted}:React.PropsWithChildren<{color?:string}>)=><Text style={{fontSize:10,fontWeight:'800',letterSpacing:1.5,color,textTransform:'uppercase'}}>{children}</Text>;
export function Heading({children,aside,onAside}:React.PropsWithChildren<{aside?:string;onAside?:()=>void}>) {
 return <View style={st.sectionHead}><Text style={st.sectionTitle}>{children}</Text>{aside&&<Pressable onPress={onAside} style={st.more}><Text style={st.moreText}>{aside}</Text><I name="arrow-forward" color={C.quiet} size={15}/></Pressable>}</View>;
}
export function Solid({children,onPress,secondary=false,light=false,disabled=false}:React.PropsWithChildren<{onPress:()=>void;secondary?:boolean;light?:boolean;disabled?:boolean}>) {
 return <Hit onPress={onPress} disabled={disabled} style={[st.solid,secondary&&st.outline,light&&{backgroundColor:C.brasa},disabled&&{opacity:.4}]}><Text style={[st.solidText,secondary&&{color:C.dark}]}>{children}</Text><I name="arrow-forward" color={secondary?C.dark:C.white} size={18}/></Hit>;
}
export function Pill({text,active,onPress,small=false}:{text:string;active?:boolean;onPress:()=>void;small?:boolean}){
 return <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{selected:!!active}} style={[st.pill,active&&st.pillActive,small&&{paddingHorizontal:12,paddingVertical:7}]}><Text style={[st.pillText,active&&{color:C.white}]}>{text}</Text></Pressable>;
}
export function Pills({items,value,onChange}:{items:string[];value:string;onChange:(x:string)=>void}){
 return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:8,paddingVertical:3,paddingRight:22}}>{items.map(x=><Pill key={x} text={x} active={x===value} onPress={()=>onChange(x)}/>)}</ScrollView>;
}
export function NavBack({title,onBack,action,actionIcon}:{title:string;onBack:()=>void;action?:()=>void;actionIcon?:IconName}){
 return <View style={st.navBack}><Pressable accessibilityLabel="Voltar" onPress={onBack} style={st.iconAction}><I name="arrow-back" color={C.ink} size={23}/></Pressable><Text numberOfLines={1} style={st.navTitle}>{title}</Text>{action?<Pressable onPress={action} style={st.iconAction}><I name={actionIcon||'ellipsis-horizontal'} size={24}/></Pressable>:<View style={{width:44}}/>}</View>;
}
export function Empty({title,subtitle,icon='file-tray-outline',onAction,action}:{title:string;subtitle:string;icon?:IconName;onAction?:()=>void;action?:string}){
 return <View style={st.empty}><View style={st.emptyIcon}><I name={icon} size={31} color={C.green}/></View><Text style={st.emptyTitle}>{title}</Text><Text style={st.emptyCopy}>{subtitle}</Text>{onAction&&<Pressable style={st.emptyAction} onPress={onAction}><Text style={st.emptyLink}>{action||'Explorar'}</Text><I name="arrow-forward" size={16} color={C.dark}/></Pressable>}</View>;
}
export function Tile({icon,title,description,onPress,tint=C.sage}:{icon:IconName;title:string;description:string;onPress:()=>void;tint?:string}){
 return <Hit onPress={onPress} style={st.tile}><View style={[st.tileIcon,{backgroundColor:tint}]}><I name={icon} size={24} color={C.dark}/></View><Text style={st.tileTitle}>{title}</Text><Text style={st.tileDesc}>{description}</Text></Hit>;
}
export function Sheet({visible,onClose,title,children}:{visible:boolean;onClose:()=>void;title?:string;children:React.ReactNode}){
 const y=useSharedValue(0);
 const pan=usePanGesture({
  activeOffsetY:[-12,12],
  onUpdate:e=>{y.value=Math.max(0,e.translationY)},
  onDeactivate:e=>{if(e.translationY>95||e.velocityY>900){runOnJS(onClose)()}y.value=withSpring(0,{damping:19})}
 });
 const movement=useAnimatedStyle(()=>({transform:[{translateY:y.value}]}));
 useEffect(()=>{if(visible)y.value=0},[visible]);
 return <Modal visible={visible} transparent animationType="fade" statusBarTranslucent={Platform.OS==='android'} onRequestClose={onClose}>
 <View style={st.modal}><Pressable style={st.scrim} onPress={onClose}/><Animated.View entering={SlideInDown.duration(280)} style={[st.sheet,movement]}><GestureDetector gesture={pan}><Animated.View style={st.handleArea}><View style={st.handle}/></Animated.View></GestureDetector>{title&&<View style={st.sheetHead}><Text style={st.sheetHeadText}>{title}</Text><Pressable onPress={onClose} accessibilityLabel="Fechar" style={st.iconAction}><I name="close" size={23}/></Pressable></View>}<ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={st.sheetContent}>{children}</ScrollView></Animated.View></View>
 </Modal>;
}
export function SwipeRow({children,onLeft,onRight}:{children:React.ReactNode;onLeft?:()=>void;onRight?:()=>void}){
 const x=useSharedValue(0);
 const pan=usePanGesture({
  activeOffsetX:[-20,20],
  onUpdate:e=>{x.value=Math.max(-100,Math.min(100,e.translationX))},
  onDeactivate:e=>{
    if(e.translationX>85&&onLeft)runOnJS(onLeft)();
    if(e.translationX< -85&&onRight)runOnJS(onRight)();
    x.value=withSpring(0,{damping:19});
  },
 });
 const style=useAnimatedStyle(()=>({transform:[{translateX:x.value}]}));
 return <View style={st.swipe}><View style={st.swipeBase}><Text style={{color:C.white,fontSize:11,fontWeight:'800'}}>SALVAR</Text><Text style={{color:C.white,fontSize:11,fontWeight:'800'}}>OCULTAR</Text></View><GestureDetector gesture={pan}><Animated.View style={[{backgroundColor:C.white},style]}>{children}</Animated.View></GestureDetector></View>;
}
export const st=StyleSheet.create({
 sectionHead:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginTop:27,marginBottom:12},sectionTitle:{fontSize:20,fontWeight:'800',letterSpacing:-.55,color:C.ink,flexShrink:1},more:{flexDirection:'row',alignItems:'center',gap:6,paddingVertical:6},moreText:{fontSize:12,fontWeight:'700',color:C.quiet},
 solid:{minHeight:52,borderRadius:15,paddingHorizontal:19,paddingVertical:14,backgroundColor:C.dark,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},solidText:{color:C.white,fontWeight:'800',fontSize:14},outline:{backgroundColor:C.white,borderColor:C.dark,borderWidth:1},
 pill:{borderRadius:100,paddingVertical:10,paddingHorizontal:16,backgroundColor:C.white,borderColor:C.line,borderWidth:1},pillActive:{backgroundColor:C.dark,borderColor:C.dark},pillText:{fontSize:12,color:C.quiet,fontWeight:'700'},
 navBack:{height:57,flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:14,borderBottomWidth:1,borderColor:C.line,backgroundColor:C.paper},navTitle:{fontSize:15,fontWeight:'800',color:C.ink,flex:1,textAlign:'center'},iconAction:{width:44,height:44,alignItems:'center',justifyContent:'center'},
 empty:{alignItems:'center',justifyContent:'center',paddingVertical:46,paddingHorizontal:27},emptyIcon:{width:74,height:74,borderRadius:38,backgroundColor:C.sage,alignItems:'center',justifyContent:'center',marginBottom:17},emptyTitle:{color:C.ink,fontWeight:'800',fontSize:17,textAlign:'center'},emptyCopy:{fontSize:13,color:C.quiet,textAlign:'center',lineHeight:19,marginTop:8},emptyAction:{flexDirection:'row',gap:8,alignItems:'center',padding:12,marginTop:14},emptyLink:{fontWeight:'800',fontSize:13,color:C.dark},
 tile:{width:143,minHeight:151,backgroundColor:C.white,borderWidth:1,borderColor:C.line,borderRadius:17,padding:14},tileIcon:{width:51,height:51,borderRadius:14,alignItems:'center',justifyContent:'center',marginBottom:15},tileTitle:{fontSize:14,fontWeight:'800',color:C.ink},tileDesc:{fontSize:11,color:C.muted,marginTop:5},
 modal:{flex:1,justifyContent:'flex-end',alignItems:'center'},scrim:{...StyleSheet.absoluteFillObject,backgroundColor:'rgba(17,28,23,0.6)'},sheet:{maxHeight:'90%',minHeight:220,width:'100%',maxWidth:540,backgroundColor:C.paper,borderTopLeftRadius:25,borderTopRightRadius:25,overflow:'hidden',paddingBottom:Platform.OS==='web'?14:22},handleArea:{height:32,alignItems:'center',justifyContent:'center'},handle:{width:43,height:5,borderRadius:8,backgroundColor:'#B9C3BB'},sheetHead:{paddingHorizontal:21,paddingBottom:8,flexDirection:'row',justifyContent:'space-between',alignItems:'center'},sheetHeadText:{fontSize:16,color:C.ink,fontWeight:'800'},sheetContent:{paddingHorizontal:23,paddingBottom:35},
 swipe:{position:'relative',overflow:'hidden',borderBottomWidth:1,borderColor:C.line},swipeBase:{position:'absolute',top:0,bottom:0,left:0,right:0,paddingHorizontal:17,flexDirection:'row',alignItems:'center',justifyContent:'space-between',backgroundColor:C.green}
});
