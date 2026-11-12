import React,{useEffect,useMemo,useState} from 'react';
import {BackHandler,Keyboard,Platform,Pressable,ScrollView,StatusBar,StyleSheet,Text,TextInput,View,useWindowDimensions} from 'react-native';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {SafeAreaProvider,SafeAreaView} from 'react-native-safe-area-context';
import Animated,{FadeInDown} from 'react-native-reanimated';
import {Host,Switch} from '@expo/ui';
import {C} from './src/theme';
import {Event,Group,Listing,Provider,Question,Thread,events,groups,initialThreads,listings,neighborhoods,places,providers,questions} from './src/data';
import {Avatar,EventRow,GroupCard,Illustration,ListingCard,ProviderCard,QuestionRow,money} from './src/cards';
import {Empty,Eyebrow,Heading,Hit,I,IconName,NavBack,Pill,Pills,Sheet,Solid,Tile} from './src/ui';

type Page='home'|'community'|'market'|'profile'|'search'|'question'|'listing'|'provider'|'group'|'event'|'groups'|'events'|'guide'|'inbox'|'thread'|'saved'|'requests'|'compare'|'settings'|'reports';
type Route={page:Page;id?:string};
type SheetName='create'|'filters'|'city'|'notifications'|'report'|'request'|'question-actions'|'verify'|'sort'|'contact'|null;
type ComposeType='pergunta'|'imovel'|'desapego'|'grupo'|'encontro';
const rootTabs:[Page,string,IconName,IconName][]=[['home','Início','home-outline','home'],['community','Comunidade','people-outline','people'],['market','Mercado','storefront-outline','storefront'],['profile','Você','person-outline','person']];
const serviceKinds=['Eletricista','Diarista','Mudança','Marcenaria','Reformas','Cuidados'];
const format=(v:string)=>v.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const CardList=({children}:{children:React.ReactNode})=><View style={sx.cardList}>{children}</View>;
const Tag=({label}:{label:string})=><View style={sx.tag}><Text style={sx.tagText}>{label}</Text></View>;
const Info=({children}:{children:React.ReactNode})=><Text style={sx.info}>{children}</Text>;
function ShortAction({name,icon,description,onPress}:{name:string;icon:IconName;description?:string;onPress:()=>void}){
 return <Hit style={sx.shortAction} onPress={onPress}><View style={sx.shortIcon}><I name={icon} color={C.dark} size={21}/></View><View style={{flex:1}}><Text style={sx.shortName}>{name}</Text>{description&&<Text style={sx.shortDesc}>{description}</Text>}</View><I name="arrow-forward" color={C.muted} size={15}/></Hit>;
}
function PageHeader({heading,eyebrow,detail}:{heading:string;eyebrow:string;detail?:string}){
 return <View style={{marginBottom:22}}><Eyebrow>{eyebrow}</Eyebrow><Text style={sx.pageHeading}>{heading}</Text>{detail&&<Info>{detail}</Info>}</View>;
}
export default function App(){
 const {width}=useWindowDimensions();
 const [history,setHistory]=useState<Route[]>([{page:'home'}]);
 const active=history[history.length-1];
 const [sheet,setSheet]=useState<SheetName>(null);
 const [note,setNote]=useState('');
 const [city,setCity]=useState('Manaus');
 const [questionsState,setQuestions]=useState<Question[]>(questions);
 const [listingsState,setListings]=useState<Listing[]>(listings);
 const [groupsState,setGroups]=useState<Group[]>(groups);
 const [eventsState,setEvents]=useState<Event[]>(events);
 const [threads,setThreads]=useState<Thread[]>(initialThreads);
 const [saved,setSaved]=useState<string[]>([]);
 const [hidden,setHidden]=useState<string[]>([]);
 const [joined,setJoined]=useState<string[]>(['g1']);
 const [attending,setAttending]=useState<string[]>([]);
 const [useful,setUseful]=useState<string[]>([]);
 const [answers,setAnswers]=useState<Record<string,string[]>>({});
 const [groupPosts,setGroupPosts]=useState<Record<string,string[]>>({});
 const [reports,setReports]=useState<string[]>([]);
 const [requests,setRequests]=useState<{id:string;provider:string;body:string;status:string}[]>([]);
 const [selectedType,setSelectedType]=useState<ComposeType>('pergunta');
 const [draftTitle,setDraftTitle]=useState('');
 const [draftText,setDraftText]=useState('');
 const [draftRegion,setDraftRegion]=useState('Parque Dez');
 const [draftPrice,setDraftPrice]=useState('');
 const [draftRooms,setDraftRooms]=useState('2');
 const [reportReason,setReportReason]=useState('Conteúdo impróprio');
 const [target,setTarget]=useState('');
 const [requestText,setRequestText]=useState('');
 const [message,setMessage]=useState('');
 const [search,setSearch]=useState('');
 const [recents,setRecents]=useState<string[]>(['eletricista','apartamento','grupo de corrida']);
 const [communityMode,setCommunityMode]=useState('Perguntas');
 const [marketMode,setMarketMode]=useState('Imóveis');
 const [category,setCategory]=useState('Todos');
 const [region,setRegion]=useState('Todos');
 const [minRooms,setMinRooms]=useState(0);
 const [maxMonthly,setMaxMonthly]=useState(5000);
 const [sort,setSort]=useState('Mais recentes');
 const [mapMode,setMapMode]=useState(false);
 const [compare,setCompare]=useState<string[]>([]);
 const [nearby,setNearby]=useState(false);
 const [notifyEnabled,setNotifyEnabled]=useState(true);
 const [readNotifications,setReadNotifications]=useState(false);
 const [photoIndex,setPhotoIndex]=useState(0);
 const [groupText,setGroupText]=useState('');
 const [threadUnread,setThreadUnread]=useState(false);

 const root=(page:Page)=>{Keyboard.dismiss();setHistory([{page}]);setSheet(null)};
 const go=(page:Page,id?:string)=>{Keyboard.dismiss();setSheet(null);setHistory(h=>[...h,{page,id}]);};
 const back=()=>{Keyboard.dismiss();if(sheet){setSheet(null);return;}setHistory(h=>h.length>1?h.slice(0,-1):h)};
 useEffect(()=>{const sub=BackHandler.addEventListener('hardwareBackPress',()=>{if(sheet||history.length>1){back();return true;}return false});return()=>sub.remove()},[history.length,sheet]);
 const flash=(s:string)=>{setNote(s)};
 const save=(id:string)=>setSaved(s=>s.includes(id)?s.filter(v=>v!==id):[...s,id]);
 const hide=(id:string)=>{setHidden(h=>h.includes(id)?h:[...h,id]);flash('Conteúdo ocultado nesta sessão. Você pode rever em Você.')};
 const openCreate=(type:ComposeType='pergunta')=>{setSelectedType(type);setDraftTitle('');setDraftText('');setDraftPrice('');setSheet('create')};
 const openQuestion=(id:string)=>go('question',id);
 const openListing=(id:string)=>{setPhotoIndex(0);go('listing',id)};
 const q=questionsState.find(x=>x.id===active.id);
 const listing=listingsState.find(x=>x.id===active.id);
 const provider=providers.find(x=>x.id===active.id);
 const grp=groupsState.find(x=>x.id===active.id);
 const ev=eventsState.find(x=>x.id===active.id);
 const thread=threads.find(x=>x.id===active.id);
 const allVisible=questionsState.filter(x=>!hidden.includes(x.id));
 const filteredQ=allVisible.filter(x=>(category==='Todos'||x.category===category)&&(region==='Todos'||x.neighborhood===region));
 const filteredListings=listingsState.filter(x=>x.type===(marketMode==='Imóveis'?'imovel':'desapego')&&(region==='Todos'||x.region===region)&&((x.type!=='imovel')||(x.rooms||0)>=minRooms&&(x.price+(x.fee||0))<=maxMonthly)).sort((a,b)=>sort==='Menor preço'?a.price-b.price:sort==='Maior preço'?b.price-a.price:0);
 const filteredProviders=providers.filter(x=>region==='Todos'||x.neighborhood===region);
 const searchResults=useMemo(()=>{
  const t=format(search.trim());if(!t)return null;
  return {questions:allVisible.filter(x=>format(x.title+' '+x.body+' '+x.category+' '+x.neighborhood).includes(t)),
   listings:listingsState.filter(x=>format(x.title+' '+x.region+' '+x.kind).includes(t)),
   providers:providers.filter(x=>format(x.name+' '+x.specialty+' '+x.neighborhood).includes(t)),
   groups:groupsState.filter(x=>format(x.title+' '+x.description).includes(t)),
   events:eventsState.filter(x=>format(x.title+' '+x.place).includes(t))};
 },[search,questionsState,listingsState,groupsState,eventsState,hidden]);
 const remember=(t:string)=>{if(t.trim())setRecents(s=>[t.trim(),...s.filter(x=>x!==t.trim())].slice(0,6))};
 const firstRoot=['home','community','market','profile'].includes(active.page);
 const makePost=()=>{
   const name=draftTitle.trim(),body=draftText.trim();
   if(name.length<8){flash('O título precisa ter pelo menos 8 caracteres.');return;}
   if(selectedType==='pergunta'){const id='q'+Date.now();setQuestions(s=>[{id,title:name,body,author:'Você',role:'Participante',neighborhood:draftRegion,ago:'agora',category:'Serviços',replies:0,useful:0},...s]);setSheet(null);go('question',id)}
   else if(selectedType==='imovel'||selectedType==='desapego'){const price=Number(draftPrice.replace(',','.'));if(!(price>0)){flash('Informe um valor válido para o anúncio.');return;}const id='l'+Date.now();setListings(s=>[{id,title:name,price,fee:0,rooms:Number(draftRooms)||1,area:75,parking:1,region:draftRegion,kind:selectedType==='imovel'?'Apartamento':'Item usado',description:body||'Anúncio de demonstração',features:['Anúncio novo'],author:'Você',available:true,type:selectedType,palette:C.sage},...s]);setSheet(null);go('listing',id)}
   else if(selectedType==='grupo'){const id='g'+Date.now();setGroups(s=>[{id,title:name,topic:'Novo grupo',members:1,private:false,description:body||'Grupo local criado nesta demonstração',cover:C.green,recent:'Você criou este grupo'},...s]);setJoined(s=>[...s,id]);setSheet(null);go('group',id)}
   else {const id='v'+Date.now();setEvents(s=>[{id,title:name,day:'30',month:'NOV',place:draftRegion+' · Manaus',time:'09:00',capacity:20,going:0,description:body||'Encontro criado nesta demonstração'},...s]);setSheet(null);go('event',id)}
   flash('Criado nesta sessão. Dados fictícios, não publicados na rede.');
 };
 const replyToQ=()=>{if(!q||draftText.trim().length<2){flash('Escreva sua resposta.');return;}setAnswers(s=>({...s,[q.id]:[...(s[q.id]||[]),draftText.trim()]}));setQuestions(s=>s.map(x=>x.id===q.id?{...x,replies:x.replies+1}:x));setDraftText('');flash('Resposta adicionada localmente.')};
 const sendMessage=()=>{if(!thread||!message.trim())return;setThreads(s=>s.map(x=>x.id===thread.id?{...x,last:message.trim(),ago:'agora',unread:0,messages:[...x.messages,{from:'me' as const,body:message.trim(),time:'agora'}]}:x));setMessage('')};
 const contact=(name:string,context:string)=>{
  let id=threads.find(t=>t.name===name&&t.context===context)?.id;
  if(!id){id='m'+Date.now();setThreads(s=>[{id:id!,name,context,last:'Início de conversa',ago:'agora',unread:0,messages:[]},...s])}
  go('thread',id);
 };
 const submitRequest=()=>{if(requestText.trim().length<12){flash('Descreva o serviço em pelo menos 12 caracteres.');return;}setRequests(s=>[{id:'r'+Date.now(),provider:target,body:requestText.trim(),status:'Em aberto · simulação'},...s]);setSheet(null);root('profile');go('requests');setRequestText('');flash('Pedido salvo localmente. Nenhuma empresa foi notificada.')};
 const askReport=(id:string)=>{setTarget(id);setSheet('report')};
 const sendReport=()=>{setReports(s=>[reportReason+' · '+target,...s]);setSheet(null);flash('Denúncia registrada apenas neste laboratório.')};
 const openRequest=(name:string)=>{setTarget(name);setSheet('request')};
 const menu=(id:string)=>{setTarget(id);setSheet('question-actions')};
 const addCompare=(id:string)=>setCompare(s=>s.includes(id)?s.filter(x=>x!==id):s.length>=3?s:[...s,id]);
 const toggleRsvp=(id:string)=>setAttending(s=>s.includes(id)?s.filter(x=>x!==id):[...s,id]);
 const cardsQ=(arr:Question[])=>arr.length?<CardList>{arr.map(x=><QuestionRow key={x.id} item={x} onOpen={()=>openQuestion(x.id)} saved={saved.includes(x.id)} onSave={()=>save(x.id)} onHide={()=>hide(x.id)}/>)}</CardList>:<Empty title="Nada neste filtro" subtitle="Experimente outra categoria ou bairro." onAction={()=>{setCategory('Todos');setRegion('Todos')}} action="Limpar filtros"/>;
 const cardsL=(arr:Listing[],wide=false)=><View style={{gap:12}}>{arr.map(x=><ListingCard key={x.id} item={x} wide={wide} saved={saved.includes(x.id)} onSave={()=>save(x.id)} onOpen={()=>openListing(x.id)}/>)}</View>;
 const body=()=>{
 if(active.page==='home')return <>
 <View style={sx.cityHeadline}><Eyebrow>COMUNIDADE DE MANAUS</Eyebrow><Text style={sx.homeTitle}>O que você precisa<Text style={sx.serif}> por aqui?</Text></Text><Text style={sx.homeSub}>A rede de quem vive, chega e compartilha a cidade.</Text></View>
 <Hit style={sx.searchTap} onPress={()=>go('search')}><I name="search-outline" color={C.quiet} size={21}/><Text style={sx.searchHint}>Buscar “eletricista”, “apartamento”...</Text><I name="arrow-forward" color={C.dark}/></Hit>
 <View style={sx.quickQuad}>
 {[
 ['Pedir indicação','chatbubble-ellipses-outline','pergunta'],
 ['Ver imóveis','home-outline','imovel'],
 ['Encontrar serviços','construct-outline','servico'],
 ['Explorar encontros','calendar-outline','encontro']
 ].map(([label,icon,act])=><Hit key={label} style={sx.quickTile} onPress={()=>{if(act==='pergunta')openCreate('pergunta');else if(act==='imovel'){setMarketMode('Imóveis');root('market')}else if(act==='servico'){setMarketMode('Serviços');root('market')}else go('events')}}><I name={icon as IconName} color={C.dark} size={23}/><Text style={sx.quickText}>{label}</Text><I name="arrow-up-forward" color={C.muted} size={14}/></Hit>)}
 </View>
 <View style={sx.editorial}><View style={{maxWidth:'76%'}}><Eyebrow color="#CADCCE">AQUI A INDICAÇÃO TEM ORIGEM</Eyebrow><Text style={sx.editorialTitle}>Alguém já passou por isso.</Text><Text style={sx.editorialSub}>Pergunte. Compare experiências. Encontre quem pode ajudar.</Text></View><Hit onPress={()=>openCreate('pergunta')} style={sx.editorialCTA}><Text style={{color:C.white,fontWeight:'800'}}>Perguntar</Text><I name="arrow-forward" size={19} color={C.white}/></Hit><View pointerEvents="none" style={sx.editorialCircle}/></View>
 <Heading aside="Todos" onAside={()=>{setMarketMode('Serviços');root('market')}}>Indicações locais</Heading>
 <ScrollView horizontal snapToInterval={208} decelerationRate="fast" showsHorizontalScrollIndicator={false} contentContainerStyle={sx.hScroll}>{providers.slice(0,4).map(x=><ProviderCard key={x.id} item={x} onOpen={()=>go('provider',x.id)}/>)}</ScrollView>
 <Heading aside="Explorar" onAside={()=>{setMarketMode('Imóveis');root('market')}}>Oportunidades por perto</Heading>
 <ScrollView horizontal snapToInterval={266} decelerationRate="fast" showsHorizontalScrollIndicator={false} contentContainerStyle={sx.hScroll}>{listingsState.slice(0,4).map(x=><ListingCard key={x.id} item={x} onOpen={()=>openListing(x.id)} onSave={()=>save(x.id)} saved={saved.includes(x.id)}/>)}</ScrollView>
 <Heading aside="Abrir grupos" onAside={()=>go('groups')}>Sua comunidade em movimento</Heading>
 <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={sx.hScroll}>{groupsState.slice(0,3).map(x=><GroupCard key={x.id} item={x} joined={joined.includes(x.id)} onOpen={()=>go('group',x.id)}/>)}</ScrollView>
 <Heading aside="Agenda" onAside={()=>go('events')}>Próximos encontros</Heading>
 <CardList>{eventsState.slice(0,1).map(x=><EventRow key={x.id} item={x} going={attending.includes(x.id)} onOpen={()=>go('event',x.id)}/>)}</CardList>
 <Heading aside="Responder" onAside={()=>{setCommunityMode('Perguntas');root('community')}}>A comunidade está procurando</Heading>
 {cardsQ(allVisible.slice(0,2))}
 <Hit onPress={()=>go('guide')} style={sx.guideTeaser}><View><Eyebrow color="#BFCEC2">GUIA DA CIDADE</Eyebrow><Text style={sx.guideTeaserTitle}>Chegando em Manaus?</Text><Text style={{color:'#CDDACD',fontSize:12}}>Bairros, primeiros passos e dicas compartilhadas.</Text></View><I name="compass-outline" size={43} color="#D3DFD3"/></Hit>
 </>;
 if(active.page==='community')return <>
 <PageHeader eyebrow="A CIDADE EM CONVERSA" heading="Gente que ajuda gente." detail="Encontre respostas, participe de grupos e descubra encontros."/>
 <Pills items={['Perguntas','Grupos','Encontros']} value={communityMode} onChange={setCommunityMode}/>
 {communityMode==='Perguntas'?<>
 <Hit onPress={()=>openCreate('pergunta')} style={sx.createQuestion}><I name="add-circle-outline" color={C.white} size={22}/><View style={{flex:1}}><Text style={sx.createLabel}>Fazer uma pergunta</Text><Text style={sx.createSub}>Conte o que você procura em Manaus</Text></View><I name="arrow-forward" color={C.white}/></Hit>
 <View style={{marginTop:15}}><Pills items={['Todos','Serviços','Moradia','Comunidade','Guia']} value={category} onChange={setCategory}/></View>
 <View style={{marginTop:14}}>{cardsQ(filteredQ)}</View>
 </>:communityMode==='Grupos'?<>
 <Heading aside="Criar grupo" onAside={()=>openCreate('grupo')}>Grupos de interesse</Heading>
 <View style={sx.groupGrid}>{groupsState.map(x=><GroupCard key={x.id} item={x} joined={joined.includes(x.id)} onOpen={()=>go('group',x.id)}/>)}</View>
 </>:<>
 <Heading aside="Criar encontro" onAside={()=>openCreate('encontro')}>Agenda da cidade</Heading><CardList>{eventsState.map(x=><EventRow key={x.id} item={x} going={attending.includes(x.id)} onOpen={()=>go('event',x.id)}/>)}</CardList>
 </>}
 </>;
 if(active.page==='market')return <>
 <PageHeader eyebrow="MERCADO ENTRE PESSOAS" heading="Encontre o que precisa." detail="Moradia, desapegos e serviços com contexto local."/>
 <Pills items={['Imóveis','Desapegos','Serviços']} value={marketMode} onChange={x=>{setMarketMode(x);setMapMode(false)}}/>
 <View style={sx.marketToolbar}><Hit onPress={()=>setSheet('filters')} style={sx.toolbarBtn}><I name="options-outline" size={19}/><Text style={sx.toolbarTxt}>Filtros</Text></Hit><Hit onPress={()=>setSheet('sort')} style={sx.toolbarBtn}><I name="swap-vertical-outline" size={17}/><Text style={sx.toolbarTxt}>Ordenar</Text></Hit>{marketMode==='Imóveis'&&<Hit onPress={()=>setMapMode(v=>!v)} style={sx.toolbarBtn}><I name={mapMode?'list-outline':'map-outline'} size={17}/><Text style={sx.toolbarTxt}>{mapMode?'Lista':'Bairros'}</Text></Hit>}</View>
 {marketMode==='Serviços'?<>
 <Heading aside="Pedir serviço" onAside={()=>openCreate('pergunta')}>Profissionais indicados</Heading>
 <View style={sx.serviceList}>{filteredProviders.map(x=><Hit key={x.id} onPress={()=>go('provider',x.id)} style={sx.serviceRow}><Avatar name={x.name} size={53} color={x.palette}/><View style={{flex:1}}><Text style={sx.listTitle}>{x.name} {x.verified?'✓':''}</Text><Text style={sx.listSub}>{x.specialty} · {x.neighborhood}</Text><Text style={sx.greenText}>{x.references} indicações na demonstração</Text></View><I name="chevron-forward" color={C.muted}/></Hit>)}</View>
 </>:<>
 <Heading aside={marketMode==='Imóveis'?'Anunciar imóvel':'Publicar desapego'} onAside={()=>openCreate(marketMode==='Imóveis'?'imovel':'desapego')}>{filteredListings.length} resultados</Heading>
 {mapMode&&marketMode==='Imóveis'?<><View style={sx.mapSketch}><Eyebrow>ESQUEMA ILUSTRATIVO, NÃO É MAPA GEOLOCALIZADO</Eyebrow><View style={sx.mapLines}><View style={[sx.mapDistrict,{top:34,left:22}]}><Text style={sx.mapPin}>Parque Dez</Text></View><View style={[sx.mapDistrict,{top:95,right:15}]}><Text style={sx.mapPin}>Adrianópolis</Text></View><View style={[sx.mapDistrict,{bottom:22,left:58}]}><Text style={sx.mapPin}>Flores</Text></View></View></View><Text style={sx.hint}>Selecione um bairro acima em Filtros; os anúncios continuam abaixo.</Text></>:null}
 {cardsL(filteredListings,true)}
 <Hit onPress={()=>{setMarketMode('Imóveis');go('compare')}} style={sx.compareAction}><I name="git-compare-outline" color={C.dark}/><Text style={{flex:1,color:C.dark,fontWeight:'800'}}>Comparar imóveis ({compare.length}/3)</Text><I name="arrow-forward" color={C.dark}/></Hit>
 </>}
 </>;
 if(active.page==='profile')return <>
 <PageHeader eyebrow="SEU ESPAÇO" heading="Sua vida no Bivaque." detail="O que você salva, publica, acompanha e combina."/>
 <View style={sx.profileHeader}><Avatar name="Você" size={65} color={C.sage}/><View><Text style={sx.listTitle}>Perfil de demonstração</Text><Text style={sx.listSub}>{city} · Modo laboratório</Text><Tag label="DADOS LOCAIS"/></View></View>
 <View style={sx.statRow}><View style={sx.stat}><Text style={sx.statNumber}>{saved.length}</Text><Text style={sx.statLabel}>Salvos</Text></View><View style={sx.stat}><Text style={sx.statNumber}>{requests.length}</Text><Text style={sx.statLabel}>Pedidos</Text></View><View style={sx.stat}><Text style={sx.statNumber}>{attending.length}</Text><Text style={sx.statLabel}>Encontros</Text></View></View>
 <Heading>Organize sua vida</Heading>
 <View style={sx.actionMenu}>{[
 ['Salvos','bookmark-outline','saved'],['Conversas','chatbubbles-outline','inbox'],['Pedidos de serviço','document-text-outline','requests'],['Comparar imóveis','git-compare-outline','compare'],['Guia da cidade','compass-outline','guide'],['Configurações','settings-outline','settings'],['Minhas denúncias','shield-checkmark-outline','reports']
 ].map(([label,icon,page])=><ShortAction key={label} name={label} icon={icon as IconName} onPress={()=>go(page as Page)}/>)}</View>
 <View style={sx.demoCaution}><I name="information-circle-outline" color={C.green}/><Text style={sx.hint}>Este experimento não usa login nem Supabase. Interações são locais e não enviam contatos, propostas ou denúncias reais.</Text></View>
 </>;
 if(active.page==='search')return <>
 <View style={sx.searchInput}><I name="search-outline" size={22} color={C.quiet}/><TextInput autoFocus value={search} onChangeText={setSearch} onSubmitEditing={()=>remember(search)} placeholder={'Buscar em '+city} placeholderTextColor={C.muted} style={sx.searchField}/>{search.length>0&&<Pressable onPress={()=>setSearch('')}><I name="close-circle" size={20} color={C.muted}/></Pressable>}</View>
 {!searchResults?<>
 <Heading aside="Limpar" onAside={()=>setRecents([])}>Buscas recentes</Heading>
 {recents.map(x=><ShortAction key={x} name={x} icon="time-outline" onPress={()=>setSearch(x)}/>)}
 <Heading>Explorar em {city}</Heading>
 <View style={sx.exploreGrid}>{[['Serviços','construct-outline','Serviços'],['Imóveis','home-outline','Imóveis'],['Desapegos','pricetag-outline','Desapegos'],['Perguntas','chatbubbles-outline','Perguntas'],['Grupos','people-outline','Grupos'],['Encontros','calendar-outline','Encontros']].map(([name,icon,kind])=><Hit key={name} onPress={()=>{if(kind==='Perguntas'){setCommunityMode('Perguntas');root('community')}else if(kind==='Grupos')go('groups');else if(kind==='Encontros')go('events');else{setMarketMode(kind);root('market')}}} style={sx.exploreItem}><I name={icon as IconName} size={22} color={C.dark}/><Text style={sx.exploreTxt}>{name}</Text><I name="arrow-forward" color={C.muted} size={15}/></Hit>)}</View>
 <Heading>Sugestões</Heading><View>{['diarista no Planalto','apartamento dois quartos','corrida em grupo'].map(x=><ShortAction key={x} name={x} icon="trending-up-outline" onPress={()=>setSearch(x)}/>)}</View>
 </>:<>
 <Heading>Resultados para “{search}”</Heading>
 <Text style={sx.hint}>Pesquisa transversal · demonstração</Text>
 {searchResults.questions.length>0&&<><Heading>Perguntas ({searchResults.questions.length})</Heading>{cardsQ(searchResults.questions)}</>}
 {searchResults.listings.length>0&&<><Heading>Mercado ({searchResults.listings.length})</Heading>{cardsL(searchResults.listings,true)}</>}
 {searchResults.providers.length>0&&<><Heading>Serviços ({searchResults.providers.length})</Heading><View style={{gap:10}}>{searchResults.providers.map(x=><ShortAction key={x.id} name={x.name} description={x.specialty} icon="construct-outline" onPress={()=>{remember(search);go('provider',x.id)}}/>)}</View></>}
 {searchResults.groups.length>0&&<><Heading>Grupos ({searchResults.groups.length})</Heading>{searchResults.groups.map(x=><ShortAction key={x.id} name={x.title} description={x.topic} icon="people-outline" onPress={()=>go('group',x.id)}/>)}</>}
 {searchResults.events.length>0&&<><Heading>Encontros ({searchResults.events.length})</Heading><CardList>{searchResults.events.map(x=><EventRow key={x.id} item={x} going={attending.includes(x.id)} onOpen={()=>go('event',x.id)}/>)}</CardList></>}
 {Object.values(searchResults).every(x=>x.length===0)&&<Empty title="Nenhum resultado encontrado" subtitle="Tente uma expressão mais curta ou explore as categorias." icon="search-outline"/>}
 </>}
 </>;
 if(active.page==='question'&&q)return <>
 <View style={sx.detailHead}><Eyebrow>{q.category} · {q.neighborhood}</Eyebrow><Text style={sx.detailTitle}>{q.title}</Text><View style={sx.authorLine}><Avatar name={q.author} size={38}/><View><Text style={sx.listTitle}>{q.author} · {q.role}</Text><Text style={sx.listSub}>{q.ago} · Manaus</Text></View></View></View>
 <Text style={sx.detailBody}>{q.body}</Text>
 <View style={sx.detailActions}><Hit onPress={()=>save(q.id)} style={sx.detailAction}><I name={saved.includes(q.id)?'bookmark':'bookmark-outline'} color={C.dark}/><Text style={sx.detailActionText}>{saved.includes(q.id)?'Salvo':'Salvar'}</Text></Hit><Hit onPress={()=>{setTarget(q.id);setSheet('contact')}} style={sx.detailAction}><I name="share-social-outline"/><Text style={sx.detailActionText}>Indicar</Text></Hit><Hit onPress={()=>menu(q.id)} style={sx.detailAction}><I name="ellipsis-horizontal"/><Text style={sx.detailActionText}>Mais</Text></Hit></View>
 {q.resolved&&<View style={sx.success}><I name="checkmark-circle" color={C.good}/><Text style={sx.successText}>Pergunta marcada como resolvida.</Text></View>}
 <Heading>{q.replies} respostas</Heading>
 {q.replies>0&&<View style={sx.answer}><View style={sx.authorLine}><Avatar name="Participante local"/><View><Text style={sx.listTitle}>Participante da comunidade</Text><Text style={sx.listSub}>Resposta demonstrativa</Text></View></View><Text style={sx.answerText}>Vale pedir referências e combinar orçamento com antecedência. Procure indicações de quem já contratou o serviço.</Text><Hit onPress={()=>{setUseful(s=>s.includes(q.id)?s.filter(x=>x!==q.id):[...s,q.id]);flash('Obrigado por avaliar esta resposta.')}} style={sx.useful}><I name={useful.includes(q.id)?'thumbs-up':'thumbs-up-outline'} size={16} color={C.green}/><Text style={sx.greenText}>{useful.includes(q.id)?'Marcado como útil':'Útil'}</Text></Hit></View>}
 {(answers[q.id]||[]).map((x,i)=><View key={i} style={sx.answer}><Text style={sx.listTitle}>Você · agora</Text><Text style={sx.answerText}>{x}</Text></View>)}
 <Heading>Contribua com sua experiência</Heading><TextInput value={draftText} onChangeText={setDraftText} multiline placeholder="Escreva uma resposta útil..." placeholderTextColor={C.muted} style={[sx.field,{height:96,textAlignVertical:'top'}]}/><Solid onPress={replyToQ}>Publicar resposta</Solid>
 <View style={sx.tip}><I name="shield-checkmark-outline" color={C.green}/><Text style={sx.tipText}>Não compartilhe dados pessoais em público. Contatos devem ser enviados em conversa privada.</Text></View>
 </>;
 if(active.page==='listing'&&listing)return <>
 <View style={sx.photoBox}><Illustration large kind={listing.type} color={listing.palette}/><View style={sx.photoControls}><Pressable onPress={()=>setPhotoIndex(s=>Math.max(0,s-1))} style={sx.roundIcon}><I name="chevron-back"/></Pressable><Text style={sx.photoNumber}>{photoIndex+1} / 3 · ilustração</Text><Pressable onPress={()=>setPhotoIndex(s=>Math.min(2,s+1))} style={sx.roundIcon}><I name="chevron-forward"/></Pressable></View></View>
 <View style={sx.listingKicker}><Eyebrow>{listing.kind} · {listing.region}</Eyebrow><Tag label="ANÚNCIO FICTÍCIO"/></View>
 <Text style={sx.detailTitle}>{listing.title}</Text><Text style={sx.priceBig}>{money(listing.price)}{listing.type==='imovel'&&<Text style={sx.priceSmall}> / mês</Text>}</Text>
 {listing.type==='imovel'&&<><View style={sx.costLine}><Text style={sx.costLabel}>Condomínio</Text><Text style={sx.costVal}>{money(listing.fee||0)}</Text></View><View style={sx.costLine}><Text style={[sx.costLabel,{fontWeight:'800'}]}>Total estimado por mês</Text><Text style={[sx.costVal,{fontWeight:'800',color:C.dark}]}>{money(listing.price+(listing.fee||0))}</Text></View>
 <View style={sx.attributes}><View><I name="bed-outline" color={C.green}/><Text style={sx.attributeVal}>{listing.rooms} quartos</Text></View><View><I name="resize-outline" color={C.green}/><Text style={sx.attributeVal}>{listing.area} m²</Text></View><View><I name="car-outline" color={C.green}/><Text style={sx.attributeVal}>{listing.parking} vagas</Text></View></View></>}
 <Heading>Sobre este anúncio</Heading><Text style={sx.detailBody}>{listing.description}</Text><View style={sx.features}>{listing.features.map(x=><Tag key={x} label={x}/>)}</View>
 <View style={sx.seller}><Avatar name={listing.author} size={49}/><View style={{flex:1}}><Text style={sx.listTitle}>{listing.author}</Text><Text style={sx.listSub}>Anunciante fictício</Text></View><Hit onPress={()=>askReport(listing.id)}><I name="flag-outline" color={C.muted}/></Hit></View>
 <View style={sx.twoButtons}><View style={{flex:1}}><Solid secondary onPress={()=>save(listing.id)}>{saved.includes(listing.id)?'Salvo':'Salvar'}</Solid></View><View style={{flex:2}}><Solid onPress={()=>contact(listing.author,listing.title)}>Conversar com anunciante</Solid></View></View>
 {listing.type==='imovel'&&<Hit onPress={()=>{addCompare(listing.id);flash(compare.includes(listing.id)?'Removido da comparação':'Adicionado à comparação (máximo 3)')}} style={sx.compareAction}><I name="git-compare-outline"/><Text style={{flex:1,color:C.dark,fontWeight:'800'}}>{compare.includes(listing.id)?'Remover da comparação':'Adicionar à comparação'}</Text><I name="arrow-forward"/></Hit>}
 <View style={sx.tip}><I name="shield-checkmark-outline" color={C.green}/><Text style={sx.tipText}>Segurança: não transfira valores antes de confirmar identidade e condições pessoalmente.</Text></View>
 </>;
 if(active.page==='provider'&&provider)return <>
 <View style={[sx.providerCover,{backgroundColor:provider.palette}]}><Avatar name={provider.name} size={87} color="#FFFFFFB0"/><Eyebrow>PROFISSIONAL DA COMUNIDADE · DEMO</Eyebrow></View>
 <View style={{marginTop:19}}><Text style={sx.detailTitle}>{provider.name} {provider.verified?'✓':''}</Text><Text style={sx.detailBody}>{provider.specialty} · {provider.neighborhood}</Text><View style={sx.providerStats}><View><Text style={sx.statNumber}>{provider.references}</Text><Text style={sx.statLabel}>indicações fictícias</Text></View><View><Text style={sx.statNumber}>{provider.verified?'Sim':'Não'}</Text><Text style={sx.statLabel}>selo demonstrativo</Text></View></View><Text style={sx.detailBody}>{provider.intro}</Text></View>
 <Hit onPress={()=>setSheet('verify')} style={sx.explain}><I name="information-circle-outline" color={C.green}/><Text style={sx.explainText}>O que significa o selo de verificação?</Text><I name="arrow-forward" size={15} color={C.quiet}/></Hit>
 <Heading>O que pode resolver</Heading><View style={sx.features}>{[provider.specialty,'Atendimento por conversa','Orçamento personalizado'].map(x=><Tag key={x} label={x}/>)}</View>
 <View style={{marginTop:29,gap:10}}><Solid onPress={()=>openRequest(provider.name)}>Solicitar orçamento</Solid><Solid secondary onPress={()=>contact(provider.name,provider.specialty)}>Iniciar conversa</Solid></View>
 <View style={sx.tip}><I name="shield-checkmark-outline" color={C.green}/><Text style={sx.tipText}>As indicações e os selos deste protótipo são fictícios. Não representam profissionais reais validados.</Text></View>
 </>;
 if(active.page==='group'&&grp)return <>
 <View style={[sx.groupBanner,{backgroundColor:grp.cover}]}><Eyebrow color="#E4EFE3">{grp.topic} · {grp.private?'Grupo fechado':'Grupo aberto'}</Eyebrow><Text style={sx.groupBannerTitle}>{grp.title}</Text><Text style={{color:'#E0E9DE'}}>{grp.members+(joined.includes(grp.id)?1:0)} participantes</Text></View>
 <Text style={[sx.detailBody,{marginVertical:20}]}>{grp.description}</Text>
 <Solid onPress={()=>{setJoined(s=>s.includes(grp.id)?s.filter(x=>x!==grp.id):[...s,grp.id]);flash(joined.includes(grp.id)?'Você saiu do grupo':'Entrada simulada no grupo')}}>{joined.includes(grp.id)?'Sair do grupo':'Participar deste grupo'}</Solid>
 <Heading>Publicações do grupo</Heading>
 <View style={sx.answer}><Text style={sx.listTitle}>Movimento recente</Text><Text style={sx.answerText}>{grp.recent}</Text><Text style={sx.listSub}>Publicado na demonstração</Text></View>
 {(groupPosts[grp.id]||[]).map((x,i)=><View style={sx.answer} key={i}><Text style={sx.listTitle}>Você · agora</Text><Text style={sx.answerText}>{x}</Text></View>)}
 {joined.includes(grp.id)?<><TextInput style={[sx.field,{minHeight:89,textAlignVertical:'top'}]} multiline value={groupText} onChangeText={setGroupText} placeholder="Escrever para este grupo..." placeholderTextColor={C.muted}/><Solid onPress={()=>{if(groupText.trim().length<5)return flash('Escreva mais detalhes.');setGroupPosts(s=>({...s,[grp.id]:[...(s[grp.id]||[]),groupText.trim()]}));setGroupText('');flash('Post publicado apenas neste laboratório.')}}>Publicar no grupo</Solid></>:<Info>Participe para publicar neste grupo.</Info>}
 <Hit onPress={()=>askReport(grp.id)} style={sx.reportLink}><I name="flag-outline" size={17} color={C.muted}/><Text style={sx.hint}>Denunciar grupo</Text></Hit>
 </>;
 if(active.page==='event'&&ev)return <>
 <View style={sx.eventHero}><Text style={sx.eventHeroDay}>{ev.day}</Text><View><Eyebrow color="#DAE9DC">{ev.month} · {ev.time}</Eyebrow><Text style={sx.eventHeroName}>Um encontro para fazer parte.</Text></View></View>
 <Text style={sx.detailTitle}>{ev.title}</Text><Text style={sx.detailBody}>{ev.description}</Text>
 <View style={sx.eventFacts}><ShortAction name={ev.place} description="Local do encontro (demonstração)" icon="location-outline" onPress={()=>flash('Localização ilustrativa, sem mapa externo.')}/><ShortAction name={ev.going+(attending.includes(ev.id)?1:0)+' de '+ev.capacity+' confirmados'} description="Capacidade limitada" icon="people-outline" onPress={()=>flash('Capacidade calculada localmente.')}/></View>
 <Solid onPress={()=>{toggleRsvp(ev.id);flash(attending.includes(ev.id)?'Presença cancelada':'Presença confirmada localmente')}}>{attending.includes(ev.id)?'Cancelar minha presença':'Confirmar presença'}</Solid>
 <View style={sx.tip}><I name="information-circle-outline" color={C.green}/><Text style={sx.tipText}>Evento fictício. A confirmação não gera inscrição real nem mensagem ao organizador.</Text></View>
 </>;
 if(active.page==='groups')return <><PageHeader eyebrow="PERTENCIMENTO" heading="Encontre sua turma." detail="Interesses em comum, conversas e atividades."/><View style={sx.groupGrid}>{groupsState.map(x=><GroupCard key={x.id} item={x} onOpen={()=>go('group',x.id)} joined={joined.includes(x.id)}/>)}</View><View style={{marginTop:22}}><Solid onPress={()=>openCreate('grupo')}>Criar grupo</Solid></View></>;
 if(active.page==='events')return <><PageHeader eyebrow="PESSOAS NO MESMO LUGAR" heading="Encontros na cidade." detail="Entre na agenda e confirme presença."/><CardList>{eventsState.map(x=><EventRow key={x.id} item={x} going={attending.includes(x.id)} onOpen={()=>go('event',x.id)}/>)}</CardList><View style={{marginTop:24}}><Solid onPress={()=>openCreate('encontro')}>Criar encontro</Solid></View></>;
 if(active.page==='guide')return <><PageHeader eyebrow={'GUIA DE '+city.toUpperCase()} heading="Um lugar de cada vez." detail="Referências iniciais para conhecer bairros. Não substituem visitas ou informações atualizadas."/>
 <View style={sx.guideIntro}><I name="compass-outline" color="#E0E9DD" size={42}/><Text style={sx.guideIntroTitle}>Chegue sabendo por onde começar.</Text></View>
 <Heading>Explorar bairros</Heading>{places.map((p,i)=><Hit key={p.name} onPress={()=>{setRegion(p.name);flash('Filtro de bairro selecionado: '+p.name);setMarketMode('Imóveis');root('market')}} style={sx.placeRow}><View style={sx.placeNo}><Text style={sx.placeNoText}>0{i+1}</Text></View><View style={{flex:1}}><Text style={sx.listTitle}>{p.name}</Text><Text style={sx.listSub}>{p.detail}</Text><Tag label={p.tag}/></View><I name="arrow-up-forward" color={C.dark}/></Hit>)}
 <Heading>Primeiros passos</Heading><ShortAction name="Encontrar moradia" description="Filtre por custo total e bairro" icon="home-outline" onPress={()=>{setMarketMode('Imóveis');root('market')}}/><ShortAction name="Perguntar à comunidade" description="Experiências de quem já está aqui" icon="chatbubbles-outline" onPress={()=>openCreate('pergunta')}/><ShortAction name="Participar de grupos" description="Se aproxime de pessoas com interesses comuns" icon="people-outline" onPress={()=>go('groups')}/></>;
 if(active.page==='inbox')return <><PageHeader eyebrow="CONVERSAS" heading="A conversa continua aqui." detail="Mensagens de demonstração e contatos iniciados nesta sessão."/><CardList>{threads.map(t=><Hit key={t.id} onPress={()=>{setThreads(s=>s.map(x=>x.id===t.id?{...x,unread:0}:x));go('thread',t.id)}} style={sx.threadRow}><Avatar name={t.name} size={47}/><View style={{flex:1}}><Text style={sx.listTitle}>{t.name} {t.unread?'· '+t.unread+' nova(s)':''}</Text><Text style={sx.listSub}>{t.context}</Text><Text numberOfLines={1} style={sx.hint}>{t.last}</Text></View><Text style={sx.listSub}>{t.ago}</Text></Hit>)}</CardList></>;
 if(active.page==='thread'&&thread)return <><View style={sx.chatSafety}><I name="shield-checkmark-outline" color={C.good}/><Text style={sx.tipText}>Não envie senhas ou pagamentos antecipados. Conversa local de demonstração.</Text></View><View style={{minHeight:260,paddingTop:23}}>{thread.messages.length?thread.messages.map((m,i)=><View key={i} style={[sx.bubble,m.from==='me'?sx.bubbleMe:sx.bubbleThem]}><Text style={[sx.bubbleText,m.from==='me'&&{color:C.white}]}>{m.body}</Text><Text style={[sx.bubbleTime,m.from==='me'&&{color:'#CFDDD2'}]}>{m.time}</Text></View>):<Empty title="Comece uma conversa" subtitle="Escreva uma mensagem para simular o contato com esta pessoa." icon="chatbubble-ellipses-outline"/>}</View><View style={sx.messageInput}><TextInput value={message} onChangeText={setMessage} multiline style={sx.messageText} placeholder="Escreva sua mensagem..." placeholderTextColor={C.muted}/><Pressable onPress={sendMessage} style={sx.sendBtn}><I name="send" color={C.white}/></Pressable></View></>;
 if(active.page==='saved')return <><PageHeader eyebrow="SEUS FAVORITOS" heading="Guarde para depois." detail="Salvos nesta sessão de teste."/><Heading>Perguntas</Heading>{cardsQ(allVisible.filter(x=>saved.includes(x.id)))}<Heading>Anúncios</Heading>{cardsL(listingsState.filter(x=>saved.includes(x.id)),true)}{saved.length===0&&<Empty title="Nenhum item salvo" subtitle="Toque na marcação de um anúncio ou pergunta para guardar."/>}</>;
 if(active.page==='requests')return <><PageHeader eyebrow="SOLICITAÇÕES" heading="Seus pedidos de serviço." detail="Simulação local de solicitação e comparação de propostas."/>
 {requests.length?requests.map(r=><View key={r.id} style={sx.requestItem}><Eyebrow>{r.status}</Eyebrow><Text style={sx.listTitle}>{r.provider}</Text><Text style={sx.detailBody}>{r.body}</Text><Heading>Propostas ilustrativas</Heading><View style={sx.offer}><Text style={sx.offerPrice}>R$ 180–260</Text><Text style={sx.listSub}>Proposta exemplo A · Inclui visita</Text></View><View style={sx.offer}><Text style={sx.offerPrice}>R$ 230–310</Text><Text style={sx.listSub}>Proposta exemplo B · Prazo de 2 dias</Text></View><Text style={sx.hint}>Faixas fictícias, sem vínculo com prestadores.</Text><Solid secondary onPress={()=>contact(r.provider,'Pedido de orçamento')}>Conversar sobre o pedido</Solid></View>):<Empty title="Nenhum pedido ainda" subtitle="Abra um serviço e toque em Solicitar orçamento." onAction={()=>{setMarketMode('Serviços');root('market')}} action="Explorar serviços"/>}
 </>;
 if(active.page==='compare')return <><PageHeader eyebrow="DECISÃO DE MORADIA" heading="Compare antes de decidir." detail="Até três imóveis lado a lado por critérios importantes."/>
 {compare.length===0?<Empty title="Escolha imóveis para comparar" subtitle="Nos detalhes de cada imóvel, use Adicionar à comparação." onAction={()=>{setMarketMode('Imóveis');root('market')}} action="Explorar imóveis"/>:listingsState.filter(x=>compare.includes(x.id)).map(x=><View key={x.id} style={sx.compareItem}><Text style={sx.listTitle}>{x.title}</Text><Text style={sx.listSub}>{x.region}</Text><View style={sx.costLine}><Text style={sx.costLabel}>Total mensal</Text><Text style={sx.costVal}>{money(x.price+(x.fee||0))}</Text></View><View style={sx.costLine}><Text style={sx.costLabel}>Quartos · área · vagas</Text><Text style={sx.costVal}>{x.rooms} · {x.area} m² · {x.parking}</Text></View><Hit onPress={()=>addCompare(x.id)} style={sx.reportLink}><I name="close" color={C.brasa}/><Text style={sx.greenText}>Remover da comparação</Text></Hit></View>)}
 </>;
 if(active.page==='settings')return <><PageHeader eyebrow="PREFERÊNCIAS" heading="Como prefere descobrir?" detail="Configurações locais deste laboratório."/><View style={sx.settingsRow}><View style={{flex:1}}><Text style={sx.listTitle}>Priorizar bairros escolhidos</Text><Text style={sx.listSub}>Filtrar conteúdo por bairro na comunidade</Text></View><Host matchContents><Switch value={nearby} onValueChange={setNearby}/></Host></View><View style={sx.settingsRow}><View style={{flex:1}}><Text style={sx.listTitle}>Avisos demonstrativos</Text><Text style={sx.listSub}>Receber alertas dentro do protótipo</Text></View><Host matchContents><Switch value={notifyEnabled} onValueChange={setNotifyEnabled}/></Host></View><Heading>Controle do conteúdo</Heading><ShortAction name="Ver conteúdo ocultado" description={hidden.length+' pergunta(s) oculta(s)'} icon="eye-off-outline" onPress={()=>{setHidden([]);flash('Conteúdos restaurados.')}}/><ShortAction name="Alterar cidade" icon="location-outline" onPress={()=>setSheet('city')}/></>;
 if(active.page==='reports')return <><PageHeader eyebrow="SEGURANÇA" heading="Seus registros locais." detail="Neste protótipo, denúncias não são enviadas a moderadores reais."/><CardList>{reports.length?reports.map((x,i)=><View key={i} style={sx.reportItem}><I name="shield-checkmark-outline" color={C.green}/><View style={{flex:1}}><Text style={sx.listTitle}>Denúncia recebida na demonstração</Text><Text style={sx.listSub}>{x}</Text></View></View>):<Empty title="Nenhuma denúncia registrada" subtitle="Você pode denunciar uma pergunta, anúncio ou grupo." icon="shield-outline"/>}</CardList></>;
 return <Empty title="Esta tela está em preparação" subtitle="Volte para a página anterior."/>;
 };
 const activeLabel:Record<Page,string>={home:'Início',community:'Comunidade',market:'Mercado',profile:'Você',search:'Busca',question:'Pergunta',listing:'Anúncio',provider:'Serviço',group:'Grupo',event:'Encontro',groups:'Grupos',events:'Encontros',guide:'Guia de Manaus',inbox:'Conversas',thread:thread?.name||'Conversa',saved:'Salvos',requests:'Pedidos',compare:'Comparar imóveis',settings:'Configurações',reports:'Denúncias'};
 const sheetBody=()=>{
 if(sheet==='create')return <><Eyebrow>CRIAR NO BIVAQUE</Eyebrow><Text style={sx.sheetTitle}>O que você quer compartilhar?</Text>
 <View style={sx.createKinds}>{([['pergunta','Pergunta','chatbubble-ellipses-outline'],['imovel','Imóvel','home-outline'],['desapego','Desapego','pricetag-outline'],['grupo','Grupo','people-outline'],['encontro','Encontro','calendar-outline']] as [ComposeType,string,IconName][]).map(([id,label,icon])=><Pill key={id} text={label} active={selectedType===id} onPress={()=>setSelectedType(id)}/>)}</View>
 <Text style={sx.fieldLabel}>Título</Text><TextInput value={draftTitle} onChangeText={setDraftTitle} style={sx.field} placeholder={selectedType==='pergunta'?'Ex.: Quem indica um eletricista?':'Escreva um título claro'} placeholderTextColor={C.muted} maxLength={90}/>
 <Text style={sx.fieldLabel}>Detalhes</Text><TextInput value={draftText} onChangeText={setDraftText} multiline style={[sx.field,{height:118,textAlignVertical:'top'}]} placeholder="Contexto, condições ou informações relevantes" placeholderTextColor={C.muted}/>
 <Text style={sx.fieldLabel}>Bairro</Text><View style={sx.wrap}>{neighborhoods.slice(1).map(x=><Pill key={x} small text={x} active={draftRegion===x} onPress={()=>setDraftRegion(x)}/>)}</View>
 {(selectedType==='imovel'||selectedType==='desapego')&&<><Text style={sx.fieldLabel}>{selectedType==='imovel'?'Aluguel mensal':'Preço do item'} (R$)</Text><TextInput keyboardType="numeric" style={sx.field} value={draftPrice} onChangeText={setDraftPrice} placeholder="Ex.: 2100" placeholderTextColor={C.muted}/>{selectedType==='imovel'&&<><Text style={sx.fieldLabel}>Quartos</Text><TextInput keyboardType="numeric" style={sx.field} value={draftRooms} onChangeText={setDraftRooms}/></>}</>}
 <View style={{marginTop:20}}><Solid light onPress={makePost}>Criar nesta demonstração</Solid></View><Text style={sx.footnote}>Sem publicação real. Todos os dados criados ficam apenas na sessão.</Text></>;
 if(sheet==='filters')return <><Text style={sx.sheetTitle}>Filtrar por contexto</Text><Text style={sx.fieldLabel}>Bairro</Text><View style={sx.wrap}>{neighborhoods.map(x=><Pill key={x} small text={x} active={region===x} onPress={()=>setRegion(x)}/>)}</View>
 {marketMode==='Imóveis'&&<><Text style={sx.fieldLabel}>Quartos</Text><View style={sx.wrap}>{[0,1,2,3,4].map(n=><Pill key={n} text={n===0?'Todos':n+'+'} active={minRooms===n} onPress={()=>setMinRooms(n)}/>)}</View><Text style={sx.fieldLabel}>Total mensal máximo</Text><View style={sx.wrap}>{[2000,3000,4000,5000].map(n=><Pill key={n} text={money(n)} active={maxMonthly===n} onPress={()=>setMaxMonthly(n)}/>)}</View></>}
 {active.page==='community'&&<><Text style={sx.fieldLabel}>Categoria</Text><Pills items={['Todos','Serviços','Moradia','Comunidade','Guia']} value={category} onChange={setCategory}/></>}
 <View style={{marginTop:25}}><Solid onPress={()=>setSheet(null)}>Aplicar filtros</Solid></View><Hit onPress={()=>{setRegion('Todos');setMinRooms(0);setMaxMonthly(5000);setCategory('Todos')}} style={sx.reportLink}><Text style={sx.greenText}>Limpar filtros</Text></Hit></>;
 if(sheet==='sort')return <><Text style={sx.sheetTitle}>Ordenar resultados</Text>{['Mais recentes','Menor preço','Maior preço'].map(x=><ShortAction key={x} name={x} icon={sort===x?'radio-button-on':'radio-button-off'} onPress={()=>{setSort(x);setSheet(null)}}/>)}</>;
 if(sheet==='city')return <><Eyebrow>CIDADE ATIVA</Eyebrow><Text style={sx.sheetTitle}>Onde está sua comunidade?</Text><Text style={sx.hint}>Manaus é a única cidade com dados fictícios neste teste.</Text><ShortAction name="Manaus, AM" description="Dados de demonstração disponíveis" icon="location" onPress={()=>{setCity('Manaus');setSheet(null)}}/>{['Brasília','Rio de Janeiro','Natal'].map(x=><ShortAction key={x} name={x} description="Indisponível nesta demonstração" icon="location-outline" onPress={()=>flash('Este laboratório usa apenas dados de Manaus.')}/>)}</>;
 if(sheet==='notifications')return <><Text style={sx.sheetTitle}>Central de avisos</Text><View style={sx.notification}><I name="notifications-outline" color={C.green}/><View style={{flex:1}}><Text style={sx.listTitle}>Bem-vindo ao laboratório</Text><Text style={sx.listSub}>Novidades e conversas são simuladas neste dispositivo.</Text></View></View><Solid onPress={()=>{setReadNotifications(true);setSheet(null)}}>Marcar como lido</Solid></>;
 if(sheet==='request')return <><Eyebrow>PEDIR SERVIÇO</Eyebrow><Text style={sx.sheetTitle}>Conte o que precisa para {target}.</Text><Text style={sx.hint}>O pedido simula um orçamento. Não será enviado a nenhum profissional.</Text><TextInput multiline value={requestText} onChangeText={setRequestText} style={[sx.field,{height:130,textAlignVertical:'top',marginTop:18}]} placeholder="Ex.: instalar três luminárias em apartamento no Parque Dez" placeholderTextColor={C.muted}/><View style={{marginTop:20}}><Solid light onPress={submitRequest}>Registrar pedido</Solid></View></>;
 if(sheet==='report')return <><Eyebrow>CONFIANÇA E SEGURANÇA</Eyebrow><Text style={sx.sheetTitle}>Por que deseja denunciar?</Text>{['Conteúdo impróprio','Suspeita de fraude','Informação falsa','Assédio ou discriminação','Outro motivo'].map(x=><ShortAction key={x} name={(reportReason===x?'✓ ':'')+x} icon="flag-outline" onPress={()=>setReportReason(x)}/>)}
 <View style={{marginTop:20}}><Solid light onPress={sendReport}>Registrar denúncia local</Solid></View><Text style={sx.footnote}>Não há painel de moderação ou envio real neste laboratório.</Text></>;
 if(sheet==='question-actions')return <><Text style={sx.sheetTitle}>Gerenciar conteúdo</Text><ShortAction name="Salvar ou remover dos salvos" icon="bookmark-outline" onPress={()=>{save(target);setSheet(null)}}/><ShortAction name="Ocultar para mim" icon="eye-off-outline" onPress={()=>{hide(target);setSheet(null);back()}}/><ShortAction name="Denunciar" icon="flag-outline" onPress={()=>setSheet('report')}/>
 {questionsState.find(x=>x.id===target)?.author==='Você'&&<ShortAction name="Marcar como resolvida" icon="checkmark-circle-outline" onPress={()=>{setQuestions(s=>s.map(x=>x.id===target?{...x,resolved:true}:x));setSheet(null)}}/>}</>;
 if(sheet==='verify')return <><Eyebrow>SELO DE VERIFICAÇÃO</Eyebrow><Text style={sx.sheetTitle}>Confiança exige contexto.</Text><Text style={sx.detailBody}>Na R72, o selo informa o que foi conferido. Neste laboratório, o selo serve apenas para experimentar a explicação: nenhum nome, identidade ou profissão foi realmente verificado.</Text><Solid onPress={()=>setSheet(null)}>Entendi</Solid></>;
 if(sheet==='contact')return <><Eyebrow>COMPARTILHAR INDICAÇÃO</Eyebrow><Text style={sx.sheetTitle}>Indicação com origem.</Text><Text style={sx.detailBody}>Compartilhe com cuidado: o autor pode contextualizar a recomendação por conversa. Números de telefone não são coletados neste protótipo.</Text><Solid onPress={()=>{setSheet(null);flash('Fluxo de compartilhamento demonstrado sem envio externo.')}}>Concluir demonstração</Solid></>;
 return null;
 };
 return <GestureHandlerRootView style={{flex:1,backgroundColor:'#DDE2DC'}}><SafeAreaProvider><StatusBar backgroundColor={C.paper} barStyle="dark-content"/><SafeAreaView edges={['top','bottom']} style={sx.safe}><View style={[sx.shell,{maxWidth:width>=600?520:undefined}]}>
 {firstRoot?<View style={sx.top}>
 <Hit onPress={()=>setSheet('city')} style={sx.cityBtn}><View style={sx.logo}><Text style={sx.logoLetter}>b</Text></View><View><Eyebrow>SUA CIDADE</Eyebrow><View style={sx.row}><Text style={sx.cityName}>{city}, AM</Text><I name="chevron-down" size={15} color={C.quiet}/></View></View></Hit>
 <View style={sx.row}><Pressable onPress={()=>go('inbox')} style={sx.topIcon} accessibilityLabel="Conversas"><I name="chatbubbles-outline" size={23}/>{threads.some(x=>x.unread>0)&&<View style={sx.topDot}/>}</Pressable><Pressable onPress={()=>setSheet('notifications')} style={sx.topIcon} accessibilityLabel="Avisos"><I name="notifications-outline" size={22}/>{!readNotifications&&<View style={sx.topDot}/>}</Pressable></View></View>
 :<NavBack title={activeLabel[active.page]} onBack={back} action={active.page==='question'&&q?()=>menu(q.id):active.page==='listing'&&listing?()=>askReport(listing.id):undefined} actionIcon="ellipsis-horizontal"/>}
 <ScrollView key={active.page+active.id} style={{flex:1}} contentContainerStyle={[sx.content,{paddingTop:firstRoot?14:22}]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">{body()}<View style={{height:22}}/></ScrollView>
 {firstRoot&&<View style={sx.bottom}>
 {rootTabs.slice(0,2).map(([id,label,icon,activeIcon])=><Pressable key={id} style={sx.tabBtn} onPress={()=>root(id)}><I name={active.page===id?activeIcon:icon} color={active.page===id?C.dark:C.muted} size={23}/><Text style={[sx.tabLabel,active.page===id&&sx.tabActive]}>{label}</Text>{active.page===id&&<View style={sx.tabPill}/>}</Pressable>)}
 <Hit onPress={()=>openCreate('pergunta')} accessibilityLabel="Criar no Bivaque" style={sx.createTab}><I name="add" color={C.white} size={29}/><Text style={{fontSize:10,fontWeight:'800',color:C.white}}>Criar</Text></Hit>
 {rootTabs.slice(2).map(([id,label,icon,activeIcon])=><Pressable key={id} style={sx.tabBtn} onPress={()=>root(id)}><I name={active.page===id?activeIcon:icon} color={active.page===id?C.dark:C.muted} size={23}/><Text style={[sx.tabLabel,active.page===id&&sx.tabActive]}>{label}</Text>{active.page===id&&<View style={sx.tabPill}/>}</Pressable>)}
 </View>}
 {note!==''&&<View style={sx.toast}><Text style={sx.toastText}>{note}</Text><Pressable onPress={()=>setNote('')}><I name="close" color={C.white} size={17}/></Pressable></View>}
 <Sheet visible={!!sheet} title={sheet==='create'?'Criar no Bivaque':undefined} onClose={()=>setSheet(null)}>{sheetBody()}</Sheet>
 </View></SafeAreaView></SafeAreaProvider></GestureHandlerRootView>;
}
const sx=StyleSheet.create({
 safe:{flex:1,alignItems:'center'},shell:{flex:1,width:'100%',backgroundColor:C.paper,overflow:'hidden'},row:{flexDirection:'row',alignItems:'center',gap:6},
 top:{height:79,paddingHorizontal:21,backgroundColor:C.paper,flexDirection:'row',justifyContent:'space-between',alignItems:'center'},cityBtn:{flexDirection:'row',alignItems:'center',gap:11},logo:{height:41,width:41,borderRadius:12,backgroundColor:C.dark,alignItems:'center',justifyContent:'center'},logoLetter:{fontSize:33,fontWeight:'800',color:C.white,marginTop:-4},cityName:{fontSize:16,fontWeight:'800',color:C.dark},topIcon:{height:44,width:43,alignItems:'center',justifyContent:'center'},topDot:{position:'absolute',right:7,top:7,width:7,height:7,borderRadius:6,backgroundColor:C.brasa},
 content:{paddingHorizontal:20,paddingBottom:24},cityHeadline:{marginTop:6},homeTitle:{fontSize:35,lineHeight:40,color:C.ink,fontWeight:'800',letterSpacing:-1.6,marginTop:14,maxWidth:350},serif:{fontFamily:Platform.OS==='web'?'Georgia':'serif',fontWeight:'400',fontStyle:'italic',color:C.green},homeSub:{fontSize:13,color:C.quiet,lineHeight:19,marginTop:9},searchTap:{height:54,backgroundColor:C.white,borderWidth:1,borderColor:C.line,borderRadius:15,paddingHorizontal:14,marginTop:22,marginBottom:17,flexDirection:'row',alignItems:'center',gap:10},searchHint:{flex:1,fontSize:12,color:C.muted},quickQuad:{flexDirection:'row',flexWrap:'wrap',gap:9,marginBottom:20},quickTile:{width:'48.6%',minHeight:87,backgroundColor:C.white,padding:13,borderRadius:15,borderWidth:1,borderColor:C.line,flexDirection:'row',alignItems:'center',gap:9},quickText:{fontSize:12,lineHeight:16,fontWeight:'800',color:C.dark,flex:1},quickIcon:{width:36,height:36,borderRadius:12,backgroundColor:C.sage,alignItems:'center',justifyContent:'center'},
 editorial:{position:'relative',backgroundColor:C.dark,borderRadius:21,padding:22,minHeight:218,overflow:'hidden'},editorialTitle:{fontSize:27,lineHeight:31,fontWeight:'800',letterSpacing:-.8,color:C.white,marginTop:12},editorialSub:{fontSize:12,lineHeight:17,color:'#D0E1D3',marginTop:9},editorialCTA:{flexDirection:'row',alignSelf:'flex-start',alignItems:'center',gap:18,borderWidth:1,borderColor:'#769186',borderRadius:11,padding:11,marginTop:19,zIndex:2},editorialCircle:{position:'absolute',height:170,width:170,borderWidth:26,borderRadius:110,borderColor:'#345346',right:-76,top:32},hScroll:{gap:11,paddingRight:20,paddingBottom:3},
 cardList:{backgroundColor:C.white,borderRadius:16,overflow:'hidden',borderWidth:1,borderColor:C.line},guideTeaser:{marginTop:26,backgroundColor:C.darkBlue,borderRadius:17,padding:22,flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:12},guideTeaserTitle:{fontSize:21,fontWeight:'800',color:C.white,marginTop:10,marginBottom:6},
 pageHeading:{fontSize:32,lineHeight:38,fontWeight:'800',letterSpacing:-1.2,color:C.ink,marginTop:12},info:{fontSize:13,lineHeight:19,color:C.quiet,marginTop:9},createQuestion:{flexDirection:'row',alignItems:'center',gap:12,backgroundColor:C.dark,borderRadius:16,padding:17,marginTop:21},createLabel:{color:C.white,fontSize:14,fontWeight:'800'},createSub:{color:'#D1DFD4',fontSize:11,marginTop:4},groupGrid:{flexDirection:'row',flexWrap:'wrap',gap:12,marginTop:18,justifyContent:'space-between'},
 marketToolbar:{flexDirection:'row',gap:9,marginTop:22,marginBottom:4},toolbarBtn:{borderRadius:11,paddingHorizontal:13,paddingVertical:11,backgroundColor:C.white,borderWidth:1,borderColor:C.line,flexDirection:'row',alignItems:'center',gap:7},toolbarTxt:{fontSize:12,fontWeight:'800',color:C.ink},serviceList:{gap:9},serviceRow:{flexDirection:'row',gap:12,alignItems:'center',padding:13,backgroundColor:C.white,borderRadius:15,borderWidth:1,borderColor:C.line},listTitle:{fontSize:14,fontWeight:'800',color:C.ink,lineHeight:19},listSub:{fontSize:11,color:C.quiet,lineHeight:16,marginTop:3},greenText:{fontSize:11,color:C.green,fontWeight:'800',marginTop:5},mapSketch:{marginTop:13,height:250,backgroundColor:'#E5E7D9',borderRadius:15,padding:17,overflow:'hidden'},mapLines:{flex:1,borderWidth:1,borderColor:'#BBC9BC',borderRadius:80,marginTop:12,transform:[{rotate:'-12deg'}]},mapDistrict:{position:'absolute',backgroundColor:C.dark,borderRadius:12,padding:9},mapPin:{color:C.white,fontSize:11,fontWeight:'800',transform:[{rotate:'12deg'}]},hint:{color:C.muted,fontSize:11,lineHeight:17,marginTop:8},compareAction:{marginTop:18,borderRadius:14,padding:17,backgroundColor:C.sage,flexDirection:'row',alignItems:'center',gap:10},
 profileHeader:{flexDirection:'row',alignItems:'center',gap:15,padding:19,backgroundColor:C.white,borderWidth:1,borderColor:C.line,borderRadius:17},tag:{backgroundColor:C.sage,borderRadius:7,paddingVertical:5,paddingHorizontal:8,alignSelf:'flex-start',marginTop:8},tagText:{fontSize:9,letterSpacing:.7,fontWeight:'800',color:C.green},statRow:{flexDirection:'row',gap:9,marginTop:12},stat:{flex:1,alignItems:'center',padding:17,borderRadius:13,backgroundColor:C.clay},statNumber:{fontSize:24,fontWeight:'800',color:C.dark},statLabel:{fontSize:10,color:C.quiet,marginTop:5},actionMenu:{backgroundColor:C.white,borderRadius:15,overflow:'hidden',borderWidth:1,borderColor:C.line},shortAction:{flexDirection:'row',alignItems:'center',gap:12,padding:16,borderBottomWidth:1,borderColor:C.line},shortIcon:{width:33,height:33,borderRadius:11,backgroundColor:C.sage,justifyContent:'center',alignItems:'center'},shortName:{fontSize:13,fontWeight:'800',color:C.dark},shortDesc:{fontSize:11,color:C.quiet,marginTop:3},demoCaution:{flexDirection:'row',gap:10,alignItems:'flex-start',marginTop:25,padding:14,backgroundColor:C.sage,borderRadius:12},
 searchInput:{flexDirection:'row',alignItems:'center',gap:12,paddingHorizontal:15,backgroundColor:C.white,borderRadius:14,borderWidth:1,borderColor:C.line,height:57},searchField:{flex:1,fontSize:16,color:C.dark,outlineStyle:'none'} as any,exploreGrid:{flexDirection:'row',flexWrap:'wrap',gap:9},exploreItem:{width:'48%',backgroundColor:C.white,borderWidth:1,borderColor:C.line,borderRadius:13,padding:13,minHeight:99,justifyContent:'space-between'},exploreTxt:{fontSize:13,fontWeight:'800',color:C.dark},
 detailHead:{paddingBottom:19,borderBottomWidth:1,borderColor:C.line},detailTitle:{fontSize:29,fontWeight:'800',lineHeight:35,letterSpacing:-.9,color:C.ink,marginTop:13,marginBottom:15},authorLine:{flexDirection:'row',alignItems:'center',gap:10},detailBody:{fontSize:15,lineHeight:24,color:C.quiet,marginVertical:14},detailActions:{flexDirection:'row',gap:9,marginTop:8,marginBottom:12},detailAction:{flex:1,backgroundColor:C.white,borderWidth:1,borderColor:C.line,borderRadius:12,padding:12,alignItems:'center',justifyContent:'center',gap:6},detailActionText:{fontSize:11,fontWeight:'800',color:C.dark},success:{flexDirection:'row',gap:8,backgroundColor:C.sage,borderRadius:10,padding:14,alignItems:'center'},successText:{color:C.good,fontWeight:'800',fontSize:12},answer:{backgroundColor:C.white,borderWidth:1,borderColor:C.line,borderRadius:14,padding:16,marginBottom:10},answerText:{fontSize:13,lineHeight:20,color:C.ink,marginTop:12},useful:{flexDirection:'row',gap:7,alignItems:'center',paddingTop:13},field:{backgroundColor:C.white,borderWidth:1,borderColor:C.line,borderRadius:13,paddingHorizontal:14,paddingVertical:13,fontSize:14,color:C.ink,minHeight:50,marginBottom:12},tip:{flexDirection:'row',alignItems:'flex-start',gap:11,backgroundColor:C.sage,borderRadius:12,padding:14,marginTop:25},tipText:{flex:1,fontSize:11,lineHeight:17,color:C.quiet},
 photoBox:{borderRadius:17,overflow:'hidden'},photoControls:{height:45,backgroundColor:C.clay,paddingHorizontal:12,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},roundIcon:{width:36,height:36,borderRadius:30,backgroundColor:C.white,alignItems:'center',justifyContent:'center'},photoNumber:{fontSize:11,color:C.quiet,fontWeight:'700'},listingKicker:{marginTop:23,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},priceBig:{fontSize:29,fontWeight:'800',color:C.dark},priceSmall:{fontSize:14,fontWeight:'500',color:C.quiet},costLine:{borderBottomWidth:1,borderColor:C.line,flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingVertical:12},costLabel:{fontSize:12,color:C.quiet},costVal:{fontSize:13,color:C.ink,fontWeight:'700'},attributes:{marginTop:20,backgroundColor:C.white,borderWidth:1,borderColor:C.line,borderRadius:14,flexDirection:'row',justifyContent:'space-around',padding:19},attributeVal:{fontSize:12,fontWeight:'800',color:C.dark,marginTop:8},features:{flexDirection:'row',flexWrap:'wrap',gap:8},seller:{flexDirection:'row',alignItems:'center',gap:11,padding:17,marginTop:28,backgroundColor:C.white,borderWidth:1,borderColor:C.line,borderRadius:15},twoButtons:{flexDirection:'row',gap:9,marginTop:15},
 providerCover:{height:207,borderRadius:18,alignItems:'flex-start',justifyContent:'space-between',padding:23},providerStats:{flexDirection:'row',gap:45,marginVertical:20},explain:{padding:15,borderRadius:12,backgroundColor:C.sage,flexDirection:'row',alignItems:'center',gap:11},explainText:{fontSize:12,fontWeight:'800',color:C.green,flex:1},
 groupBanner:{padding:27,minHeight:205,borderRadius:18,justifyContent:'space-between'},groupBannerTitle:{fontSize:32,fontWeight:'800',color:C.white,lineHeight:35,maxWidth:285,marginVertical:20},reportLink:{flexDirection:'row',alignItems:'center',gap:9,alignSelf:'flex-start',paddingVertical:14},eventHero:{borderRadius:17,backgroundColor:C.green,flexDirection:'row',alignItems:'center',gap:20,padding:23,marginBottom:16},eventHeroDay:{fontSize:79,fontWeight:'800',color:C.white},eventHeroName:{fontSize:17,color:C.white,fontWeight:'800',maxWidth:180,marginTop:7},eventFacts:{marginBottom:21,backgroundColor:C.white,borderRadius:15,overflow:'hidden'},
 guideIntro:{minHeight:155,backgroundColor:C.darkBlue,borderRadius:17,padding:23,justifyContent:'space-between'},guideIntroTitle:{fontSize:23,color:C.white,fontWeight:'800',maxWidth:260,marginTop:19},placeRow:{flexDirection:'row',alignItems:'center',gap:16,padding:17,backgroundColor:C.white,borderBottomWidth:1,borderColor:C.line},placeNo:{width:50,height:67,backgroundColor:C.clay,borderRadius:11,alignItems:'center',justifyContent:'center'},placeNoText:{fontSize:23,fontWeight:'800',color:C.dark},
 threadRow:{flexDirection:'row',alignItems:'center',gap:11,padding:15,borderBottomWidth:1,borderColor:C.line},chatSafety:{flexDirection:'row',gap:12,padding:14,backgroundColor:C.sage,borderRadius:12},bubble:{padding:14,borderRadius:14,maxWidth:'82%',marginBottom:11},bubbleMe:{alignSelf:'flex-end',backgroundColor:C.dark,borderBottomRightRadius:3},bubbleThem:{alignSelf:'flex-start',backgroundColor:C.white,borderBottomLeftRadius:3},bubbleText:{fontSize:14,lineHeight:20,color:C.ink},bubbleTime:{fontSize:10,color:C.muted,marginTop:5,textAlign:'right'},messageInput:{flexDirection:'row',alignItems:'center',gap:10,padding:9,backgroundColor:C.white,borderRadius:14,borderWidth:1,borderColor:C.line},messageText:{flex:1,fontSize:14,color:C.ink,maxHeight:100},sendBtn:{width:40,height:40,borderRadius:13,backgroundColor:C.brasa,alignItems:'center',justifyContent:'center'},
 requestItem:{backgroundColor:C.white,borderRadius:16,borderWidth:1,borderColor:C.line,padding:19,marginBottom:13},offer:{backgroundColor:C.clay,padding:14,borderRadius:12,marginBottom:10},offerPrice:{fontWeight:'800',fontSize:16,color:C.dark},compareItem:{padding:18,backgroundColor:C.white,borderRadius:14,borderWidth:1,borderColor:C.line,marginBottom:12},
 settingsRow:{flexDirection:'row',alignItems:'center',padding:17,backgroundColor:C.white,borderBottomWidth:1,borderColor:C.line},reportItem:{flexDirection:'row',alignItems:'center',gap:11,padding:15,borderBottomWidth:1,borderColor:C.line},
 bottom:{height:78,flexDirection:'row',alignItems:'stretch',borderTopWidth:1,borderColor:C.line,backgroundColor:C.white},tabBtn:{flex:1,alignItems:'center',justifyContent:'center',gap:5,position:'relative'},tabLabel:{fontSize:10,fontWeight:'700',color:C.muted},tabActive:{color:C.dark},tabPill:{position:'absolute',top:0,width:21,height:3,borderRadius:3,backgroundColor:C.dark},createTab:{alignItems:'center',justifyContent:'center',width:63,backgroundColor:C.brasa,borderRadius:18,marginHorizontal:2,marginTop:-15,marginBottom:12,shadowColor:C.brasa,shadowOpacity:.2,shadowRadius:12},
 toast:{position:'absolute',bottom:90,left:17,right:17,padding:16,backgroundColor:C.dark,borderRadius:14,flexDirection:'row',gap:9,alignItems:'center',justifyContent:'space-between'},toastText:{fontSize:12,fontWeight:'700',color:C.white,flex:1},
 sheetTitle:{fontSize:26,lineHeight:32,letterSpacing:-.8,fontWeight:'800',color:C.ink,marginTop:10,marginBottom:16},createKinds:{flexDirection:'row',flexWrap:'wrap',gap:8,marginBottom:15},fieldLabel:{fontSize:10,letterSpacing:1.2,fontWeight:'800',color:C.quiet,marginTop:18,marginBottom:9},wrap:{flexDirection:'row',flexWrap:'wrap',gap:8},footnote:{fontSize:11,color:C.muted,lineHeight:16,marginTop:16},notification:{flexDirection:'row',gap:12,alignItems:'center',padding:17,backgroundColor:C.white,borderRadius:15,marginVertical:16}
});
