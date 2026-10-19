// Rodada 47 (lote de volume): salvar e marcar "Útil" atualizam só o que foi tocado, sem redesenhar a
// lista inteira (com 650 cartões, salvar levava 5 s num celular médio). Telas que mostram o resultado
// do toque (Salvos, Você e o atalho de comparar imóveis) continuam sendo redesenhadas.
function savedNeedsRender(){return ['salvos','voce'].includes(route.name)||!!root.querySelector('[data-action="compare-saved"]');}
// Troca cada botão de salvar desse anúncio ou negócio (cartão, folha do bairro, página) e devolve o foco.
function patchSaveButtons(action,x){
 const [on,off]=action==='save-item'?['Remover dos salvos','Salvar anúncio']:['Remover negócio dos salvos','Salvar negócio'];
 for(const b of $$(`[data-action="${action}"][data-value="${x.id}"]`).filter(e=>!e.closest('#create-menu'))){
  const focused=document.activeElement===b,t=document.createElement('template');
  t.innerHTML=iconBtn(x.saved?'bookmark':'bookmark_border',action,x.id,x.saved?on:off,`${b.classList.contains('save-card')?'class="save-card" ':''}aria-pressed="${!!x.saved}"`);
  // O botão do Material só aceita foco depois de desenhar o interior.
  const nb=t.content.firstElementChild;b.replaceWith(nb);if(focused)(nb.updateComplete||Promise.resolve()).then(()=>nb.focus());
 }
}
function toggleSaved(action,x){
 if(!mutate(()=>{x.saved=!x.saved;},{redraw:false}))return false;
 if(savedNeedsRender())render();else patchSaveButtons(action,x);
 return true;
}
// "Útil" no feed do grupo: só o cartão da publicação é trocado.
function patchPostCard(g,p,value){
 const b=$(`[data-action="like-post"][data-value="${value}"]`),card=b?.closest('.gpost');
 if(route.name!=='grupo'||!card){render();return;}
 const t=document.createElement('template');t.innerHTML=gPostCard(g,p);const nc=t.content.firstElementChild;card.replaceWith(nc);
 const like=nc.querySelector('[data-action="like-post"]');
 if(like&&(document.activeElement===document.body||!document.activeElement))(like.updateComplete||Promise.resolve()).then(()=>like.focus());
}
