// Messaging owns its action dispatcher, composer bindings and transient draft recovery.
// Persistent demo data is written only through mutate; no message leaves this device.
const messagingDrafts=new Map();
let messagingReturnFocus=null;
function messagingPrepareBack(destination){
 if(route.name!=='conversa'||messagingReturnFocus&&routeHash(messagingReturnFocus.route)===routeHash(destination))return;
 const action=destination.name==='conversas'?'open-thread':destination.name==='anuncio'?'item-interest':destination.name==='negocio'?'quote':null;
 messagingReturnFocus={route:{...destination},action,value:destination.name==='conversas'?route.id:destination.id};
}
function messagingThread(id){const t=threadById(id);return accessibleRecord(t)&&!t.deleted?t:null;}
function messagingFeedback(text,{invalid=false}={}){
 const status=$('#chat-status'),input=$('#chat-input');
 if(status)status.textContent=text;else notify(text,'info');
 if(input){input.error=invalid;input.errorText=invalid?text:'';}
}
function messagingCanWrite(){
 if(readonly()){messagingFeedback(`Você está consultando ${state.city}. Envie mensagens na sua cidade, ${state.homeCity}.`);return false;}
 if(!state.profile.verified){messagingFeedback('O perfil de teste precisa estar verificado para enviar mensagens.');return false;}
 return true;
}
async function messagingAction(action,value,el){
 if(!['open-thread','send-message','thread-origin','thread-menu','pin-thread','thread-unread','swipe-delete-thread','quick-reply','react-open','react-msg'].includes(action))return false;
 const t=messagingThread(['quick-reply','react-open','react-msg'].includes(action)?value.split('|')[0]:value);
 if(!t){messagingFeedback('Esta conversa não está disponível nesta cidade.');return true;}
 if(action==='react-open'||action==='react-msg'){chatReactAction(action,t,value);return true;}
 if(action==='quick-reply'){const input=$('#chat-input'),text=messagingQuickReplies(t)[Number(value.split('|')[1])];if(!input||input.disabled||!text)return true;const current=(input.value||'').trimEnd();input.value=current?`${current} ${text}`:text;messagingDrafts.set(t.id,input.value);input.focus();return true;}
 if(action==='open-thread'){
  messagingReturnFocus={route:{...route},action:el?.dataset.action||'open-thread',value};
  if(dialog.open)await closeDialog(true);
  if(t.unread)mutate(()=>{threadById(value).unread=false;},{redraw:false});
  navigate('conversa',value);return true;
 }
 if(action==='send-message'){
  if(route.name!=='conversa'||route.id!==value){notify('Abra esta conversa antes de enviar uma mensagem.','info');return true;}
  const input=$('#chat-input');if(!input){notify('O campo de mensagem não está disponível.','error');return true;}
  const raw=input.value||'',text=raw.trim();messagingDrafts.set(value,raw);
  if(isBlocked(t.who)){messagingFeedback(`Você bloqueou ${t.who}.`);return true;}
  if(!messagingCanWrite())return true;
  if(!text||raw.length>2000){messagingFeedback(!text?'Escreva uma mensagem antes de enviar.':'A mensagem pode ter até 2.000 caracteres.',{invalid:true});input.focus({preventScroll:true});return true;}
  const gate=planReplyGate(t);if(gate.blocked){planLimitDialog();return true;}
  messagingFeedback('Salvando mensagem neste dispositivo…');
  const saved=mutate(()=>{const thread=threadById(value);thread.msgs.push({me:true,t:text,at:Date.now()});thread.updatedAt=Date.now();thread.unread=false;thread.draft='';if(gate.isNew)planCountReply(thread);},{redraw:false});
  if(!saved){messagingFeedback('Não foi possível salvar a mensagem. O texto foi mantido; libere espaço e tente novamente.');input.focus({preventScroll:true});return true;}
  messagingDrafts.delete(value);render();messagingFeedback('Mensagem fictícia salva neste dispositivo.');return true;
 }
 if(action==='thread-origin'){
  const ref=t.about.type==='item'?itemById(t.about.id):t.about.type==='biz'?bizById(t.about.id):null;
  if(!accessibleRecord(ref)){messagingFeedback('A origem deste contato não está mais disponível. O histórico da conversa foi preservado.');return true;}
  navigate(t.about.type==='item'?'anuncio':'negocio',ref.id);return true;
 }
 // Rodada 60 (quadro 6): menu da conversa no popover do ⋮, com Denunciar e Bloquear.
 if(action==='thread-menu'){
  openCreate(el,[[t.unread?'drafts':'chat_bubble',t.unread?'Marcar como lida':'Marcar como não lida','thread-unread','',value],['push_pin',t.pinned?'Soltar conversa':'Fixar conversa','pin-thread','',value],['flag','Denunciar conversa','report','',`thread|${value}`],isBlocked(t.who)?['visibility',`Desbloquear ${t.who}`,'unblock-person','',t.who]:['cancel',`Bloquear ${t.who}`,'block-person','',t.who],['delete','Apagar conversa','swipe-delete-thread','',value,true]]);return true;
 }
 if(!messagingCanWrite())return true;
 // Rodada 39: marcar como não lida (ou lida) pelo deslizar ou pelo menu ⋮.
 if(action==='thread-unread'){
  const t=messagingThread(value);if(!t)return true;
  if(mutate(()=>{t.unread=!t.unread;},{redraw:false})){if(dialog.open)await closeDialog(true);render();notify(t.unread?'Conversa marcada como não lida':'Conversa marcada como lida',t.unread?'chat_bubble':'drafts');}return true;
 }
 if(action==='pin-thread'){
  if(mutate(()=>{threadById(value).pinned=!threadById(value).pinned;},{redraw:false})){if(dialog.open)await closeDialog(true);render();notify(threadById(value).pinned?'Conversa fixada':'Conversa solta');}return true;
 }
 confirm('Apagar conversa local?','A conversa ficará oculta neste dispositivo. Você poderá desfazer logo após apagar.',async()=>{
  if(!messagingThread(value)||!messagingCanWrite())return;
  if(mutate(()=>{threadById(value).deleted=true;},{redraw:false})){if(dialog.open)await closeDialog(true);navigate('conversas');notify('Conversa local apagada','delete',()=>{if(mutate(()=>{threadById(value).deleted=false;}))notify('Conversa restaurada');});}
 });return true;
}
function bindMessagingScreen(){
 const input=$('#chat-input');
 if(route.name==='conversa'&&input){
  const id=route.id;
  input.addEventListener('input',()=>{const v=input.value||'';messagingDrafts.set(id,v);input.error=false;input.errorText='';const status=$('#chat-status');if(status)status.textContent=v.length>1800?`${v.length.toLocaleString('pt-BR')} de 2.000 caracteres`:'';});
  input.addEventListener('change',()=>{if(messagingThread(id)&&messagingCanWrite())mutate(()=>{threadById(id).draft=(input.value||'').slice(0,2000);},{redraw:false});});
  input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing&&e.keyCode!==229&&!matchMedia('(pointer: coarse)').matches){e.preventDefault();messagingAction('send-message',id,input);}});
  requestAnimationFrame(()=>{if(route.name!=='conversa'||route.id!==id)return;root.scrollTop=root.scrollHeight;if(!input.disabled)input.focus({preventScroll:true});else $('#chat-heading')?.focus({preventScroll:true});});
 }else if(messagingReturnFocus&&routeHash(route)===routeHash(messagingReturnFocus.route)){
  const target=$$('[data-action]',root).find(x=>x.dataset.action===messagingReturnFocus.action&&x.dataset.value===messagingReturnFocus.value)||$('h1',root);messagingReturnFocus=null;
  if(target?.tagName==='H1')target.tabIndex=-1;
  requestAnimationFrame(()=>target?.focus({preventScroll:true}));
 }
}
function ensureThread(type,id,draft=''){
 const x=type==='item'?itemById(id):bizById(id);if(!x)return null;let t=state.threads.find(t=>t.about.type===type&&t.about.id===id&&t.city===x.city);
 if(!t){t={id:uid('t'),who:x.seller||x.name,ini:x.sini||x.ini||initals(x.name),city:x.city,about:{type,id},snapshot:{title:x.title||x.name,photo:x.photos?.[0],price:x.price,city:x.city},msgs:[],unread:false,updatedAt:Date.now()};state.threads.unshift(t);}t.deleted=false;if(draft)t.draft=draft;return t;
}
async function contact(type,id,draft=''){
 if(!canPost())return;const x=type==='item'?itemById(id):bizById(id);if(!accessibleRecord(x))return;if(type==='item'&&x.mine){notify('Este anúncio é seu.','info');return;}if(type==='item'&&x.status!=='active'){notify('Este anúncio já foi encerrado.','info');return;}if(type==='biz'&&x.claimed===false){notify('O responsável ainda não assumiu a página.','info');return;}if(type==='biz'&&x.suspended){notify('Esta página está suspensa pela moderação.','info');return;}if(!x.mine&&isBlocked(x.seller||x.name)){notify(`Você bloqueou ${x.seller||x.name}. Desbloqueie em Configurações para conversar.`,'info');return;}let t;
 if(mutate(()=>{t=ensureThread(type,id,draft);},{redraw:false})){messagingReturnFocus={route:{...route},action:type==='item'?'item-interest':'quote',value:id};messagingDrafts.delete(t.id);if(dialog.open)await closeDialog(true);navigate('conversa',t.id);}
}
async function share(type,id){
 const record=type==='anuncio'?itemById(id):type==='negocio'?bizById(id):type==='pergunta'?askById(id):type==='evento'?state.events.find(x=>x.id===id):null;
 if(!accessibleRecord(record)){showDialog('Compartilhamento indisponível','<p class="form-note">O conteúdo foi removido ou não está disponível nesta cidade. Nenhum link foi compartilhado.</p>',btn('Voltar','close-dialog','','text'));return false;}
 const link=new URL(location.href);link.hash=`${type}/${encodeURIComponent(id)}?cidade=${encodeURIComponent(record.city)}`;
 const title=record.title||record.name||record.q||'Bivaque',notice='Link da demonstração local: publicações deste protótipo não são distribuídas para outros dispositivos.';
 try{if(navigator.share&&/^https?:$/.test(location.protocol)){await navigator.share({title:`${title} · demonstração Bivaque`,text:notice,url:link.href});return true;}if(!navigator.clipboard?.writeText)throw new Error('Clipboard indisponível');await navigator.clipboard.writeText(link.href);notify('Link local da demonstração copiado','link');return true;}
 catch(error){if(error.name==='AbortError')return false;showDialog('Compartilhar demonstração',`${field('share-link','Link local',link.href,'readonly')}<p class="form-note">${notice} Não foi possível copiar automaticamente; selecione o link ou tente Copiar.</p>`,`${btn('Fechar','close-dialog','','text')}${btn('Copiar','copy-share','','filled','content_copy')}`);const input=$('#share-link');await input?.updateComplete;input?.focus({preventScroll:true});input?.shadowRoot?.querySelector('input')?.select();return false;}
}
async function copyText(text){
 if(typeof text!=='string'||!text.trim()){notify('Não há texto disponível para copiar.','error');return false;}
 const previous=globalFocusDescriptor(document.activeElement);
 try{if(!navigator.clipboard?.writeText)throw new Error('Clipboard indisponível');await navigator.clipboard.writeText(text);notify('Copiado','content_copy');if(dialog.open)globalFocus(previous?.action,previous?.value,dialog);else navigationFocus(previous);return true;}
 catch{
  const recovery=`${field('copy-recovery-text','Texto para copiar',text,'readonly')}<p class="form-note" role="status">A cópia automática não está disponível. O texto está visível e selecionado; use a opção Copiar do navegador.</p>`;
  if(dialog.open){let box=$('#copy-recovery',dialog);if(!box){box=document.createElement('div');box.id='copy-recovery';box.className='stack';$('[slot="content"]',dialog).appendChild(box);}box.innerHTML=recovery;}else showDialog('Copiar texto',`<div id="copy-recovery" class="stack">${recovery}</div>`,btn('Fechar','close-dialog','','text'));
  const input=$('#copy-recovery-text');await input?.updateComplete;input?.focus({preventScroll:true});input?.shadowRoot?.querySelector('input,textarea')?.select();return false;
 }
}
function simulateAnswer(){const q=state.asks.find(q=>q.mine&&q.city===state.homeCity&&q.status==='open');if(!q){notify('Publique uma pergunta aberta antes de simular a resposta.','info');return;}const terms=queryTerms(q.q),donor=state.asks.filter(a=>!a.mine&&a.city===q.city&&a.answers.length&&a.status==='ok').map(a=>({a,score:terms.filter(t=>matches(t,a.q,a.keywords||[])).length})).filter(x=>x.score>=Math.min(2,terms.length)).sort((a,b)=>b.score-a.score)[0];if(!donor){notify('Não há resposta de exemplo relacionada a essa pergunta.','info');return;}const source=donor.a.answers[0];if(mutate(()=>{q.answers.push({...structuredClone(source),id:uid('a'),mine:false,who:'Resposta de exemplo da comunidade',ini:'CM',solved:false,originQuestion:donor.a.id});state.notices.unshift({id:uid('n'),city:q.city,unread:true,text:'Uma resposta de exemplo chegou à sua pergunta.',go:['pergunta',q.id],when:'Agora'});})){notify('Resposta relacionada adicionada');}}
function simulateMessage(){const t=route.name==='conversa'?messagingThread(route.id):state.threads.find(t=>t.city===state.homeCity&&!t.deleted&&!isBlocked(t.who));if(!t){notify('Abra um anúncio e inicie uma conversa primeiro.','info');return;}if(isBlocked(t.who)){notify(`Você bloqueou ${t.who}. Nenhuma mensagem chega.`,'info');return;}if(!messagingCanWrite())return;const text=t.about.type==='item'?'Obrigado pelo contato. Vamos confirmar disponibilidade e combinar os detalhes.':'Obrigado pelo contato. Conte o serviço e o bairro para combinarmos um orçamento.';if(mutate(()=>{t.msgs.push({me:false,t:text,at:Date.now()});t.unread=route.name!=='conversa';t.updatedAt=Date.now();}))notify('Resposta fictícia salva neste dispositivo');}
