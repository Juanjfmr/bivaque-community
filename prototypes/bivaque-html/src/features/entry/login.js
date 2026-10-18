// Rodada 55 (lote Entrada): entrar, recuperar a senha, Google com aceite e convite familiar, como no
// app web (preauth). Tudo simulado neste dispositivo: nenhuma senha é guardada nem enviada; o Google
// é uma conta de teste; o convite usa os códigos criados em Você → Família convidada.
const ENTRY_DEMO_EMAIL='rafael@exemplo.com';
function renderEntryLogin(){
 return `<div class="en en-form">${entryTop('')}<h1 class="en-h1">Que bom ter você de volta.</h1>
 ${btn('Continuar com Google','entry-google','login','outlined')}<p class="en-or">ou com e-mail</p>
 ${field('en-email','E-mail','','type="email" required autocomplete="email" inputmode="email"')}${entryPasswordField('en-pass-login','Senha')}<p class="en-err" id="en-err" role="alert"></p>
 ${btn('Entrar','entry-login-submit','','filled')}<p class="en-foot">${btn('Esqueci minha senha','entry-go','senha','text')}${btn('Criar conta','entry-go','conta','text')}</p>
 <p class="en-hint">Modo teste: use ${ENTRY_DEMO_EMAIL} e qualquer senha com letras e números.</p></div>`;
}
function renderEntryForgot(){
 const sent=entryForgotSent;
 return `<div class="en en-form">${entryTop('login')}<h1 class="en-h1">Recuperar a senha.</h1>${sent?`<p class="en-ok" role="status">${icon('check_circle')}Se ${esc(sent)} puder entrar no Bivaque, o link para criar uma nova senha já está a caminho. Confira também o spam.</p>${btn('Voltar para entrar','entry-go','login','filled')}`:`<p class="en-lead">Mandamos um link para criar uma senha nova.</p>${field('en-email','E-mail','','type="email" required autocomplete="email" inputmode="email"')}<p class="en-err" id="en-err" role="alert"></p>${btn('Enviar link','entry-forgot-submit','','filled')}`}<p class="en-hint">Modo teste: nenhum e-mail é enviado.</p></div>`;
}
// Quem chega pelo Google também aceita a privacidade e o código de conduta (no app web, esse
// caminho pulava o aceite).
function renderEntryGoogleConsent(){
 const a=entryData().account;
 return `<div class="en en-form">${entryTop('conta')}${entrySteps(1,'Conta')}<h1 class="en-h1">Antes de entrar, as regras.</h1><p class="en-lead">Você entrou com o Google como ${esc(a?.email||'')}.</p>
 <label class="en-check"><md-checkbox id="en-consent" aria-describedby="en-consent-t"></md-checkbox><span id="en-consent-t">Li e aceito a Política de privacidade e o Código de conduta.</span></label><p class="en-err" id="en-err" role="alert"></p>
 ${btn('Concordar e continuar','entry-google-consent','','filled')}</div>`;
}
function entryInviteFound(){return (state.invites||[]).find(i=>i.code===entryInviteCode&&!i.used);}
function renderEntryInvite(){
 const inv=entryInviteFound();
 if(!inv)return `<div class="en en-form">${entryTop('')}<h1 class="en-h1">Entre pelo convite.</h1><p class="en-lead">Cônjuges e dependentes entram pelo convite de quem é militar, sem CPF.</p>
  ${field('en-code','Código do convite','','required autocomplete="off" maxlength="20"')}<p class="en-err" id="en-err" role="alert"></p>${btn('Continuar','entry-invite-code','','filled')}
  <p class="en-hint">Quem é militar cria o código em Você → Família convidada.</p></div>`;
 const from=inv.from||state.profile.name;
 return `<div class="en en-form">${entryTop('')}<div class="en-inv"><span class="en-av" aria-hidden="true">${esc(initals(from))}</span><span><b>${esc(from)} convidou você</b>para a família no Bivaque, em ${esc(state.homeCity)}.</span></div><h1 class="en-h1">Crie sua conta.</h1><p class="en-lead">Quem convidou já foi verificado. Você não precisa de CPF.</p>
 ${field('en-name','Nome',inv.name||'','required minlength="2" maxlength="80" autocomplete="name"')}${field('en-email','E-mail','','type="email" required autocomplete="email" inputmode="email"')}${entryPasswordField('en-pass','Senha')}
 <label class="en-check"><md-checkbox id="en-consent" aria-describedby="en-consent-t"></md-checkbox><span id="en-consent-t">Li e aceito a Política de privacidade e o Código de conduta.</span></label><p class="en-err" id="en-err" role="alert"></p>
 ${btn('Aceitar convite','entry-invite-accept','','filled')}</div>`;
}
var entryForgotSent='',entryInviteCode='';
const entryEmail=()=>($('#en-email')?.value||'').trim().toLowerCase();
const entryEmailOk=e=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
function entryLoginSubmit(){
 const email=entryEmail(),pass=$('#en-pass-login')?.value||'',e=entryData();
 if(!entryEmailOk(email)||pass.length<8||!/[a-z]/i.test(pass)||!/\d/.test(pass)){entryError('E-mail ou senha incorretos.','en-email');return;}
 if(email===(state.profile.email||ENTRY_DEMO_EMAIL)){entrySignInBack();return;}
 if(e.account?.email===email){navigate('entrar',e.eligibility==='pending'?'analise':e.eligibility==='verified'?'cidade':e.eligibility==='none'?'cpf':'resultado');return;}
 entryError('E-mail ou senha incorretos.','en-email');
}
function entryGoogle(from){
 // Na tela de entrar, o Google é a conta de teste de quem já é membro.
 if(from==='login'){entrySignInBack();return;}
 if(!mutate(()=>{state.entry={account:{name:'Conta Google (teste)',email:'conta.google@exemplo.com',provider:'google'},eligibility:'none'};},{redraw:false}))return;
 navigate('entrar','aceite');
}
async function entryAuthAction(action,value){
 if(action==='entry-login-submit'){entryLoginSubmit();return true;}
 if(action==='entry-forgot-submit'){const email=entryEmail();if(!entryEmailOk(email)){entryError('Confira o e-mail.','en-email');return true;}entryForgotSent=email;render();return true;}
 if(action==='entry-google'){entryGoogle(value);return true;}
 if(action==='entry-google-consent'){if(!$('#en-consent')?.checked){entryError('Para continuar, aceite a Política de privacidade e o Código de conduta.','en-consent');return true;}if(mutate(()=>{state.entry={...state.entry,consentAt:Date.now()};},{redraw:false}))navigate('entrar','cpf');return true;}
 if(action==='entry-invite-code'){entryInviteCode=($('#en-code')?.value||'').trim().toUpperCase();if(!entryInviteFound()){entryError('Este convite não existe ou já foi usado. Peça um novo a quem convidou.','en-code');return true;}render();return true;}
 if(action==='entry-invite-accept'){
  const inv=entryInviteFound();if(!inv)return true;
  const name=($('#en-name')?.value||'').trim().replace(/\s+/g,' '),email=entryEmail(),pass=$('#en-pass')?.value||'';
  if(name.length<2){entryError('Informe seu nome.','en-name');return true;}
  if(!entryEmailOk(email)){entryError('Confira o e-mail.','en-email');return true;}
  if(pass.length<8||!/[a-z]/i.test(pass)||!/\d/.test(pass)){entryError(`A senha precisa ter ${ENTRY_SENHA_REGRA.toLowerCase()}`,'en-pass');return true;}
  if(!$('#en-consent')?.checked){entryError('Para aceitar o convite, aceite a Política de privacidade e o Código de conduta.','en-consent');return true;}
  if(!mutate(()=>{inv.used=true;state.entry={account:{name:name.slice(0,80),email,provider:'email',family:true,invitedBy:inv.from||state.profile.name},consentAt:Date.now(),eligibility:'verified'};},{redraw:false}))return true;
  entryVerified();return true;
 }
 return false;
}
