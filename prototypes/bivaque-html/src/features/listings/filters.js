// Rodada 23: filtros em pílulas, como na maquete aprovada pelo usuário em 2026-10-16. Cada pílula
// abre só o seu filtro (folha no celular, painel suspenso no desktop); "Filtros" abre tudo (tela
// cheia no celular, painel lateral no desktop). O botão diz quantos anúncios ficam antes de
// aplicar, e fechar sem aplicar descarta. Ordenar fica junto da contagem.
const FILTER_DESKTOP=matchMedia('(min-width:1024px)');
const FILTER_QUICK={imovel:[1500,2500,3000,4000],desapego:[100,300,800,1500]};
const FILTER_SECTIONS={imovel:['ptype','price','avail','beds','parking','area','amen','hood'],desapego:['cat','price','cond','pickup','hood']};
const FILTER_FIELDS={ptype:['ptypes'],price:['min','max'],avail:['avail'],beds:['beds'],parking:['parking'],area:['area'],amen:['amen'],hood:['hoods'],cat:['cats'],cond:['cond'],pickup:['pickup']};
let filterDraft=null,filterClosingHistory=false;
const isoDay=v=>/^\d{4}-\d{2}-\d{2}$/.test(v||'');
const shortDay=v=>new Date(`${v}T12:00`).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'});
const countWord=(n,kind)=>kind==='imovel'?`${n} ${n===1?'imóvel':'imóveis'}`:`${n} ${n===1?'desapego':'desapegos'}`;
const manyLabel=(list,empty,many)=>list.length===1?list[0]:list.length?`${list.length} ${many}`:empty;
function priceLabel(kind,min,max){const a=Number(min)||0,b=Number(max)||0;if(!a&&!b)return kind==='imovel'?'Total por mês':'Preço';if(a&&b)return `${money(a)} a ${money(b)}`;return b?`Até ${money(b)}`:`A partir de ${money(a)}`;}
const availLabel=v=>v==='now'?'Disponível agora':v==='30'?'Em até 30 dias':v==='60'?'Em até 60 dias':isoDay(v)?`Até ${shortDay(v)}`:'Disponível';
// Quantos grupos de filtro estão ativos (o número da pílula "Filtros").
function filterActiveCount(kind,a=catalogAttrs[kind]){
 const price=Number(a.min)||Number(a.max)?1:0;
 return kind==='imovel'?price+(a.ptypes.length?1:0)+(a.hoods.length?1:0)+(a.beds?1:0)+(a.parking?1:0)+(a.area?1:0)+a.amen.length+(a.avail?1:0):price+(a.cats.length?1:0)+(a.hoods.length?1:0)+(a.cond?1:0)+(a.pickup?1:0);
}
function catalogPillsHtml(kind){
 const a=catalogAttrs[kind],n=filterActiveCount(kind),pill=(key,label,on)=>`<button type="button" class="fpill${on?' on':''}" data-action="catalog-pill" data-value="${key}" aria-haspopup="dialog">${esc(label)}${icon('expand_more')}</button>`;
 const toggle=(k,ic,label)=>{const on=a.amen.includes(k);return `<button type="button" class="fpill${on?' on':''}" data-action="catalog-toggle" data-value="${k}" aria-pressed="${on}">${icon(ic)}${esc(label)}</button>`;};
 const all=`<button type="button" class="fpill fall${n?' on':''}" data-action="catalog-pill" data-value="all" aria-haspopup="dialog" aria-label="${n?`Filtros, ${n} ativos`:'Filtros'}">${icon('tune')}${FILTER_DESKTOP.matches?'Todos os filtros':'Filtros'}${n?`<span class="fbadge" aria-hidden="true">${n}</span>`:''}</button>`;
 const price=pill('price',priceLabel(kind,a.min,a.max),Number(a.min)||Number(a.max));
 const hood=pill('hood',manyLabel(a.hoods,'Bairro','bairros'),a.hoods.length);
 const items=kind==='imovel'?[pill('ptype',manyLabel(a.ptypes,'Tipo','tipos'),a.ptypes.length),price,pill('beds',a.beds?`${a.beds}+ quartos`:'Quartos',a.beds||a.parking),hood,pill('avail',availLabel(a.avail),a.avail),toggle('pets','pets','Aceita pets'),toggle('furnished','chair','Mobiliado')]:[pill('cat',manyLabel(a.cats,'Categoria','categorias'),a.cats.length),price,pill('cond',a.cond||'Estado',a.cond),pill('pickup',a.pickup==='now'?'Retirada imediata':a.pickup==='30'?'Retirada em 30 dias':'Retirada',a.pickup),hood];
 return `<div class="fpills" role="toolbar" aria-label="Filtros de ${kind==='imovel'?'imóveis':'desapegos'}">${all}${items.join('')}</div>`;
}
function catalogBarHtml(kind,n){const sort=SORT_LABELS(kind).find(([v])=>v===searchSort)?.[1]||'Mais recentes';return `<div class="fbar"><span id="catalog-count" role="status"><b>${countWord(n,kind)}</b> ${n===1?'encontrado':'encontrados'}</span><button type="button" class="fsort" data-action="catalog-pill" data-value="sort" aria-haspopup="dialog" aria-label="Ordenar: ${esc(sort)}">${icon('sort')}${esc(sort)}</button></div>`;}
const SORT_LABELS=kind=>[['recent','Mais recentes'],['price-low',kind==='imovel'?'Menor total por mês':'Menor preço'],['price-high',kind==='imovel'?'Maior total por mês':'Maior preço']];
const FILTER_TITLES={all:'Filtros',ptype:'Tipo de imóvel',avail:'Disponível para morar',beds:'Quartos e vagas',hood:'Bairro',cat:'Categoria',cond:'Estado de uso',pickup:'Retirada',sort:'Ordenar'};
function fpButtons(field,opts,multi){
 const d=filterDraft.attrs;
 return opts.map(([v,l])=>{const on=multi?d[field].includes(v):String(d[field])===String(v);return `<button type="button" class="fchip${on?' on':''}" data-f="set" data-field="${field}" data-v="${esc(String(v))}"${multi?' data-multi="1"':''} aria-pressed="${on}">${on?icon('check'):''}${esc(l)}</button>`;}).join('');
}
const fpGroup=(id,title,body,hint='')=>`<section class="fsec" aria-labelledby="fs-${id}"><h3 id="fs-${id}">${title}</h3>${hint?`<p class="fhint">${hint}</p>`:''}${body}</section>`;
function fpSection(id){
 const k=filterDraft.kind,chips=(f,o,m)=>`<div class="fchips">${fpButtons(f,o,m)}</div>`,seg=(f,o)=>`<div class="fseg">${fpButtons(f,o)}</div>`;
 if(id==='ptype')return fpGroup(id,'Tipo de imóvel',chips('ptypes',PROPERTY_TYPES.map(t=>[t,t]),true));
 if(id==='price'){
  const {max,step}=catalogPriceRange(k),a=Math.min(Number(filterDraft.attrs.min)||0,max),b=Math.min(Number(filterDraft.attrs.max)||max,max);
  const quick=FILTER_QUICK[k].map(v=>{const on=Number(filterDraft.attrs.max)===v&&!Number(filterDraft.attrs.min);return `<button type="button" class="fchip${on?' on':''}" data-f="quick" data-v="${v}" aria-pressed="${on}">${on?icon('check'):''}Até ${money(v)}</button>`;}).join('');
  return fpGroup(id,k==='imovel'?'Total por mês':'Preço',`<div class="fchips">${quick}</div><div class="fminmax"><label class="ffield"><span>Mínimo (R$)</span><input type="number" inputmode="numeric" min="0" step="${step}" id="fp-min" value="${esc(filterDraft.attrs.min)}" placeholder="0"></label><label class="ffield"><span>Máximo (R$)</span><input type="number" inputmode="numeric" min="0" step="${step}" id="fp-max" value="${esc(filterDraft.attrs.max)}" placeholder="Sem limite"></label></div><md-slider id="fp-price" range min="0" max="${max}" step="${step}" value-start="${a}" value-end="${b}" aria-label-start="Valor mínimo" aria-label-end="Valor máximo"></md-slider>`,k==='imovel'?'Aluguel + condomínio, o que sai do bolso todo mês.':'');
 }
 if(id==='avail')return fpGroup(id,'Disponível para morar',`${chips('avail',[['','Qualquer data'],['now','Agora'],['30','Até 30 dias'],['60','Até 60 dias']])}<label class="ffield fdate"><span>Ou até a data</span><input type="date" id="fp-date" min="${dateISO(0)}" value="${isoDay(filterDraft.attrs.avail)?filterDraft.attrs.avail:''}"></label>`,'Combine com a data da sua chegada.');
 if(id==='beds')return fpGroup(id,'Quartos',seg('beds',[[0,'Qualquer'],[1,'1+'],[2,'2+'],[3,'3+'],[4,'4+']]));
 if(id==='parking')return fpGroup(id,'Vagas de garagem',seg('parking',[[0,'Qualquer'],[1,'1+'],[2,'2+'],[3,'3+']]));
 if(id==='area')return fpGroup(id,'Área mínima',chips('area',[[0,'Qualquer'],[40,'40 m²+'],[60,'60 m²+'],[80,'80 m²+'],[100,'100 m²+']]));
 if(id==='amen')return fpGroup(id,'Comodidades',chips('amen',PROPERTY_AMENITIES,true));
 if(id==='hood')return fpGroup(id,'Bairro',chips('hoods',HOODS.map(h=>[h,h]),true));
 if(id==='cat')return fpGroup(id,'Categoria',chips('cats',ITEM_CATEGORIES.map(c=>[c,c]),true));
 if(id==='cond')return fpGroup(id,'Estado de uso',chips('cond',[['','Todos'],...ITEM_CONDITIONS.map(c=>[c,c])]));
 if(id==='pickup')return fpGroup(id,'Retirada',chips('pickup',[['','Qualquer data'],['now','Retirada imediata'],['30','Em até 30 dias']]));
 return '';
}
function fpSections(){const {kind,key}=filterDraft;return key==='all'?FILTER_SECTIONS[kind]:key==='beds'?['beds','parking']:[key];}
function fpCount(){const {kind,attrs}=filterDraft;return filteredItems(kind,attrs).length;}
function filterPanelHtml(){
 const {kind,key,mode}=filterDraft,title=key==='price'?(kind==='imovel'?'Total por mês':'Preço'):FILTER_TITLES[key];
 const head=`${mode==='sheet'?'<div class="fgrab" aria-hidden="true"></div>':''}<div class="fhead"><h2 id="fp-title">${title}</h2>${key==='all'?'<button type="button" class="flink" data-f="clear">Limpar tudo</button>':''}<button type="button" class="ficon" data-f="close" aria-label="Fechar sem aplicar">${icon('close')}</button></div>`;
 if(key==='sort')return `${head}<div class="fbody" role="radiogroup" aria-labelledby="fp-title">${SORT_LABELS(kind).map(([v,l])=>`<button type="button" class="fopt" role="radio" aria-checked="${searchSort===v}" data-f="sort" data-v="${v}">${esc(l)}${searchSort===v?icon('check'):''}</button>`).join('')}</div>`;
 const n=fpCount();
 return `${head}<div class="fbody">${fpSections().map(fpSection).join('')}</div><div class="ffoot"><button type="button" class="flink" data-f="clear">${key==='all'?'Limpar tudo':'Limpar'}</button><button type="button" class="fcta" data-f="apply" id="fp-apply">${n?`Ver ${countWord(n,kind)}`:'Nenhum resultado'}</button></div>`;
}
function fpPlace(el,anchor){
 if(filterDraft.mode!=='pop'||!anchor?.isConnected)return;
 const r=anchor.getBoundingClientRect(),w=el.offsetWidth,right=filterDraft.key==='sort';
 el.style.left=`${Math.max(16,Math.min(right?r.right-w:r.left,innerWidth-w-16))}px`;el.style.top=`${Math.round(r.bottom+8)}px`;
}
function fpRefresh(focus){
 const el=$('#filter-panel');if(!el||!filterDraft)return;
 const scroll=$('.fbody',el)?.scrollTop||0;el.innerHTML=filterPanelHtml();const body=$('.fbody',el);if(body)body.scrollTop=scroll;
 bindFilterInputs(el);(focus&&$(focus,el))?.focus({preventScroll:true});
}
function fpUpdateCount(){const b=$('#fp-apply');if(!b||!filterDraft)return;const n=fpCount();b.textContent=n?`Ver ${countWord(n,filterDraft.kind)}`:'Nenhum resultado';}
function bindFilterInputs(el){
 const min=$('#fp-min',el),max=$('#fp-max',el),slider=$('#fp-price',el),date=$('#fp-date',el);
 const clean=v=>{const n=Math.max(0,Math.trunc(Number(v)||0));return n?String(n):'';};
 for(const [input,key] of [[min,'min'],[max,'max']])input?.addEventListener('input',()=>{filterDraft.attrs={...filterDraft.attrs,[key]:clean(input.value)};const a=filterDraft.attrs;if(slider){const top=Number(slider.max);slider.valueStart=Math.min(Number(a.min)||0,top);slider.valueEnd=Math.min(Number(a.max)||top,top);}for(const b of $$('[data-f="quick"]',el)){const on=Number(a.max)===Number(b.dataset.v)&&!Number(a.min);b.classList.toggle('on',on);b.setAttribute('aria-pressed',String(on));}fpUpdateCount();});
 slider?.addEventListener('change',()=>{const top=Number(slider.max);filterDraft.attrs={...filterDraft.attrs,min:slider.valueStart>0?String(slider.valueStart):'',max:slider.valueEnd<top?String(slider.valueEnd):''};if(min)min.value=filterDraft.attrs.min;if(max)max.value=filterDraft.attrs.max;fpUpdateCount();});
 date?.addEventListener('change',()=>{filterDraft.attrs={...filterDraft.attrs,avail:isoDay(date.value)?date.value:''};fpRefresh('#fp-date');});
}
function filterPanelClick(e){
 const el=e.currentTarget;if(e.target===el){closeFilterPanel();return;}
 const b=e.target.closest('[data-f]');if(!b||!filterDraft)return;const f=b.dataset.f,d=filterDraft;
 if(f==='close'){closeFilterPanel();return;}
 if(f==='apply'){applyFilterPanel();return;}
 if(f==='sort'){searchSort=b.dataset.v;closeFilterPanel(false);render();globalFocus('catalog-pill','sort');return;}
 if(f==='clear'){const defaults=CATALOG_DEFAULTS[d.kind],attrs={...d.attrs};for(const s of fpSections())for(const field of FILTER_FIELDS[s])attrs[field]=structuredClone(defaults[field]);d.attrs=attrs;fpRefresh('#fp-apply');return;}
 if(f==='quick'){const on=Number(d.attrs.max)===Number(b.dataset.v)&&!Number(d.attrs.min);d.attrs={...d.attrs,min:'',max:on?'':b.dataset.v};fpRefresh(`[data-f="quick"][data-v="${b.dataset.v}"]`);return;}
 if(f==='set'){
  const field=b.dataset.field,raw=b.dataset.v,num=['beds','parking','area'].includes(field),v=num?Number(raw)||0:raw,attrs={...d.attrs};
  attrs[field]=b.dataset.multi?(attrs[field].includes(v)?attrs[field].filter(x=>x!==v):[...attrs[field],v]):v;d.attrs=attrs;
  fpRefresh(`[data-f="set"][data-field="${field}"][data-v="${CSS.escape(raw)}"]`);
 }
}
function openFilterPanel(key,anchor){
 const kind=catalogKind();if(!FILTER_TITLES[key]&&key!=='price')return;
 const desk=FILTER_DESKTOP.matches,mode=key==='all'?(desk?'drawer':'full'):desk?'pop':'sheet';
 filterDraft={kind,key,mode,attrs:structuredClone(catalogAttrs[kind]),back:anchor};
 let el=$('#filter-panel');
 if(!el){el=document.createElement('dialog');el.id='filter-panel';el.setAttribute('aria-labelledby','fp-title');el.addEventListener('click',filterPanelClick);el.addEventListener('cancel',e=>{e.preventDefault();closeFilterPanel();});document.body.appendChild(el);}
 el.className=`fpanel ${mode}`;el.style.left=el.style.top='';el.innerHTML=filterPanelHtml();bindFilterInputs(el);
 el.showModal();fpPlace(el,anchor);
 try{history.pushState({...history.state,bivaque:true,filterPanel:true,overlayDepth:(history.state?.overlayDepth||0)+1},'',location.href);}catch{}
 ($('.fbody [aria-pressed="true"],.fbody [aria-checked="true"]',el)||$('.fbody button,.fbody input',el))?.focus({preventScroll:true});
}
function closeFilterPanel(restore=true,dropHistory=true){
 const el=$('#filter-panel');if(!el?.open)return;const back=filterDraft?.back;el.close();filterDraft=null;
 if(dropHistory&&history.state?.filterPanel){filterClosingHistory=true;history.back();}
 if(restore&&back?.isConnected)back.focus({preventScroll:true});
}
function applyFilterPanel(){
 const d=filterDraft;if(!d)return;const key=d.back?.dataset?.value||d.key;
 catalogAttrs={...catalogAttrs,[d.kind]:d.attrs};
 closeFilterPanel(false);render();globalFocus('catalog-pill',key);
}
FILTER_DESKTOP.addEventListener('change',()=>{if($('#filter-panel')?.open)closeFilterPanel();if(['imoveis','desapegos','catalogo'].includes(route.name))render();});
