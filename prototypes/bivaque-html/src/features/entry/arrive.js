// Rodada 56 (lote Entrada): o passo 3 (cidade, momento e nome) e as boas-vindas, como na maquete v2.
// Substitui o cadastro em diálogo: vínculo, Força e verificação não são mais escolhidos aqui, vêm da
// conta e da consulta do CPF. Quem está em análise aparece na fila do Painel do Bivaque.
var entryCityDraft=null;
function entryCityData(){
 if(!entryCityDraft)entryCityDraft={name:entryData().account?.name||'',city:'',mode:'chegando',arrival:'',leave:'',dest:''};
 return entryCityDraft;
}
// Só os campos do momento são trocados: o rádio em uso não é redesenhado e o foco fica nele.
// Chegada e saída guardam datas separadas no rascunho.
function entryMomentHtml(d){
 if(d.mode==='moro')return '';
 const out=d.mode==='saindo';
 return `<label class="en-date"><span>${out?'Data da saída':'Data de chegada'}</span><input id="en-date" type="date" min="${dateISO()}" value="${esc((out?d.leave:d.arrival)||'')}"></label>${out?selectField('en-dest','Destino da transferência',CITY_NAMES,d.dest):''}`;
}
function renderEntryCity(){
 const d=entryCityData();
 return `<div class="en en-form" id="en-city-form">${entryTop('')}${entrySteps(3,'Cidade')}<h1 class="en-h1">Onde e em que momento?</h1>
 ${selectField('en-city','Cidade',CITY_NAMES,d.city)}<p class="en-sub">Isso não publica seu endereço.</p>
 <p class="en-lbl" id="en-mode-l">Seu momento</p><div class="en-seg" role="radiogroup" aria-labelledby="en-mode-l">${[['chegando','Chegando'],['moro','Moro aqui'],['saindo','Saindo']].map(([v,t])=>`<label><input type="radio" name="en-mode" value="${v}"${d.mode===v?' checked':''}><span>${t}</span></label>`).join('')}</div>
 <p class="en-sub">Muda o que aparece primeiro: plano de chegada, turma ou anúncios de quem sai.</p><div id="en-moment">${entryMomentHtml(d)}</div>
 ${field('en-name','Como você quer ser chamado',d.name,'required minlength="2" maxlength="80" autocomplete="name"')}<p class="en-err" id="en-err" role="alert"></p>
 ${btn('Concluir minha entrada','entry-finish','','filled')}</div>`;
}
function bindEntryCity(){
 const f=$('#en-city-form');if(!f)return;
 const d=entryCityData(),dest=()=>$('#en-dest')?.addEventListener('change',e=>{d.dest=e.target.value;});
 f.addEventListener('change',e=>{
  const t=e.target;
  if(t.name==='en-mode'){d.mode=t.value;$('#en-moment').innerHTML=entryMomentHtml(d);dest();return;}
  if(t.id==='en-date')d[d.mode==='saindo'?'leave':'arrival']=t.value;
 });
 $('#en-city')?.addEventListener('change',e=>{d.city=e.target.value;});
 $('#en-name')?.addEventListener('input',e=>{d.name=e.target.value;});
 dest();
}
function entryFinish(){
 const e=entryData(),a=e.account,d=entryCityData();
 if(entryNext()!=='cidade'){navigate('entrar',entryNext());return;}
 const city=$('#en-city')?.value||'',date=$('#en-date')?.value||'',dest=$('#en-dest')?.value||'',name=($('#en-name')?.value||'').trim().replace(/\s+/g,' ');
 if(!CITY_NAMES.includes(city))return entryError('Escolha sua cidade.','en-city');
 if(d.mode!=='moro'&&!date)return entryError(d.mode==='saindo'?'Informe a data da saída.':'Informe a data de chegada.','en-date');
 if(d.mode==='saindo'&&(!CITY_NAMES.includes(dest)||dest===city))return entryError('Escolha um destino diferente da sua cidade atual.','en-dest');
 if(name.length<2)return entryError('Informe como você quer ser chamado.','en-name');
 if(!mutate(()=>{
  // Perfil novo do zero (decisão do dono, 18/10/2026): nada da conta anterior é herdado. Vínculo e
  // Força não são perguntados; só a família vem marcada, pelo convite.
  state.profile={name:name.slice(0,80),email:a.email,verified:true,role:a.family?'familia':'',force:'',interests:[]};
  if(a.invite){const inv=state.invites.find(i=>i.code===a.invite);if(inv)inv.used=true;}
  state.city=state.homeCity=city;state.mode=d.mode;
  if(d.mode==='chegando')state.arrival=date;
  if(d.mode==='saindo'){state.leaveDate=date;state.dest=dest;}
  state.leftAuto=[];state.signedOut=false;state.entry={...state.entry,done:Date.now()};
 },{redraw:false}))return;
 entryCityDraft=null;navigate('entrar','boas-vindas',{replace:true});
}
function renderEntryWelcome(){
 const mode=state.mode,home=state.homeCity,turma=mode==='moro'?null:state.groups.find(g=>g.auto&&g.on&&g.city===(mode==='saindo'?state.dest:home));
 const lead=mode==='chegando'?`Seu plano de chegada a ${esc(home)} já está pronto.`:mode==='saindo'?`Seu plano de saída para ${esc(state.dest)} já está pronto.`:`O que a comunidade de ${esc(home)} indica já está à sua espera.`;
 const tiles=[mode==='moro'?['map',`Conhecer ${home}`,'O que a comunidade indica, por assunto.','guia']:['map',mode==='saindo'?'Ver o plano de saída':'Ver o plano de chegada','Moradia, escola, saúde e mudança, na ordem.','inicio'],...(turma?[['group',mode==='saindo'?'Conhecer quem vai com você':'Conhecer quem chega com você',turma.t,'grupo/'+turma.id]]:[])];
 return `<div class="en en-form en-welcome"><header class="en-top"><span class="en-mark" aria-hidden="true">B</span><span class="en-brand">Bivaque</span></header><div class="en-badge" aria-hidden="true">${icon('check')}</div><h1 class="en-h1" tabindex="-1">Você chegou ao Bivaque.</h1><p class="en-lead">${lead}</p>
 ${tiles.map(([ic,t,d,to])=>`<button type="button" class="en-tile" data-action="entry-home" data-value="${esc(to)}">${icon(ic)}<span><b>${esc(t)}</b>${esc(d)}</span></button>`).join('')}${btn('Entrar na comunidade','entry-home','comunidade','filled')}</div>`;
}
// A entrada em análise na fila do dono: o nome e o que já chegou. A pessoa ainda não escolheu a cidade.
// Depois de "Pedir outro documento", sai da fila até o novo envio.
function ownerEntryVerification(){
 const e=state.entry;if(!e?.account||e.done||e.eligibility!=='pending'||(e.asked&&!e.doc))return null;
 const at=e.doc?.at||e.checkedAt||0;
 return {id:`verify:entry-${at}`,kind:'verify',entry:true,data:{checks:[['Documento enviado',!!e.doc],['Nome confere com o documento',false]]},city:'',at,due:at+OWNER_SLA,icon:'verified_user',tone:'blue',title:`${e.account.name} pediu verificação`,sub:e.doc?`Documento enviado · ${entryDocLabel(e.doc)}`:'A fonte oficial pediu conferência'};
}
function ownerEntryReviewBody(q){
 const doc=state.entry?.doc;
 return `<p>Criou a conta neste dispositivo. A fonte oficial não confirmou o vínculo pelo CPF${doc?' e a pessoa enviou um documento':''}. O CPF não fica guardado.</p><h3>Documento</h3><div class="ow-doc">${doc?esc(entryDocLabel(doc)):'Nenhum documento ainda'}</div><h3>Conferir</h3>${ownerChecks(q.data.checks)}<h3>Histórico</h3><p class="small muted">Primeiro pedido. A cidade é escolhida depois da aprovação.</p>`;
}
async function entryArriveAction(action,value){
 if(action==='entry-finish'){entryFinish();return true;}
 if(action==='entry-home'){const [name,id]=(value||'inicio').split('/');navigate(name,id||null,{replace:true});return true;}
 // Controles do protótipo: recomeçar a jornada de entrada do zero, sem apagar os dados de teste.
 if(action==='onboarding'){if(dialog.open)await closeDialog(true);if(mutate(()=>{state.signedOut=true;state.entry={};},{redraw:false})){entryCityDraft=null;entryInviteCode='';entryForgotSent='';closePalette(false);navigate('entrar','conta');}return true;}
 return false;
}
