// Rodada 41: no celular, a folha do bairro fica sobre o mapa sem cobri-lo (referências: Vaul;
// Swiggy e Mindtrip, no Mobbin). Abre baixa, com uma linha compacta por anúncio; puxando, sobe até
// a metade (cartões) e até a tela cheia. O mapa continua tocável: outro marcador troca o bairro.
// No desktop e no tablet, a folha do bairro continua sendo o diálogo (openHoodSheet).
var hoodPanel=null;
const HOOD_STOPS=['low','half','full'];
function hoodStopHeight(stop){return stop==='low'?248:stop==='half'?Math.round(innerHeight*.58):innerHeight-76;}
function hoodCompactRow(x,kind){
 const p=image(x.photos?.[0]),meta=kind==='imovel'?[x.beds?`${x.beds} ${x.beds===1?'quarto':'quartos'}`:'',x.area?`${x.area} m²`:''].filter(Boolean).join(' · '):[x.cond,x.cat].filter(Boolean).join(' · ');
 return `<button type="button" class="hp-row" data-action="open-item" data-value="${x.id}">${p?`<img src="${p}" alt="">`:`<span class="hp-noimg">${icon(x.icon||'image')}</span>`}<span class="hp-txt"><span class="price">${money(x.numPrice)}${x.per?'<small> / mês</small>':''}</span><b>${esc(x.title)}</b><small>${esc(meta||x.hood)}</small></span>${icon('chevron_right')}</button>`;
}
function hoodPanelHtml(){
 const {hood,stop}=hoodPanel,kind=catalogKind(),list=filteredItems(kind).filter(x=>x.hood===hood);
 const body=!list.length?`<p class="small muted">Nenhum anúncio neste bairro com esses filtros.</p>`:stop==='low'?`${hoodCompactRow(list[0],kind)}${list.length>1?`<p class="hp-more">Puxe para ver os ${list.length} anúncios</p>`:''}`:`<div class="hp-cards">${list.map(photoCard).join('')}</div>`;
 const more=stop==='full'?'Mostrar menos do bairro':'Mostrar mais do bairro';
 return `<div class="hp-top"><button type="button" class="hp-grab" data-action="hood-panel-stop" aria-label="${more}"></button><div class="hp-head"><h2 id="hp-title" tabindex="-1">${esc(hood)}</h2><small>${esc(countWord(list.length,kind))} com os filtros que você escolheu</small></div>${iconBtn('close','hood-panel-close','',`Fechar ${hood}`)}</div><div class="hp-body">${body}</div><div class="hp-foot">${btn('Ver só este bairro na lista','map-hood-list',hood,'text','list')}</div>`;
}
function hoodPinsSync(){for(const pin of $$('.cmap-pin'))pin.classList.toggle('on',pin.dataset.value===hoodPanel?.hood);}
function renderHoodPanel(focus=false){
 let el=$('#hood-panel');
 if(!el){el=document.createElement('section');el.id='hood-panel';el.className='hood-panel';el.setAttribute('role','region');document.body.appendChild(el);bindHoodPanelDrag(el);}
 // Redesenhar (ex.: ao salvar um anúncio) mantém a rolagem e o foco de quem está na folha.
 const keep=el.dataset.stop===hoodPanel.stop?{x:el.querySelector('.hp-cards')?.scrollLeft||0,y:el.querySelector('.hp-body')?.scrollTop||0}:null,act=el.contains(document.activeElement)?globalFocusDescriptor(document.activeElement):null;
 el.dataset.stop=hoodPanel.stop;el.setAttribute('aria-labelledby','hp-title');el.innerHTML=hoodPanelHtml();
 if(keep){const c=el.querySelector('.hp-cards'),b=el.querySelector('.hp-body');if(c)c.scrollLeft=keep.x;if(b)b.scrollTop=keep.y;}
 if(act?.action){const t=[...el.querySelectorAll('[data-action]')].find(x=>x.dataset.action===act.action&&(x.dataset.value||'')===act.value);t?.focus({preventScroll:true});}
 document.body.classList.add('hood-open');hoodPinsSync();
 if(focus)requestAnimationFrame(()=>$('#hp-title')?.focus({preventScroll:true}));
}
var hoodClosingHistory=false;
function openHoodPanel(hood){
 if(!hoodPanel)try{history.pushState({...history.state,bivaque:true,hood:true,overlayDepth:(history.state?.overlayDepth||0)+1},'',location.href);}catch{}
 const same=hoodPanel?.hood===hood;hoodPanel={hood,stop:same?hoodPanel.stop:'low',back:document.activeElement};renderHoodPanel(true);
 // O bairro escolhido vai para o centro da parte do mapa que fica acima da folha.
 if(HOOD_POINTS[hood])catalogMap?.easeTo?.({center:HOOD_POINTS[hood],offset:[0,-hoodStopHeight(hoodPanel.stop)/2],duration:matchMedia('(prefers-reduced-motion: reduce)').matches?0:450});
}
function closeHoodPanel(restore=true,dropHistory=true){
 if(!hoodPanel)return;
 if(dropHistory&&history.state?.hood){hoodClosingHistory=true;history.back();}
 const back=hoodPanel?.back;hoodPanel=null;$('#hood-panel')?.remove();document.body.classList.remove('hood-open');hoodPinsSync();
 if(restore&&back?.isConnected)back.focus({preventScroll:true});
}
function setHoodStop(stop){if(!hoodPanel)return;if(hoodPanel.stop!==stop)haptic(6);hoodPanel.stop=stop;renderHoodPanel();}
// Depois de cada desenho: a folha some fora do mapa e acompanha filtros e salvos.
function syncHoodPanel(){
 if(!hoodPanel)return;
 if(!$('#catalog-map')||innerWidth>=720){closeHoodPanel(false,false);return;}
 renderHoodPanel();
}
function bindHoodPanelDrag(el){
 let d=null;
 el.addEventListener('pointerdown',e=>{const top=e.target.closest('.hp-top');if(!top||e.target.closest('md-icon-button')||e.button>0)return;d={id:e.pointerId,y:e.clientY,h:el.getBoundingClientRect().height,t:performance.now(),moved:false};});
 el.addEventListener('pointermove',e=>{
  if(!d||e.pointerId!==d.id)return;const dy=e.clientY-d.y;if(!d.moved&&Math.abs(dy)<6)return;
  if(!d.moved){d.moved=true;try{el.setPointerCapture(e.pointerId);}catch{}}
  el.style.transition='none';el.style.height=`${Math.max(60,Math.min(hoodStopHeight('full'),d.h-dy))}px`;
 });
 const end=e=>{
  if(!d||e.pointerId!==d.id)return;const cur=d;d=null;if(!cur.moved)return;
  const dy=e.clientY-cur.y,v=dy/Math.max(1,performance.now()-cur.t),h=cur.h-dy;el.style.transition='';el.style.height='';
  // O clique que o mouse gera ao soltar não aciona o puxador. O dedo não gera clique depois de
  // arrastar; por isso o supressor só existe para o mouse e não engole o próximo toque.
  if(e.pointerType==='mouse')el.addEventListener('click',ev=>{ev.stopPropagation();ev.preventDefault();},{capture:true,once:true});
  if(e.type==='pointercancel'){renderHoodPanel();return;}
  if(h<150||(v>.8&&hoodPanel?.stop==='low')){closeHoodPanel();return;}
  let i=HOOD_STOPS.map(s=>Math.abs(hoodStopHeight(s)-h)).reduce((b,x,k,a)=>x<a[b]?k:b,0);
  const from=HOOD_STOPS.indexOf(hoodPanel.stop);if(Math.abs(v)>.5&&i===from)i=Math.min(2,Math.max(0,from+(v<0?1:-1)));
  setHoodStop(HOOD_STOPS[i]);
 };
 el.addEventListener('pointerup',end);el.addEventListener('pointercancel',end);
}
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&hoodPanel&&!e.defaultPrevented&&!createOpen&&!$('#filter-panel')?.open&&!dialog.open&&!confirmDialog.open&&!$('#lightbox')){e.preventDefault();closeHoodPanel();}});
addEventListener('resize',()=>{if(hoodPanel&&innerWidth>=720)closeHoodPanel(false);},{passive:true});
// Voltar do sistema: recolhe a folha; uma entrada da folha que sobrou (saiu do mapa por outra rota) é pulada.
function hoodPopstate(){
 if(hoodClosingHistory){hoodClosingHistory=false;return true;}
 if(hoodPanel){closeHoodPanel(true,false);return true;}
 if(history.state?.hood){history.back();return true;}
 return false;
}
async function hoodPanelAction(action){
 if(action==='hood-panel-close'){closeHoodPanel();return true;}
 if(action==='hood-panel-stop'){setHoodStop(HOOD_STOPS[(HOOD_STOPS.indexOf(hoodPanel?.stop||'low')+1)%3]);$('#hood-panel .hp-grab')?.focus({preventScroll:true});return true;}
 return false;
}
