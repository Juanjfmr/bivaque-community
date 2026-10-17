// Rodada 31: mapa de bairros em Imóveis e Desapegos (referências do Mobbin: Luma e Rakuten).
// Dependências externas escolhidas pelo usuário em 2026-10-16: MapLibre GL JS (código aberto)
// com o mapa-base do OpenFreeMap (dados do OpenStreetMap), carregados só quando a pessoa abre o
// mapa. O resto do protótipo continua sem rede. A posição é a do centro aproximado do bairro
// (consulta única ao Nominatim); endereço exato nunca aparece. A distância até a unidade militar
// fica de fora: guardar a organização militar depende do ADR-20260811-om-declarada (R3).
const MAP_JS='https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js';
const MAP_CSS='https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css';
const MAP_STYLE='https://tiles.openfreemap.org/styles/liberty';
const HOOD_POINTS={'Ponta Negra':[-60.0962,-3.0509],'Planalto':[-60.0572,-3.0653],'Dom Pedro':[-60.0431,-3.0877],'Flores':[-60.0212,-3.0728],'Adrianópolis':[-60.0090,-3.1017],'Parque 10':[-60.0213,-3.0794],'Tarumã':[-60.0513,-3.0247],'Centro':[-60.0216,-3.1321]};
let catalogView='list',catalogMap=null,mapLoading=null;
function catalogViewHtml(){return `<div class="fview" role="group" aria-label="Ver como">${[['list','list','Lista'],['map','map','Mapa']].map(([v,ic,l])=>`<button type="button" class="fchip${catalogView===v?' on':''}" data-action="catalog-view" data-value="${v}" aria-pressed="${catalogView===v}" aria-label="Ver em ${l.toLowerCase()}">${icon(ic)}<span class="fview-label">${l}</span></button>`).join('')}</div>`;}
function hoodCounts(list){const m=new Map();for(const x of list)m.set(x.hood,(m.get(x.hood)||0)+1);return [...m].sort((a,b)=>b[1]-a[1]);}
function catalogMapHtml(list,kind){
 const counts=hoodCounts(list),word=n=>countWord(n,kind);
 return `<div class="cmap-wrap"><div class="cmap" id="catalog-map" role="region" aria-label="Mapa com ${word(list.length)} por bairro"><p class="cmap-status" id="cmap-status">Carregando o mapa…</p></div><p class="cmap-note">Posição aproximada do bairro; o endereço exato não aparece. Mapa © OpenStreetMap, servido pelo OpenFreeMap.</p>
<section class="cmap-list" aria-label="Bairros"><h3>Bairros</h3>${counts.length?`<div class="fchips">${counts.map(([h,n])=>`<button type="button" class="fchip" data-action="map-hood" data-value="${esc(h)}">${icon('location_on')}${esc(h)} · ${n}</button>`).join('')}</div>`:'<p class="small muted">Nenhum anúncio com esses filtros.</p>'}</section></div>`;
}
function loadMapLibre(){
 if(window.maplibregl)return Promise.resolve(window.maplibregl);
 if(mapLoading)return mapLoading;
 mapLoading=new Promise((resolve,reject)=>{
  const css=document.createElement('link');css.rel='stylesheet';css.href=MAP_CSS;document.head.appendChild(css);
  const s=document.createElement('script');s.src=MAP_JS;s.async=true;const t=setTimeout(()=>reject(new Error('timeout')),15000);
  s.onload=()=>{clearTimeout(t);window.maplibregl?resolve(window.maplibregl):reject(new Error('sem maplibregl'));};
  s.onerror=()=>{clearTimeout(t);reject(new Error('falha ao carregar'));};document.head.appendChild(s);
 }).catch(error=>{mapLoading=null;throw error;});
 return mapLoading;
}
// Depois de cada desenho: monta o mapa se a tela pede, e desmonta o anterior.
async function catalogMapAfterRender(){
 if(catalogMap){try{catalogMap.remove();}catch{}catalogMap=null;}
 const box=$('#catalog-map');if(!box)return;
 const kind=catalogKind(),list=filteredItems(kind),status=$('#cmap-status');
 try{
  const gl=await loadMapLibre();if(!box.isConnected)return;
  const pts=hoodCounts(list).filter(([h])=>HOOD_POINTS[h]);
  const map=new gl.Map({container:box,style:MAP_STYLE,center:[-60.035,-3.08],zoom:11.3,attributionControl:{compact:true},cooperativeGestures:true});
  catalogMap=map;map.addControl(new gl.NavigationControl({showCompass:false}),'top-right');
  for(const [h,n] of pts){
   const el=document.createElement('button');el.type='button';el.className='cmap-pin';el.dataset.action='map-hood';el.dataset.value=h;el.textContent=String(n);
   new gl.Marker({element:el}).setLngLat(HOOD_POINTS[h]).addTo(map);
   // O MapLibre troca o rótulo por "Map marker"; o bairro e a contagem voltam depois de adicionar.
   el.setAttribute('aria-label',`${h}: ${countWord(n,kind)}`);
  }
  // Nomes em português quando o OpenStreetMap tiver (o estilo vem com nomes em inglês).
  map.on('load',()=>{status?.remove();for(const l of map.getStyle?.().layers||[])if(l.type==='symbol'&&map.getLayoutProperty(l.id,'text-field'))try{map.setLayoutProperty(l.id,'text-field',['coalesce',['get','name:pt'],['get','name']]);}catch{}});
  map.on('error',()=>{if(status)status.textContent='Parte do mapa não carregou. Os bairros abaixo continuam funcionando.';});
 }catch{
  if(status)status.textContent='O mapa precisa de internet e não carregou agora. Use os bairros abaixo ou volte para a lista.';
 }
}
function openHoodSheet(hood){
 const kind=catalogKind(),list=filteredItems(kind).filter(x=>x.hood===hood);
 showDialog(`${hood} · ${countWord(list.length,kind)}`,`<p class="form-note">Com os filtros que você escolheu.</p>${list.length?`<div class="card-grid">${list.map(photoCard).join('')}</div>`:empty('Nenhum anúncio neste bairro','Mude os filtros ou escolha outro bairro.','location_off')}`,`${btn('Ver só este bairro na lista','map-hood-list',hood,'text','list')}${btn('Fechar','close-dialog','','filled')}`);
}
async function mapAction(action,value){
 if(!['catalog-view','map-hood','map-hood-list'].includes(action))return false;
 if(action==='catalog-view'){catalogView=value==='map'?'map':'list';render();globalFocus(action,catalogView);return true;}
 if(action==='map-hood'){openHoodSheet(value);return true;}
 const kind=catalogKind();catalogAttrs={...catalogAttrs,[kind]:{...catalogAttrs[kind],hoods:[value]}};catalogView='list';
 if(dialog.open)await closeDialog(true);render();globalFocus('catalog-pill','hood');return true;
}
