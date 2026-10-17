// Rodada 30: comparar imóveis salvos lado a lado, no padrão das propostas da Rodada 16. Linhas
// alinhadas entre as colunas; destaques só quando os valores diferem (menor total do mês, mais
// quartos, maior área, disponível antes).
const savedRentals=()=>cityItems().filter(x=>x.saved&&x.kind==='imovel'&&x.status==='active').sort((a,b)=>itemTotal(a)-itemTotal(b));
function compareEntryHtml(){const n=savedRentals().length;return n>=2?`<div class="falert">${icon('apartment')}<span class="grow">Você salvou ${n} imóveis. Compare total do mês, quartos, área e disponibilidade.</span>${btn('Comparar','compare-saved','','tonal')}</div>`:'';}
function compareBadges(list){
 const pick=(get,better)=>{const vals=list.map(get);const best=vals.reduce((m,v)=>better(v,m)?v:m,vals[0]);return vals.some(v=>v!==best)?best:null;};
 const availDay=x=>x.avail&&x.avail>dateISO(0)?x.avail:dateISO(0);
 return {total:pick(itemTotal,(a,b)=>a<b),beds:pick(x=>x.beds||0,(a,b)=>a>b),area:pick(x=>x.area||0,(a,b)=>a>b),avail:pick(availDay,(a,b)=>a<b),availDay};
}
function compareColHtml(x,best){
 const badge=(on,text)=>on?`<span class="prop-badge">${icon('check')}${text}</span>`:'',later=x.avail&&x.avail>dateISO(0),amen=(x.amen||[]).map(amenityLabel).filter(Boolean);
 return `<article class="prop-col cmp-col" aria-label="${esc(x.title)}">
<header>${x.photos?.[0]?`<img class="cmp-photo" src="${image(x.photos[0])}" alt="">`:''}<b>${esc(x.title)}</b><small>${esc(x.ptype||'Imóvel')} · ${esc(x.hood)}</small></header>
<div><span class="cmp-label">Total por mês</span><b class="prop-price">${money(itemTotal(x))}</b><small class="cmp-sub">${x.condo?`aluguel ${money(x.numPrice)} + condomínio ${money(x.condo)}`:'sem condomínio'}</small>${badge(best.total===itemTotal(x),'Menor total')}</div>
<div><span class="cmp-label">Quartos</span><b>${esc(String(x.beds??'—'))}</b>${badge(best.beds===(x.beds||0),'Mais quartos')}</div>
<div><span class="cmp-label">Área</span><b>${x.area?`${esc(String(x.area))} m²`:'—'}</b>${badge(best.area===(x.area||0),'Maior área')}</div>
<div><span class="cmp-label">Vagas</span><b>${esc(String(x.parking??0))}</b></div>
<div><span class="cmp-label">Disponível</span><b>${later?`a partir de ${new Date(`${x.avail}T12:00`).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'})}`:'agora'}</b>${badge(best.avail===best.availDay(x),'Disponível antes')}</div>
<div><span class="cmp-label">Comodidades</span>${amen.length?`<ul class="cmp-amen">${amen.map(a=>`<li>${icon('check')}${esc(a)}</li>`).join('')}</ul>`:'<small class="cmp-sub">Nenhuma informada</small>'}</div>
<div class="cmp-actions">${btn('Ver anúncio','compare-open',x.id,'outlined')}${btn('Tirar dos salvos','compare-unsave',x.id,'text')}</div></article>`;
}
function openCompareSaved(note=''){
 const list=savedRentals();
 if(list.length<2){if(dialog.open)closeDialog(true);notify('Salve ao menos dois imóveis para comparar.','info');return;}
 const best=compareBadges(list);
 showDialog('Comparar imóveis salvos',`${note?`<div class="falert" role="status">${icon('info')}<span class="grow">${esc(note)}</span></div>`:''}<p class="form-note">Do menor para o maior total do mês. Os destaques aparecem só quando os valores são diferentes.</p><div class="prop-compare cmp-grid" role="region" aria-label="Comparação de ${list.length} imóveis salvos" tabindex="0">${list.map(x=>compareColHtml(x,best)).join('')}</div>`,btn('Fechar','close-dialog','','text'),'compare');
}
async function compareAction(action,value){
 if(!['compare-saved','compare-open','compare-unsave'].includes(action))return false;
 if(action==='compare-saved'){openCompareSaved();return true;}
 const x=itemById(value);if(!x){openCompareSaved('Este anúncio não está mais disponível.');return true;}
 if(action==='compare-open'){if(dialog.open)await closeDialog(true);navigate('anuncio',value);return true;}
 if(mutate(()=>{itemById(value).saved=false;},{redraw:false})){render();if(savedRentals().length>=2){openCompareSaved(`“${x.title}” saiu dos salvos.`);$('#dialog .prop-compare')?.focus();}else{if(dialog.open)await closeDialog(true);notify(`“${x.title}” saiu dos salvos. Salve outro imóvel para voltar a comparar.`,'bookmark_border');}}
 return true;
}
