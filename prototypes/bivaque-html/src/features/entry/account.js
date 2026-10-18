// Rodada 54 (lote Entrada): criar conta e confirmar a elegibilidade, como no app web (preauth):
// nome, e-mail e senha com aceite da privacidade e do código de conduta; CPF conferido na fonte
// oficial (aqui, simulado pelos controles do protótipo) e nunca guardado.
// Resultados distintos (decisão do dono, 18/10/2026, exceção ao BIVAQUE.md §4.2): o vínculo de
// militar é público no Portal da Transparência, então dizer o resultado não revela nada novo e
// ajuda a pessoa. Confirmado segue para a cidade; não localizado pede um documento; fonte fora do
// ar pede para tentar de novo; em análise espera a equipe.
// A senha não é guardada; da conta fica só nome e e-mail, neste dispositivo. Do documento ficam só
// o tipo e o tamanho (o nome do arquivo pode trazer o CPF).
const ENTRY_SENHA_REGRA='Ao menos 8 caracteres, com letras e números.';
const ENTRY_DOC_TYPES={'application/pdf':'PDF','image/jpeg':'JPG','image/png':'PNG'},ENTRY_DOC_MAX=10*1024*1024;
function entryData(){return state.entry||{};}
const entryInProgress=()=>{const e=entryData();return !!e.account&&!e.done;};
// O próximo passo da entrada, num só lugar. Nenhuma rota pula um passo: o aceite do Google, a
// consulta do CPF e a análise não são contornáveis pelo endereço.
function entryNext(){
 const e=entryData();if(!entryInProgress())return 'conta';if(!e.consentAt)return 'aceite';
 if(e.eligibility==='verified')return 'cidade';if(e.eligibility==='notfound'||e.eligibility==='error')return 'resultado';
 return e.eligibility&&e.eligibility!=='none'?'analise':'cpf';
}
// Validação do CPF pelos dígitos verificadores (o número não sai deste formulário).
function validCpf(raw){
 const d=String(raw||'').replace(/\D/g,'');if(d.length!==11||/^(\d)\1+$/.test(d))return false;
 const dv=n=>{let s=0;for(let i=0;i<n;i++)s+=Number(d[i])*(n+1-i);const r=(s*10)%11;return r===10?0:r;};
 return dv(9)===Number(d[9])&&dv(10)===Number(d[10]);
}
const entryTop=(back='',right='sair')=>`<header class="en-top">${back?iconBtn('arrow_back','entry-go',back,'Voltar'):''}<span class="en-mark" aria-hidden="true">B</span><span class="en-brand">Bivaque</span>${right==='entrar'?btn('Entrar','entry-login','','text'):btn('Sair','entry-cancel','','text')}</header>`;
function entrySteps(n,label){return `<p class="en-step">Passo ${n} de 3 · ${label}</p><div class="en-steps" role="img" aria-label="Passo ${n} de 3">${[1,2,3].map(i=>`<i class="${i<=n?'on':''}"></i>`).join('')}</div>`;}
function entryPasswordField(id,label){return `<md-outlined-text-field id="${id}" label="${label}" type="password" required minlength="8" autocomplete="${id==='en-pass'?'new-password':'current-password'}" supporting-text="${id==='en-pass'?ENTRY_SENHA_REGRA:''}">${iconBtn('visibility','entry-pass-toggle',id,'Mostrar senha','slot="trailing-icon"')}</md-outlined-text-field>`;}
function entryDocLabel(d){const kb=(d?.size||0)/1024;return `${d?.type||'Documento'} · ${kb<1024?`${Math.max(1,Math.round(kb))} KB`:`${(kb/1024).toFixed(1).replace('.',',')} MB`}`;}
function renderEntrySignup(){
 return `<div class="en en-form">${entryTop('','entrar')}${entrySteps(1,'Conta')}<h1 class="en-h1" tabindex="-1">Vamos começar.</h1>
 ${btn('Continuar com Google','entry-google','conta','outlined')}<p class="en-or">ou com e-mail</p>
  ${field('en-name','Nome','','required minlength="2" maxlength="80" autocomplete="name"')}
 ${field('en-email','E-mail','','type="email" required autocomplete="email" inputmode="email"')}
 ${entryPasswordField('en-pass','Senha')}
 <label class="en-check"><md-checkbox id="en-consent" aria-describedby="en-consent-t"></md-checkbox><span id="en-consent-t">Li e aceito a Política de privacidade e o Código de conduta. Pelo Google, o aceite vem no passo seguinte.</span></label><p class="en-err" id="en-err" role="alert"></p>
 ${btn('Criar conta','entry-signup','','filled')}<p class="en-foot">Já tem conta? ${btn('Entrar','entry-login','','text')}</p></div>`;
}
// Quem já começou não perde a conta sem querer: continuar, ou começar de novo com confirmação.
function renderEntryResume(){
 const a=entryData().account;
 return `<div class="en en-form">${entryTop('','entrar')}<h1 class="en-h1" tabindex="-1">Você já começou a entrada.</h1><p class="en-lead">Conta de ${esc(a.name)} · ${esc(a.email)}</p>
 ${btn('Continuar de onde parei','entry-resume','','filled')}${btn('Começar com outra conta','entry-restart','','outlined')}<p class="en-hint">Começar de novo apaga esta entrada neste dispositivo.</p></div>`;
}
function renderEntryCpf(){
 return `<div class="en en-form">${entryTop('')}${entrySteps(2,'Elegibilidade')}<h1 class="en-h1" tabindex="-1">Confirme seu vínculo.</h1><p class="en-lead">Para militares federais ativos, veteranos e pensionistas militares.</p>
 ${field('en-cpf','CPF','','required inputmode="numeric" maxlength="14" autocomplete="off" placeholder="000.000.000-00"')}<p class="en-err" id="en-err" role="alert"></p>
 ${btn('Conferir e continuar','entry-cpf','','filled')}
 <div class="en-why">${icon('verified_user')}<span><b>Por que o CPF</b>Com ele confirmamos o vínculo na fonte oficial, sem pedir posto nem organização. O número não fica salvo.</span></div>
 <button type="button" class="en-link" data-action="entry-invite">${icon('group')}<span><b>É cônjuge ou dependente?</b>Você entra pelo convite de quem é militar, sem CPF.</span></button></div>`;
}
function renderEntryResult(){
 if(entryData().eligibility==='error')return `<div class="en en-form">${entryTop('')}${entrySteps(2,'Elegibilidade')}<h1 class="en-h1" tabindex="-1">Não conseguimos consultar agora.</h1><p class="en-lead">A fonte oficial está fora do ar. Tente de novo em alguns minutos.</p>${btn('Tentar de novo','entry-retry','','filled')}</div>`;
 return `<div class="en en-form">${entryTop('')}${entrySteps(2,'Elegibilidade')}<h1 class="en-h1" tabindex="-1">Não localizamos o vínculo.</h1><p class="en-lead">A fonte oficial não confirmou o vínculo deste CPF. Isso acontece com quem passou para a reserva há pouco ou com pensionistas recentes.</p>
 <label class="en-file">${icon('upload')}<span><b>Enviar um documento</b>PDF, JPG ou PNG, até 10 MB. A equipe responde em até 2 dias úteis.</span><input id="en-doc" type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"></label><p class="en-err" id="en-err" role="alert"></p>
 ${btn('Conferir o CPF de novo','entry-retry','','outlined')}</div>`;
}
function renderEntryPending(){
 const e=entryData(),doc=e.doc,when=t=>new Date(t).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
 const steps=[['done','Conta criada',e.account?.email||''],[doc?'done':'now',doc?'Documento enviado':'Consulta feita',doc?`${entryDocLabel(doc)} · ${when(doc.at)}`:e.asked?'A equipe pediu outro documento':'A fonte oficial pediu uma conferência'],['now','Análise da equipe','Até 2 dias úteis · normalmente no mesmo dia'],['','Escolher sua cidade','Assim que liberar']];
 const title=doc?'Recebemos seu documento.':e.asked?'A equipe pediu outro documento.':'Sua elegibilidade está em análise.';
 return `<div class="en en-form">${entryTop('')}<h1 class="en-h1" tabindex="-1">${title}</h1><p class="en-lead">Enquanto a equipe confere, o conteúdo do Bivaque fica fechado.${doc?'':' Para adiantar, envie um documento que mostre o vínculo, como o contracheque ou a identidade militar.'}</p>
 <ol class="en-time">${steps.map(([s,t,d],i)=>`<li class="${s}"><i aria-hidden="true">${s==='done'?'✓':i+1}</i><span><b>${t}</b>${esc(d)}</span></li>`).join('')}</ol>
 <label class="en-file">${icon('upload')}<span><b>${doc?'Enviar outro documento':'Enviar um documento'}</b>PDF, JPG ou PNG, até 10 MB.</span><input id="en-doc" type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"></label><p class="en-err" id="en-err" role="alert"></p>
 ${e.notify?`<p class="en-ok" role="status">${icon('notifications_active')}Vamos avisar por e-mail e no celular quando liberar.</p>`:btn('Avise-me quando liberar','entry-notify','','filled','notifications')}
 <p class="en-foot">Você pode sair e voltar: o status fica aqui.</p><div class="en-test">${pill('Modo teste')}<span>A análise da equipe é simulada neste protótipo.</span>${btn('Simular aprovação','entry-approve','','text')}</div></div>`;
}
const ENTRY_STEPS={conta:()=>renderEntrySignup(),aceite:()=>renderEntryGoogleConsent(),cpf:()=>renderEntryCpf(),resultado:()=>renderEntryResult(),analise:()=>renderEntryPending(),cidade:()=>renderEntryCity()};
function renderEntry(){
 const id=route.id||'';
 if(id==='boas-vindas')return state.signedOut?renderEntryLanding():renderEntryWelcome();
 if(id==='login')return renderEntryLogin();
 if(id==='senha')return renderEntryForgot();
 if((id==='conta'||id==='convite')&&entryInProgress())return renderEntryResume();
 if(id==='conta')return renderEntrySignup();
 if(id==='convite')return renderEntryInvite();
 // Passos da entrada: o endereço sempre mostra o passo em que a pessoa está.
 if(['aceite','cpf','analise','resultado','cidade'].includes(id)){
  const next=entryNext();
  if(id!==next){route={...route,id:next};try{history.replaceState(history.state,'','#entrar/'+next);}catch{}}
  return ENTRY_STEPS[next]();
 }
 return renderEntryLanding();
}
function entryError(text,focusId){const e=$('#en-err');if(e)e.textContent=text;const f=focusId&&$('#'+focusId);if(!f)return;if('errorText' in f)f.error=true;f.focus();}
function entryFocusTitle(){const h=$('#main .en-h1');if(h){h.tabIndex=-1;h.focus({preventScroll:true});}}
function entrySignup(){
 const name=($('#en-name')?.value||'').trim().replace(/\s+/g,' '),email=($('#en-email')?.value||'').trim().toLowerCase(),pass=$('#en-pass')?.value||'';
 if(name.length<2)return entryError('Informe seu nome.','en-name');
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return entryError('Confira o e-mail.','en-email');
 if(pass.length<8||!/[a-z]/i.test(pass)||!/\d/.test(pass))return entryError(`A senha precisa ter ${ENTRY_SENHA_REGRA.toLowerCase()}`,'en-pass');
 if(!$('#en-consent')?.checked)return entryError('Para criar a conta, aceite a Política de privacidade e o Código de conduta.','en-consent');
 if(email===(state.profile.email||'rafael@exemplo.com'))return entryError('Este e-mail já tem conta. Use Entrar ou recupere a senha.','en-email');
 if(!mutate(()=>{state.entry={account:{name:name.slice(0,80),email,provider:'email'},consentAt:Date.now(),eligibility:'none'};},{redraw:false}))return;
 navigate('entrar','cpf');
}
function entryCpf(){
 if(entryNext()!=='cpf'){navigate('entrar',entryNext());return;}
 const raw=$('#en-cpf')?.value||'';
 if(!validCpf(raw))return entryError('CPF inválido. Confira os 11 dígitos.','en-cpf');
 // Modo teste: os controles do protótipo decidem o resultado da fonte oficial.
 const outcome=['verified','notfound','pending','error'].includes(state.test?.portal)?state.test.portal:'verified',ok=outcome==='verified';
 if(!mutate(()=>{state.entry={...state.entry,eligibility:outcome,checkedAt:Date.now()};},{redraw:false}))return;
 // O CPF não fica salvo: o campo é limpo antes de sair do passo.
 const f=$('#en-cpf');if(f)f.value='';
 if(ok){entryVerified();return;}
 navigate('entrar',entryNext());
}
// Quem é verificado segue para o passo 3: cidade, momento e nome (Rodada 56).
function entryVerified(){entryCityDraft=null;navigate('entrar','cidade');}
function entryDoc(input){
 const f=input.files?.[0];if(!f||!['resultado','analise'].includes(entryNext()))return;
 const type=ENTRY_DOC_TYPES[f.type];
 if(!type)return entryError('Formato inválido: use PDF, JPG ou PNG.');
 if(!f.size||f.size>ENTRY_DOC_MAX)return entryError('O documento precisa ter até 10 MB.');
 if(!mutate(()=>{state.entry={...state.entry,eligibility:'pending',asked:false,doc:{type,size:f.size,at:Date.now()}};},{redraw:false}))return;
 if(route.id==='analise'){render();entryFocusTitle();}else navigate('entrar','analise');
}
function bindEntry(){
 $('#en-doc')?.addEventListener('change',e=>entryDoc(e.target));
 const form=$('#main .en-form');if(!form)return;
 for(const f of $$('md-outlined-text-field',form))f.addEventListener('input',()=>{f.error=false;const e=$('#en-err');if(e)e.textContent='';});
 // Enter num campo envia o passo, como num formulário.
 form.addEventListener('keydown',e=>{if(e.key!=='Enter'||e.isComposing||!e.target.closest?.('md-outlined-text-field'))return;const b=$(':scope>md-filled-button[data-action]',form);if(b){e.preventDefault();b.click();}});
}
async function entryFlowAction(action,value){
 if(await entryAuthAction(action,value))return true;
 if(await entryArriveAction(action,value))return true;
 if(action==='entry-go'){if(value==='senha')entryForgotSent='';if(value==='convite')entryInviteCode='';navigate('entrar',value||null);return true;}
 if(action==='entry-signup'){entrySignup();return true;}
 if(action==='entry-cpf'){entryCpf();return true;}
 if(action==='entry-retry'){if(entryNext()==='resultado'&&mutate(()=>{state.entry={...state.entry,eligibility:'none'};},{redraw:false}))navigate('entrar','cpf');return true;}
 if(action==='entry-resume'){navigate('entrar',entryNext());return true;}
 if(action==='entry-restart'){confirm('Começar com outra conta?','A entrada em andamento é apagada deste dispositivo.',()=>{if(mutate(()=>{state.entry={};},{redraw:false}))navigate('entrar','conta',{replace:true});});return true;}
 if(action==='entry-notify'){if(mutate(()=>{state.entry={...state.entry,notify:true};})){notify('Vamos avisar quando liberar.','notifications_active');entryFocusTitle();}return true;}
 if(action==='entry-pass-toggle'){const f=$('#'+value);if(f){const show=f.type==='password';f.type=show?'text':'password';const b=$(`[data-action="entry-pass-toggle"][data-value="${value}"]`);if(b){b.ariaLabel=show?'Ocultar senha':'Mostrar senha';b.querySelector('md-icon').textContent=show?'visibility_off':'visibility';}}return true;}
 if(action==='entry-cancel'){navigate('entrar',null);return true;}
 // Controles do protótipo: só aprova uma análise de fato pendente; quem volta entra pelo passo da cidade.
 if(action==='entry-approve'){if(entryData().eligibility!=='pending'||!entryInProgress())return true;if(mutate(()=>{state.entry={...state.entry,eligibility:'verified',asked:false};},{redraw:false})){if(dialog.open)await closeDialog(true);notify('Análise aprovada (modo teste).','verified_user');if(route.name==='entrar'&&route.id==='analise')entryVerified();}return true;}
 return false;
}
