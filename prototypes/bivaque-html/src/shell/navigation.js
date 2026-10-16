function theme(){let v=state.prefs.appearance;document.documentElement.dataset.theme=v==='auto'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):v;const dark=document.documentElement.dataset.theme==='dark';$('meta[name="theme-color"]').content=dark?'#111415':'#f9f9fb';}
function routeHash(r){return '#'+r.name+(r.id?'/'+encodeURIComponent(r.id):'');}
let globalActionElement=null,navigationPendingContext=null,navigationRenderedCity=state.city,navigationProblem='',navigationGhostDepth=0,navigationGhostParent=null;
const navigationNames=['inicio','comunidade','conversas','conversa','voce','busca','catalogo','negocios','anuncio','negocio','pergunta','grupo','publicacao','evento','agenda','salvos','meus-anuncios','minhas','guia','pedidos','pedido'];
function globalFocusDescriptor(el=document.activeElement){
 while(el?.shadowRoot?.activeElement)el=el.shadowRoot.activeElement;
 while(el&&!el.dataset?.action&&!(el.id&&el.getRootNode()===document)){el=el.parentElement||el.getRootNode()?.host;}
 return el?{id:el.id||'',action:el.dataset?.action||'',value:el.dataset?.value||''}:null;
}
function globalFocus(action,value='',scope=document){
 const target=$$('[data-action]',scope).find(x=>x.dataset.action===action&&(x.dataset.value||'')===value);
 if(target)requestAnimationFrame(()=>target.isConnected&&target.focus({preventScroll:true}));return !!target;
}
function navigationFocus(descriptor){
 let target=descriptor?.id?document.getElementById(descriptor.id):null;
 if(!target&&descriptor?.action)target=$$('[data-action]').find(x=>x.dataset.action===descriptor.action&&(x.dataset.value||'')===descriptor.value);
 if(!target||target.closest('[hidden],[inert]'))target=$('h1',root)||$('#page');
 if(target){if(!target.matches('button,input,textarea,a,[data-action]'))target.tabIndex=-1;requestAnimationFrame(()=>target.isConnected&&target.focus({preventScroll:true}));}
}
function navigationContext(){return {route:{...route},city:navigationRenderedCity,origin,scroll:root.scrollTop,focus:globalFocusDescriptor(globalActionElement?.isConnected?globalActionElement:document.activeElement),filters:{communityTab,questionFilter,catalogFilter,searchType,searchQuery,searchHood,searchMin,searchMax,searchSort,bizCat,bizQuery,myAdsFilter,savedType}};}
function navigationRestore(context){
 if(!context)return;
 if(CITY_NAMES.includes(context.city))state.city=context.city;
 origin=['inicio','comunidade','conversas','voce'].includes(context.origin)?context.origin:'inicio';
 const f=context.filters||{};
 communityTab=f.communityTab??communityTab;questionFilter=f.questionFilter??questionFilter;catalogFilter=f.catalogFilter??catalogFilter;searchType=f.searchType??searchType;searchQuery=f.searchQuery??searchQuery;searchHood=f.searchHood??searchHood;searchMin=f.searchMin??searchMin;searchMax=f.searchMax??searchMax;searchSort=f.searchSort??searchSort;bizCat=['Todos',...GROUP_NAMES].includes(f.bizCat)?f.bizCat:bizCat;bizQuery=f.bizQuery??bizQuery;myAdsFilter=f.myAdsFilter??myAdsFilter;savedType=f.savedType??savedType;
}
function parseRoute(){
 const [path,query]=location.hash.slice(1).split('?'),parts=path.split('/'),name=parts[0]||'inicio';navigationProblem='';
 let id=null;try{id=parts[1]?decodeURIComponent(parts[1]):null;}catch{navigationProblem='O endereço contém um identificador inválido.';}
 if(!navigationNames.includes(name)||parts.length>2)navigationProblem='Este endereço não corresponde a uma página do protótipo.';
 const city=new URLSearchParams(query||'').get('cidade');if(CITY_NAMES.includes(city))state.city=city;
 const context=history.state?.navigation;if(context&&context.route?.name===name&&context.route?.id===id)navigationRestore(context);
 return {name:navigationProblem?'indisponivel':name,id};
}
function navigate(name,id=null,{replace=false,keepScroll=false,returnOverlay=''}={}){
 closeCreateMenu(false);
 const source=navigationPendingContext&&routeHash(navigationPendingContext.route)===routeHash(route)?navigationPendingContext:navigationContext();navigationPendingContext=null;if(returnOverlay)source.overlay=returnOverlay;
 try{history.replaceState({...history.state,bivaque:true,navigation:source},'',location.href);}catch{}
 scrollPositions.set(routeHash(route),root.scrollTop);navMinimized=false;lastNavY=0;
 if(['inicio','comunidade','conversas','voce'].includes(name))origin=name;
 navigationGhostDepth=0;navigationGhostParent=null;navigationProblem=navigationNames.includes(name)?'':'Este destino não está disponível no protótipo.';route={name:navigationProblem?'indisponivel':name,id};const hash=routeHash(route);try{history[replace?'replaceState':'pushState']({bivaque:true,parent:replace?history.state?.parent:source.route,navigation:{...navigationContext(),route:{...route},city:state.city,scroll:keepScroll?root.scrollTop:0,focus:null,overlay:null}},'',hash);}catch{location.hash=hash;}
 render();if(!['inicio','comunidade','conversas','voce'].includes(name))animatePage(1);if(!keepScroll)root.scrollTop=0;
 if(name!=='conversa'&&name!=='busca')navigationFocus(null);
}
function animatePage(direction){if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;$('#page')?.animate([{transform:`translateX(${direction*56}px)`,opacity:0},{transform:'none',opacity:1}],{duration:420,easing:'cubic-bezier(.2,0,0,1)'});}
function back(){if(createOpen){closeCreateMenu();return;}if(dialog.open){closeDialog();return;}if(history.state?.parent){const depth=history.state.reloadedOverlayDepth||0;navigationGhostDepth=0;navigationGhostParent=null;history.go(-(depth+1));}else{const fallback={conversa:'conversas',salvos:'voce','meus-anuncios':'voce',evento:'agenda',anuncio:'catalogo',negocio:'negocios',pergunta:'comunidade',minhas:'comunidade',grupo:'comunidade',publicacao:'comunidade',guia:'inicio',agenda:'inicio',pedido:'pedidos',pedidos:'voce'};const destination={name:fallback[route.name]||origin||'inicio',id:null};messagingPrepareBack(destination);navigate(destination.name,null,{replace:true});}}
window.addEventListener('popstate',()=>{if(lightboxClosingHistory){lightboxClosingHistory=false;return;}if($('#lightbox')){closeLightbox(true,false);return;}if(createClosingHistory){createClosingHistory=false;createHistoryDone?.();createHistoryDone=null;createHistoryPromise=null;return;}if(confirmClosingHistory){confirmClosingHistory=false;confirmHistoryDone?.();confirmHistoryDone=null;confirmHistoryPromise=null;return;}if(dialogClosingHistory){dialogClosingHistory=false;dialogHistoryDone?.();dialogHistoryDone=null;dialogHistoryPromise=null;return;}if(navigationSkipReloadedOverlay())return;if(confirmDialog.open){confirmDialog.close();return;}if(createOpen){closeCreateMenu(true,false);return;}if(dialog.open){if(dialog.dataset.kind==='onboarding'&&onboardStep>1){onboardStep--;pushDialogHistory();renderOnboarding();return;}if(editorDirty)pushDialogHistory();closeDialog(false,false);return;}scrollPositions.set(routeHash(route),root.scrollTop);const destination=parseRoute(),context=history.state?.navigation;messagingPrepareBack(destination);route=destination;navMinimized=false;render();animatePage(-1);root.scrollTop=context?.scroll??scrollPositions.get(routeHash(route))??0;lastNavY=root.scrollTop;navigationGhostDepth=history.state?.reloadedOverlayDepth||0;navigationGhostParent=history.state?.parent||null;if(route.name!=='conversa')navigationFocus(context?.focus);if(context?.overlay&&typeof profileRestoreOverlay==='function'){profileRestoreOverlay(context.overlay);Promise.resolve(dialogOpenPromise).then(()=>navigationFocus(context.focus));}});
function titleForRoute(){return ({inicio:'Bivaque',comunidade:'Comunidade',conversas:'Conversas',voce:'Você',busca:'Buscar',catalogo:'Desapegos e imóveis',negocios:'Negócios locais',anuncio:'Anúncio',negocio:'Negócio local',pergunta:'Indicação',grupo:'Grupo',publicacao:'Publicação',evento:'Encontro',agenda:'Agenda da cidade',salvos:'Salvos','meus-anuncios':'Meus anúncios',guia:`Guia de ${state.city}`,conversa:'Conversa',minhas:'Minhas indicações',pedidos:'Pedidos de serviço',pedido:'Pedido de serviço'})[route.name]||'Bivaque';}
function activeTab(){if(['inicio','comunidade','conversas','voce'].includes(route.name))return route.name;if(route.name==='conversa')return 'conversas';if(['grupo','publicacao','pergunta','minhas'].includes(route.name))return 'comunidade';if(['salvos','meus-anuncios'].includes(route.name))return 'voce';return origin;}
function shell(){
 const rootPage=['inicio','comunidade','conversas','voce'].includes(route.name);const notices=state.notices.filter(n=>n.city===state.homeCity&&n.unread).length, chats=state.threads.filter(t=>t.city===state.city&&!t.deleted&&t.unread).length;
 $('#topbar').innerHTML=`<div class="topbar-in"><div class="row grow">${rootPage?`<span class="brand">${mark()}${route.name==='inicio'?'Bivaque':esc(titleForRoute())}</span>`:`${iconBtn('arrow_back','back','','Voltar')}<span class="top-title grow">${esc(titleForRoute())}</span>`}</div><div class="row">${btn(state.city,'city','','text','expand_more').replace('<md-text-button','<md-text-button class="city-chip"')}${route.name==='inicio'?`<span class="notice-button">${iconBtn('notifications','notices','','Avisos')}${notices?`<span class="badge">${notices}</span>`:''}</span>`:iconBtn('search','search','','Buscar')}</div></div>`;
 $('#topbar').classList.toggle('searching',route.name==='busca');document.body.classList.toggle('search-mode',route.name==='busca');
 if(route.name==='busca')$('#topbar').innerHTML=`<div class="search-topbar">${iconBtn('arrow_back','back','','Voltar')}<md-filled-text-field id="search-query" class="search-input" type="search" placeholder="Buscar no Bivaque" aria-label="Buscar no Bivaque" value="${esc(searchQuery)}" autofocus>${icon('search','leading-icon')}${iconBtn('close','clear-search','','Limpar busca').replace('<md-icon-button','<md-icon-button slot="trailing-icon"')}</md-filled-text-field></div>`;
 $('#nav').innerHTML=`<div class="rail-brand">${mark()}</div>${[['inicio','home','Início'],['comunidade','forum','Comunidade'],['conversas','chat_bubble','Conversas'],['voce','person','Você']].map(([n,ic,label])=>`<button type="button" class="nav-item" data-action="nav" data-value="${n}" ${activeTab()===n?'aria-current="page"':''}><span class="nav-icon">${icon(ic,'',activeTab()===n)}${n==='conversas'&&chats?`<span class="badge">${chats}</span>`:''}</span><span>${label}</span></button>`).join('')}<div class="rail-tools">${iconBtn('tune','prototype','','Controles do protótipo')}${iconBtn('settings','settings','','Configurações')}</div>`;
 syncMobileNavigation();$('#fab').disabled=readonly();
 $('#detail-actions').hidden=true;root.classList.remove('detail');
}
function actionsBar(html){$('#detail-actions').innerHTML=`<div class="detail-actions-in">${html}</div>`;$('#detail-actions').hidden=false;root.classList.add('detail');}
function syncMobileNavigation(){
 const mobile=innerWidth<720,rootPage=['inicio','comunidade','conversas','voce'].includes(route.name);
 $('#nav').hidden=mobile&&!rootPage;$('#nav').classList.toggle('minimized',mobile&&rootPage&&navMinimized);$('#nav').inert=(mobile&&(!rootPage||navMinimized))||createOpen||paletteIsOpen()||Boolean($('#lightbox'));
 $('#fab').hidden=mobile&&!rootPage;$('#fab').classList.toggle('compact',mobile&&rootPage&&navMinimized);
 document.body.classList.toggle('mobile-detail',mobile&&!rootPage);
}
root.addEventListener('scroll',()=>{
 const y=root.scrollTop;if(innerWidth<720&&!createOpen&&['inicio','comunidade','conversas','voce'].includes(route.name)){
  if(y>lastNavY+6&&y>140)navMinimized=true;else if(y<lastNavY-6||y<60)navMinimized=false;syncMobileNavigation();
 }lastNavY=y;
},{passive:true});
function remember(type,id){state.lastViewed={type,id,city:state.city};try{localStorage.setItem(KEY,JSON.stringify(state));}catch{};}
function render(){const flight=motionBeforeRender();ensureTurma();theme();navigationRenderedCity=state.city;shell();const f={inicio:renderHome,catalogo:renderCatalog,negocios:renderBusinesses,comunidade:renderCommunity,anuncio:renderItem,negocio:renderBusiness,pergunta:renderQuestion,grupo:renderGroup,publicacao:renderPost,evento:renderEvent,agenda:renderAgenda,voce:renderProfile,salvos:renderSaved,'meus-anuncios':renderMyAds,minhas:renderMineQuestions,conversas:renderThreads,conversa:renderChat,busca:renderSearch,guia:renderGuide,pedidos:renderRequests,pedido:renderRequest}[route.name]||(()=>empty('Página indisponível',navigationProblem||'Confira o endereço ou volte ao início.','link_off','home','Ir para o início'));root.innerHTML=`<div class="page ${route.name==='conversa'?'chat-page':''}" id="page">${f()}</div>`;bindScreen();document.title=`${titleForRoute()} · Bivaque`;motionAfterRender(flight);}
function readonlyHtml(){return readonly()?`<div class="context-strip readonly">${icon('visibility')}<span class="grow">Você está conhecendo <b>${esc(state.city)}</b>. Sua cidade atual é ${esc(state.homeCity)}.</span>${btn('Voltar','home-city','','text')}</div>`:'';}
function navigationSkipReloadedOverlay(){if(!navigationGhostDepth)return false;const depth=navigationGhostDepth,parent=navigationGhostParent;navigationGhostDepth=0;navigationGhostParent=null;const destination=parseRoute();if(parent&&navigationNames.includes(parent.name)&&routeHash(destination)===routeHash(route)){history.go(-depth);return true;}return false;}
