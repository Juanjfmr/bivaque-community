function filterChips(values,selected,action){return `<div class="filter-row" data-seg="${esc(action)}"><span class="seg-ind" aria-hidden="true"></span><md-chip-set>${values.map(([value,label])=>`<md-filter-chip label="${esc(label)}" ${selected===value?'selected':''} data-action="${action}" data-value="${esc(value)}" aria-label="Filtrar por ${esc(label)}"></md-filter-chip>`).join('')}</md-chip-set></div>`;}
// Rodada 22: Desapegos e Imóveis são telas próprias, cada uma com os filtros do seu mercado.
// Filtros principais sempre à vista; os demais ficam em "Mais filtros" no celular e no tablet.
const CATALOG_DEFAULTS={desapego:{cat:'',cond:'',pickup:''},imovel:{ptype:'',beds:0,parking:0,area:0,amen:[]}};
let catalogAttrs=structuredClone(CATALOG_DEFAULTS),catalogMore=false;
function catalogKind(){return route.name==='imoveis'?'imovel':route.name==='desapegos'?'desapego':catalogFilter==='imovel'?'imovel':'desapego';}
// Imóvel pesa pelo total do mês (aluguel + condomínio); desapego, pelo preço.
const itemTotal=x=>(Number(x.numPrice)||0)+(x.kind==='imovel'?Number(x.condo)||0:0);
function catalogCountText(n,kind){return kind==='imovel'?`${n} ${n===1?'imóvel':'imóveis'} para alugar em ${esc(state.city)}`:`${n} ${n===1?'desapego':'desapegos'} em ${esc(state.city)}`;}
function renderCatalog(){
 const kind=catalogKind(),imovel=kind==='imovel',list=filteredItems(kind);catalogFilter=kind;
 return `<div class="page-head"><div><h1>${imovel?'Imóveis':'Desapegos'}</h1><p id="catalog-count">${catalogCountText(list.length,kind)}</p></div>${!readonly()?btn(imovel?'Anunciar imóvel':'Anunciar desapego',imovel?'create-property':'create-item','','tonal','add'):''}</div>${readonlyHtml()}${catalogFilterFields(kind)}<div id="catalog-results">${itemResults(list,kind)}</div>`;
}
function catalogMoreCount(kind){const a=catalogAttrs[kind];return kind==='imovel'?(a.beds?1:0)+(a.parking?1:0)+(a.area?1:0)+a.amen.length:(a.cond?1:0)+(a.pickup?1:0);}
const catalogMoreLabel=n=>n?`Mais filtros (${n})`:'Mais filtros';
function catalogFilterFields(kind){
 const a=catalogAttrs[kind],imovel=kind==='imovel';
 const main=imovel?selectField('catalog-ptype','Tipo de imóvel',[['','Todos os tipos'],...PROPERTY_TYPES],a.ptype):selectField('catalog-cat','Categoria',[['','Todas as categorias'],...ITEM_CATEGORIES],a.cat);
 const sort=selectField('catalog-sort','Ordenar',[['recent','Mais recentes'],['price-low',imovel?'Menor total por mês':'Menor preço'],['price-high',imovel?'Maior total por mês':'Maior preço']],searchSort);
 return `<div class="filter-panel catalog-primary">${main}${selectField('catalog-hood','Bairro',['Todos',...HOODS],searchHood)}${sort}${catalogPriceSlider(kind)}<md-outlined-button type="button" class="catalog-more-toggle" data-action="catalog-more" aria-expanded="${catalogMore}" aria-controls="catalog-more">${icon('tune','icon')}<span id="catalog-more-label">${catalogMoreLabel(catalogMoreCount(kind))}</span></md-outlined-button></div><div class="catalog-more${catalogMore?' open':''}" id="catalog-more">${imovel?propertyMoreHtml(a):itemMoreHtml(a)}</div>`;
}
// Grupo de chips com rótulo; "2+" é lido como "2 ou mais".
function attrChips(key,label,options,current,multi=false){
 const chip=([v,l])=>{const on=multi?current.includes(v):String(current)===String(v);return `<md-filter-chip label="${esc(l)}" ${on?'selected':''} data-action="catalog-attr" data-value="${esc(`${key}|${v}`)}" aria-label="${esc(`${label}: ${l.replace(/\+$/,' ou mais')}`)}"></md-filter-chip>`;};
 return `<div class="attr-group" role="group" aria-labelledby="attr-${key}"><span class="attr-label" id="attr-${key}">${esc(label)}</span><md-chip-set>${options.map(chip).join('')}</md-chip-set></div>`;
}
function propertyMoreHtml(a){return `${attrChips('beds','Quartos',[[0,'Qualquer'],[1,'1+'],[2,'2+'],[3,'3+'],[4,'4+']],a.beds)}${attrChips('parking','Vagas de garagem',[[0,'Qualquer'],[1,'1+'],[2,'2+']],a.parking)}${attrChips('area','Área mínima',[[0,'Qualquer'],[40,'40 m²+'],[60,'60 m²+'],[80,'80 m²+'],[100,'100 m²+']],a.area)}${attrChips('amen','Comodidades',PROPERTY_AMENITIES,a.amen,true)}`;}
function itemMoreHtml(a){return `${attrChips('cond','Estado de uso',[['','Todos'],...ITEM_CONDITIONS.map(c=>[c,c])],a.cond)}${attrChips('pickup','Retirada',[['','Qualquer data'],['now','Já disponível'],['30','Em até 30 dias']],a.pickup)}`;}
function catalogSetAttr(key,value){const kind=catalogKind(),a={...catalogAttrs[kind]};if(key==='amen')a.amen=a.amen.includes(value)?a.amen.filter(k=>k!==value):[...a.amen,value];else a[key]=['beds','parking','area'].includes(key)?Number(value)||0:value;catalogAttrs={...catalogAttrs,[kind]:a};}
function catalogRefresh(){const kind=catalogKind(),list=filteredItems(kind),r=$('#catalog-results'),c=$('#catalog-count'),m=$('#catalog-more-label');if(r)r.innerHTML=itemResults(list,kind);if(c)c.innerHTML=catalogCountText(list.length,kind);if(m)m.textContent=catalogMoreLabel(catalogMoreCount(kind));}
// Faixa de preço (Rodada 10): md-slider de intervalo; o máximo fica acima do maior valor para que o extremo exclua todos.
function catalogPriceRange(kind=catalogKind()){const prices=cityItems().filter(x=>x.kind===kind).map(itemTotal);const top=Math.max(0,...prices);const step=top>5000?100:top>500?50:10;return {max:Math.ceil((top+1)/step)*step,step};}
function catalogPriceLabel(a,b,max){return a<=0&&b>=max?(catalogKind()==='imovel'?'Qualquer valor':'Qualquer preço'):`${money(a)} a ${money(b)}`;}
function catalogPriceSlider(kind=catalogKind()){const {max,step}=catalogPriceRange(kind),imovel=kind==='imovel';const a=Math.min(Number(searchMin)||0,max),b=Math.min(Number(searchMax)||max,max);searchMin=a>0?String(a):'';searchMax=b<max?String(b):'';return `<div class="price-filter"><div class="row between"><span class="small">${imovel?'Total por mês':'Preço'}</span><span class="small muted" id="catalog-price-label" aria-live="polite">${catalogPriceLabel(a,b,max)}</span></div><md-slider id="catalog-price" range labeled min="0" max="${max}" step="${step}" value-start="${a}" value-end="${b}" aria-label-start="${imovel?'Total mínimo por mês, aluguel mais condomínio':'Preço mínimo'}" aria-label-end="${imovel?'Total máximo por mês, aluguel mais condomínio':'Preço máximo'}" style="width:100%"></md-slider></div>`;}
function catalogMatches(x,kind,a){
 if(kind==='imovel')return (!a.ptype||x.ptype===a.ptype)&&(x.beds||0)>=a.beds&&(x.parking||0)>=a.parking&&(x.area||0)>=a.area&&a.amen.every(k=>(x.amen||[]).includes(k));
 const pick=x.pickup||'';
 return (!a.cat||x.cat===a.cat)&&(!a.cond||x.cond===a.cond)&&(a.pickup!=='now'||!pick||pick<=dateISO(0))&&(a.pickup!=='30'||!pick||pick<=dateISO(30));
}
function filteredItems(kind=catalogKind()){const a=catalogAttrs[kind];const list=cityItems().filter(x=>x.status==='active'&&x.kind===kind&&(searchHood==='Todos'||x.hood===searchHood)&&(!searchMin||itemTotal(x)>=Number(searchMin))&&(!searchMax||itemTotal(x)<=Number(searchMax))&&catalogMatches(x,kind,a));return list.sort((p,q)=>searchSort==='price-low'?itemTotal(p)-itemTotal(q):searchSort==='price-high'?itemTotal(q)-itemTotal(p):q.createdAt-p.createdAt);}
function itemResults(list,kind=catalogKind()){return list.length?`<div class="card-grid">${list.map(photoCard).join('')}</div>`:kind==='imovel'?empty('Nenhum imóvel com esses filtros','Tente outro bairro, um total maior ou menos comodidades.','search_off','clear-filters','Limpar filtros'):empty('Nenhum desapego com esses filtros','Tente outra categoria, outro bairro ou amplie a faixa de preço.','search_off','clear-filters','Limpar filtros');}
// Seção da Início com os dois tipos: cada um leva à sua tela.
function catalogSectionTitle(title){return `<div class="section-title"><h2>${esc(title)}</h2><div class="section-links">${btn('Ver desapegos','intent','desapego','text')}${btn('Ver imóveis','intent','imovel','text')}</div></div>`;}
