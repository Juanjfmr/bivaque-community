import React,{useMemo,useState} from 'react';
import {Pressable,ScrollView,Text,View,useWindowDimensions} from 'react-native';
import {router} from 'expo-router';
import {C} from '../../src/theme';
import {useStore} from '../../src/store';
import {Body,Eyebrow,H,Icon,ListingTile,SearchField,Wrap} from '../../src/ui';
import {NativeMarketFilters} from '../../src/native-controls';
const kinds=['Todos','Desapego','Imóvel','Serviço','Salvos'] as const;
export default function Market(){const {width}=useWindowDimensions();const {state}=useStore();const [filter,setFilter]=useState<(typeof kinds)[number]>('Todos');const [query,setQuery]=useState('');const [bairro,setBairro]=useState('Todos os bairros');const itemWidth=Math.max(120,(width-56)/2);
 const list=useMemo(()=>state.listings.filter(x=>(filter==='Todos'||filter==='Salvos'?filter!=='Salvos'||state.favorites.includes(x.id):x.kind===filter)&&`${x.title} ${x.description} ${x.neighborhood}`.toLowerCase().includes(query.toLowerCase())&&(bairro==='Todos os bairros'||x.neighborhood===bairro)),[filter,state.listings,state.favorites,query,bairro]);
 const bairros=['Todos os bairros',...new Set(state.listings.map(x=>x.neighborhood))];
 return <ScrollView style={{flex:1,backgroundColor:C.bg}} contentContainerStyle={{paddingBottom:95}} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
 <Wrap style={{paddingTop:24,gap:11}}><View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}><Eyebrow>CIRCULA NA REDE</Eyebrow><Pressable onPress={()=>router.push('/criar')} accessibilityRole="button" accessibilityLabel="Criar anúncio" style={{backgroundColor:C.deep,borderRadius:13,paddingHorizontal:14,paddingVertical:10,flexDirection:'row',alignItems:'center',gap:6}}><Icon name="add" color={C.paper} size={16}/><Text style={{fontSize:12,fontWeight:'800',color:C.paper}}>Anunciar</Text></Pressable></View><H style={{fontSize:37,lineHeight:42}}>O que muda de mãos, continua útil.</H><Body>Desapegos, moradia e serviços publicados na comunidade.</Body><View style={{marginTop:8}}><SearchField value={query} onChange={setQuery} placeholder="O que você está procurando?"/></View></Wrap>
 <Wrap style={{paddingTop:18,paddingBottom:5}}><NativeMarketFilters kind={filter} kinds={kinds} onKind={setFilter} neighborhood={bairro} neighborhoods={bairros} onNeighborhood={setBairro}/></Wrap>
 <Wrap style={{paddingTop:21}}><View style={{flexDirection:'row',alignItems:'baseline',justifyContent:'space-between',marginBottom:17}}><H style={{fontSize:25,lineHeight:30}}>{filter==='Todos'?'Explore o Mercado':filter==='Salvos'?'Seus favoritos':filter==='Imóvel'?'Moradia em Manaus':filter==='Serviço'?'Serviços por perto':'Achados da comunidade'}</H><Body style={{fontSize:12}}>{list.length} itens</Body></View><View style={{flexDirection:'row',flexWrap:'wrap',columnGap:12,rowGap:21}}>{list.map(item=><ListingTile key={item.id} item={item} width={itemWidth}/>)}</View>{list.length===0&&<View style={{alignItems:'center',gap:10,paddingTop:65}}><Icon name="bag-outline" color={C.sub} size={40}/><Text style={{fontWeight:'800',fontSize:16,color:C.ink}}>Nada por aqui ainda</Text><Body>Ajuste os filtros ou publique um anúncio.</Body></View>}</Wrap>
 </ScrollView>
}
