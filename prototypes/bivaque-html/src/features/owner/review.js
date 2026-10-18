// Rodada 49: revisar um item da fila no painel lateral (no celular, a folha de baixo). Decisões com
// consequência pedem motivo; tudo fica no registro do dono (state.owner.log).
const OWNER_DECISION_REASONS=[['','Escolher motivo'],['golpe','Golpe ou pedido de pagamento antecipado'],['enganoso','Informação enganosa'],['dados','Dados pessoais expostos'],['ofensa','Ofensa ou assédio'],['documento','Documento ilegível ou não confere'],['outro','Outro motivo']];
function ownerFind(id){return ownerQueue().find(q=>q.id===id)||null;}
function ownerChecks(list){return `<ul class="ow-checks">${list.map(([t,ok])=>`<li>${icon(ok?'check_circle':'schedule')}<span>${esc(t)}${ok?'':' · conferir'}</span></li>`).join('')}</ul>`;}
const ownerReason=()=>selectField('owner-reason','Motivo da decisão',OWNER_DECISION_REASONS,'');
function ownerReviewBody(q){
 if(q.kind==='report'){
  const t=reportTarget(q.type,q.target),who=t?.seller||t?.who||t?.name||'';
  return `<p>${esc(q.title)}${who?` · ${esc(who)}`:''}</p><h3>Denúncias</h3><ul class="ow-reports">${q.list.map(r=>`<li><b>${esc(REPORT_REASONS[r.reason]||r.reason)}</b>${r.details?` · “${esc(r.details)}”`:''}<small>${ownerAgo(r.at)}${r.demo?'':' · feita neste dispositivo'}</small></li>`).join('')}</ul>${t&&q.type==='item'?btn('Abrir o anúncio','open-item',t.id,'text','open_in_new'):''}<h3>Decisão</h3>${ownerReason()}<p class="form-note">Remover tira o conteúdo das listas e da busca. Dispensar mantém o conteúdo e fecha as denúncias.</p>`;
 }
 if(q.kind==='verify'){const v=q.data;return `<p>Pediu acesso como família chegando a ${esc(v.city)} ${esc(v.when)}. Convidada por ${esc(v.invitedBy)}, verificado.</p><h3>Documento</h3><div class="ow-doc">Documento enviado (exemplo)</div><h3>Conferir</h3>${ownerChecks(v.checks)}<h3>Histórico</h3><p class="small muted">Primeiro pedido. Nenhuma denúncia.</p><h3>Se for recusar</h3>${ownerReason()}`;}
 if(q.kind==='claim'){const b=q.biz;return `<p>${esc(b.name)} · ${esc(b.cat)} · ${esc(b.city)}</p><h3>Conferir</h3>${ownerChecks([['Indicada pela comunidade',(b.recN||0)>0],['CNPJ e telefone conferem',true],['Quem pede é o responsável',false]])}${btn('Abrir a página','open-biz',b.id,'text','open_in_new')}<h3>Se for recusar</h3>${ownerReason()}`;}
 const rows=q.asks.slice(0,5).map(a=>`<li><b>${esc(a.q)}</b><small>${esc(a.city)} · ${ownerAgo(a.createdAt)}</small></li>`).join('');
 return `<p>${esc(q.sub)}.</p>${rows?`<h3>Paradas no protótipo</h3><ul class="ow-reports">${rows}</ul>`:''}<p class="form-note">Os embaixadores da cidade recebem um aviso com as perguntas. Onde não há embaixador, o aviso pede para você convidar alguém de lá.</p>`;
}
function ownerReviewActions(q){
 const a=(label,d,kind='outlined')=>btn(label,'owner-decide',`${q.id}~${d}`,kind);
 if(q.kind==='report')return `${a('Dispensar','dismiss','text')}${a('Remover','remove','filled')}`;
 if(q.kind==='verify')return `${a('Pedir outro documento','more','text')}${a('Recusar','reject')}${a('Aprovar','approve','filled')}`;
 if(q.kind==='claim')return `${a('Recusar','reject')}${a('Aprovar','approve','filled')}`;
 return a('Chamar embaixadores','call','filled');
}
function ownerReview(id){const q=ownerFind(id);if(!q){notify('Este item já foi decidido.','info');return;}showDialog(q.title,`<div class="ow-review">${ownerReviewBody(q)}</div>`,ownerReviewActions(q),'owner-review');}
function ownerDecide(value){
 const [id,d]=value.split('~'),q=ownerFind(id);if(!q)return;
 const needs=d==='remove'||d==='reject',reason=$('#owner-reason')?.value||'';
 if(needs&&!reason){const f=$('#owner-reason');if(f){f.error=true;f.errorText='Escolha o motivo antes de decidir.';f.focus();}return;}
 const label={remove:'removido',dismiss:'dispensado',approve:'aprovado',reject:'recusado',more:'novo documento pedido',call:'embaixadores chamados'}[d];
 const ok=mutate(()=>{
  const o=state.owner||(state.owner={decisions:{},log:[]});
  const undo={};
  if(q.kind==='report'){undo.reportKey=`${q.type}|${q.target}`;const t=reportTarget(q.type,q.target);if(d==='remove'&&q.type==='item'&&t){undo.item=t.id;undo.itemStatus=t.status;}if(d==='remove'&&q.type==='ask'&&t){undo.ask=t.id;undo.askHidden=!!t.hidden;}}
  if(q.kind==='claim'&&d==='approve'){undo.biz=q.biz.id;undo.claimed=q.biz.claimed;}
  o.decisions[id]={d,reason,at:Date.now(),title:q.title,kind:q.kind,city:q.city,undo};o.log=[{at:Date.now(),text:`${q.title}: ${label}${reason?` (${OWNER_DECISION_REASONS.find(r=>r[0]===reason)?.[1].toLowerCase()})`:''}`},...o.log].slice(0,50);
  if(q.kind==='report'&&d==='remove'){const t=reportTarget(q.type,q.target);if(q.type==='item'&&t)t.status='removed';if(q.type==='ask'&&t)t.hidden=true;}
  if(q.kind==='report')for(const r of state.reports||[])if(`${r.type}|${r.target}`===`${q.type}|${q.target}`)r.status='closed';
  if(q.kind==='claim'&&d==='approve')q.biz.claimed=true;
 },{redraw:false});
 if(!ok)return;
 closeDialog(true).then(()=>{render();notify(d==='call'?ownerCallText(q):`${q.title}: ${label}.`,'check_circle');});
}
function ownerCallText(q){const cs=OWNER_DEMO.cities,c=Object.keys(q.cities),without=c.filter(x=>!cs[x]?.ambassadors),withA=c.filter(x=>cs[x]?.ambassadors);return `${withA.length?`Aviso enviado aos embaixadores de ${withA.join(' e ')}. `:''}${without.length?`${without.join(' e ')} ainda não ${without.length===1?'tem':'têm'} embaixador: convide alguém de lá.`:''}`.trim();}
async function ownerAction(action,value){
 if(!action.startsWith('owner-'))return false;
 if(action==='owner-open'){if(dialog.open)await closeDialog(true);ownerTab='all';ownerStatus='open';navigate('dono');return true;}
 if(action==='owner-exit'){navigate('voce');return true;}
 if(action==='owner-city'){ownerCity=value;render();globalFocus(action,value);return true;}
 if(action==='owner-tab'){ownerTab=value;render();globalFocus(action,value);return true;}
 if(action==='owner-review'){ownerReview(value);return true;}
 if(action==='owner-decide'){ownerDecide(value);return true;}
 if(action==='owner-go'){navigate('dono',value||null);return true;}
 if(action==='owner-status'){ownerStatus=value;render();globalFocus(action,value);return true;}
 if(action==='owner-sort'){ownerSort=value;render();globalFocus(action,value);return true;}
 if(action==='owner-assign'){ownerAssign(value);return true;}
 if(action==='owner-undo'){ownerUndo(value);return true;}
 return false;
}
// Denúncia feita no app: fica registrada e entra na fila do dono (antes, só um aviso de dependência).
function submitReport(value){
 const [type,target]=value.split('|'),reason=$('#report-reason')?.value||'',details=($('#report-details')?.value||'').trim();
 if(!reason){const f=$('#report-reason');if(f){f.error=true;f.errorText='Escolha o motivo.';f.focus();}return;}
 if((state.reports||[]).some(r=>r.type===type&&r.target===target&&r.status==='open')){closeDialog(true);notify('Você já denunciou este conteúdo. A equipe do Bivaque está revisando.','info');return;}
 if(!mutate(()=>{state.reports=[...(state.reports||[]),{id:uid('rp'),type,target,reason,details:details.slice(0,1000),at:Date.now(),status:'open'}];},{redraw:false}))return;
 closeDialog(true).then(()=>notify('Denúncia registrada. A equipe do Bivaque revisa em até 24 h.','flag'));
}
