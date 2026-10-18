function theme(){let v=state.prefs.appearance;document.documentElement.dataset.theme=v==='auto'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):v;const dark=document.documentElement.dataset.theme==='dark';$('meta[name="theme-color"]').content=dark?'#111415':'#f9f9fb';}
function routeHash(r){return '#'+r.name+(r.id?'/'+encodeURIComponent(r.id):'');}
let globalActionElement=null,navigationPendingContext=null,navigationRenderedCity=state.city,navigationProblem='',navigationGhostDepth=0,navigationGhostParent=null;
const navigationNames=['inicio','comunidade','conversas','conversa','voce','busca','catalogo','desapegos','imoveis','negocios','anuncio','negocio','pergunta','grupo','publicacao','evento','agenda','salvos','meus-anuncios','minhas','guia','pedidos','pedido','dono','entrar','privacidade','conduta','ocultados','bloqueados','ajuda','contato','chamados','apagar-conta'];
function globalFocusDescriptor(el=document.activeElement){
 while(el?.shadowRoot?.activeElement)el=el.shadowRoot.activeElement;
 while(el&&!el.dataset?.action&&!(el.id&&el.getRootNode()===document)){el=el.parentElement||el.getRootNode()?.host;}
 return el?{id:el.id||'',action:el.dataset?.action||'',value:el.dataset?.value||''}:null;
}
function globalFocus(action,value='',scope=document){
 // Com cópias do mesmo botão (ex.: o ⋮ da barra no celular e o da página no desktop), o foco vai
 // para a que está à vista; a escolha espera o quadro seguinte, quando a tela nova já foi desenhada.
 const matches=$$('[data-action]',scope).filter(x=>x.dataset.action===action&&(x.dataset.value||'')===value);
 if(matches.length)requestAnimationFrame(()=>{const target=matches.find(x=>x.isConnected&&x.getClientRects().length)||matches[0];if(target.isConnected)target.focus({preventScroll:true});});return matches.length>0;
}
function navigationFocus(descriptor){
 let target=descriptor?.id?document.getElementById(descriptor.id):null;
 if(!target&&descriptor?.action){const all=$$('[data-action]').filter(x=>x.dataset.action===descriptor.action&&(x.dataset.value||'')===descriptor.value);target=all.find(x=>x.getClientRects().length)||all[0]||null;}
 if(!target||target.closest('[hidden],[inert]'))target=$('h1',root)||$('#page');
 if(target){if(!target.matches('button,input,textarea,a,[data-action]'))target.tabIndex=-1;requestAnimationFrame(()=>target.isConnected&&target.focus({preventScroll:true}));}
}
function navigationContext(){return {route:{...route},city:navigationRenderedCity,who:state.profile.email||'',origin,scroll:root.scrollTop,focus:globalFocusDescriptor(globalActionElement?.isConnected?globalActionElement:document.activeElement),filters:{communityTab,questionFilter,catalogFilter,catalogAttrs:structuredClone(catalogAttrs),searchType,searchQuery,searchHood,searchMin,searchMax,searchSort,bizCat,bizQuery,myAdsFilter,savedType}};}
function navigationRestore(context){
 if(!context)return;
 // A cidade consultada só volta para a mesma conta: depois de concluir a entrada, o histórico de
 // antes não troca a cidade de quem acabou de entrar.
 if(CITY_NAMES.includes(context.city)&&(context.who===undefined||context.who===(state.profile.email||'')))state.city=context.city;
 origin=['inicio','comunidade','conversas','voce'].includes(context.origin)?context.origin:'inicio';
 const f=context.filters||{};
 communityTab=f.communityTab??communityTab;questionFilter=f.questionFilter??questionFilter;catalogFilter=f.catalogFilter??catalogFilter;if(f.catalogAttrs?.desapego&&f.catalogAttrs?.imovel)catalogAttrs={desapego:{...structuredClone(CATALOG_DEFAULTS.desapego),...f.catalogAttrs.desapego},imovel:{...structuredClone(CATALOG_DEFAULTS.imovel),...f.catalogAttrs.imovel}};searchType=f.searchType??searchType;searchQuery=f.searchQuery??searchQuery;searchHood=f.searchHood??searchHood;searchMin=f.searchMin??searchMin;searchMax=f.searchMax??searchMax;searchSort=f.searchSort??searchSort;bizCat=['Todos',...GROUP_NAMES].includes(f.bizCat)?f.bizCat:bizCat;bizQuery=f.bizQuery??bizQuery;myAdsFilter=f.myAdsFilter??myAdsFilter;savedType=f.savedType??savedType;
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
function back(){if(createOpen){closeCreateMenu();return;}if(dialog.open){closeDialog();return;}if(hoodPanel){closeHoodPanel();return;}if(history.state?.parent){const depth=history.state.reloadedOverlayDepth||0;navigationGhostDepth=0;navigationGhostParent=null;history.go(-(depth+1));}else{const fallback={conversa:'conversas',salvos:'voce','meus-anuncios':'voce',evento:'agenda',anuncio:itemById(route.id)?.kind==='imovel'?'imoveis':'desapegos',negocio:'negocios',pergunta:'comunidade',minhas:'comunidade',grupo:'comunidade',publicacao:'comunidade',guia:'inicio',agenda:'inicio',pedido:'pedidos',pedidos:'voce',privacidade:'voce',conduta:'voce',ocultados:'voce',bloqueados:'voce',ajuda:route.id?'ajuda':'voce',contato:'ajuda',chamados:'ajuda','apagar-conta':'voce'};const destination={name:fallback[route.name]||origin||'inicio',id:null};messagingPrepareBack(destination);navigate(destination.name,null,{replace:true});}}
window.addEventListener('popstate',()=>{if(hoodPopstate())return;if(filterClosingHistory){filterClosingHistory=false;return;}if($('#filter-panel')?.open){closeFilterPanel(true,false);return;}if(lightboxClosingHistory){lightboxClosingHistory=false;return;}if($('#lightbox')){closeLightbox(true,false);return;}if(createClosingHistory){createClosingHistory=false;createHistoryDone?.();createHistoryDone=null;createHistoryPromise=null;return;}if(confirmClosingHistory){confirmClosingHistory=false;confirmHistoryDone?.();confirmHistoryDone=null;confirmHistoryPromise=null;return;}if(dialogClosingHistory){dialogClosingHistory=false;dialogHistoryDone?.();dialogHistoryDone=null;dialogHistoryPromise=null;return;}if(navigationSkipReloadedOverlay())return;if(confirmDialog.open){confirmDialog.close();return;}if(createOpen){closeCreateMenu(true,false);return;}if(dialog.open){if(editorDirty)pushDialogHistory();closeDialog(false,false);return;}scrollPositions.set(routeHash(route),root.scrollTop);const destination=parseRoute(),context=history.state?.navigation;messagingPrepareBack(destination);route=destination;navMinimized=false;render();animatePage(-1);root.scrollTop=context?.scroll??scrollPositions.get(routeHash(route))??0;lastNavY=root.scrollTop;navigationGhostDepth=history.state?.reloadedOverlayDepth||0;navigationGhostParent=history.state?.parent||null;if(route.name!=='conversa')navigationFocus(context?.focus);if(context?.overlay&&typeof profileRestoreOverlay==='function'){profileRestoreOverlay(context.overlay);Promise.resolve(dialogOpenPromise).then(()=>navigationFocus(context.focus));}});
function titleForRoute(){return ({entrar:'Bivaque',dono:'Painel do Bivaque',inicio:'Bivaque',comunidade:'Comunidade',conversas:'Conversas',voce:'Você',busca:'Buscar',catalogo:catalogKind()==='imovel'?'Imóveis':'Desapegos',desapegos:'Desapegos',imoveis:'Imóveis',negocios:'Negócios locais',anuncio:'Anúncio',negocio:'Negócio local',pergunta:'Indicação',grupo:'Grupo',publicacao:'Publicação',evento:'Encontro',agenda:'Agenda da cidade',salvos:'Salvos','meus-anuncios':'Meus anúncios',guia:`Guia de ${state.city}`,conversa:'Conversa',minhas:'Minhas indicações',pedidos:'Pedidos de serviço',pedido:'Pedido de serviço',privacidade:'Política de privacidade',conduta:'Código de conduta',ocultados:'Ocultados',bloqueados:'Pessoas bloqueadas',ajuda:'Ajuda',contato:'Fale com a gente',chamados:'Meus chamados','apagar-conta':'Apagar a conta'})[route.name]||'Bivaque';}
function activeTab(){if(['inicio','comunidade','conversas','voce'].includes(route.name))return route.name;if(route.name==='conversa')return 'conversas';if(['grupo','publicacao','pergunta','minhas'].includes(route.name))return 'comunidade';if(['salvos','meus-anuncios','ocultados','bloqueados','privacidade','conduta','ajuda','contato','chamados','apagar-conta'].includes(route.name))return 'voce';return origin;}
function shell(){
 // Rodada 49: o Painel do Bivaque tem a própria navegação; a do app sai de cena.
 document.body.classList.toggle('owner-mode',route.name==='dono');
 document.body.classList.toggle('entry-mode',entryChrome());
 const rootPage=['inicio','comunidade','conversas','voce'].includes(route.name);const notices=state.notices.filter(n=>n.city===state.homeCity&&n.unread).length, chats=state.threads.filter(t=>t.city===state.city&&!t.deleted&&t.unread).length;
 $('#topbar').innerHTML=`<div class="topbar-in"><div class="row grow">${rootPage?`<span class="brand">${mark()}<span class="brand-text">${route.name==='inicio'?'Bivaque':esc(titleForRoute())}</span></span>`:`${iconBtn('arrow_back','back','','Voltar')}${chatTopTitle()||`<span class="top-title grow">${esc(titleForRoute())}</span>`}`}</div><div class="row">${btn(state.city,'city','','text','expand_more').replace('<md-text-button','<md-text-button class="city-chip"')}${route.name==='inicio'?`<span class="notice-button">${iconBtn('notifications','notices','','Avisos')}${notices?`<span class="badge">${notices}</span>`:''}</span>`:chatTopActions()||questionTopActions()||iconBtn('search','search','','Buscar')}</div></div>`;
 // Abaixo de 1024 px a cidade fica no título da Início; vendo outra cidade, ela volta para a barra.
 $('#topbar').classList.toggle('away',readonly()&&route.name!=='inicio');
 $('#topbar').classList.toggle('searching',route.name==='busca');document.body.classList.toggle('search-mode',route.name==='busca');
 if(route.name==='busca')$('#topbar').innerHTML=`<div class="search-topbar">${iconBtn('arrow_back','back','','Voltar')}<md-filled-text-field id="search-query" class="search-input" type="search" inputmode="search" placeholder="Buscar no Bivaque" aria-label="Buscar no Bivaque" value="${esc(searchQuery)}" autofocus>${icon('search','leading-icon')}${iconBtn('close','clear-search','','Limpar busca').replace('<md-icon-button','<md-icon-button slot="trailing-icon"')}</md-filled-text-field></div>`;
 $('#nav').innerHTML=`<div class="rail-brand">${mark()}</div>${[['inicio','Início'],['comunidade','Comunidade'],['conversas','Conversas'],['voce','Você']].map(([n,label])=>`${n==='conversas'?'<span class="nav-create-slot" aria-hidden="true">Criar</span>':''}<button type="button" class="nav-item" data-action="nav" data-value="${n}" ${activeTab()===n?'aria-current="page"':''}><span class="nav-icon">${navIcon(n)}${n==='conversas'&&chats?`<span class="badge">${chats}</span>`:''}</span><span>${label}</span></button>`).join('')}<div class="rail-tools">${iconBtn('tune','prototype','','Controles do protótipo')}${iconBtn('settings','settings','','Configurações')}</div>`;
 $('#nav .nav-create-slot')?.addEventListener('click',()=>$('#fab').click());syncMobileNavigation();$('#fab').disabled=readonly();requestAnimationFrame(syncTopTitle);
 $('#detail-actions').hidden=true;root.classList.remove('detail');
}
function actionsBar(html){$('#detail-actions').innerHTML=`<div class="detail-actions-in">${html}</div>`;$('#detail-actions').hidden=false;root.classList.add('detail');}
// Rodada 35: ícones da barra em SVG próprio (traço de 1,9 px, cantos arredondados; desenho
// baseado no Lucide, licença ISC). A aba ativa ganha preenchimento leve; Você mostra as iniciais.
var NAV_SVG={inicio:'<path class="f" d="M3 10a2 2 0 0 1 .7-1.5l7-6a2 2 0 0 1 2.6 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M15 21v-7a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v7"/>',comunidade:'<path class="f" d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle class="f" cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',conversas:'<path class="f" d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/><path d="M8 12h.01M12 12h.01M16 12h.01" stroke-width="2.6"/>'};
function navIcon(n){if(n==='voce')return `<span class="nav-avatar" aria-hidden="true">${esc(initals(state.profile?.name||''))}</span>`;return `<svg class="nav-svg" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${NAV_SVG[n]}</svg>`;}
// Rodada 36: no celular, o título da barra só aparece quando o título grande da página passa
// por baixo dela (referências: Apple Mail e Mensagens, no Mobbin). Sem título grande, fica visível.
// Rodada 37: na conversa, a barra mostra com quem se fala e o assunto (referências: Luma, Fresha e
// Insight Timer, no Mobbin). No celular o cabeçalho da página sai da vista e o ⋮ vai para a barra.
function chatTopTitle(){const t=route.name==='conversa'&&messagingThread(route.id);if(!t)return '';return `<span class="top-title grow tb-desk-title">${esc(titleForRoute())}</span><span class="top-title top-chat grow"><span class="avatar" aria-hidden="true">${esc(t.ini||initals(t.who))}</span><span class="top-chat-txt"><b>${esc(t.who)}</b><small>${esc(threadTitle(t))}</small></span></span>`;}
function chatTopActions(){const t=route.name==='conversa'&&messagingThread(route.id);if(!t)return '';return `<span class="tb-desk">${iconBtn('search','search','','Buscar')}</span><span class="tb-phone">${iconBtn('more_vert','thread-menu',t.id,'Opções da conversa')}</span>`;}
function syncTopTitle(){
 const bar=$('#topbar'),h=$('#main .page-head h1');if(!bar)return;
 // Rodada 38: no celular, anúncio e negócio abrem com a foto até o topo e a barra transparente por
 // cima (referências: Swiggy, talabat e Insight Timer, no Mobbin); a barra volta ao rolar a foto.
 const hero=$('#main .detail-hero'),immersive=innerWidth<720&&hero&&['anuncio','negocio'].includes(route.name);
 document.body.classList.toggle('immersive',Boolean(immersive));
 bar.classList.toggle('bar-solid',Boolean(immersive)&&hero.getBoundingClientRect().bottom<=bar.getBoundingClientRect().bottom);
 const dock=innerWidth<720&&h&&!['inicio','busca','conversa'].includes(route.name);
 bar.classList.toggle('title-hides',Boolean(dock));if(!dock){bar.classList.remove('title-docked');return;}
 bar.classList.toggle('title-docked',h.getBoundingClientRect().bottom<=bar.getBoundingClientRect().bottom+4);
}
function syncMobileNavigation(){
 const mobile=innerWidth<720,rootPage=['inicio','comunidade','conversas','voce'].includes(route.name);
 $('#nav').hidden=mobile&&!rootPage;$('#nav').classList.toggle('minimized',mobile&&rootPage&&navMinimized);$('#nav').inert=(mobile&&(!rootPage||navMinimized))||createOpen||paletteIsOpen()||Boolean($('#lightbox'));
 $('#fab').hidden=mobile&&!rootPage;$('#fab').classList.toggle('compact',mobile&&rootPage&&navMinimized);
 document.body.classList.toggle('mobile-detail',mobile&&!rootPage);
}
root.addEventListener('scroll',()=>{
 const y=root.scrollTop;if(innerWidth<720&&!createOpen&&['inicio','comunidade','conversas','voce'].includes(route.name)){
  if(y>lastNavY+6&&y>140)navMinimized=true;else if(y<lastNavY-6||y<60)navMinimized=false;syncMobileNavigation();
 }lastNavY=y;syncTopTitle();
},{passive:true});
var chatWide=innerWidth>=720;
addEventListener('resize',()=>{syncTopTitle();const wide=innerWidth>=720;if(wide!==chatWide){chatWide=wide;if(route.name==='conversa')render();}},{passive:true});
function remember(type,id){state.lastViewed={type,id,city:state.city};try{localStorage.setItem(KEY,JSON.stringify(state));}catch{};}
// Rodada 53: quem saiu só vê a landing; quem está dentro não fica nela.
function entryGate(){const out=!!state.signedOut,welcome=!out&&route.name==='entrar'&&route.id==='boas-vindas';if(welcome||legalRoute()||supportRoute()||out===(route.name==='entrar'))return;route={name:out?'entrar':'inicio',id:null};try{history.replaceState(history.state,'',out?'#entrar':'#inicio');}catch{}}
function render(){entryGate();entryDraftPrune();const flight=motionBeforeRender();ensureTurma();theme();navigationRenderedCity=state.city;shell();const f={inicio:renderHome,catalogo:renderCatalog,desapegos:renderCatalog,imoveis:renderCatalog,negocios:renderBusinesses,comunidade:renderCommunity,anuncio:renderItem,negocio:renderBusiness,pergunta:renderQuestion,grupo:renderGroup,publicacao:renderPost,evento:renderEvent,agenda:renderAgenda,voce:renderProfile,salvos:renderSaved,'meus-anuncios':renderMyAds,minhas:renderMineQuestions,conversas:renderThreads,conversa:renderChat,busca:renderSearch,guia:renderGuide,pedidos:renderRequests,pedido:renderRequest,privacidade:renderLegal,conduta:renderLegal,ocultados:renderHidden,bloqueados:renderBlocked,ajuda:renderHelp,contato:renderContact,chamados:renderTickets,'apagar-conta':renderDeleteAccount,dono:renderOwner,entrar:renderEntry}[route.name]||(()=>empty('Página indisponível',navigationProblem||'Confira o endereço ou volte ao início.','link_off','home','Ir para o início'));root.innerHTML=`<div class="page ${route.name==='conversa'?'chat-page':route.name==='dono'?'owner-page':entryChrome()?'entry-page':''}" id="page">${f()}</div>`;bindScreen();document.title=`${titleForRoute()} · Bivaque`;motionAfterRender(flight);animateCounts(root);segmentsAfterRender(root);catalogMapAfterRender();pagedWatch();if(route.name==='entrar'){bindEntry();bindEntryCity();}}
function readonlyHtml(){return readonly()?`<div class="context-strip readonly">${icon('visibility')}<span class="grow">Você está conhecendo <b>${esc(state.city)}</b>. Sua cidade atual é ${esc(state.homeCity)}.</span>${btn('Voltar','home-city','','text')}</div>`:'';}
function navigationSkipReloadedOverlay(){if(!navigationGhostDepth)return false;const depth=navigationGhostDepth,parent=navigationGhostParent;navigationGhostDepth=0;navigationGhostParent=null;const destination=parseRoute();if(parent&&navigationNames.includes(parent.name)&&routeHash(destination)===routeHash(route)){history.go(-depth);return true;}return false;}
