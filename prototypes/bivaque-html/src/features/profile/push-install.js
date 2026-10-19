// Rodada 43: avisos no celular pedidos com explicação antes do pedido do sistema (referências:
// Luma, Bumble e Claude, no Mobbin) e o Bivaque instalável como app. No protótipo a ativação dos
// avisos é simulada: nenhum pedido real do navegador é feito, porque não há avisos para enviar.
const PUSH_REASK_MS=7*864e5;
var installPrompt=null;
// Ícones que não existem no conjunto embutido: o Compartilhar do Safari e um celular com seta.
const SVG_SHARE_IOS='<svg class="inline-svg" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M8 7l4-4 4 4"/><path d="M8 11H6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-2"/></svg>';
const SVG_INSTALL='<svg class="inline-svg" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="2" width="12" height="20" rx="2.5"/><path d="M12 7v7M9 11l3 3 3-3M10.5 18.5h3"/></svg>';
addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;if(route?.name==='voce')render();});
addEventListener('appinstalled',()=>{installPrompt=null;notify('Bivaque instalado na tela inicial','check_circle');});
const PUSH_SAMPLES={
 alert:['notifications','Imóvel novo em Ponta Negra','Combina com o seu alerta de busca.'],
 ask:['chat_bubble','Ana respondeu sua pergunta','“Atende pelo plano, sim. Liga antes.”'],
 request:['request_quote','Nova proposta para o seu pedido','Mudanças Rio Negro enviou uma proposta.'],
};
function pushOn(){return state.prefs.push==='on';}
// Depois de uma ação que gera aviso, uma vez; recusado, só volta depois de 7 dias.
// Não interrompe quem já está digitando (ex.: respondendo logo após publicar); pergunta na próxima vez.
function askPushSoon(reason){setTimeout(()=>{if(!createOpen&&!$('#lightbox')&&!$('#filter-panel')?.open&&!document.activeElement?.matches('input,textarea,md-outlined-text-field,md-filled-text-field,[contenteditable="true"]'))maybeAskPush(reason);},900);}
function maybeAskPush(reason,force=false){
 if(readonly()||pushOn()||dialog.open||confirmDialog.open)return false;
 if(!force&&state.prefs.pushAskedAt&&Date.now()-state.prefs.pushAskedAt<PUSH_REASK_MS)return false;
 const first=PUSH_SAMPLES[reason]||PUSH_SAMPLES.ask,rest=Object.entries(PUSH_SAMPLES).filter(([k])=>k!==reason).map(([,v])=>v),cards=[first,...rest].slice(0,3);
 // Mostrar já conta como pergunta: fechar pelo X, Esc ou arrastando também espera 7 dias.
 mutate(()=>{state.prefs.pushAskedAt=Date.now();},{redraw:false});
 showDialog('Receba avisos do que importa',`<div class="push-samples" aria-hidden="true">${cards.map(([ic,t,s])=>`<div class="push-sample">${icon(ic)}<span><b>${esc(t)}</b><small>${esc(s)}</small></span><time>agora</time></div>`).join('')}</div><p class="form-note">Avisamos só do que você pediu: respostas às suas perguntas, propostas aos seus pedidos, alertas de busca e encontros. Você muda isso quando quiser em Você → Avisos.</p>`,`${btn('Agora não','push-later','','text')}${btn('Ativar avisos','push-enable','','filled','notifications_active')}`,'push');
 return true;
}
function isIOS(){return /iPhone|iPad|iPod/i.test(navigator.userAgent)&&!/CriOS|FxiOS/i.test(navigator.userAgent);}
function isStandalone(){return matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;}
function pushRowHtml(){
 if(readonly())return '';
 return `<div class="list-row"><span class="txt"><b>Avisos no celular</b><small>${pushOn()?'Ativados: respostas, propostas, alertas e encontros':'Desativados'}</small></span>${btn(pushOn()?'Desativar':'Ativar',pushOn()?'push-disable':'push-ask','','text')}</div>`;
}
function installRowHtml(){
 if(isStandalone()||(!installPrompt&&!isIOS()))return '';
 return `<button type="button" class="list-row" data-action="install-app">${SVG_INSTALL}<span class="txt"><b>Instalar o Bivaque no celular</b><small>Abre direto da tela inicial, em tela cheia.</small></span>${icon('chevron_right')}</button>`;
}
async function pushInstallAction(action){
 if(!['push-enable','push-later','push-ask','push-disable','install-app'].includes(action))return false;
 if(action==='push-ask'){maybeAskPush('ask',true);return true;}
 if(action==='push-later'){mutate(()=>{state.prefs.pushAskedAt=Date.now();},{redraw:false});await closeDialog(true);return true;}
 if(action==='push-enable'){if(mutate(()=>{state.prefs.push='on';state.prefs.pushAskedAt=Date.now();},{redraw:false})){await closeDialog(true);render();notify('Avisos ativados neste protótipo. No app, o celular pede a sua permissão aqui.','notifications_active');}return true;}
 if(action==='push-disable'){if(mutate(()=>{state.prefs.push='off';}))notify('Avisos no celular desativados','notifications_off');return true;}
 if(installPrompt){const p=installPrompt;installPrompt=null;try{await p.prompt();const r=await p.userChoice;if(r?.outcome!=='accepted')notify('Instalação cancelada.','info');}catch{notify('Não foi possível instalar agora.','error');}render();return true;}
 showDialog('Instalar no iPhone',`<ol class="install-steps"><li>Toque em ${SVG_SHARE_IOS} <b>Compartilhar</b>, na barra do Safari.</li><li>Escolha <b>Adicionar à Tela de Início</b>.</li><li>Toque em <b>Adicionar</b>. O Bivaque abre direto da tela inicial.</li></ol>`,btn('Entendi','close-dialog','','filled'),'install');
 return true;
}
