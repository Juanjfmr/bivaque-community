function filterChips(values,selected,action){return `<div class="filter-row" data-seg="${esc(action)}"><span class="seg-ind" aria-hidden="true"></span><md-chip-set>${values.map(([value,label])=>`<md-filter-chip label="${esc(label)}" ${selected===value?'selected':''} data-action="${action}" data-value="${esc(value)}" aria-label="Filtrar por ${esc(label)}"></md-filter-chip>`).join('')}</md-chip-set></div>`;}
// Rodada 22: Desapegos e Imóveis são telas próprias, cada uma com os filtros do seu mercado.
// Rodada 23: os filtros ficam em pílulas (features/listings/filters.js).
// Cada tela guarda os próprios filtros, inclusive a faixa de valor.
const CATALOG_DEFAULTS={desapego:{cats:[],hoods:[],cond:'',pickup:'',min:'',max:''},imovel:{ptypes:[],hoods:[],beds:0,parking:0,area:0,amen:[],avail:'',min:'',max:''}};
let catalogAttrs=structuredClone(CATALOG_DEFAULTS);
function catalogKind(){return route.name==='imoveis'?'imovel':route.name==='desapegos'?'desapego':catalogFilter==='imovel'?'imovel':'desapego';}
// Imóvel pesa pelo total do mês (aluguel + condomínio); desapego, pelo preço.
const itemTotal=x=>(Number(x.numPrice)||0)+(x.kind==='imovel'?Number(x.condo)||0:0);
function renderCatalog(){
 const kind=catalogKind(),imovel=kind==='imovel',list=filteredItems(kind);catalogFilter=kind;
 return `<div class="page-head"><div><h1>${imovel?'Imóveis':'Desapegos'}</h1><p>${imovel?'Para alugar':'À venda'} em ${esc(state.city)}</p></div>${!readonly()?btn(imovel?'Anunciar imóvel':'Anunciar desapego',imovel?'create-property':'create-item','','tonal','add'):''}</div>${readonlyHtml()}${catalogPillsHtml(kind)}${catalogBarHtml(kind,list.length)}${alertBannerHtml(kind)}<div id="catalog-results">${catalogView==='map'?catalogMapHtml(list,kind):itemResults(list,kind)}</div>`;
}
// Atalhos de um toque (Aceita pets, Mobiliado) entram e saem das comodidades.
function catalogSetAttr(key,value){const kind=catalogKind(),a={...catalogAttrs[kind]};if(key==='amen')a.amen=a.amen.includes(value)?a.amen.filter(k=>k!==value):[...a.amen,value];else a[key]=value;catalogAttrs={...catalogAttrs,[kind]:a};}
// Faixa de preço (Rodada 10): o máximo do slider fica acima do maior valor para que o extremo exclua todos.
function catalogPriceRange(kind=catalogKind()){const prices=cityItems().filter(x=>x.kind===kind).map(itemTotal);const top=Math.max(0,...prices);const step=top>5000?100:top>500?50:10;return {max:Math.ceil((top+1)/step)*step,step};}
// Disponível até a data pedida: sem data no anúncio = disponível agora.
function availBy(value){return value==='now'?dateISO(0):value==='30'?dateISO(30):value==='60'?dateISO(60):/^\d{4}-\d{2}-\d{2}$/.test(value||'')?value:'';}
function catalogMatches(x,kind,a){
 const hood=!a.hoods.length||a.hoods.includes(x.hood);
 if(kind==='imovel'){const by=availBy(a.avail);return hood&&(!a.ptypes.length||a.ptypes.includes(x.ptype))&&(x.beds||0)>=a.beds&&(x.parking||0)>=a.parking&&(x.area||0)>=a.area&&a.amen.every(k=>(x.amen||[]).includes(k))&&(!by||!x.avail||x.avail<=by);}
 const pick=x.pickup||'';
 return hood&&(!a.cats.length||a.cats.includes(x.cat))&&(!a.cond||x.cond===a.cond)&&(a.pickup!=='now'||!pick||pick<=dateISO(0))&&(a.pickup!=='30'||!pick||pick<=dateISO(30));
}
function filteredItems(kind=catalogKind(),a=catalogAttrs[kind]){const list=cityItems().filter(x=>x.status==='active'&&x.kind===kind&&(!a.min||itemTotal(x)>=Number(a.min))&&(!a.max||itemTotal(x)<=Number(a.max))&&catalogMatches(x,kind,a));return list.sort((p,q)=>searchSort==='price-low'?itemTotal(p)-itemTotal(q):searchSort==='price-high'?itemTotal(q)-itemTotal(p):q.createdAt-p.createdAt);}
function itemResults(list,kind=catalogKind()){return list.length?`<div class="card-grid">${list.map(photoCard).join('')}</div>`:kind==='imovel'?empty('Nenhum imóvel com esses filtros','Tente outro bairro, um total maior ou menos comodidades.','search_off','clear-filters','Limpar filtros'):empty('Nenhum desapego com esses filtros','Tente outra categoria, outro bairro ou amplie a faixa de preço.','search_off','clear-filters','Limpar filtros');}
// Seção da Início com os dois tipos: cada um leva à sua tela.
function catalogSectionTitle(title){return `<div class="section-title"><h2>${esc(title)}</h2><div class="section-links">${btn('Ver desapegos','intent','desapego','text')}${btn('Ver imóveis','intent','imovel','text')}</div></div>`;}
