function openCreate(anchor=$('#fab'),customChoices=null,contextMenu=false){
 if(createHistoryPromise){createHistoryPromise.then(()=>openCreate(anchor,customChoices,contextMenu));return;}
 if(createOpen){closeCreateMenu();return;}
 createAnchor=anchor;createOpen=true;createFocusIndex=0;
 const choices=customChoices||[
  ['volunteer_activism','Pedir indicação','ask',''],
  ['sell','Anunciar desapego','create-item',''],
  ['apartment','Anunciar imóvel','create-property',''],
  ['add_business','Indicar um negócio','indicate','Quem você já contrata e confia'],
  ['event','Criar encontro','create-event','Com local, data e horário'],
  ['storefront','Divulgar meu negócio','my-biz','']
 ];
 const popup=$('#create-menu');popup.classList.toggle('context-menu',contextMenu);popup.setAttribute('aria-label',contextMenu?'Ações do anúncio':'Criar publicação');$('#create-scrim').classList.toggle('context-menu',contextMenu);
 popup._closing?.cancel();popup.style.pointerEvents='';
 popup.innerHTML=choices.map(([ic,title,action,sub,value])=>`<md-filled-tonal-button type="button" class="create-menu-action" role="menuitem" data-action="${action}"${value!==undefined?` data-value="${esc(value)}"`:''}>${icon(ic,'icon')}<span class="create-menu-label">${esc(title)}${sub?`<span class="create-menu-sub">${esc(sub)}</span>`:''}</span></md-filled-tonal-button>`).join('');
 // The pinned Material button delegates its aria properties but does not
 // render role on its inner button. Preserve the menu's accessible semantics.
 for(const item of $$('md-filled-tonal-button',popup))item.updateComplete.then(()=>item.shadowRoot?.querySelector('button')?.setAttribute('role','menuitem'));
 if(contextMenu){const preview=anchor.cloneNode(true);preview.className='context-preview';preview.id='context-preview';preview.inert=true;preview.removeAttribute('data-action');preview.removeAttribute('data-value');$$('[id],[data-action]',preview).forEach(e=>{e.removeAttribute('id');e.removeAttribute('data-action');});document.body.appendChild(preview);}
 popup.hidden=false;$('#create-scrim').hidden=false;
 anchor.classList.add('create-expanded');anchor.setAttribute('aria-expanded','true');anchor.setAttribute('aria-haspopup','menu');anchor.setAttribute('aria-controls','create-menu');
 $('#main').inert=true;$('#nav').inert=true;$('#topbar').inert=true;
 // Toolbar actions can also open this menu, so retain the anchor's focus.
 if(anchor.id!=='fab')$('#topbar').inert=false;
 try{history.pushState({bivaque:true,createMenu:true},'',location.href);}catch{}
 requestAnimationFrame(()=>{
  if(!createOpen||createAnchor!==anchor)return;
  placeCreateMenu();popup.classList.add('open');$('#create-scrim').classList.add('open');
  popup.querySelector('md-filled-tonal-button')?.focus({preventScroll:true});
 });
}
function placeCreateMenu(){
 if(!createOpen||!createAnchor)return;const popup=$('#create-menu'),a=createAnchor.getBoundingClientRect(),w=Math.min(262,innerWidth-24),h=popup.offsetHeight;
 const above=a.top>innerHeight/2;const left=Math.max(12,Math.min(innerWidth-w-12,a.right-w));
 let top=above?a.top-h-10:a.bottom+12;top=Math.max(12,Math.min(innerHeight-h-12,top));
 const preview=$('#context-preview');if(preview){preview.style.width=a.width+'px';preview.style.left=Math.max(12,Math.min(innerWidth-a.width-12,a.left))+'px';const ph=preview.offsetHeight,py=Math.max(12,Math.min(a.top,innerHeight-h-ph-36));preview.style.top=py+'px';top=Math.min(innerHeight-h-12,py+ph+12);}
 popup.style.width=w+'px';popup.style.left=left+'px';popup.style.top=top+'px';popup.style.transformOrigin=above?'right bottom':'left top';
}
function closeCreateMenu(restoreFocus=true,dropHistory=true){
 if(!createOpen)return createHistoryPromise||Promise.resolve();createOpen=false;const popup=$('#create-menu');popup.classList.remove('open');popup.style.pointerEvents='none';$('#create-scrim').classList.remove('open');$('#create-scrim').hidden=true;
 if(matchMedia('(prefers-reduced-motion: reduce)').matches)popup.hidden=true;else{popup._closing=popup.animate([{transform:'none',opacity:1},{transform:'scale(.6)',opacity:0}],{duration:200,easing:'cubic-bezier(.3,0,1,1)',fill:'forwards'});popup._closing.finished.then(()=>{if(!createOpen)popup.hidden=true;}).catch(()=>{});}
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
 if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){
  e.preventDefault();const items=$$('md-filled-tonal-button',$('#create-menu'));
  createFocusIndex=e.key==='Home'?0:e.key==='End'?items.length-1:(createFocusIndex+(e.key==='ArrowDown'?1:-1)+items.length)%items.length;
  items[createFocusIndex]?.focus({preventScroll:true});
 }
});
window.addEventListener('resize',()=>{if(createOpen)placeCreateMenu();syncMobileNavigation();});
