// Rodada 45 (maquete aprovada em 17/10/2026; referências: Etsy, Nextdoor e Airtasker, no Mobbin):
// listas longas em blocos de 24. O próximo bloco entra sozinho quando o fim se aproxima; o botão
// "Mostrar mais" fica como reserva (teclado, leitor de tela, navegador sem IntersectionObserver).
// A quantidade mostrada fica guardada por lista e filtro: voltar de um anúncio devolve o mesmo ponto.
const LIST_PAGE=24;
var pagedShown=new Map(),pagedLists={},pagedObservers=[];
function pagedHtml(id,sig,list,cardFn,{noun,art='os',wrap='card-grid',end='',size=LIST_PAGE}={}){
 const prev=pagedShown.get(id),n=Math.min(list.length,Math.max(size,prev?.sig===sig?prev.n:0));
 pagedShown.set(id,{sig,n});pagedLists[id]={list,cardFn,noun,art,wrap,end,size};
 return `<div class="${wrap}" data-paged="${id}">${list.slice(0,n).map(cardFn).join('')}</div>${pagedFootHtml(id)}<span class="paged-live" role="status" data-paged-live="${id}"></span>`;
}
function pagedFootHtml(id){
 const {list,noun,end,size}=pagedLists[id],n=pagedShown.get(id).n,total=list.length;
 if(n<total)return `<div class="paged-foot" data-paged-foot="${id}"><small>Mostrando ${n} de ${total} ${esc(noun)}</small><span class="paged-bar" aria-hidden="true"><i style="width:${Math.max(2,Math.round(n/total*100))}%"></i></span>${btn(`Mostrar mais ${Math.min(size,total-n)}`,'list-more',id,'outlined')}</div>`;
 return total>size?`<div class="paged-foot is-end" data-paged-foot="${id}"><small>${pagedSeen(id)}</small></div>${end}`:'';
}
function pagedSeen(id){const {list,noun,art}=pagedLists[id];return `Você viu ${art} ${list.length} ${esc(noun)}`;}
function pagedStatus(id){const {list,noun}=pagedLists[id],n=pagedShown.get(id).n;return n<list.length?`Mostrando ${n} de ${list.length} ${noun}`:pagedSeen(id);
}
// Acrescenta o próximo bloco sem redesenhar a tela. Pelo botão, o foco vai ao primeiro cartão novo.
function pagedMore(id,focus=false){
 const p=pagedLists[id],s=pagedShown.get(id),grid=$(`[data-paged="${id}"]`);if(!p||!s||!grid||s.n>=p.list.length)return;
 const from=s.n;s.n=Math.min(p.list.length,from+p.size);
 grid.insertAdjacentHTML('beforeend',p.list.slice(from,s.n).map(p.cardFn).join(''));
 const foot=$(`[data-paged-foot="${id}"]`);if(foot){foot.insertAdjacentHTML('afterend',pagedFootHtml(id));foot.remove();}
 const live=$(`[data-paged-live="${id}"]`);if(live)live.textContent=pagedStatus(id);
 if(grid.closest('#main'))bindOriginalGestures(false);
 if(focus){const el=grid.children[from];let t=el?.querySelector('.card-link,button.swipe-content,button.txt')||(el?.matches('button,[href]')?el:null);if(el&&!t){el.tabIndex=-1;t=el;}t?.focus();}
 pagedWatch();
}
// Perto do fim (600 px antes), mostra dois cartões de espera e acrescenta o bloco no quadro seguinte.
function pagedAuto(id){
 const foot=$(`[data-paged-foot="${id}"]`),grid=$(`[data-paged="${id}"]`),p=pagedLists[id];if(!foot||!grid||!p||foot.classList.contains('is-loading'))return;
 foot.classList.add('is-loading');const t=foot.querySelector('small');if(t)t.textContent=`Carregando mais ${Math.min(p.size,p.list.length-pagedShown.get(id).n)}…`;
 if(p.wrap==='card-grid')grid.insertAdjacentHTML('beforeend','<div class="paged-skel" aria-hidden="true"><i></i><b></b><b></b></div>'.repeat(2));
 requestAnimationFrame(()=>setTimeout(()=>{for(const k of grid.querySelectorAll('.paged-skel'))k.remove();if(grid.isConnected)pagedMore(id);},40));
}
function pagedWatch(){
 for(const o of pagedObservers)o.disconnect();pagedObservers=[];if(!('IntersectionObserver' in window))return;
 // Quem rola é o #main ou o diálogo, não a janela: sem o root certo, a antecedência de 600 px não vale.
 const groups=new Map();for(const f of $$('.paged-foot:not(.is-end)')){const r=f.closest('#main')?root:f.closest('md-dialog')?.shadowRoot?.querySelector('.scroller')||null;groups.set(r,[...(groups.get(r)||[]),f]);}
 for(const [r,feet] of groups){const o=new IntersectionObserver(es=>{for(const e of es)if(e.isIntersecting)pagedAuto(e.target.dataset.pagedFoot);},{root:r,rootMargin:'0px 0px 600px 0px'});for(const f of feet)o.observe(f);pagedObservers.push(o);}
}
// Fim de lista para quem não achou a resposta: pergunta à comunidade.
function askEndHtml(){return readonly()?'':`<div class="paged-end">${icon('forum')}<span class="grow"><b>Não achou sua dúvida?</b><small>Pergunte: quem mora aqui responde.</small></span>${btn('Perguntar','ask','','tonal')}</div>`;}
function pagedAction(action,value){if(action!=='list-more')return false;pagedMore(value,true);return true;}
