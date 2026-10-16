// Rodada 21: filtros com indicador deslizante. Referência: Animated Tabs / Sliding Pill, do
// 21st.dev. O fundo do filtro escolhido vira uma pílula única que desliza do filtro anterior
// para o novo; sem JavaScript ou com movimento reduzido o chip selecionado já tem fundo.
const segLast=new Map();
let segObserver=null;
function segKey(row){return `${route.name}|${row.dataset.seg}`;}
function segRect(row){
 const chip=$('md-filter-chip[selected]',row);if(!chip)return null;
 const r=chip.getBoundingClientRect(),box=row.getBoundingClientRect();
 return {x:r.left-box.left+row.scrollLeft,w:r.width,h:r.height,y:r.top-box.top};
}
function segPlace(row,ind,rect){ind.style.transform=`translate(${rect.x}px,${rect.y}px)`;ind.style.width=`${rect.w}px`;ind.style.height=`${rect.h}px`;}
function segmentsAfterRender(scope=document){
 segObserver?.disconnect();
 const rows=$$('.filter-row[data-seg]',scope);if(!rows.length)return;
 // O observador avisa uma vez ao começar; só reposiciona (sem animar) quando a medida muda.
 segObserver=new ResizeObserver(entries=>{for(const e of entries){const row=e.target.closest('.filter-row[data-seg]'),ind=row&&$('.seg-ind',row),rect=row&&segRect(row),last=row&&segLast.get(segKey(row));if(!ind||!rect||last&&last.x===rect.x&&last.w===rect.w&&last.y===rect.y)continue;{ind.classList.add('no-anim');segPlace(row,ind,rect);segLast.set(segKey(row),rect);}}});
 for(const row of rows){
  const ind=$('.seg-ind',row);if(!ind)continue;
  // Espera os chips desenharem (componentes Material atualizam depois de entrar na página).
  Promise.all($$('md-filter-chip',row).map(c=>c.updateComplete)).then(()=>requestAnimationFrame(()=>{
   if(!row.isConnected)return;const rect=segRect(row);if(!rect){ind.hidden=true;return;}
   const prev=segLast.get(segKey(row)),moving=prev&&(prev.x!==rect.x||prev.w!==rect.w);
   ind.classList.add('no-anim');segPlace(row,ind,moving?prev:rect);row.classList.add('seg-ready');
   if(moving){ind.getBoundingClientRect();ind.classList.remove('no-anim');segPlace(row,ind,rect);}
   segLast.set(segKey(row),rect);
   segObserver.observe(row);const chip=$('md-filter-chip[selected]',row);if(chip)segObserver.observe(chip);
  }));
 }
}
