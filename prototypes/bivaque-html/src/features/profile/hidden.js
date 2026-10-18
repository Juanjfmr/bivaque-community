// Rodada 58 (A6 da auditoria funcional): "Ocultar" é pessoal. Deslizar uma pergunta e tocar em
// Ocultar grava `hiddenByMe` (a data); `hidden` continua sendo só da moderação. A pergunta some das
// listas desta pessoa, com aviso e Desfazer; o endereço direto abre com a faixa "Você ocultou esta
// pergunta" e Mostrar; Configurações → Ocultados lista tudo para mostrar de novo. No protótipo o
// campo fica na própria pergunta, neste aparelho; no back-end é um vínculo da pessoa com a pergunta.
const hiddenAsks=()=>state.asks.filter(q=>q.hiddenByMe&&!q.hidden).sort((a,b)=>b.hiddenByMe-a.hiddenByMe);
function hiddenStrip(q){return `<div class="context-strip readonly" style="margin:0 0 16px" role="status">${icon('visibility_off')}<span class="grow">Você ocultou esta pergunta</span>${btn('Mostrar','show-question',q.id,'text')}</div>`;}
function hiddenRow(q){
 const when=new Date(q.hiddenByMe).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'}),open=q.city===state.city,title=esc(q.q),city=q.city===state.homeCity?'':` · ${esc(q.city)}`;
 return `<div class="list-row">${icon('forum')}${open?`<button type="button" class="txt" data-action="open-question" data-value="${q.id}"><b>${title}</b><small>Pergunta · ocultada em ${when}${city}</small></button>`:`<span class="txt"><b>${title}</b><small>Pergunta · ocultada em ${when}${city}</small></span>`}${btn('Mostrar','show-question',q.id,'outlined')}</div>`;
}
function renderHidden(){
 const list=hiddenAsks();
 return `<div class="page-head"><div><h1>Ocultados</h1><p>Só você deixa de ver. Nada é removido da comunidade.</p></div></div>${list.length?`<div class="list">${list.map(hiddenRow).join('')}</div>`:empty('Nada oculto','As perguntas que você ocultar aparecem aqui, para mostrar de novo quando quiser.','visibility_off')}`;
}
async function hiddenAction(action,value){
 if(!['hide-question','show-question','open-hidden'].includes(action))return false;
 if(action==='open-hidden'){if(dialog.open)await closeDialog(true);navigate('ocultados');return true;}
 const q=askById(value);if(!q||q.hidden)return true;
 if(action==='hide-question'){
  if(mutate(()=>{q.hiddenByMe=Date.now();}))notify('Pergunta ocultada para você.','visibility_off',()=>{const x=askById(value);if(x?.hiddenByMe)mutate(()=>{delete x.hiddenByMe;});});
  return true;
 }
 if(q.hiddenByMe&&mutate(()=>{delete q.hiddenByMe;}))notify('Pergunta de volta nas suas listas.','visibility');
 return true;
}
