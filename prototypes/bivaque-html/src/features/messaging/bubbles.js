// Rodada 20: balões de conversa. Referência: Chat Bubble e Message Reactions, do 21st.dev.
// Mensagens seguidas da mesma pessoa em até 5 min formam um grupo (hora só no fim), dias
// ganham separador, a última mensagem sua mostra o estado, as recebidas aceitam uma reação
// e mensagens novas entram com um leve deslizar. Tudo continua só neste dispositivo.
const CHAT_GROUP_MS=5*60e3;
const CHAT_REACTIONS=[['👍','Curtir'],['❤️','Amei'],['😂','Haha'],['🙏','Obrigado']];
const chatSeen=new Map();
function chatDay(at){
 const d=new Date(at),today=new Date();today.setHours(0,0,0,0);
 const day=new Date(d);day.setHours(0,0,0,0);const diff=Math.round((today-day)/864e5);
 return diff===0?'Hoje':diff===1?'Ontem':d.toLocaleDateString('pt-BR',{day:'numeric',month:'short'});
}
const chatTime=at=>new Date(at).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
// Horário só vale se for número; dado antigo ou corrompido fica sem hora e sem dia.
const chatAt=m=>Number.isFinite(m?.at)?m.at:0;
const chatSnippet=m=>{const t=String(m.t||'').replace(/\s+/g,' ').trim();return t.length>40?`${t.slice(0,40)}…`:t;};
function chatReactionHtml(t,i,m){
 const r=CHAT_REACTIONS.find(([e])=>e===m.react);if(!r)return `<span class="msg-reaction" id="react-${i}" hidden></span>`;
 return `<button type="button" class="msg-reaction" id="react-${i}" data-action="react-msg" data-value="${t.id}|${i}|" aria-label="Sua reação: ${r[1]}. Remover">${r[0]}</button>`;
}
// Duas mensagens seguidas ficam no mesmo grupo se são da mesma pessoa, do mesmo dia e com
// menos de 5 min entre elas (mensagens antigas sem horário agrupam só por pessoa).
function chatJoins(a,b){
 if(!a||!b||a.me!==b.me)return false;const x=chatAt(a),y=chatAt(b);if(!x||!y)return true;
 return Math.abs(y-x)<CHAT_GROUP_MS&&chatDay(x)===chatDay(y);
}
function chatPickerHtml(t,i,m){
 return `<button type="button" class="msg-react" data-action="react-open" data-value="${t.id}|${i}" aria-label="Reagir à mensagem: ${esc(chatSnippet(m))}" aria-expanded="false" aria-controls="react-pick-${i}">☺</button><div class="msg-picker" id="react-pick-${i}" role="group" aria-label="Escolha uma reação" hidden>${CHAT_REACTIONS.map(([e,l])=>`<button type="button" data-action="react-msg" data-value="${t.id}|${i}|${e}" aria-label="${l}" aria-pressed="${m.react===e}">${e}</button>`).join('')}</div>`;
}
function chatMessagesHtml(t){
 const msgs=t.msgs,seen=chatSeen.get(t.id),prev=seen!==undefined&&seen<=msgs.length?seen:undefined;chatSeen.set(t.id,msgs.length);
 const lastMine=msgs.length&&msgs.at(-1).me?msgs.length-1:-1;
 let lastDay='';
 return msgs.map((m,i)=>{
  const at=chatAt(m),day=at?chatDay(at):'',newDay=Boolean(day)&&day!==lastDay;if(day)lastDay=day;
  const first=newDay||!chatJoins(msgs[i-1],m),last=!chatJoins(m,msgs[i+1]);
  const meta=[last&&at?chatTime(at):'',i===lastMine?'Salva no aparelho':''].filter(Boolean);
  const cls=`msg-row${m.me?' me':''}${first?' first':''}${last?' last':''}${prev!==undefined&&i>=prev?' enter':''}`;
  const small=meta.length?`<small>${i===lastMine?icon('check'):''}${m.me?'Você · ':''}${meta.join(' · ')}</small>`:'';
  return `${newDay?`<p class="chat-day" role="separator" aria-label="${esc(day)}">${esc(day)}</p>`:''}<div class="${cls}"><div class="bubble${m.me?' me':''}"><span style="white-space:pre-wrap">${esc(m.t)}</span>${small}${m.me?'':chatReactionHtml(t,i,m)}</div>${m.me?'':chatPickerHtml(t,i,m)}</div>`;
 }).join('');
}
function chatClosePickers(except){
 for(const b of $$('.msg-react[aria-expanded="true"]')){if(b===except)continue;b.setAttribute('aria-expanded','false');const p=$(`#${b.getAttribute('aria-controls')}`);if(p)p.hidden=true;}
}
document.addEventListener('click',e=>{if(!e.target.closest?.('.msg-react,.msg-picker'))chatClosePickers();});
document.addEventListener('keydown',e=>{if(e.key!=='Escape')return;const open=$('.msg-react[aria-expanded="true"]');if(!open||open.closest('[inert]')||!e.target.closest?.('.msg-row'))return;e.preventDefault();e.stopPropagation();chatClosePickers();open.focus();},true);
document.addEventListener('focusout',e=>{const row=e.target.closest?.('.msg-row');if(row&&!row.contains(e.relatedTarget))chatClosePickers();});
function chatReactAction(action,t,value){
 const [,raw,emoji='']=value.split('|'),i=Number(raw),m=t.msgs[i];if(!m||m.me)return;
 if(action==='react-open'){
  if(!messagingCanWrite())return;
  const b=$(`.msg-react[aria-controls="react-pick-${i}"]`),p=$(`#react-pick-${i}`);if(!b||!p)return;
  const open=b.getAttribute('aria-expanded')!=='true';chatClosePickers(b);b.setAttribute('aria-expanded',String(open));p.hidden=!open;
  if(open)($('[aria-pressed="true"]',p)||$('button',p)).focus();return;
 }
 if(!messagingCanWrite())return;
 const next=emoji&&m.react!==emoji&&CHAT_REACTIONS.some(([e])=>e===emoji)?emoji:'';
 if(!mutate(()=>{const x=threadById(t.id).msgs[i];if(next)x.react=next;else delete x.react;},{redraw:false})){messagingFeedback('Não foi possível salvar a reação neste dispositivo.');return;}
 const chip=$(`#react-${i}`);if(chip)chip.outerHTML=chatReactionHtml(t,i,threadById(t.id).msgs[i]);
 for(const b of $$(`#react-pick-${i} button`))b.setAttribute('aria-pressed',String(Boolean(next)&&b.dataset.value.endsWith(`|${next}`)));
 chatClosePickers();$(`.msg-react[aria-controls="react-pick-${i}"]`)?.focus();
 const status=$('#chat-status');if(status)status.textContent='';
 requestAnimationFrame(()=>messagingFeedback(next?`Reação ${CHAT_REACTIONS.find(([e])=>e===next)[1]} salva na mensagem "${chatSnippet(m)}".`:`Reação removida da mensagem "${chatSnippet(m)}".`));
}
