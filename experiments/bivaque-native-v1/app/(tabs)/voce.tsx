import React from 'react';
import {Alert,Pressable,ScrollView,Text,View} from 'react-native';
import {router} from 'expo-router';
import {C,serif} from '../../src/theme';
import {useStore} from '../../src/store';
import {groups} from '../../src/content';
import {Body,Eyebrow,H,Icon,Line,QuestionRow,Wrap} from '../../src/ui';
export default function You(){const {state,reset}=useStore();const myQuestions=state.questions.filter(q=>q.isMine);const myListings=state.listings.filter(x=>x.isMine);const items:[string,string,string,()=>void][]=[
 ['heart-outline','Itens salvos',`${state.favorites.length} anúncios`,()=>router.push('/(tabs)/mercado')],
 ['chatbox-ellipses-outline','Conversas locais',`${state.conversations.length} conversas`,()=>router.push('/mensagens')],
 ['pricetags-outline','Meus anúncios',`${myListings.length} anúncios publicados`,()=>router.push('/(tabs)/mercado')],
 ['people-outline','Meus grupos',`${state.joinedGroups.length} participações`,()=>router.push('/(tabs)/comunidade')],
 ];
 return <ScrollView style={{flex:1,backgroundColor:C.bg}} showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom:105}}><Wrap style={{paddingTop:26}}><Eyebrow>MINHA ÁREA</Eyebrow><H style={{fontSize:38,marginTop:9}}>Sua vida em rede.</H><View style={{marginTop:20,backgroundColor:C.deep,borderRadius:18,padding:22,flexDirection:'row',alignItems:'center',gap:16}}><View style={{width:65,height:65,borderRadius:20,backgroundColor:'#ffffff29',alignItems:'center',justifyContent:'center'}}><Icon name="person-outline" color={C.paper} size={32}/></View><View style={{flex:1,gap:7}}><Text style={{fontSize:19,fontWeight:'800',color:C.paper}}>Minha experiência local</Text><Text style={{color:'#c9d8dc',fontSize:13}}>Manaus · {state.moment==='chegando'?'Chegando':state.moment==='morando'?'Morando':'Saindo'}</Text><Text style={{fontSize:11,color:'#f3eadc'}}>Dados armazenados neste aparelho</Text></View></View><View style={{marginTop:25,backgroundColor:C.paper,borderRadius:16,paddingHorizontal:18}}>{items.map(([icon,title,meta,action],i)=><Pressable key={title} onPress={action} style={{minHeight:76,alignItems:'center',flexDirection:'row',gap:14,borderBottomWidth:i===items.length-1?0:1,borderBottomColor:C.line}}><Icon name={icon as any} size={23} color={C.deep}/><View style={{flex:1}}><Text style={{fontWeight:'800',color:C.ink,fontSize:15}}>{title}</Text><Body style={{fontSize:12,marginTop:4}}>{meta}</Body></View><Icon name="chevron-forward" size={18} color={C.sub}/></Pressable>)}</View>
 <View style={{marginTop:36,marginBottom:15}}><Eyebrow>SUAS CONTRIBUIÇÕES</Eyebrow><H style={{fontSize:25,marginTop:7}}>Perguntas recentes</H></View>{myQuestions.length?myQuestions.map(q=><View key={q.id} style={{borderBottomWidth:1,borderColor:C.line}}><QuestionRow item={q}/></View>):<Body>Ao perguntar à comunidade, suas conversas aparecerão aqui.</Body>}
 <View style={{marginTop:30,padding:19,backgroundColor:C.sand,borderRadius:14,gap:8}}><Eyebrow>VERSÃO BETA NATIVA</Eyebrow><Text style={{fontWeight:'800',color:C.ink,fontSize:16}}>Aplicativo real. Dados locais.</Text><Body>Publicações, mensagens e interações funcionam e persistem no aparelho. Não são enviadas ao Supabase nem a outros usuários nesta versão. Os perfis de exemplo são fictícios.</Body></View>
 <Pressable onPress={()=>Alert.alert('Reiniciar os dados de teste','Isso apaga suas publicações, respostas, favoritos e conversas salvas neste aparelho.',[{text:'Cancelar',style:'cancel'},{text:'Reiniciar',style:'destructive',onPress:reset}])} style={{paddingVertical:22,alignItems:'center'}}><Text style={{color:C.clay,fontWeight:'800',fontSize:13}}>Reiniciar dados locais</Text></Pressable>
 </Wrap></ScrollView>
}
