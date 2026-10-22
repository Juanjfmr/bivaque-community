// Rodada 71 (decisão do dono, 18/10/2026): a landing pública passa a ser a v8 aprovada, com o
// título F, na pele da marca da R70. Um único CTA ("Criar conta") leva ao cadastro; "Entrar" leva
// ao login; o convite de familiar continua dentro do cadastro, sem CPF. Saiu a amostra por cidade
// da R53: quem está fora não lê o Bivaque, então a única conversa da página é ilustrativa.
// Rodada 72: a folha do menu prende o foco (o resto da landing fica inerte) e a barra fixa escondida
// sai do teclado e da tecnologia assistiva.
const LANDING_FORCES='Marinha, Exército e Aeronáutica';
const LANDING_TITLE='Juntos somos mais fortes.';
const LANDING_LEAD='A família militar se ajuda, em qualquer cidade: pergunte a quem já mora perto, ache serviços e imóveis, passe adiante o que não usa mais. Gratuito para militares, veteranos, pensionistas e suas famílias.';
const LANDING_NAV=[['exemplo','Como funciona','forum'],['recursos','O que tem','sell'],['mudanca','Mudança de cidade','map'],['perguntas','Perguntas','help']];
const LANDING_FEATURES=[['forum','Indicações','Pergunte e escolha com base no que funcionou para quem mora perto.'],['sell','Serviços e negócios','Profissionais e comércios que outras famílias já contrataram e recomendam.'],['apartment','Imóveis e desapegos','Aluguel, venda e o que sobrou da mudança, entre famílias militares.'],['groups','Grupos e eventos','Quem corre, quem tem filhos da mesma idade, quem quer só um café.']];
const LANDING_CHECKS=['Moradia: bairros e imóveis indicados','Escola das crianças','Saúde e plano','A mudança, na ordem'];
const LANDING_STEPS=[['Crie sua conta','Com e-mail e senha ou com o Google.'],['Confirme seu vínculo','Informe seu CPF. Quem chegou por convite de um familiar militar não precisa.'],['Escolha sua cidade','Onde você mora ou para onde vai. Qualquer cidade do Brasil.']];
const LANDING_FAQ=[['Quem pode participar?','Militares da Marinha, do Exército e da Aeronáutica, da ativa ou veteranos, pensionistas e as famílias de todos eles.'],['É gratuito?','Sim. Tudo no Bivaque é gratuito: entrar, perguntar, responder e usar o plano de mudança.'],['Como familiares participam?','Quem é militar cria o convite no próprio app e envia. Quem recebe faz o mesmo cadastro, sem a etapa do CPF.'],['Como funciona a confirmação pelo CPF?','Você informa o CPF e o Bivaque confere seu vínculo militar, que é um dado público. O número serve só para isso e não fica salvo. Se a confirmação não sair na hora, o cadastro mostra o que fazer em seguida.'],['O Bivaque é ligado às Forças Armadas?','É uma comunidade independente, feita pela família militar.'],['Posso escolher qualquer cidade?','Sim. Escolha onde você mora ou para onde vai. O que você perguntar e indicar fica lá para quem chegar depois, e você pode chamar quem já conhece.']];
// A pergunta do CPF abre: é a dúvida que trava o cadastro.
const LANDING_FAQ_OPEN=3;
const LANDING_ANCHORS=['inicio','exemplo','recursos','mudanca','participar','perguntas','fim'];
function landingCta(id=''){return `<md-filled-button${id?` id="${id}"`:''} type="button" data-action="entry-join">Criar conta</md-filled-button>`;}
function landingAnchor(id,label,iconName=''){return `<a href="#${id}" data-landing-anchor="${id}">${iconName?icon(iconName):''}${esc(label)}</a>`;}
function landingThread(){
 const msg=(av,cls,who,text,extra='')=>`<div class="ld-msg${cls?' '+cls:''}"><span class="ld-av ${cls||''}" aria-hidden="true">${av}</span><div><span class="ld-who"><b>${who}</b></span><p>${text}</p>${extra}</div></div>`;
 return `<figure class="ld-thread" id="ld-thread">
  <div class="ld-thread-top"><span class="ld-chip">Casa</span>Manaus · Adrianópolis<span class="ld-illus">Conversa ilustrativa</span></div>
  ${msg('MA','q','Marina A.','Alguém indica um eletricista de confiança aqui no bairro?')}
  ${msg('PS','b','Paulo S.','O Sérgio, que refez a fiação aqui de casa. Pontual e cobra o combinado.',`<span class="ld-useful">${icon('thumb_up')}Marcada como útil</span>`)}
  ${msg('RT','c','Renata T.','Peça o orçamento por escrito. Comigo foi tranquilo.')}
  <div class="ld-done">${icon('check')}Resolvida · Marina marcou a indicação que funcionou</div>
  <figcaption class="sr">Conversa ilustrativa mostrando uma pergunta resolvida pela comunidade.</figcaption>
 </figure>`;
}
function renderEntryLanding(){
 return `<div class="ld" id="landing">
 <a class="ld-skip" href="#ld-main" data-landing-anchor="ld-main">Pular para o conteúdo</a>
 <header class="ld-top" id="ld-top"><div class="ld-wrap ld-top-in">
  <a class="ld-home" href="#inicio" data-landing-anchor="inicio" aria-label="Bivaque, início">${mark()}<b>Bivaque</b></a>
  <nav class="ld-nav" aria-label="Seções"><span class="ld-pill" aria-hidden="true"></span>${LANDING_NAV.map(([id,label])=>landingAnchor(id,label)).join('')}</nav>
  <div class="ld-actions"><button type="button" class="ld-text" data-action="entry-login">Entrar</button><span class="ld-cta">${landingCta()}</span><button type="button" class="ld-menu-btn" data-ld-menu aria-label="Abrir menu" aria-expanded="false" aria-controls="ld-sheet">${icon('menu')}</button></div>
 </div></header>
 <div id="ld-main" tabindex="-1">

 <section class="ld-hero" id="inicio" aria-labelledby="ld-h1">
  <picture class="ld-hero-media"><source media="(max-width:860px)" srcset="${image('landing-hero-retrato')}"><img src="${image('landing-hero')}" alt="Famílias reunidas num fim de tarde, conversando em volta de uma mesa ao ar livre"></picture>
  <div class="ld-wrap ld-hero-in"><div class="ld-hero-copy">
   <p class="ld-forces">${LANDING_FORCES}</p>
   <h1 id="ld-h1">${LANDING_TITLE}</h1>
   <p class="ld-lead">${LANDING_LEAD}</p>
   ${landingCta('ld-hero-cta')}
   <p class="ld-note">Familiar de militar? O convite leva ao mesmo cadastro, sem CPF.</p>
  </div></div>
 </section>

 <section class="ld-sec ld-ex" id="exemplo"><div class="ld-wrap">
  <div><p class="ld-kicker">Como funciona</p><h2>Uma pergunta, várias famílias respondendo</h2><p class="ld-sub">Quem já passou por isso indica. A indicação que funcionou fica guardada para quem chegar depois.</p></div>
  ${landingThread()}
 </div></section>

 <section class="ld-sec ld-alt ld-feat" id="recursos"><div class="ld-wrap">
  <div><p class="ld-kicker">O que tem</p><h2>O que a gente resolve junto, na sua cidade</h2><p class="ld-sub">Cada cidade tem a sua comunidade, feita de quem já passou por lá.</p>
   <ul class="ld-list">${LANDING_FEATURES.map(([ic,title,text])=>`<li><i>${icon(ic)}</i><div><b>${title}</b><span>${text}</span></div></li>`).join('')}</ul>
  </div>
  <figure class="ld-shot"><img src="${image('landing-app-comunidade')}" alt="Tela Comunidade do Bivaque com perguntas resolvidas"><figcaption>Tela da Comunidade no app · dados de exemplo</figcaption></figure>
 </div></section>

 <section class="ld-sec ld-move" id="mudanca"><div class="ld-wrap">
  <figure class="ld-shot"><img src="${image('landing-app-inicio')}" alt="Tela Início do Bivaque com o plano de chegada"><figcaption>Plano de chegada no app · dados de exemplo</figcaption></figure>
  <div><p class="ld-kicker">Mudança de cidade</p><h2>Transferido? Chegue sabendo.</h2><p class="ld-sub">Um plano para quem vai chegar ou sair, montado com o que a comunidade da cidade já sabe.</p>
   <ul class="ld-checks">${LANDING_CHECKS.map(text=>`<li>${icon('check')}${text}</li>`).join('')}</ul>
   <p class="ld-move-foot">Funciona para onde você mora e para onde vai.</p>
  </div>
 </div></section>

 <section class="ld-sec ld-alt" id="participar"><div class="ld-wrap">
  <p class="ld-kicker">Como participar</p><h2>Três passos para entrar</h2>
  <ol class="ld-steps">${LANDING_STEPS.map(([title,text])=>`<li><b>${title}</b><span>${text}</span></li>`).join('')}</ol>
 </div></section>

 <section class="ld-sec ld-faq" id="perguntas"><div class="ld-wrap">
  <div><p class="ld-kicker">Perguntas</p><h2>Perguntas frequentes</h2><p class="ld-sub">Outra dúvida? <button type="button" class="ld-inline" data-action="support-open" data-value="contato">Fale com a gente</button></p></div>
  <div>${LANDING_FAQ.map(([question,answer],index)=>`<details${index===LANDING_FAQ_OPEN?' open':''}><summary>${esc(question)}${icon('expand_more')}</summary><p>${esc(answer)}</p></details>`).join('')}</div>
 </div></section>

 <section class="ld-final" id="fim">
  <img src="${image('landing-encontro')}" alt="">
  <div class="ld-wrap"><h2>Entre na comunidade da sua cidade.</h2><p>Juntos somos mais fortes.</p>${landingCta()}</div>
 </section>

 </div>
 <footer class="ld-footer"><div class="ld-wrap">
  <span class="ld-who">${mark()}Bivaque · Comunidade independente da família militar</span>
  <nav aria-label="Rodapé"><button type="button" class="ld-link" data-action="entry-login">Entrar</button><button type="button" class="ld-link" data-action="support-open" data-value="ajuda">Ajuda</button>${legalLink('privacidade','Privacidade')}${legalLink('conduta')}</nav>
  <small>© 2026 Bivaque</small>
 </div></footer>
 <div class="ld-bar" id="ld-bar">${landingCta()}</div>
 <div class="ld-sheet" id="ld-sheet" role="dialog" aria-modal="true" aria-label="Menu">
  <div class="ld-sheet-head"><a class="ld-home" href="#inicio" data-landing-anchor="inicio" aria-label="Bivaque, início">${mark()}<b>Bivaque</b></a><button type="button" class="ld-menu-btn" data-ld-close aria-label="Fechar menu">${icon('close')}</button></div>
  <nav aria-label="Seções">${LANDING_NAV.map(([id,label,ic])=>landingAnchor(id,label,ic)).join('')}</nav>
  <div class="ld-sheet-acts">${landingCta()}<button type="button" class="ld-link" data-action="entry-login">Já tenho conta · Entrar</button></div>
  <div class="ld-sheet-legal"><button type="button" class="ld-link" data-action="support-open" data-value="ajuda">Ajuda</button>${legalLink('privacidade','Privacidade')}${legalLink('conduta')}</div>
 </div>
 </div>`;
}
// Rodada 71: a landing rola dentro de #main (o body tem overflow:hidden), então os observadores, o
// topo que se esconde e a âncora ativa leem esse contêiner, nunca a janela.
var landingView=null;
function bindLanding(){
 const el=$('#landing');
 if(landingView){landingView.destroy();landingView=null;}
 if(el)landingView=landingMount(el);
}
function landingMount(el){
 const main=$('#main'),top=$('#ld-top',el),bar=$('#ld-bar',el),sheet=$('#ld-sheet',el);
 const menuBtn=$('[data-ld-menu]',el),pill=$('.ld-pill',el),links=$$('.ld-nav a',el),sheetLinks=$$('.ld-sheet nav a',el);
 const media=$('.ld-hero-media',el),cta=$('#ld-hero-cta',el),fim=$('#fim',el),thread=$('#ld-thread',el);
 const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches,mobile=matchMedia('(max-width:860px)');
 const observers=[];let heroGone=false,fimIn=false,open=false,lastY=main.scrollTop;
 const watch=(callback,options)=>{const observer=new IntersectionObserver(callback,options);observers.push(observer);return observer;};
 // Rodada 72: com a folha do menu aberta, o resto da landing sai do alcance do teclado e da tecnologia
 // assistiva (inert). Fora dela não há o que focar enquanto a folha está aberta.
 const outside=[$('.ld-skip',el),top,$('#ld-main',el),$('.ld-footer',el),bar].filter(Boolean);
 const sheetFocusables=()=>$$('a[href],button,md-filled-button,md-outlined-button,md-text-button,[tabindex]:not([tabindex="-1"])',sheet).filter(x=>x.getClientRects().length&&!x.disabled);
 const sync=()=>{top.classList.toggle('ld-show-cta',heroGone);const barShown=heroGone&&!fimIn;bar.classList.toggle('ld-show',barShown);bar.inert=!barShown;if(barShown)bar.removeAttribute('aria-hidden');else bar.setAttribute('aria-hidden','true');};
 // O topo fica transparente sobre a foto e ganha o fundo da superfície depois dela.
 watch(([entry])=>top.classList.toggle('ld-solid',!entry.isIntersecting),{root:main,rootMargin:'-64px 0px 0px 0px'}).observe(media);
 // O CTA do topo pode nascer abaixo da dobra (celular): o estado dele vem da geometria a cada
 // rolagem, não de uma transição do observador.
 const trackHero=()=>{
  const rect=cta.getBoundingClientRect(),root=main.getBoundingClientRect();
  const gone=rect.bottom<=root.top+1;
  if(gone!==heroGone){heroGone=gone;sync();}
 };
 watch(([entry])=>{fimIn=entry.isIntersecting;sync();},{root:main}).observe(fim);
 const setActive=(id)=>{
  let on=null;
  for(const link of links){const hit=link.getAttribute('href')==='#'+id;if(hit){link.setAttribute('aria-current','true');on=link;}else link.removeAttribute('aria-current');}
  for(const link of sheetLinks){if(link.getAttribute('href')==='#'+id)link.setAttribute('aria-current','true');else link.removeAttribute('aria-current');}
  if(!on||!pill){if(pill)pill.style.opacity=0;return;}
  if(!on.offsetWidth)return; // a navegação do topo está escondida no celular
  pill.style.width=on.offsetWidth+'px';pill.style.transform=`translateX(${on.offsetLeft}px)`;pill.style.opacity=1;
 };
 const spy=watch((entries)=>{for(const entry of entries)if(entry.isIntersecting)setActive(entry.target.id);},{root:main,rootMargin:'-45% 0px -50% 0px'});
 for(const id of LANDING_ANCHORS)spy.observe($('#'+id,el));
 const setMenu=(state,restore=true)=>{
  open=state;sheet.classList.toggle('ld-open',state);menuBtn.setAttribute('aria-expanded',String(state));main.classList.toggle('ld-locked',state);
  for(const node of outside)node.inert=state;
  if(state){const close=$('[data-ld-close]',sheet);if(close)close.focus({preventScroll:true});}
  else if(restore)menuBtn.focus({preventScroll:true});
 };
 const goTo=(id)=>{
  const target=document.getElementById(id);if(!target)return;
  target.scrollIntoView({block:'start',behavior:reduce?'auto':'smooth'});
  if(id==='ld-main')target.focus({preventScroll:true});
 };
 const onClick=(event)=>{
  const anchor=event.target.closest?.('[data-landing-anchor]');
  if(anchor){event.preventDefault();if(open)setMenu(false);goTo(anchor.dataset.landingAnchor);return;}
  if(event.target.closest?.('[data-ld-menu]')){event.preventDefault();setMenu(true);return;}
  if(event.target.closest?.('[data-ld-close]')){event.preventDefault();setMenu(false);}
 };
 // Tab e Shift+Tab dão a volta dentro da folha: o último item volta ao primeiro, e vice-versa.
 const onKey=(event)=>{
  if(!open)return;
  if(event.key==='Escape'){event.preventDefault();setMenu(false);return;}
  if(event.key!=='Tab')return;
  const items=sheetFocusables();if(!items.length)return;
  const first=items[0],last=items[items.length-1],active=document.activeElement;
  if(!sheet.contains(active)){event.preventDefault();(event.shiftKey?last:first).focus({preventScroll:true});return;}
  if(event.shiftKey&&active===first){event.preventDefault();last.focus({preventScroll:true});}
  else if(!event.shiftKey&&active===last){event.preventDefault();first.focus({preventScroll:true});}
 };
 const onScroll=()=>{
  const y=main.scrollTop;
  trackHero();
  if(!mobile.matches)top.classList.remove('ld-hide');
  else if(y>lastY+6&&y>200)top.classList.add('ld-hide');
  else if(y<lastY-6||y<60)top.classList.remove('ld-hide');
  lastY=y;
 };
 el.addEventListener('click',onClick);
 document.addEventListener('keydown',onKey);
 main.addEventListener('scroll',onScroll,{passive:true});
 // A conversa se monta ao entrar na tela; com movimento reduzido ela já nasce montada.
 if(!reduce){
  thread.classList.add('ld-reveal');
  watch(([entry],observer)=>{if(entry.isIntersecting){thread.classList.add('ld-in');observer.disconnect();}},{root:main,threshold:.25}).observe(thread);
 }
 sync();
 trackHero();
 return {destroy(){
  for(const observer of observers)observer.disconnect();
  main.removeEventListener('scroll',onScroll);
  document.removeEventListener('keydown',onKey);
  main.classList.remove('ld-locked');
  for(const node of outside)node.inert=false;
 }};
}
// Sair: os dados de teste ficam neste dispositivo; entrar de novo volta para o mesmo perfil.
function entrySignOut(){confirm('Sair do Bivaque?','Você volta para a página inicial. Os dados de teste continuam neste dispositivo.',()=>{if(mutate(()=>{state.signedOut=true;},{redraw:false})){entryForgotSent='';entryInviteCode='';closePalette(false);navigate('entrar',null,{replace:true});}});}
function entrySignInBack(){if(state.accountDeletedAt){entryError('Esta conta foi apagada. Crie uma nova.');return;}if(!mutate(()=>{state.signedOut=false;},{redraw:false}))return;navigate('inicio',null,{replace:true});notify(`Você entrou como ${state.profile.name} (modo teste).`,'check_circle');}
async function entryAction(action,value){
 if(!action.startsWith('entry-')&&!['sign-out','onboarding'].includes(action))return false;
 if(await entryFlowAction(action,value))return true;
 if(action==='sign-out'){entrySignOut();return true;}
 // Entrar sempre abre o formulário: quem está no meio da entrada retoma ao entrar com o e-mail dela,
 // e quem quer usar outra conta não fica preso.
 if(action==='entry-login'){navigate('entrar','login');return true;}
 if(action==='entry-join'){navigate('entrar','conta');return true;}
 if(action==='entry-invite'){entryInviteCode='';navigate('entrar','convite');return true;}
 return false;
}
