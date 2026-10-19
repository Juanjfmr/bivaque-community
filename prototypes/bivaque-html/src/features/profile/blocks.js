// Rodada 60 (AUDITORIA_FUNCIONAL_2026-10-18, item C): bloquear pessoa. No protótipo a pessoa é o nome que
// aparece no conteúdo (autor de pergunta, resposta, anúncio, publicação, comentário e conversa);
// `state.blocked=[{name,at}]`. Bloquear some com o que ela publicou (listas, busca e detalhes: veja
// `isBlocked`, `askAnswers`, `groupPosts`, `postComments` em state.js), fecha a caixa de mensagem da
// conversa com ela e recusa conversa nova. Desbloquear em Configurações → Pessoas bloqueadas devolve
// tudo. Quem foi bloqueado não é avisado. No back-end é um vínculo entre duas contas, não um nome.
let blockPeek=new Set();
const peeked=(kind,id)=>blockPeek.has(`${kind}|${id}`);
// Só para a frase: nome que termina em "a" fica no feminino (limite do protótipo; no back-end vem do cadastro).
const feminine=name=>/a$/i.test(String(name).split(' ')[0]);
const blockedWord=(name,m,f)=>feminine(name)?f:m;
function blockedStrip(name){return `<div class="context-strip readonly" style="margin:0 0 16px" role="status">${icon('cancel')}<span class="grow">Você bloqueou ${esc(name)}</span>${btn('Desbloquear','unblock-person',name,'text')}</div>`;}
// Detalhe aberto pelo endereço (ou por um aviso) de conteúdo de quem foi bloqueado.
function blockedContent(kind,id,name){return `<div class="empty"><div class="empty-art" aria-hidden="true">${EMPTY_ART}<span class="empty-ic">${icon('cancel')}</span><i class="d1"></i><i class="d2"></i><i class="d3"></i></div><h3>Conteúdo de uma pessoa que você bloqueou</h3><p>${esc(name)} está nas suas pessoas bloqueadas.</p>${btn('Ver mesmo assim','peek-blocked',`${kind}|${id}`,'tonal','visibility')}</div>`;}
// Quando a pessoa pediu "Ver mesmo assim", o conteúdo abre com a faixa de quem foi bloqueado.
const blockedGate=(kind,id,name,mine)=>!mine&&isBlocked(name)?peeked(kind,id)?{strip:blockedStrip(name)}:{page:blockedContent(kind,id,name)}:{};
function blockedRow(b){
 const when=new Date(b.at).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'});
 return `<div class="list-row"><span class="avatar" aria-hidden="true">${esc(initals(b.name))}</span><span class="txt"><b>${esc(b.name)}</b><small>${blockedWord(b.name,'Bloqueado','Bloqueada')} em ${when}</small></span>${btn('Desbloquear','unblock-person',b.name,'outlined')}</div>`;
}
function renderBlocked(){
 const list=[...(state.blocked||[])].sort((a,b)=>b.at-a.at);
 return `<div class="page-head"><div><h1>Pessoas bloqueadas</h1><p>Quem você bloqueou não vê que foi bloqueado.</p></div></div>${list.length?`<div class="list">${list.map(blockedRow).join('')}</div>`:empty('Ninguém bloqueado','As pessoas que você bloquear aparecem aqui, para desbloquear quando quiser.','cancel')}`;
}
function blockConfirm(name){
 const f=feminine(name),a=f?'a':'o',ele=f?'ela':'ele';
 confirm(`Bloquear ${name}?`,`Você deixa de ver as perguntas, respostas, anúncios e mensagens ${f?'dela':'dele'}, e ${ele} não consegue mais falar com você.\n${f?'Ela':'Ele'} não é avisad${a}. Você pode desbloquear em Configurações.`,()=>setBlocked(name,true),{ok:'Bloquear',cancel:'Cancelar'});
}
function setBlocked(name,on){
 if(!name||name===state.profile.name)return;
 const had=isBlocked(name);if(on===had)return;
 if(!mutate(()=>{state.blocked=on?[...(state.blocked||[]),{name,at:Date.now()}]:(state.blocked||[]).filter(b=>b.name!==name);const l=state.lastViewed,seen=l?.type==='item'?itemById(l.id)?.seller:l?.type==='ask'?askById(l.id)?.who:'';if(on&&seen===name)state.lastViewed=null;},{redraw:false}))return;
 blockPeek=new Set();
 const f=feminine(name);
 render();
 if(on)notify(`${name} ${f?'bloqueada':'bloqueado'}.`,'cancel',()=>setBlocked(name,false));
 else notify(`${name} ${f?'desbloqueada':'desbloqueado'}.`,'check_circle');
}
// ⋮ do conteúdo de outra pessoa: denunciar e bloquear (só quem não sou eu).
function otherMenu(el,what,reportValue,name,extra=[]){
 openCreate(el,[...extra,['flag',`Denunciar ${what}`,'report','',reportValue],...(blockable(name)&&!isBlocked(name)?[['cancel',`Bloquear ${name}`,'block-person','',name]]:[])],false,`Ações d${what==='comentário'?'o':'a'} ${what}`);
}
async function blockAction(action,value,el){
 if(!['open-blocked','block-person','unblock-person','peek-blocked','answer-other-menu','comment-other-menu','post-other-menu','question-other-menu'].includes(action))return false;
 if(action==='open-blocked'){if(await leaveDialog(()=>navigate('bloqueados')))navigate('bloqueados');return true;}
 if(action==='block-person'){if(value&&value!==state.profile.name&&!isBlocked(value))blockConfirm(value);return true;}
 if(action==='unblock-person'){setBlocked(value,false);return true;}
 if(action==='peek-blocked'){blockPeek=new Set([...blockPeek,value]);render();return true;}
 const [a1,a2,a3]=value.split('|');
 // Rodada 64: o ⋮ da pergunta de outra pessoa também oferece Ocultar (além do deslizar).
 if(action==='question-other-menu'){const q=askById(a1);if(q&&!q.mine)otherMenu(el,'pergunta',`ask|${q.id}`,q.who,q.hiddenByMe?[]:[['visibility_off','Ocultar pergunta','hide-question','',q.id]]);return true;}
 if(action==='answer-other-menu'){const a=askById(a1)?.answers.find(x=>x.id===a2);if(a&&!a.mine)otherMenu(el,'resposta',`answer|${a1}~${a2}`,a.who);return true;}
 const p=gById(a1)?.posts.find(x=>x.id===a2);
 if(action==='post-other-menu'){if(p&&!p.mine)otherMenu(el,'publicação',`post|${a1}~${a2}`,p.author);return true;}
 const c=p?.comments.find(x=>x.id===a3);
 if(c&&!c.mine)otherMenu(el,p.type==='question'?'resposta':'comentário',`comment|${a1}~${a2}~${a3}`,c.author);
 return true;
}
