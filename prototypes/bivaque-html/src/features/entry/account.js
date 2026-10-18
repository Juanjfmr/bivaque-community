// Rodada 54 (lote Entrada): criar conta e confirmar a elegibilidade, como no app web (preauth):
// nome, e-mail e senha com aceite da privacidade e do código de conduta; CPF conferido na fonte
// oficial (aqui, simulado pelos controles do protótipo) e nunca guardado. Resultados distintos:
// verificado, vínculo não localizado (envio de documento), em análise e fonte fora do ar.
// A senha não é guardada; da conta fica só nome e e-mail, neste dispositivo.
const ENTRY_PASSWORD_RULE='Ao menos 8 caracteres, com letras e números.';
const ENTRY_DOC_TYPES=['application/pdf','image/jpeg','image/png'],ENTRY_DOC_MAX=10*1024*1024;
function entryData(){return state.entry||{};}
// Validação do CPF pelos dígitos verificadores (o número não sai deste formulário).
function validCpf(raw){
 const d=String(raw||'').replace(/\D/g,'');if(d.length!==11||/^(\d)\1+$/.test(d))return false;
 const dv=n=>{let s=0;for(let i=0;i<n;i++)s+=Number(d[i])*(n+1-i);const r=(s*10)%11;return r===10?0:r;};
 return dv(9)===Number(d[9])&&dv(10)===Number(d[10]);
}
const entryTop=(back='',right='sair')=>`<header class="en-top">${back?iconBtn('arrow_back','entry-go',back,'Voltar'):''}<span class="en-mark" aria-hidden="true">B</span><span class="en-brand">Bivaque</span>${right==='entrar'?btn('Entrar','entry-login','','text'):btn('Sair','entry-cancel','','text')}</header>`;
function entrySteps(n,label){return `<p class="en-step">Passo ${n} de 3 · ${label}</p><div class="en-steps" role="img" aria-label="Passo ${n} de 3">${[1,2,3].map(i=>`<i class="${i<=n?'on':''}"></i>`).join('')}</div>`;}
function entryPasswordField(id,label){return `<md-outlined-text-field id="${id}" label="${label}" type="password" required minlength="8" autocomplete="${id==='en-pass'?'new-password':'current-password'}" supporting-text="${ENTRY_PASSWORD_RULE}">${iconBtn('visibility','entry-pass-toggle',id,'Mostrar senha','slot="trailing-icon"')}</md-outlined-text-field>`;}
function renderEntrySignup(){
 return `<div class="en en-form">${entryTop('','entrar')}${entrySteps(1,'Conta')}<h1 class="en-h1">Vamos começar.</h1>
  ${field('en-name','Nome','','required minlength="2" maxlength="80" autocomplete="name"')}
 ${field('en-email','E-mail','','type="email" required autocomplete="email" inputmode="email"')}
 ${entryPasswordField('en-pass','Senha')}
 <label class="en-check"><md-checkbox id="en-consent" aria-describedby="en-consent-t"></md-checkbox><span id="en-consent-t">Li e aceito a Política de privacidade e o Código de conduta.</span></label><p class="en-err" id="en-err" role="alert"></p>
 ${btn('Criar conta','entry-signup','','filled')}<p class="en-foot">Já tem conta? ${btn('Entrar','entry-login','','text')}</p></div>`;
}
function renderEntryCpf(){
 return `<div class="en en-form">${entryTop('conta')}${entrySteps(2,'Elegibilidade')}<h1 class="en-h1">Confirme seu vínculo.</h1><p class="en-lead">Para militares federais ativos, veteranos e pensionistas militares.</p>
 ${field('en-cpf','CPF','','required inputmode="numeric" maxlength="14" autocomplete="off" placeholder="000.000.000-00"')}<p class="en-err" id="en-err" role="alert"></p>
 ${btn('Conferir e continuar','entry-cpf','','filled')}
 <div class="en-why">${icon('lock')}<span><b>O que fazemos com o CPF</b>Consultamos a fonte oficial para confirmar o vínculo deste CPF. O número não fica salvo, e não pedimos posto, organização nem endereço. Se precisarmos confirmar que o CPF é seu, pedimos um documento.</span></div>
 <button type="button" class="en-link" data-action="entry-invite">${icon('group')}<span><b>É cônjuge ou dependente?</b>Você entra pelo convite de quem é militar, sem CPF.</span></button></div>`;
}
function renderEntryResult(){
 const r=entryData().eligibility;
 if(r==='error')return `<div class="en en-form">${entryTop('cpf')}${entrySteps(2,'Elegibilidade')}<h1 class="en-h1">Não conseguimos consultar agora.</h1><p class="en-lead">A fonte oficial está fora do ar. Tente de novo em alguns minutos; o que você preencheu continua aqui.</p>${btn('Tentar de novo','entry-go','cpf','filled')}</div>`;
 return `<div class="en en-form">${entryTop('cpf')}${entrySteps(2,'Elegibilidade')}<h1 class="en-h1">Não localizamos o vínculo.</h1><p class="en-lead">A fonte oficial não confirmou o vínculo deste CPF. Isso acontece com quem passou para a reserva há pouco ou com pensionistas recentes.</p>
 <label class="en-file">${icon('upload')}<span><b>Enviar um documento</b>PDF, JPG ou PNG, até 10 MB. A equipe responde em até 2 dias úteis.</span><input id="en-doc" type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"></label><p class="en-err" id="en-err" role="alert"></p>
 ${btn('Conferir o CPF digitado','entry-go','cpf','outlined')}</div>`;
}
function renderEntryPending(){
 const e=entryData(),doc=e.doc,when=t=>new Date(t).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
 const steps=[['done','Conta criada',e.account?.email||''],[doc?'done':'now',doc?'Documento enviado':'Consulta feita',doc?`${doc.name} · ${when(doc.at)}`:'A fonte oficial pediu uma conferência'],['now','Análise da equipe','Até 2 dias úteis · normalmente no mesmo dia'],['','Escolher sua cidade','Assim que liberar']];
 return `<div class="en en-form">${entryTop('')}<h1 class="en-h1">${doc?'Recebemos seu documento.':'Sua elegibilidade está em análise.'}</h1><p class="en-lead">Enquanto a equipe confere, o conteúdo do Bivaque fica fechado.</p>
 <ol class="en-time">${steps.map(([s,t,d],i)=>`<li class="${s}"><i aria-hidden="true">${s==='done'?'✓':i+1}</i><span><b>${t}</b>${esc(d)}</span></li>`).join('')}</ol>
 ${e.notify?`<p class="en-ok" role="status">${icon('notifications_active')}Vamos avisar por e-mail e no celular quando liberar.</p>`:btn('Avise-me quando liberar','entry-notify','','filled','notifications')}
 ${doc?btn('Enviar outro documento','entry-go','resultado','outlined'):''}<p class="en-foot">Você pode sair e voltar: o status fica aqui.</p><div class="en-test">${pill('Modo teste')}<span>A análise da equipe é simulada neste protótipo.</span>${btn('Simular aprovação','entry-approve','','text')}</div></div>`;
}
function renderEntry(){
 const id=route.id||'';
 if(id==='conta')return renderEntrySignup();
 if(!entryData().account&&['cpf','resultado','analise'].includes(id))return renderEntrySignup();
 if(id==='cpf')return renderEntryCpf();
 if(id==='resultado')return renderEntryResult();
 if(id==='analise')return renderEntryPending();
 return renderEntryLanding();
}
function entryError(text,focusId){const e=$('#en-err');if(e)e.textContent=text;if(focusId)$('#'+focusId)?.focus();}
function entrySignup(){
 const name=($('#en-name')?.value||'').trim().replace(/\s+/g,' '),email=($('#en-email')?.value||'').trim().toLowerCase(),pass=$('#en-pass')?.value||'';
 if(name.length<2)return entryError('Informe seu nome.','en-name');
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return entryError('Confira o e-mail.','en-email');
 if(pass.length<8||!/[a-z]/i.test(pass)||!/\d/.test(pass))return entryError(`A senha precisa ter ${ENTRY_PASSWORD_RULE.toLowerCase()}`,'en-pass');
 if(!$('#en-consent')?.checked)return entryError('Para criar a conta, aceite a Política de privacidade e o Código de conduta.','en-consent');
 if(email===(state.profile.email||'rafael@exemplo.com')||email===entryData().account?.email)return entryError('Este e-mail já tem conta. Use Entrar ou recupere a senha.','en-email');
 if(!mutate(()=>{state.entry={account:{name:name.slice(0,80),email,provider:'email'},consentAt:Date.now(),eligibility:'none'};},{redraw:false}))return;
 navigate('entrar','cpf');
}
function entryCpf(){
 const raw=$('#en-cpf')?.value||'';
 if(!validCpf(raw))return entryError('CPF inválido. Confira os 11 dígitos.','en-cpf');
 const outcome=state.test?.portal||'verified';
 if(!mutate(()=>{state.entry={...state.entry,eligibility:outcome==='notfound'?'notfound':outcome,checkedAt:Date.now()};},{redraw:false}))return;
 // O CPF não fica salvo: o campo é limpo antes de sair do passo.
 const f=$('#en-cpf');if(f)f.value='';
 if(outcome==='verified'){entryVerified();return;}
 navigate('entrar',outcome==='pending'?'analise':'resultado');
}
// Até a Rodada 56, quem é verificado escolhe cidade e momento no passo do cadastro existente.
function entryVerified(){
 const a=entryData().account;openOnboarding();onboardDraft.name=a?.name||onboardDraft.name;onboardDraft.verified=true;onboardStep=4;renderOnboarding();
}
function entryDoc(input){
 const f=input.files?.[0];if(!f)return;
 if(!ENTRY_DOC_TYPES.includes(f.type))return entryError('Formato inválido: use PDF, JPG ou PNG.');
 if(!f.size||f.size>ENTRY_DOC_MAX)return entryError('O documento precisa ter até 10 MB.');
 if(!mutate(()=>{state.entry={...state.entry,eligibility:'pending',doc:{name:f.name.slice(0,80),size:f.size,at:Date.now()}};},{redraw:false}))return;
 navigate('entrar','analise');
}
function bindEntry(){$('#en-doc')?.addEventListener('change',e=>entryDoc(e.target));for(const f of $$('.en-form md-outlined-text-field'))f.addEventListener('input',()=>{const e=$('#en-err');if(e)e.textContent='';});}
async function entryFlowAction(action,value){
 if(action==='entry-go'){navigate('entrar',value||null);return true;}
 if(action==='entry-signup'){entrySignup();return true;}
 if(action==='entry-cpf'){entryCpf();return true;}
 if(action==='entry-notify'){if(mutate(()=>{state.entry={...state.entry,notify:true};}))notify('Vamos avisar quando liberar.','notifications_active');return true;}
 if(action==='entry-pass-toggle'){const f=$('#'+value);if(f){const show=f.type==='password';f.type=show?'text':'password';const b=$(`[data-action="entry-pass-toggle"][data-value="${value}"]`);if(b){b.ariaLabel=show?'Ocultar senha':'Mostrar senha';b.querySelector('md-icon').textContent=show?'visibility_off':'visibility';}}return true;}
 if(action==='entry-cancel'){navigate('entrar',null);return true;}
 // Controles do protótipo: a análise pendente é aprovada; quem voltar entra pelo passo da cidade.
 if(action==='entry-approve'){if(mutate(()=>{state.entry={...state.entry,eligibility:'verified'};},{redraw:false})){await closeDialog(true);notify('Análise aprovada (modo teste).','verified_user');if(route.name==='entrar'&&route.id==='analise')entryVerified();}return true;}
 return false;
}
