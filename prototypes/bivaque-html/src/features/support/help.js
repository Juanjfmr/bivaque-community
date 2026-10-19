// Rodada 62 (AUDITORIA_FUNCIONAL_2026-10-18, seção D): Ajuda, Fale com a gente, Meus chamados e
// Apagar a conta. As três primeiras rotas (`ajuda`, `contato`, `chamados`) abrem para quem saiu (com o
// visual da entrada) e para quem entrou (com a barra do app), como as páginas legais da Rodada 58.
// `apagar-conta` só existe para quem está dentro. No protótipo o chamado fica neste aparelho
// (`state.tickets`); no back-end é uma fila de suporte respondida por e-mail.
const SUPPORT_ROUTES=['ajuda','contato','chamados'];
const supportRoute=()=>SUPPORT_ROUTES.includes(route.name);
const TICKET_MIN=10,TICKET_MAX=1000,DELETE_WORD='APAGAR',GONE_NAME='Membro que saiu',GONE_INI='MS';
const TICKET_TOPICS=[['conta','Conta'],['comunidade','Comunidade'],['anuncios','Anúncios'],['seguranca','Segurança'],['outro','Outro']];
const TICKET_SENT='Recebemos. Respondemos por e-mail em até 2 dias úteis.';
const TICKET_REPLY='Obrigado por escrever. Já olhamos o seu caso e a resposta foi enviada para o seu e-mail.';
// Só o que o app faz hoje. Cada tema abre de 3 a 5 perguntas.
const HELP_TOPICS=[
 {id:'conta',ic:'badge',t:'Conta e entrada',s:'CPF, convite, senha',qa:[
  ['Por que pedem o CPF?','Para confirmar seu vínculo na fonte oficial. O número só é conferido e não fica salvo no Bivaque.'],
  ['Sou cônjuge ou dependente. Como entro?','Pelo convite de quem é militar, veterano ou pensionista. Essa pessoa cria o código em Você → Família convidada. O convite vale só para o e-mail de quem foi convidado, por 7 dias, e não pede CPF.'],
  ['A fonte oficial não confirmou meu vínculo.','Envie um documento que mostre o vínculo, como o contracheque ou a identidade militar. A equipe responde em até 2 dias úteis e, enquanto isso, o conteúdo fica fechado.'],
  ['Esqueci a senha.','Na tela Entrar, toque em Esqueci minha senha e informe seu e-mail. Neste teste nenhum e-mail é enviado.'],
  ['Como apago minha conta?','Em Você → Configurações → Apagar a conta. Você confirma digitando APAGAR.']]},
 {id:'comunidade',ic:'forum',t:'Comunidade',s:'Perguntas, grupos, encontros',qa:[
  ['Como peço uma indicação?','Em Comunidade, toque em Perguntar e escreva sua dúvida. Quem conhece a cidade responde, e você marca a resposta que ajudou.'],
  ['Como edito ou excluo o que publiquei?','Abra a pergunta, a resposta, a publicação, o comentário ou o encontro e toque em ⋮. Só quem publicou vê Editar e Excluir. Excluir não pode ser desfeito.'],
  ['Como oculto uma pergunta?','Deslize a pergunta e toque em Ocultar. Só você deixa de vê-la. Para mostrar de novo, vá em Você → Configurações → Ocultados.'],
  ['Como entro num grupo e confirmo presença num encontro?','Em Comunidade → Grupos, escolha o grupo e entre. Os encontros ficam na Agenda: toque em Confirmar presença. Se o encontro mudar ou for cancelado, quem confirmou é avisado.']]},
 {id:'anuncios',ic:'sell',t:'Anúncios e negócios',s:'Publicar, editar, pedir orçamento',qa:[
  ['Como publico um anúncio?','Toque em Criar e escolha Desapego ou Imóvel. Só perfis verificados publicam, e só na sua cidade; nas outras você consulta.'],
  ['Como edito, encerro ou excluo um anúncio?','Em Você → Meus anúncios, abra o anúncio. Você pode editar, marcar como encerrado, reativar ou excluir.'],
  ['Como peço orçamento ou serviço?','Na página de um negócio, toque em Pedir orçamento. Para receber propostas de vários prestadores, abra Pedidos de serviço em Você: até 5 empresas respondem e você escolhe.'],
  ['Como indico um negócio?','Na página do negócio, toque em Indicar este negócio e conte sua experiência.'],
  ['O Bivaque cobra ou intermedeia pagamento?','Não. Valor e pagamento são combinados entre vocês. Desconfie de quem pede pagamento adiantado.']]},
 {id:'seguranca',ic:'verified_user',t:'Segurança',s:'Bloquear, denunciar, privacidade',qa:[
  ['Como bloqueio uma pessoa?','No ⋮ de uma resposta, comentário ou publicação dela, no menu da conversa ou na página do anúncio, toque em Bloquear. Você deixa de ver o que ela publica e ela não fala mais com você; ela não é avisada. Desbloqueie em Configurações → Pessoas bloqueadas.'],
  ['Como denuncio um conteúdo?','Use Denunciar no anúncio, na pergunta, na resposta, no comentário, na publicação, na conversa, na página do negócio ou no pedido de serviço. Escolha o motivo; a equipe analisa e pode remover o conteúdo ou limitar a conta.'],
  ['Quem vê meus dados?','Só membros confirmados da família militar. Seu bairro só aparece se você permitir, em Configurações → Mostrar meu bairro.'],
  ['O que faço diante de um golpe?','Não envie dinheiro adiantado nem códigos recebidos por mensagem. Denuncie o anúncio e combine a entrega num local movimentado.'],
  ['O que acontece se eu apagar minha conta?','Seus anúncios, perguntas e páginas saem da comunidade. Suas respostas e indicações ficam, sem o seu nome, e suas conversas são apagadas para você.']]}
];
var supportTopic='conta',supportSent=false;
const supportEmail=()=>state.profile.email||ENTRY_DEMO_EMAIL;
// Depois de apagar a conta, o e-mail antigo não entra mais (a entrada e o cadastro usam isto).
const entryKnownEmail=()=>state.accountDeletedAt?'':supportEmail();
const topicLabel=id=>(TICKET_TOPICS.find(([v])=>v===id)||TICKET_TOPICS.at(-1))[1];
const ticketsOpen=()=>(state.tickets||[]).filter(t=>t.status==='open');
// Quem saiu lê estas páginas com o visual da entrada; quem entrou, com a barra do app.
function supportPage(title,body,sub=''){
 if(state.signedOut)return `<div class="en en-form legal-doc"><header class="en-top">${iconBtn('arrow_back','back','','Voltar')}<span class="en-mark" aria-hidden="true">B</span><span class="en-brand">Bivaque</span></header><h1 class="en-h1" tabindex="-1">${esc(title)}</h1>${sub?`<p class="en-lead">${esc(sub)}</p>`:''}${body}</div>`;
 return `<article class="legal-doc"><div class="page-head"><div><h1>${esc(title)}</h1>${sub?`<p>${esc(sub)}</p>`:''}</div></div>${body}</article>`;
}
function helpContactCard(){return `<div class="help-card"><b>Não achou?</b><p>Respondemos por e-mail em até 2 dias úteis.</p>${btn('Fale com a gente','support-open','contato','filled')}</div>`;}
function renderHelp(){
 const topic=HELP_TOPICS.find(x=>x.id===route.id);
 if(topic)return supportPage(topic.t,`<div class="list">${topic.qa.map(([q,a])=>`<details class="help-q"><summary><b>${esc(q)}</b>${icon('expand_more')}</summary><p>${esc(a)}</p></details>`).join('')}</div>${helpContactCard()}`);
 const open=ticketsOpen().length,n=(state.tickets||[]).length;
 const rows=HELP_TOPICS.map(x=>profileRow(x.ic,x.t,x.s,'support-open','ajuda:'+x.id)).join('');
 // Rodada 65: Meus chamados é de quem tem conta.
 return supportPage('Ajuda',`<div class="list">${rows}</div>${helpContactCard()}${state.signedOut?'':`<div class="list">${profileRow('inbox','Meus chamados',open?`${open} em andamento`:n?'Todos respondidos':'Nenhum chamado ainda','support-open','chamados')}</div>`}`);
}
function renderContact(){
 const chips=`<md-chip-set aria-label="Assunto">${TICKET_TOPICS.map(([v,l])=>`<md-filter-chip label="${l}" ${v===supportTopic?'selected':''} data-action="support-topic" data-value="${v}" aria-label="Assunto: ${l}"></md-filter-chip>`).join('')}</md-chip-set>`;
 const who=state.signedOut?field('support-email','Seu e-mail','','type="email" required autocomplete="email" inputmode="email"')+'<p class="small muted help-note">A resposta vai para este e-mail.</p>':`<p class="small muted help-note">A resposta vai para ${esc(supportEmail())}.</p>`;
 // Rodada 65: quem enviou sem conta vê só a confirmação (Meus chamados é de quem entrou).
 if(state.signedOut&&supportSent)return supportPage('Recebemos sua mensagem',`<div class="help-card" role="status"><b>${TICKET_SENT}</b><p>A resposta vai para o e-mail que você informou.</p>${btn('Voltar à Ajuda','support-open','ajuda','filled')}</div>`);
 return supportPage('Fale com a gente',`<div class="help-chips">${chips}</div>${field('support-text','Conte o que aconteceu','',`type="textarea" rows="5" required maxlength="${TICKET_MAX}" supporting-text="Mínimo de ${TICKET_MIN} caracteres"`)}${who}<div class="help-send">${btn('Enviar','support-send','','filled')}</div><p class="small muted help-note">Neste teste o chamado fica só neste aparelho.</p>`);
}
function ticketRow(t){
 const done=t.status==='answered',when=d=>new Date(d).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'});
 return `<article class="ticket"><div class="ticket-head"><b>${esc(topicLabel(t.topic))}</b>${done?pill('Respondido','ok','check_circle'):pill('Em andamento','','schedule')}</div><p class="small muted">Enviado em ${when(t.at)}</p><p class="ticket-text">${esc(t.text)}</p>${done?`<p class="ticket-reply"><b>Resposta · ${when(t.answeredAt)}</b>${esc(t.reply||TICKET_REPLY)}</p>`:''}</article>`;
}
function renderTickets(){
 const list=[...(state.tickets||[])].sort((a,b)=>b.at-a.at);
 return supportPage('Meus chamados',list.length?`<div class="stack">${list.map(ticketRow).join('')}</div>`:empty('Nenhum chamado ainda','Quando você escrever para a gente, o chamado aparece aqui com o estado.','inbox','support-contact','Fale com a gente'));
}
function fieldError(f,text){if(!f)return;f.error=true;f.errorText=text;f.focus({preventScroll:true});}
function supportSend(){
 const f=$('#support-text'),text=(f?.value||'').trim(),mail=state.signedOut?($('#support-email')?.value||'').trim().toLowerCase():supportEmail();
 if(f)f.error=false;
 if(text.length<TICKET_MIN)return fieldError(f,`Escreva pelo menos ${TICKET_MIN} caracteres.`);
 if(!entryEmailOk(mail))return fieldError($('#support-email'),'Confira o e-mail.');
 const ticket={id:uid('t'),topic:supportTopic,text:text.slice(0,TICKET_MAX),at:Date.now(),status:'open',email:mail};
 if(!mutate(()=>{state.tickets=[ticket,...(state.tickets||[])];},{redraw:false}))return;
 if(state.signedOut){supportSent=true;render();}else navigate('chamados',null,{replace:true});
 notify(TICKET_SENT,'inbox');
}
// Controles do protótipo: o chamado mais antigo ainda aberto é respondido e um aviso leva a Meus chamados.
function supportSimulate(){
 const t=ticketsOpen().sort((a,b)=>a.at-b.at)[0];
 if(!t){notify('Nenhum chamado em andamento para responder.','info');return;}
 if(mutate(()=>{t.status='answered';t.answeredAt=Date.now();t.reply=TICKET_REPLY;state.notices=[{id:uid('n'),city:state.homeCity,unread:true,text:`O suporte respondeu ao seu chamado sobre ${topicLabel(t.topic)}.`,go:['chamados'],when:'Agora'},...state.notices];}))notify('Resposta do suporte simulada','inbox');
}
// ---- Apagar a conta ----
function renderDeleteAccount(){
 const rows=[['sell','Seus anúncios, perguntas e páginas','Saem da comunidade'],['forum','Suas respostas e indicações','Ficam, sem o seu nome'],['chat_bubble','Suas conversas','Apagadas para você']].map(([ic,t,s])=>`<div class="list-row">${icon(ic)}<span class="txt"><b>${t}</b><small>${s}</small></span></div>`).join('');
 return `<article class="legal-doc"><div class="page-head"><h1>Apagar a conta</h1></div><div class="help-warn" role="note">${icon('error')}<span>Isso não pode ser desfeito.</span></div><div class="list">${rows}</div>${field('delete-word',`Digite ${DELETE_WORD} para confirmar`,'','autocomplete="off" autocapitalize="characters" spellcheck="false"')}<div class="help-danger">${btn('Apagar minha conta','account-delete','','filled').replace('<md-filled-button','<md-filled-button class="danger-fill"')}</div></article>`;
}
// Tudo numa gravação só (`mutate`): se o armazenamento recusar, nada fica pela metade.
function accountPurge(){
 const gone=o=>{o.mine=false;o.ini=GONE_INI;},name=state.profile.name,email=state.profile.email,bizId=state.myBiz?.id;
 state.items=state.items.filter(x=>!x.mine);state.asks=state.asks.filter(q=>!q.mine);state.events=state.events.filter(e=>!e.mine);
 state.requests=(state.requests||[]).filter(r=>!r.mine);
 // Rodada 65: a página sai dos pedidos de terceiros; bloqueios e denúncias (com o texto digitado) são apagados;
 // o nome some dos títulos e do registro do Painel; a suspensão da conta não sobra.
 if(bizId)bizLeaveRequests(bizId);
 state.myBiz=null;delete state.bizSuspended;state.blocked=[];state.reports=[];
 if(state.owner&&name){const anon=s=>typeof s==='string'?s.split(name).join(GONE_NAME):s;for(const d of Object.values(state.owner.decisions||{}))d.title=anon(d.title);state.owner.log=(state.owner.log||[]).map(l=>({...l,text:anon(l.text)}));}
 for(const x of state.items)x.saved=false;
 for(const q of state.asks){q.following=false;delete q.hiddenByMe;for(const a of q.answers)if(a.mine){gone(a);a.who=GONE_NAME;}}
 for(const e of state.events)if(e.on){e.on=false;e.going=Math.max(0,(e.going||0)-1);}
 for(const b of state.biz){b.saved=false;b.myInd=false;b.says=(b.says||[]).map(s=>s[1]==='me'?[GONE_INI,'',GONE_NAME,s[3]]:s);}
 for(const g of state.groups){
  // Única administradora: o primeiro moderador assume; sem moderador, o grupo é encerrado (como em closeGroup).
  g.mods=(g.mods||[]).filter(m=>m!==name);
  if(g.role==='admin'){if(g.mods.length){g.admin=g.mods[0];g.mods=g.mods.slice(1);}else{g.closedAt=Date.now();g.requests=[];}}
  // R64 usa accountKey() (e-mail ou USER_ID) como chave da cota; o nome fica por dados antigos.
  for(const k of [name,email,USER_ID])if(k&&g.offerAt)delete g.offerAt[k];
  if(g.offerAt&&!Object.keys(g.offerAt).length)delete g.offerAt;
  g.on=false;g.pending=false;g.role=null;g.unread=0;
  if(bizId)g.posts=g.posts.filter(p=>!(p.type==='offer'&&p.biz===bizId));
  for(const p of g.posts){
   if(p.alsoCity&&!state.asks.some(q=>q.id===p.alsoCity))delete p.alsoCity;
   if(p.mine){gone(p);p.author=GONE_NAME;}
   for(const c of p.comments)if(c.mine){gone(c);c.author=GONE_NAME;}
   // Voto e presença em publicação de grupo ficam fora dos totais-base (a tela soma o da própria pessoa): limpa só o dela.
   if(p.poll?.voted!=null)p.poll.voted=null;
   if(p.event?.on)p.event.on=false;
  }
 }
 state.leftAuto=state.groups.filter(g=>g.auto).map(g=>g.id);
 state.threads=[];state.notices=[];state.tickets=[];state.invites=[];state.drafts=[];state.alerts=[];state.recent=[];state.lastViewed=null;state.askDraft='';
 state.subscription={tier:'free',month:dateISO().slice(0,7),repliedThreadIds:[]};
 state.profile={name:'',role:'',force:'',verified:false,interests:[]};state.entry={};state.signedOut=true;state.accountDeletedAt=Date.now();
}
function accountDelete(){
 const f=$('#delete-word');if(f)f.error=false;
 if(String(f?.value||'').trim().toUpperCase()!==DELETE_WORD)return fieldError(f,`Digite ${DELETE_WORD} para confirmar.`);
 if(!mutate(accountPurge,{redraw:false}))return;
 supportSent=false;entrySampleCity=null;entryCityDraft=null;entryInviteCode='';entryForgotSent='';closePalette(false);toastClearAll();
 navigate('entrar','apagada',{replace:true});
}
function renderAccountDeleted(){
 return `<div class="en en-form en-gone"><header class="en-top"><span class="en-mark" aria-hidden="true">B</span><span class="en-brand">Bivaque</span></header><div class="en-gone-in">${icon('check_circle')}<h1 class="en-h1" tabindex="-1">Sua conta foi apagada.</h1><p class="en-lead">Obrigado por ter feito parte. Você pode voltar quando quiser.</p>${btn('Voltar ao início','account-deleted-home','','outlined')}</div></div>`;
}
// Os campos voltam ao normal assim que a pessoa digita.
root.addEventListener('input',e=>{if(['support-text','support-email','delete-word'].includes(e.target?.id))e.target.error=false;});
async function supportAction(action,value){
 if(!action.startsWith('support-')&&!['account-delete','account-deleted-home'].includes(action))return false;
 if(action==='support-open'||action==='support-contact'){
  const [name,id]=action==='support-contact'?['contato',null]:String(value).split(':');
  if(![...SUPPORT_ROUTES,'apagar-conta'].includes(name)||(name==='apagar-conta'&&state.signedOut))return true;
  if(name==='contato'){supportTopic='conta';supportSent=false;}
  if(await leaveDialog(()=>navigate(name,id||null)))navigate(name,id||null);return true;
 }
 if(action==='support-topic'){
  if(!TICKET_TOPICS.some(([v])=>v===value))return true;supportTopic=value;
  for(const c of $$('[data-action="support-topic"]'))c.selected=c.dataset.value===value;return true;
 }
 if(action==='support-send'){supportSend();return true;}
 if(action==='support-simulate'){supportSimulate();return true;}
 if(action==='account-delete'){if(!state.signedOut)accountDelete();return true;}
 if(action==='account-deleted-home'){navigate('entrar',null,{replace:true});return true;}
 return false;
}
