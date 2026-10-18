// Rodada 50: página Filas do Painel do Bivaque. Abertas e decididas, por tipo, ordenadas por prazo
// ou pelas mais recentes; "Assumir" põe você como responsável e "Desfazer" reabre uma decisão.
var ownerStatus='open',ownerSort='due';
const OWNER_DECISION_LABEL={remove:'Removido',dismiss:'Dispensado',approve:'Aprovado',reject:'Recusado',more:'Novo documento pedido',call:'Embaixadores chamados'};
function ownerWho(q){if(q.cityIds){const as=q.cityIds.map(c=>ownerData().assign?.[c]);return as.every(a=>a==='me')?'Você':'';}const a=ownerData().assign?.[q.id]||Object.entries(OWNER_DEMO.assignees||{}).find(([k])=>q.id.startsWith(k))?.[1];return a==='me'?'Você':a||'';}
function ownerRowFull(q){
 const [due,late]=ownerDue(q.due),who=ownerWho(q);
 return `<div class="ow-q ow-q-full" role="listitem"><span class="ow-ic ow-${q.tone}">${icon(q.icon)}</span><span class="t"><b>${esc(q.title)}</b><small>${esc(q.sub)}</small></span><span class="ow-sla${late?' late':''}">${due}</span><span class="ow-who">${who?`<i aria-hidden="true">${esc(who==='Você'?initals(state.profile.name):initals(who))}</i>${esc(who)}`:'Sem responsável'}</span><span class="ow-acts">${who==='Você'?'':ownerBtn('Assumir','owner-assign',q,'text')}${ownerBtn('Revisar','owner-review',q,'outlined')}</span></div>`;
}
function ownerDecidedRow(id){
 const d=ownerData().decisions[id],reason=d.reason?OWNER_DECISION_REASONS.find(r=>r[0]===d.reason)?.[1]:'';
 return `<div class="ow-q ow-q-full" role="listitem"><span class="ow-ic">${icon('check')}</span><span class="t"><b>${esc(d.title||id)}</b><small>${esc(OWNER_DECISION_LABEL[d.d]||d.d)}${reason?` · ${esc(reason)}`:''}</small></span><span class="ow-sla">${ownerAgo(d.at)}</span><span class="ow-who">${d.city?esc(d.city):''}</span><span class="ow-acts">${ownerBtn('Desfazer','owner-undo',{id,title:d.title||id},'text')}</span></div>`;
}
function ownerDecidedIds(){return Object.entries(ownerData().decisions).filter(([,d])=>!d.part&&(ownerTab==='all'||d.kind===ownerTab)&&(ownerCity==='Todas'||d.city===ownerCity||!d.city)).sort((a,b)=>b[1].at-a[1].at).map(([id])=>id);}
function renderOwnerQueues(){
 const all=ownerQueue();if(ownerStatus==='open'&&ownerTab!=='all'&&!all.some(q=>q.kind===ownerTab))ownerTab='all';
 const open=all.filter(q=>ownerTab==='all'||q.kind===ownerTab).sort((a,b)=>ownerSort==='due'?a.due-b.due:b.at-a.at),done=ownerDecidedIds(),count=k=>k==='all'?all.length:all.filter(q=>q.kind===k).length;
 const list=ownerStatus==='open'
  ?(open.length?pagedHtml('owner-queue',`${ownerCity}|${ownerTab}|${ownerSort}`,open,ownerRowFull,{noun:'itens',wrap:'ow-list',role:'list'}):`<p class="ow-done">${icon('check')}Nada esperando por você${ownerTab==='all'?'':' neste tipo'}.</p>`)
  :(done.length?`<div class="ow-list" role="list">${done.map(ownerDecidedRow).join('')}</div>`:`<p class="ow-done">${icon('schedule')}Nenhuma decisão ainda${ownerTab==='all'?'':' neste tipo'}.</p>`);
 return `<h1 class="ow-h1">Filas</h1><p class="ow-lead">Tudo o que precisa de decisão, com prazo de 24 h para denúncias e verificações.</p>
 <div class="ow-filters">${filterChips([['Todas','Todas as cidades'],...ownerCities().map(c=>[c,c])],ownerCity,'owner-city')}</div>
 <section class="ow-card ow-queue-page"><div class="ow-q-tools">${filterChips([['open',`Abertas · ${all.length}`],['done',`Decididas · ${Object.values(ownerData().decisions).filter(d=>!d.part).length}`]],ownerStatus,'owner-status')}${ownerStatus==='open'?filterChips([['due','Prazo'],['recent','Mais recentes']],ownerSort,'owner-sort'):''}</div>
 ${filterChips(OWNER_KINDS.filter(([k])=>k==='all'||count(k)||ownerStatus==='done').map(([k,l])=>[k,ownerStatus==='open'?`${l} · ${count(k)}`:l]),ownerTab,'owner-tab')}${list}</section>`;
}
// Reabrir: desfaz o efeito da decisão e devolve o item à fila.
function ownerUndo(id){
 const d=ownerData().decisions[id];if(!d)return;
 const tg=d.undo?.target,gone=tg&&(tg.type==='item'?itemById(tg.id)?.status==='removed':tg.type==='ask'?!!askById(tg.id)?.hidden:false);
 if(gone&&d.d!=='remove'){notify('Este conteúdo foi removido por outra decisão. Desfaça a remoção primeiro.','info');return;}
 if(d.undo?.entry&&(state.entry?.done||!state.entry?.account||state.entry.eligibility==='pending')){notify('A pessoa já seguiu na entrada. Esta decisão não pode mais ser desfeita.','info');return;}
 if(!mutate(()=>{
  const o=state.owner,u=d.undo||{};
  if(u.itemStatus){const i=itemById(u.item);if(i)i.status=u.itemStatus;}
  if(u.askHidden!==undefined){const a=askById(u.ask);if(a)a.hidden=u.askHidden;}
  if(u.reportIds)for(const r of state.reports||[])if(u.reportIds.includes(r.id))r.status='open';
  if(u.demoIds?.length)o.closedDemo=(o.closedDemo||[]).filter(x=>!u.demoIds.includes(x));
  if(u.entry)state.entry={...state.entry,...u.entry};
  if(u.hasClaimed){const b=bizById(u.biz);if(b){if(u.claimed===null)delete b.claimed;else b.claimed=u.claimed;}}
  for(const c of u.cityIds||[])delete o.decisions[c];
  delete o.decisions[id];o.log=[{at:Date.now(),text:`${d.title||id}: decisão desfeita`},...o.log].slice(0,50);
 },{redraw:false}))return;
 render();ownerFocusHeading();notify(`${d.title||'Item'}: voltou para a fila.`,'undo');
}
function ownerAssign(id){if(!mutate(()=>{const o=state.owner||(state.owner={decisions:{},log:[]});const q=ownerFind(id);o.assign={...(o.assign||{}),...Object.fromEntries((q?.cityIds||[id]).map(k=>[k,'me']))};},{redraw:false}))return;render();globalFocus('owner-review',id);notify('Você é o responsável por este item.','person');}
