// Rodada 59 (AUDITORIA_FUNCIONAL_2026-10-18, item C): quem publicou edita e exclui o que publicou.
// Perguntas, respostas, publicações e comentários de grupo e encontros (maquete aprovada, quadros 1 e 2).
// O menu ⋮ só existe para o autor (`mine`); conteúdo de outra pessoa não muda aqui (denunciar é a R60).
// Excluir tira o registro de vez: listas, busca, Salvos e páginas derivam de `state`, então somem juntos.
const MANAGE_ACTIONS=['question-menu','edit-question','save-question','toggle-question','delete-question','answer-menu','edit-answer','save-answer','delete-answer','post-menu','edit-post','save-post','delete-post','comment-menu','edit-comment','save-comment','delete-comment'];
// Quem confirmou presença é avisado (aviso local, no modo teste). Na Agenda `going` conta a própria pessoa.
const eventGuests=e=>Math.max(0,(e.going||0)-(e.on?1:0));
const guestsNote=(n,past)=>!n?'':` ${n===1?'1 pessoa que confirmou':`${n} pessoas que confirmaram`} ${past?(n===1?'foi avisada':'foram avisadas'):(n===1?'será avisada':'serão avisadas')}.`;
const EDIT_CONFIRM={ok:'Excluir',cancel:'Cancelar',danger:true};
// Menu ⋮ da barra, na pergunta que é minha (no desktop a busca continua ao lado).
function questionTopActions(){const q=route.name==='pergunta'&&askById(route.id);if(!q?.mine||q.hidden||readonly())return '';return `<span class="tb-desk">${iconBtn('search','search','','Buscar')}</span>${iconBtn('more_vert','question-menu',q.id,'Opções da pergunta')}`;}
function openTextEdit(title,label,text,save,value,min=3){editor={kind:'edit'};editorDirty=false;showDialog(title,field('edit-text',label,text,`type="textarea" rows="4" required minlength="${min}" maxlength="2000"`),`${btn('Cancelar','close-dialog','','text')}${btn('Salvar',save,value,'filled','check')}`,'editor');}
const editedText=()=>($('#edit-text',dialog)?.value||'').trim();
function openPostEdit(g,p){
 const votes=p.poll&&(p.poll.voted!=null||p.poll.options.some(o=>o[1]>0));
 let c=field('edit-text',{post:'O que você quer compartilhar?',question:'O que você quer perguntar?',event:'Nome do evento',poll:'Pergunta da enquete'}[p.type]||'Texto',p.text,p.type==='event'?'maxlength="120"':'type="textarea" rows="4" maxlength="2000"');
 if(p.type==='event')c+=`<div class="form-grid"><label class="field-label">Data<input id="edit-date" type="date" value="${esc(p.event.date)}"></label><label class="field-label">Horário<input id="edit-time" type="time" value="${esc(p.event.time)}"></label></div>${field('edit-place','Local (público)',p.event.place,'maxlength="120"')}${p.event.going?`<p class="form-note">Se a data, o horário ou o local mudarem, ${p.event.going===1?'a pessoa que confirmou será avisada':`as ${p.event.going} pessoas que confirmaram serão avisadas`}.</p>`:''}`;
 if(p.poll)c+=votes?`<p class="form-note">Esta enquete já tem votos. Só o texto da pergunta muda; as opções ficam como estão.</p><div class="stack">${p.poll.options.map(o=>`<div class="choice">${icon('ballot')}<span class="txt"><b>${esc(o[0])}</b></span></div>`).join('')}</div>`:[0,1,2,3].map(i=>field('edit-opt-'+i,`Opção ${i+1}${i>1?' (opcional)':''}`,p.poll.options[i]?.[0]||'','maxlength="60"')).join('');
 editor={kind:'edit'};editorDirty=false;showDialog(p.type==='event'?'Editar encontro':p.type==='poll'?'Editar enquete':p.type==='question'?'Editar pergunta':'Editar publicação',c,`${btn('Cancelar','close-dialog','','text')}${btn('Salvar','save-post',`${g.id}|${p.id}`,'filled','check')}`,'editor');
}
async function savePost(g,p){
 const text=editedText();if(text.length<(p.type==='event'?3:5)){notify(p.type==='event'?'Dê um nome ao evento.':'Escreva pelo menos 5 caracteres.','error');return;}
 const ev=p.type==='event',date=ev?$('#edit-date',dialog).value:'',time=ev?$('#edit-time',dialog).value||p.event.time:'',place=ev?$('#edit-place',dialog).value.trim():'';
 if(ev&&(!date||!place)){notify('Informe a data e o local do evento.','error');return;}
 if(ev&&date!==p.event.date&&date<dateISO()){notify('A data do encontro precisa ser hoje ou depois.','error');return;}
 const votes=p.poll&&(p.poll.voted!=null||p.poll.options.some(o=>o[1]>0)),opts=p.poll&&!votes?[0,1,2,3].map(i=>$('#edit-opt-'+i,dialog)?.value.trim()||'').filter(Boolean):null;
 if(opts&&opts.length<2){notify('A enquete precisa de pelo menos 2 opções.','error');return;}
 const moved=ev&&(date!==p.event.date||time!==p.event.time||place!==p.event.place),optsChanged=opts&&opts.join('|')!==p.poll.options.map(o=>o[0]).join('|');
 if(text===p.text&&!moved&&!optsChanged){await closeDialog(true);return;}
 if(!mutate(()=>{p.text=text;if(ev)Object.assign(p.event,{date,time,place});if(optsChanged)p.poll.options=opts.map(o=>[o,0]);p.edited=Date.now();const a=p.alsoCity&&askById(p.alsoCity);if(a){a.q=text;a.edited=Date.now();}},{redraw:false}))return;
 await closeDialog(true);render();notify(ev?`Encontro atualizado.${moved?guestsNote(p.event.going,true):''}`:p.poll?'Enquete atualizada.':p.type==='question'?(p.alsoCity&&askById(p.alsoCity)?'Pergunta atualizada, também em Indicações.':'Pergunta atualizada.'):'Publicação atualizada.');
}
async function removeQuestion(id){
 const q=askById(id);if(!q?.mine)return;
 if(!mutate(()=>{state.asks=state.asks.filter(x=>x.id!==id);if(state.lastViewed?.id===id)state.lastViewed=null;for(const g of state.groups)for(const p of g.posts)if(p.alsoCity===id)delete p.alsoCity;},{redraw:false}))return;
 communityTab='ind';navigate('comunidade',null,{replace:true});notify('Pergunta excluída.','delete');
}
async function removePost(gid,pid){
 const g=gById(gid),p=g?.posts.find(x=>x.id===pid);if(!p?.mine)return;const ev=p.type==='event',n=ev?p.event.going:0;
 if(!mutate(()=>{g.posts=g.posts.filter(x=>x.id!==pid);for(const c of p.comments){const b=c.biz&&bizById(c.biz);if(b)b.recN=Math.max(0,(b.recN||0)-1);}},{redraw:false}))return;
 if(route.name==='publicacao')navigate('grupo',gid,{replace:true});else render();
 notify(ev?`Encontro cancelado.${guestsNote(n,true)}`:`${p.poll?'Enquete':p.type==='question'?'Pergunta':'Publicação'} excluída.`,ev?'event_busy':'delete');
}
async function manageAction(action,value,el){
 if(!MANAGE_ACTIONS.includes(action))return false;
 const [a1,a2,a3]=value.split('|');
 // Pergunta
 const q=action.includes('question')?askById(a1):null;
 if(q!==null){
  if(!q?.mine||q.city!==state.homeCity||!canPost())return true;
  if(action==='question-menu'){openCreate(el,[['edit','Editar pergunta','edit-question','',q.id],[q.status==='ok'?'refresh':'check_circle',q.status==='ok'?'Reabrir pergunta':'Marcar como resolvida','toggle-question','',q.id],['share','Compartilhar','share','','pergunta|'+q.id],['delete','Excluir pergunta','delete-question','',q.id,true]],false,'Ações da pergunta');return true;}
  if(action==='edit-question'){openTextEdit('Editar pergunta','Sua pergunta',q.q,'save-question',q.id,8);return true;}
  if(action==='save-question'){const text=editedText();if(text.length<8||queryTerms(text).length<2){notify('Escreva uma pergunta com um pouco mais de contexto.','error');return true;}if(text===q.q){await closeDialog(true);return true;}if(mutate(()=>{q.q=text;q.edited=Date.now();},{redraw:false})){await closeDialog(true);render();notify('Pergunta atualizada.');}return true;}
  if(action==='toggle-question'){const solve=q.status!=='ok';if(mutate(()=>{q.status=solve?'ok':'open';if(!solve)q.answers.forEach(a=>{a.solved=false;});}))notify(solve?'Pergunta marcada como resolvida.':'Pergunta reaberta.');return true;}
  const n=q.answers.length;
  confirm('Excluir pergunta?',`${n?`A pergunta e ${n===1?'a resposta saem':`as ${n} respostas saem`}`:'A pergunta sai'} da comunidade. Isso não pode ser desfeito.`,()=>removeQuestion(q.id),EDIT_CONFIRM);return true;
 }
 // Resposta minha numa pergunta: a pergunta pode ser de qualquer pessoa
 if(action.includes('answer')){
  const aq=askById(a1),ans=aq?.answers.find(x=>x.id===a2);if(!ans?.mine||aq.city!==state.homeCity||!canPost())return true;
  if(action==='answer-menu'){openCreate(el,[['edit','Editar resposta','edit-answer','',value],['delete','Excluir resposta','delete-answer','',value,true]],false,'Ações da resposta');return true;}
  if(action==='edit-answer'){openTextEdit('Editar resposta','Sua resposta',ans.t,'save-answer',value,5);return true;}
  if(action==='save-answer'){const text=editedText();if(text.length<5){notify('Escreva uma resposta com um pouco mais de contexto.','error');return true;}if(text===ans.t){await closeDialog(true);return true;}if(mutate(()=>{ans.t=text;ans.edited=Date.now();},{redraw:false})){await closeDialog(true);render();notify('Resposta atualizada.');}return true;}
  // Se era a solução, a pergunta volta a ficar sem solução.
  confirm('Excluir resposta?',`Ela sai desta pergunta. Isso não pode ser desfeito.${ans.solved?' A pergunta volta a ficar sem solução.':''}`,()=>{if(mutate(()=>{aq.answers=aq.answers.filter(x=>x.id!==a2);if(ans.solved)aq.status='open';},{redraw:false})){render();notify('Resposta excluída.','delete');}},EDIT_CONFIRM);return true;
 }
 // Publicação de grupo
 const g=gById(a1),p=g?.posts.find(x=>x.id===a2);
 // Rodada 61: grupo encerrado é só leitura; editar ou excluir publicação e comentário dele é recusado.
 if(g&&groupClosed(g)&&(action.includes('post')||action.includes('comment')))return groupLockedNotice();
 if(action.includes('post')){
  if(!p?.mine||!canPost())return true;
  if(action==='post-menu'){const noun=p.type==='event'?'encontro':p.type==='poll'?'enquete':p.type==='question'?'pergunta':'publicação';openCreate(el,[['edit',`Editar ${noun}`,'edit-post','',value],['delete',p.type==='event'?'Cancelar encontro':`Excluir ${noun}`,'delete-post','',value,true]],false,`Ações d${noun==='encontro'?'o':'a'} ${noun}`);return true;}
  if(action==='edit-post'){openPostEdit(g,p);return true;}
  if(action==='save-post'){await savePost(g,p);return true;}
  const nc=p.comments.length;
  if(p.type==='event')confirm('Cancelar encontro?',`O encontro sai do grupo.${guestsNote(p.event.going,false)}`,()=>removePost(g.id,p.id),{...EDIT_CONFIRM,ok:'Cancelar encontro',cancel:'Voltar'});
  else confirm(`Excluir ${p.poll?'enquete':p.type==='question'?'pergunta':'publicação'}?`,`${p.poll?'A enquete':p.type==='question'?'A pergunta':'A publicação'}${nc?` e ${nc===1?'o comentário saem':`os ${nc} comentários saem`}`:' sai'} do grupo.${p.alsoCity?' A pergunta enviada à cidade continua em Indicações.':''} Isso não pode ser desfeito.`,()=>removePost(g.id,p.id),EDIT_CONFIRM);
  return true;
 }
 // Comentário meu numa publicação (resposta, se a publicação é uma pergunta)
 const c=p?.comments.find(x=>x.id===a3),w=p?.type==='question'?'resposta':'comentário';
 if(!c?.mine||!canPost())return true;
 if(action==='comment-menu'){openCreate(el,[['edit',`Editar ${w}`,'edit-comment','',value],['delete',`Excluir ${w}`,'delete-comment','',value,true]],false,`Ações d${w==='resposta'?'a':'o'} ${w}`);return true;}
 if(action==='edit-comment'){openTextEdit(`Editar ${w}`,w==='resposta'?'Sua resposta':'Seu comentário',c.text,'save-comment',value);return true;}
 if(action==='save-comment'){const text=editedText();if(text.length<3){notify('Escreva pelo menos 3 caracteres.','error');return true;}if(text===c.text){await closeDialog(true);return true;}if(mutate(()=>{c.text=text;c.edited=Date.now();},{redraw:false})){await closeDialog(true);render();notify(w==='resposta'?'Resposta atualizada.':'Comentário atualizado.');}return true;}
 confirm(`Excluir ${w}?`,`${c.biz?'A indicação do negócio marcado também sai. ':''}${c.solved?'A pergunta volta a ficar sem solução. ':''}Isso não pode ser desfeito.`,()=>{if(mutate(()=>{p.comments=p.comments.filter(x=>x.id!==a3);if(c.solved)p.resolved=false;const b=c.biz&&bizById(c.biz);if(b)b.recN=Math.max(0,(b.recN||0)-1);},{redraw:false})){render();notify(w==='resposta'?'Resposta excluída.':'Comentário excluído.','delete');}},EDIT_CONFIRM);
 return true;
}
