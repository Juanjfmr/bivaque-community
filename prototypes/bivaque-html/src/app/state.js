let groupQuery='',groupFilter='all',postDraft=null,groupDraft=null,interestsDraft=null;
function initial(stage='live'){
 const src=structuredClone(stage==='seed'?SOURCE.seed:SOURCE.live);
 const items=src.items.map((x,i)=>({...x,city:'Manaus',numPrice:Number(x.price.replace(/\D/g,'')),photos:PHOTO_BY_ITEM[x.id]?[PHOTO_BY_ITEM[x.id]]:[],status:'active',createdAt:Date.now()-(i+1)*36e5,area:x.id==='i2'?98:x.id==='i5'?70:null,beds:x.id==='i2'?3:x.id==='i5'?2:null,parking:x.id==='i2'?2:x.id==='i5'?1:null,condo:x.id==='i2'?720:x.id==='i5'?480:0,demo:true}));
 src.plan.chegando.forEach(x=>{x.go={c1:['filter','imovel'],c2:['search','escola'],c3:['search','pediatra'],c4:['search','mudança'],c5:['search','despachante'],c6:['groups']}[x.id];x.s={c1:items.filter(i=>i.kind==='imovel'&&i.status==='active').length+' imóveis para consultar',c2:'Busque experiências da comunidade sobre a rotina escolar',c3:'Confirme disponibilidade e cobertura com o serviço',c4:'Compare propostas, coleta e entrega',c5:'Organize transporte e documentação',c6:'Conheça os membros dos grupos de chegada'}[x.id]||x.s;});
 src.plan.saindo.forEach(x=>{x.go={s1:['publish','desapego'],s2:['publish','imovel'],s3:['my-questions'],s4:['destination']}[x.id];x.s={s1:'Publique os itens e acompanhe os contatos',s2:'Anuncie a disponibilidade e as características do imóvel',s3:'Sua experiência ajuda as próximas famílias',s4:'Consulte o guia da sua cidade de destino'}[x.id]||x.s;if(x.id==='s4')x.t='Conhecer a cidade de destino';});
 const biz=src.biz.map(x=>({...x,city:'Manaus',photos:[PHOTO_BY_BIZ[x.id]||'service'],views:0,quoteRequests:0,demo:true}));
 const asks=src.asks.map((a,i)=>({...a,city:'Manaus',createdAt:Date.now()-(i+1)*864e5,answers:a.answers.map(x=>({...x,id:uid('a')})),following:!!a.following}));
 if(stage!=='seed') SOURCE.memory.forEach((m,i)=>asks.push({id:'mem'+i,q:m.q,city:'Manaus',topic:{saude:'Saúde',escola:'Escolas',casa:'Casa',carro:'Carro',pets:'Pets',mudanca:'Mudança'}[m.cat],who:'Comunidade de Manaus',ini:'CM',status:m.st==='ok'?'ok':'open',when:'no arquivo da cidade',ctx:'Indicação preservada pela comunidade',createdAt:Date.now()-(i+8)*864e5,mine:false,fromMemory:true,keywords:m.k,answers:[{id:'ma'+i,who:'Relato da comunidade',ini:'CM',t:KNOWLEDGE_TEXT[m.cat],biz:MEMORY_BIZ[m.cat],solved:m.st==='ok',helped:0,liked:false}],demo:true}));
 return {schema:2,stage,homeCity:'Manaus',city:'Manaus',mode:src.mode,dest:src.dest,arrival:dateISO(23),leaveDate:dateISO(41),incoming:stage==='seed'?0:14,profile:{name:'Rafael Souza',role:'ativa',force:'Aeronáutica',verified:true,interests:[]},prefs:{appearance:'auto',digest:true,cap:3,showHood:true,familyOnly:true},items,biz,asks,groups:buildGroups(stage),leftAuto:[],events:src.events.map((e,i)=>({...e,city:'Manaus',date:dateISO(5+i*2),time:'09:00',description:'Um encontro da comunidade para trocar experiências e conhecer vizinhos.',mine:false,createdAt:Date.now()})),threads:src.threads.map(t=>({...t,city:'Manaus',snapshot:threadSnapshot(t,items,biz),msgs:t.msgs.map(x=>({...x,at:Date.now()}))})),notices:src.notices.map(n=>({...n,city:'Manaus'})),myBiz:null,reports:[],invites:[],drafts:[],lastViewed:null,recent:[],plan:src.plan,subscription:{tier:'free',month:dateISO().slice(0,7),repliedThreadIds:[]},test:{demoReplies:false},onboarded:true};
}
function threadSnapshot(t,items,biz){const x=t.about.type==='item'?items.find(i=>i.id===t.about.id):biz.find(b=>b.id===t.about.id);return x?{title:x.title||x.name,photo:x.photos?.[0],price:x.price,city:x.city}:null;}
let state;
try{const raw=JSON.parse(localStorage.getItem(KEY));state=normalizeListings(normalizeCategories(raw?.schema===2?raw:initial()));}catch{state=normalizeListings(normalizeCategories(initial()));}
let route={name:'inicio',id:null};
let origin='inicio', communityTab='ind', questionFilter='help', catalogFilter='all', searchType='all', searchQuery='', searchHood='Todos', searchMin='', searchMax='', searchSort='recent',bizCat='Todos',bizQuery='',myAdsFilter='active',savedType='all';
let editor=null,editorDirty=false,toastTimer,toastUndo=null,searchTimer;
let createOpen=false,createAnchor=null,createFocusIndex=0,createClosingHistory=false,createHistoryDone=null,createHistoryPromise=null;
let navMinimized=false,lastNavY=0;
let dialogClosingHistory=false,dialogHistoryDone=null,dialogHistoryPromise=null;
let confirmClosingHistory=false,confirmHistoryDone=null,confirmHistoryPromise=null;
const scrollPositions=new Map();
const root=$('#main'),dialog=$('#dialog'),confirmDialog=$('#confirm-dialog');
const USER_ID='local-member';
function mutate(fn,{redraw=true}={}){
 const before=JSON.stringify(state);
 try{fn();localStorage.setItem(KEY,JSON.stringify(state));}catch(e){state=JSON.parse(before);notify('Não foi possível salvar. Libere espaço no navegador ou use fotos menores.','error');return false;}
 if(redraw)render();return true;
}
// Rodada 60: quem a pessoa bloqueou some das listas, da busca e dos detalhes (o nome é a identidade no protótipo).
const isBlocked=name=>!!name&&(state.blocked||[]).some(b=>b.name===name);
// Só pessoas se bloqueiam: nunca a própria conta, nem "Relato da comunidade" e outros autores de exemplo (nome + inicial).
const blockable=name=>!!name&&name!==state.profile?.name&&/^[^\s.]+( [^\s.]+\.)?$/.test(name);
function cityItems(){return state.items.filter(x=>x.city===state.city&&(x.mine||!isBlocked(x.seller)));}
function cityBiz(){return (state.myBiz?.live?[state.myBiz,...state.biz]:state.biz).filter(x=>x.city===state.city&&!x.suspended&&!x.paused);}
function cityAsks(){return state.asks.filter(x=>x.city===state.city&&!x.hidden&&!x.hiddenByMe&&(x.mine||!isBlocked(x.who)));}
// Respostas e comentários que a pessoa vê: sem os de quem bloqueou e sem os removidos pela moderação.
const askAnswers=q=>q.answers.filter(a=>!a.hidden&&(a.mine||!isBlocked(a.who)));
const groupPosts=g=>g.posts.filter(p=>p.mine||!isBlocked(p.author));
const postComments=p=>p.comments.filter(c=>!c.hidden&&(c.mine||!isBlocked(c.author)));
function cityGroups(){return state.groups.filter(x=>x.city===state.city);}
const itemById=id=>state.items.find(x=>x.id===id);
const bizById=id=>(state.myBiz?.id===id?state.myBiz:state.biz.find(x=>x.id===id));
const askById=id=>state.asks.find(x=>x.id===id);
const threadById=id=>state.threads.find(x=>x.id===id);
const readonly=()=>state.city!==state.homeCity;
function canPost(){
 if(state.signedOut)return false;
 if(readonly()){notify(`Você está consultando ${state.city}. Publique na sua cidade, ${state.homeCity}.`,'info');return false;}
 if(!state.profile.verified){showDialog('Perfil em análise','<p class="form-note">Publicar libera quando a equipe aprovar seu perfil. Nada foi publicado.</p>',btn('Voltar','close-dialog','','filled'),'unverified');return false;}return true;
}
function accessibleRecord(record){return record&&record.city===state.city;}
