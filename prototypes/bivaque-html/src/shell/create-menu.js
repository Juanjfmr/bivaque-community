let createReturnDescriptor=null;
// Rodada 13: no desktop, o botão Criar se desdobra num painel (referências: Create Button
// da Motion no 21st.dev; painéis de criação do Mixpanel e do Craft no Mobbin). Celular e
// menus de contexto continuam com a pilha de botões original.
const createPanelMQ=matchMedia('(min-width:1024px)');
const CREATE_PANEL_CHOICES=[
 ['volunteer_activism','Pedir indicação','ask','A comunidade indica quem é bom','cp-community'],
 ['build','Contratar serviço','create-request','','cp-service'],
 ['sell','Anunciar desapego','create-item','Venda o que não vai levar','cp-market'],
 ['apartment','Anunciar imóvel','create-property','Aluguel ou venda na cidade','cp-market'],
 ['add_business','Indicar um negócio','indicate','Quem você já contrata e confia','cp-community'],
 ['event','Criar encontro','create-event','Com local, data e horário','cp-event'],
 ['storefront','Divulgar meu negócio','my-biz','Crie a página e receba pedidos da comunidade','cp-biz']
];
function createPanelHtml(){return `<div class="cp-head"><div><h2 id="cp-title">Criar no Bivaque</h2><p>O que você quer publicar ou pedir?</p></div><kbd class="cp-kbd" aria-hidden="true" title="Atalho: tecla C">C</kbd><button type="button" class="cp-close" tabindex="-1" aria-label="Fechar" title="Fechar (Esc)">${icon('close')}<md-ripple></md-ripple></button></div><div class="cp-grid" role="menu" aria-labelledby="cp-title">${CREATE_PANEL_CHOICES.map(([ic,title,action,sub,tone],i)=>`<button type="button" class="create-menu-action cp-item${action==='my-biz'?' cp-wide':''}" role="menuitem" data-action="${action}" style="--i:${i}"><md-ripple></md-ripple><md-focus-ring></md-focus-ring><span class="cp-ico ${tone}">${icon(ic)}</span><span class="cp-txt"><b>${esc(title)}${action==='create-request'?'<span class="cp-new">Novo</span>':''}</b><small>${esc(sub||`Receba até ${REQUEST_LIMIT} propostas`)}</small></span></button>`).join('')}</div>`;}
function openCreate(anchor=$('#fab'),customChoices=null,contextMenu=false){
 if(createHistoryPromise){createHistoryPromise.then(()=>openCreate(anchor,customChoices,contextMenu));return;}
 if(createOpen){closeCreateMenu();return;}
 createAnchor=anchor;createReturnDescriptor=globalFocusDescriptor(anchor);createOpen=true;createFocusIndex=0;
 const choices=customChoices||[
  ['volunteer_activism','Pedir indicação','ask',''],
  ['build','Contratar serviço','create-request','Propostas de empresas do ramo'],
  ['sell','Anunciar desapego','create-item',''],
  ['apartment','Anunciar imóvel','create-property',''],
  ['add_business','Indicar um negócio','indicate','Quem você já contrata e confia'],
  ['event','Criar encontro','create-event','Com local, data e horário'],
  ['storefront','Divulgar meu negócio','my-biz','']
 ];
 const panel=!customChoices&&!contextMenu&&anchor?.id==='fab'&&createPanelMQ.matches;
 const popup=$('#create-menu');popup.classList.toggle('context-menu',contextMenu);popup.classList.toggle('create-panel',panel);popup.setAttribute('role',panel?'dialog':'menu');popup.setAttribute('aria-label',contextMenu?'Ações do anúncio':'Criar publicação');$('#create-scrim').classList.toggle('context-menu',contextMenu);
 popup._closing?.cancel();popup.style.pointerEvents='';delete popup.dataset.placed;
 popup.innerHTML=panel?createPanelHtml():choices.map(([ic,title,action,sub,value])=>`<md-filled-tonal-button type="button" class="create-menu-action" role="menuitem" data-action="${action}"${value!==undefined?` data-value="${esc(value)}"`:''}>${icon(ic,'icon')}<span class="create-menu-label">${esc(title)}${sub?`<span class="create-menu-sub">${esc(sub)}</span>`:''}</span></md-filled-tonal-button>`).join('');
 // The pinned Material button delegates its aria properties but does not
 // render role on its inner button. Preserve the menu's accessible semantics.
 popup.querySelector('.cp-close')?.addEventListener('click',()=>closeCreateMenu());
 for(const item of $$('md-filled-tonal-button',popup))item.updateComplete.then(()=>item.shadowRoot?.querySelector('button')?.setAttribute('role','menuitem'));
 if(contextMenu){const preview=anchor.cloneNode(true);preview.className='context-preview';preview.id='context-preview';preview.inert=true;preview.removeAttribute('data-action');preview.removeAttribute('data-value');$$('[id],[data-action]',preview).forEach(e=>{e.removeAttribute('id');e.removeAttribute('data-action');});document.body.appendChild(preview);}
 popup.hidden=false;$('#create-scrim').hidden=false;
 anchor.classList.add('create-expanded');anchor.setAttribute('aria-expanded','true');anchor.setAttribute('aria-haspopup',panel?'dialog':'menu');anchor.setAttribute('aria-controls','create-menu');
 $('#main').inert=true;$('#nav').inert=true;$('#topbar').inert=true;
 // Toolbar actions can also open this menu, so retain the anchor's focus.
 if(anchor.id!=='fab')$('#topbar').inert=false;
 try{history.pushState({...history.state,bivaque:true,createMenu:true,overlayDepth:(history.state?.overlayDepth||0)+1},'',location.href);}catch{}
 requestAnimationFrame(()=>{
  if(!createOpen||createAnchor!==anchor)return;
  placeCreateMenu();popup.classList.add('open');$('#create-scrim').classList.add('open');
  if(panel)createPanelMorph(popup,anchor,false);
  popup.querySelector('.create-menu-action')?.focus({preventScroll:true});
 });
}
function placeCreateMenu(){
 if(!createOpen||!createAnchor)return;const popup=$('#create-menu'),a=createAnchor.getBoundingClientRect();
 if(popup.classList.contains('create-panel')){const w=Math.min(620,innerWidth-24);popup.style.width=w+'px';const h=popup.offsetHeight;popup.style.left=Math.max(12,Math.min(innerWidth-w-12,a.left))+'px';popup.style.top=Math.max(12,Math.min(innerHeight-h-12,a.top))+'px';popup.style.transformOrigin='left top';popup.dataset.placed='';return;}
 const w=Math.min(262,innerWidth-24),h=popup.offsetHeight;
 const above=a.top>innerHeight/2,center=createAnchor.id==='fab'&&innerWidth<720;const left=Math.max(12,Math.min(innerWidth-w-12,center?a.left+a.width/2-w/2:a.right-w));popup.style.justifyItems=center?'center':'';
 let top=above?a.top-h-10:a.bottom+12;top=Math.max(12,Math.min(innerHeight-h-12,top));
 const preview=$('#context-preview');if(preview){preview.style.width=a.width+'px';preview.style.left=Math.max(12,Math.min(innerWidth-a.width-12,a.left))+'px';const ph=preview.offsetHeight,py=Math.max(12,Math.min(a.top,innerHeight-h-ph-36));preview.style.top=py+'px';top=Math.min(innerHeight-h-12,py+ph+12);}
 popup.style.width=w+'px';popup.style.left=left+'px';popup.style.top=top+'px';popup.style.transformOrigin=above?(center?'center bottom':'right bottom'):'left top';
}
function closeCreateMenu(restoreFocus=true,dropHistory=true){
 if(!createOpen)return createHistoryPromise||Promise.resolve();createOpen=false;const popup=$('#create-menu');popup.classList.remove('open');popup.style.pointerEvents='none';$('#create-scrim').classList.remove('open');$('#create-scrim').hidden=true;
 if(matchMedia('(prefers-reduced-motion: reduce)').matches)popup.hidden=true;else if(popup.classList.contains('create-panel')){popup._closing=createPanelMorph(popup,createAnchor,true);if(popup._closing)popup._closing.finished.then(()=>{if(!createOpen)popup.hidden=true;}).catch(()=>{});else popup.hidden=true;}else{popup._closing=popup.animate([{transform:'none',opacity:1},{transform:'scale(.6)',opacity:0}],{duration:200,easing:'cubic-bezier(.3,0,1,1)',fill:'forwards'});popup._closing.finished.then(()=>{if(!createOpen)popup.hidden=true;}).catch(()=>{});}
 $('#context-preview')?.remove();
 const anchor=createAnchor;createAnchor=null;anchor?.classList.remove('create-expanded');anchor?.setAttribute('aria-expanded','false');
 $('#main').inert=false;$('#nav').inert=false;$('#topbar').inert=false;
 syncMobileNavigation();
 if(dropHistory&&history.state?.createMenu){createClosingHistory=true;createHistoryPromise=new Promise(resolve=>createHistoryDone=resolve);history.back();}
 if(restoreFocus&&anchor?.isConnected)anchor.focus({preventScroll:true});
 return createHistoryPromise||Promise.resolve();
}
$('#create-scrim').addEventListener('click',()=>closeCreateMenu());
document.addEventListener('keydown',e=>{
 if(!createOpen)return;
 if(e.key==='Escape'){e.preventDefault();closeCreateMenu();return;}
 if(['Tab','ArrowDown','ArrowUp','Home','End'].includes(e.key)){
  e.preventDefault();const items=$$('.create-menu-action',$('#create-menu')).filter(x=>!x.disabled);if(!items.length)return;
  let active=document.activeElement;while(active?.shadowRoot?.activeElement)active=active.shadowRoot.activeElement;
  const current=items.findIndex(item=>item===active||item.shadowRoot?.contains(active));
  createFocusIndex=e.key==='Home'?0:e.key==='End'?items.length-1:((current<0?0:current)+(e.key==='ArrowUp'||e.key==='Tab'&&e.shiftKey?-1:1)+items.length)%items.length;
  items[createFocusIndex]?.focus({preventScroll:true});
 }
});
window.addEventListener('resize',()=>{if(createOpen&&$('#create-menu').classList.contains('create-panel')&&!createPanelMQ.matches)closeCreateMenu(false);else if(createOpen)placeCreateMenu();syncMobileNavigation();});
// O painel se desdobra a partir do retângulo do botão (clip-path) e volta a ele ao fechar.
function createPanelMorph(popup,anchor,closing){
 const a=anchor?.getBoundingClientRect(),p=popup.getBoundingClientRect();
 const from=a?`inset(${Math.max(0,a.top-p.top)}px ${Math.max(0,p.right-a.right)}px ${Math.max(0,p.bottom-a.bottom)}px ${Math.max(0,a.left-p.left)}px round 18px)`:'inset(0 round 28px)',to='inset(0px 0px 0px 0px round 28px)';
 if(matchMedia('(prefers-reduced-motion: reduce)').matches||!a)return null;
 return popup.animate(closing?[{clipPath:to,opacity:1},{clipPath:from,opacity:0}]:[{clipPath:from,opacity:.6},{clipPath:to,opacity:1}],{duration:closing?220:420,easing:closing?'cubic-bezier(.3,0,.8,.15)':'cubic-bezier(.2,0,0,1)',fill:closing?'forwards':'none'});
}
// Atalho do desktop: a tecla C abre o Criar, fora de campos de texto e de diálogos.
document.addEventListener('keydown',e=>{
 if((e.key!=='c'&&e.key!=='C')||e.ctrlKey||e.metaKey||e.altKey||e.repeat||e.isComposing||e.defaultPrevented||createOpen||!createPanelMQ.matches||dialog.open||confirmDialog.open||readonly()||paletteIsOpen()||$('#lightbox')||$('#filter-panel')?.open)return;
 if(e.composedPath().some(el=>el.matches?.('input,textarea,select,[contenteditable],md-outlined-text-field,md-filled-text-field,md-outlined-select')))return;
 const fab=$('#fab');if(!fab||fab.hidden||fab.disabled||!fab.getClientRects().length)return;e.preventDefault();openCreate(fab);
});
// O atalho só existe no desktop: anunciado a leitores de tela só lá.
const syncCreateShortcut=()=>{const fab=$('#fab');if(!fab)return;if(createPanelMQ.matches)fab.setAttribute('aria-keyshortcuts','C');else fab.removeAttribute('aria-keyshortcuts');};
createPanelMQ.addEventListener('change',syncCreateShortcut);syncCreateShortcut();
