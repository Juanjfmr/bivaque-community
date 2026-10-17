// Rodada 45 (maquete aprovada em 17/10/2026; referências: Etsy, Nextdoor e Airtasker, no Mobbin):
// listas longas em blocos de 24. O próximo bloco entra sozinho quando o fim se aproxima; o botão
// "Mostrar mais" fica como reserva (teclado, leitor de tela, navegador sem IntersectionObserver).
// A quantidade mostrada fica guardada por lista e filtro: voltar de um anúncio devolve o mesmo ponto.
const LIST_PAGE=24;
var pagedShown=new Map(),pagedLists={},pagedObserver=null;
function pagedHtml(id,sig,list,cardFn,{noun,wrap='card-grid',end=''}={}){
 const prev=pagedShown.get(id),n=Math.min(list.length,prev?.sig===sig?prev.n:LIST_PAGE);
 pagedShown.set(id,{sig,n});pagedLists[id]={list,cardFn,noun,wrap,end};
 return `<div class="${wrap}" data-paged="${id}">${list.slice(0,n).map(cardFn).join('')}</div>${pagedFootHtml(id)}`;
}
function pagedFootHtml(id){
 const {list,noun,end}=pagedLists[id],n=pagedShown.get(id).n,total=list.length;
 if(n<total)return `<div class="paged-foot" data-paged-foot="${id}"><small role="status">Mostrando ${n} de ${total} ${esc(noun)}</small><span class="paged-bar" aria-hidden="true"><i style="width:${Math.max(2,Math.round(n/total*100))}%"></i></span>${btn(`Mostrar mais ${Math.min(LIST_PAGE,total-n)}`,'list-more',id,'outlined')}</div>`;
 return total>LIST_PAGE?`<div class="paged-foot is-end" data-paged-foot="${id}"><small role="status">Você viu os ${total} ${esc(noun)}</small></div>${end}`:'';
}
// Acrescenta o próximo bloco sem redesenhar a tela. Pelo botão, o foco vai ao primeiro cartão novo.
function pagedMore(id,focus=false){
 const p=pagedLists[id],s=pagedShown.get(id),grid=$(`[data-paged="${id}"]`);if(!p||!s||!grid||s.n>=p.list.length)return;
 const from=s.n;s.n=Math.min(p.list.length,from+LIST_PAGE);
 grid.insertAdjacentHTML('beforeend',p.list.slice(from,s.n).map(p.cardFn).join(''));
 const foot=$(`[data-paged-foot="${id}"]`);if(foot){foot.insertAdjacentHTML('afterend',pagedFootHtml(id));foot.remove();}
 if(focus)grid.children[from]?.querySelector('.card-link,button,[href]')?.focus();
 pagedWatch();
}
// Perto do fim (600 px antes), mostra dois cartões de espera e acrescenta o bloco no quadro seguinte.
function pagedAuto(id){
 const foot=$(`[data-paged-foot="${id}"]`),grid=$(`[data-paged="${id}"]`),p=pagedLists[id];if(!foot||!grid||!p||foot.classList.contains('is-loading'))return;
 foot.classList.add('is-loading');const t=foot.querySelector('small');if(t)t.textContent=`Carregando mais ${Math.min(LIST_PAGE,p.list.length-pagedShown.get(id).n)}…`;
 if(p.wrap==='card-grid')grid.insertAdjacentHTML('beforeend','<div class="paged-skel" aria-hidden="true"><i></i><b></b><b></b></div>'.repeat(2));
 requestAnimationFrame(()=>setTimeout(()=>{for(const k of grid.querySelectorAll('.paged-skel'))k.remove();pagedMore(id);},40));
}
function pagedWatch(){
 pagedObserver?.disconnect();pagedObserver=null;if(!('IntersectionObserver' in window))return;
 const feet=$$('.paged-foot:not(.is-end)');if(!feet.length)return;
 pagedObserver=new IntersectionObserver(es=>{for(const e of es)if(e.isIntersecting)pagedAuto(e.target.dataset.pagedFoot);},{rootMargin:'0px 0px 600px 0px'});
 for(const f of feet)pagedObserver.observe(f);
}
function pagedAction(action,value){if(action!=='list-more')return false;pagedMore(value,true);return true;}
