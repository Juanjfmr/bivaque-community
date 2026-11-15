import React from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import {C} from './theme';
import type {Event,Group,Listing,Provider,Question} from './data';
import {Eyebrow,Hit,I,SwipeRow} from './ui';
export const money=(n:number)=>'R$ '+Math.round(n).toLocaleString('pt-BR');
export function Avatar({name,size=35,color=C.sage}:{name:string;size?:number;color?:string}){
 return <View style={{width:size,height:size,borderRadius:size/2,backgroundColor:color,alignItems:'center',justifyContent:'center'}}><Text style={{color:C.dark,fontSize:size*.36,fontWeight:'800'}}>{name.slice(0,1).toUpperCase()}</Text></View>;
}
export function QuestionRow({item,onOpen,onSave,onHide,saved=false}:{item:Question;onOpen:()=>void;onSave:()=>void;onHide:()=>void;saved?:boolean}){
 return <SwipeRow onLeft={onSave} onRight={onHide}><View style={st.question}>
 <Hit onPress={onOpen} style={{flex:1}}>
 <View style={st.row}><View style={[st.dot,{backgroundColor:item.resolved?C.good:C.brasa}]}/><Eyebrow>{item.resolved?'RESOLVIDA':item.category==='Serviços'?'PEDIU INDICAÇÃO':item.category}</Eyebrow></View>
 <Text style={st.qTitle}>{item.title}</Text>
 <View style={[st.row,{marginTop:10}]}><Avatar name={item.author} size={26}/><Text style={st.author}>{item.author}</Text><Text numberOfLines={1} style={st.dim}>· {item.neighborhood} · {item.ago}</Text></View>
 <View style={[st.row,{marginTop:12}]}><I name="chatbubble-outline" size={15} color={C.muted}/><Text style={st.dim}>{item.replies} respostas</Text><I name="thumbs-up-outline" size={14} color={C.muted}/><Text style={st.dim}>{item.useful} úteis</Text></View>
 </Hit><Pressable accessibilityLabel="Salvar pergunta" style={st.bookmark} onPress={onSave}><I name={saved?'bookmark':'bookmark-outline'} size={21} color={saved?C.brasa:C.muted}/></Pressable></View></SwipeRow>;
}
export function Illustration({kind,color,large=false}:{kind:'imovel'|'desapego';color:string;large?:boolean}){
 return <View style={{height:large?230:135,backgroundColor:color,overflow:'hidden',justifyContent:'flex-end',padding:18,position:'relative'}}>
 {kind==='imovel'?<><View style={{position:'absolute',height:large?188:112,width:large?187:113,right:large?41:25,bottom:0,backgroundColor:'#A6B7A5',borderTopLeftRadius:11}}/><View style={{position:'absolute',height:large?160:90,width:large?130:81,right:large?100:51,bottom:0,backgroundColor:'#F0EDE5',borderTopLeftRadius:5}}/>
 {Array.from({length:6}).map((_,i)=><View key={i} style={{position:'absolute',height:large?23:15,width:large?24:15,right:(large?153:91)-(i%2)*(large?43:28),bottom:(large?123:72)-Math.floor(i/2)*(large?34:20),backgroundColor:'#8AABAB',borderColor:'#D9E2DC',borderWidth:2}}/>)}</>:<><View style={{position:'absolute',height:large?113:70,width:large?175:99,right:large?65:32,bottom:large?43:20,backgroundColor:'#A79783',borderRadius:15,transform:[{rotate:'-13deg'}]}}/><View style={{position:'absolute',height:large?55:31,width:large?130:75,right:large?85:49,bottom:large?91:60,backgroundColor:'#F1EBE0',borderRadius:7,transform:[{rotate:'-13deg'}]}}/></>}
 <View style={{backgroundColor:'#FFFFFFDC',alignSelf:'flex-start',paddingHorizontal:9,paddingVertical:6,borderRadius:8}}><Text style={{fontSize:10,fontWeight:'800',color:C.dark}}>{kind==='imovel'?'MORADIA':'DESAPEGO'} · DEMO</Text></View></View>;
}
export function ListingCard({item,onOpen,onSave,saved=false,wide=false}:{item:Listing;onOpen:()=>void;onSave:()=>void;saved?:boolean;wide?:boolean}){
 return <View style={[st.listing,{width:wide?'100%':252}]}><Hit onPress={onOpen}><Illustration kind={item.type} color={item.palette}/><View style={st.listingBody}>
 <Text numberOfLines={2} style={st.listingTitle}>{item.title}</Text><Text style={st.listingPrice}>{money(item.price)}<Text style={{fontSize:12,fontWeight:'500',color:C.quiet}}>{item.type==='imovel'?'/mês':''}</Text></Text>
 <Text style={st.listingMeta}>{item.type==='imovel'?String(item.rooms||'?')+' quartos  ·  '+String(item.area||'?')+' m²  ·  '+String(item.parking||0)+' vagas':item.kind+' · usado'}</Text>
 <View style={st.row}><I name="location-outline" size={13} color={C.muted}/><Text style={st.dim}>{item.region} · Manaus</Text></View></View></Hit>
 <Pressable accessibilityLabel="Salvar anúncio" style={st.cornerSave} onPress={onSave}><I name={saved?'bookmark':'bookmark-outline'} color={saved?C.brasa:C.dark} size={20}/></Pressable></View>;
}
export function ProviderCard({item,onOpen}:{item:Provider;onOpen:()=>void}){
 return <Hit onPress={onOpen} style={st.provider}><View style={[st.providerArt,{backgroundColor:item.palette}]}><Avatar name={item.name} size={62} color="#FFFFFF88"/><View style={st.providerStamp}><I name="thumbs-up" size={12} color={C.dark}/><Text style={st.providerStampText}>{item.references} indicações</Text></View></View>
 <View style={{padding:14}}><Text style={st.providerName}>{item.name} {item.verified?'✓':''}</Text><Text style={st.providerSpec}>{item.specialty}</Text><View style={[st.row,{marginTop:8}]}><I name="location-outline" size={13} color={C.muted}/><Text style={st.dim}>{item.neighborhood}</Text></View></View></Hit>;
}
export function GroupCard({item,onOpen,joined=false}:{item:Group;onOpen:()=>void;joined?:boolean}){
 return <Hit onPress={onOpen} style={st.group}><View style={[st.groupCover,{backgroundColor:item.cover}]}><Eyebrow color="#DFE8DB">{item.topic}</Eyebrow><I name={item.title.includes('Corrida')?'walk-outline':'people-outline'} size={45} color="#FFFFFFA6"/></View>
 <View style={{padding:15}}><Text style={st.groupTitle}>{item.title}</Text><Text style={st.groupSub}>{item.members+(joined?1:0)} participantes · {item.private?'Fechado':'Aberto'}</Text><Text numberOfLines={2} style={st.groupRecent}>{item.recent}</Text></View></Hit>;
}
export function EventRow({item,onOpen,going}:{item:Event;onOpen:()=>void;going:boolean}){
 return <Hit onPress={onOpen} style={st.event}><View style={st.eventDate}><Text style={st.eventMonth}>{item.month}</Text><Text style={st.eventDay}>{item.day}</Text></View><View style={{flex:1}}><Text style={st.eventTitle}>{item.title}</Text><Text style={st.eventInfo}>{item.time} · {item.place}</Text><Text style={st.eventCount}>{item.going+(going?1:0)} / {item.capacity} vão {going?'· Você confirmou':''}</Text></View><I name="arrow-forward" color={C.muted} size={17}/></Hit>;
}
const st=StyleSheet.create({
 row:{flexDirection:'row',alignItems:'center',gap:6},question:{padding:17,paddingRight:11,flexDirection:'row',backgroundColor:C.white},dot:{width:7,height:7,borderRadius:7},qTitle:{fontSize:16,lineHeight:23,fontWeight:'800',letterSpacing:-.25,color:C.ink,marginTop:10},author:{fontSize:11,color:C.ink,fontWeight:'700'},dim:{fontSize:11,color:C.muted,flexShrink:1},bookmark:{width:31,height:40,alignItems:'flex-end',paddingTop:3},
 listing:{backgroundColor:C.white,borderWidth:1,borderColor:C.line,borderRadius:16,overflow:'hidden'},listingBody:{padding:14,minHeight:124},listingTitle:{fontSize:14,fontWeight:'800',color:C.ink,lineHeight:19,marginBottom:7},listingPrice:{fontSize:20,fontWeight:'800',color:C.dark},listingMeta:{fontSize:11,color:C.quiet,marginBottom:10,marginTop:4},cornerSave:{position:'absolute',top:9,right:9,backgroundColor:'#FFFFFFEE',borderRadius:30,width:36,height:36,alignItems:'center',justifyContent:'center'},
 provider:{width:197,backgroundColor:C.white,borderWidth:1,borderColor:C.line,borderRadius:16,overflow:'hidden'},providerArt:{height:117,alignItems:'flex-start',justifyContent:'center',padding:14,position:'relative'},providerStamp:{position:'absolute',bottom:12,right:10,flexDirection:'row',gap:4,alignItems:'center',backgroundColor:'#FFFFFFDB',borderRadius:9,padding:7},providerStampText:{fontSize:10,fontWeight:'800',color:C.dark},providerName:{fontSize:15,fontWeight:'800',color:C.ink},providerSpec:{fontSize:12,color:C.quiet,marginTop:4},
 group:{backgroundColor:C.white,width:218,borderRadius:16,overflow:'hidden',borderWidth:1,borderColor:C.line},groupCover:{height:120,padding:17,alignItems:'flex-start',justifyContent:'space-between'},groupTitle:{fontSize:16,fontWeight:'800',color:C.ink},groupSub:{fontSize:11,color:C.quiet,marginTop:5},groupRecent:{fontSize:11,color:C.muted,marginTop:12,lineHeight:16},
 event:{flexDirection:'row',alignItems:'center',gap:14,padding:14,backgroundColor:C.white,borderBottomWidth:1,borderColor:C.line},eventDate:{width:57,height:67,backgroundColor:C.sage,borderRadius:12,alignItems:'center',justifyContent:'center'},eventMonth:{fontSize:10,fontWeight:'800',letterSpacing:1,color:C.green},eventDay:{fontSize:25,fontWeight:'800',color:C.dark},eventTitle:{fontSize:14,color:C.ink,fontWeight:'800',lineHeight:19},eventInfo:{fontSize:11,color:C.quiet,marginTop:4},eventCount:{fontSize:11,color:C.green,fontWeight:'700',marginTop:8}
});
