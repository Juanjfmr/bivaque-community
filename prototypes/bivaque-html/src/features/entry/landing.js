// Rodada 53 (lote Entrada; maquete v2 aprovada em 17/10/2026, com a crítica própria e a do GPT):
// landing pública com a amostra grátis na própria página. Quem saiu (state.signedOut) só vê a landing;
// a amostra usa só exemplos do arquivo da comunidade aprovados para divulgação (fromMemory), nunca o
// que alguém publicou neste dispositivo, e não identifica membros. Decisão do dono: quem
// está em análise não lê o Bivaque; a degustação é esta amostra.
var entrySampleCity=null;
function entrySample(city){
 const solved=state.asks.filter(a=>a.city===city&&a.status==='ok'&&!a.hidden),fam=SOURCE.cities?.[city]?.fam||0;
 const ex=solved.find(a=>a.fromMemory);
 const cards=ex?[
  `<article class="en-card">${icon('forum')}<b>${esc(ex.q)}</b><span>Resolvida · a comunidade indicou o que confirmar antes de decidir.</span></article>`,
  `<article class="en-card">${icon('map')}<b>Guia de ${esc(city)}: a chegada</b><span>Moradia, escola, saúde e mudança, na ordem, com o que quem chegou antes aprendeu.</span></article>`,
  `<article class="en-card en-lock">${icon('lock')}<b>+ ${solved.length} ${solved.length===1?'indicação resolvida':'indicações resolvidas'} em ${esc(city)}</b><span>Entre para ver tudo e perguntar.</span></article>`
 ]:[`<article class="en-card en-lock">${icon('map')}<b>Ainda reunindo exemplos de ${esc(city)}</b><span>${fam?`${fam} ${fam===1?'família já está':'famílias já estão'} lá. `:''}Entre para perguntar a quem mora na cidade.</span></article>`];
 return cards.join('');
}
function renderEntryLanding(){
 const city=entrySampleCity||state.homeCity;
 return `<div class="en"><header class="en-top"><span class="en-mark" aria-hidden="true">B</span><span class="en-brand">Bivaque</span>${btn('Entrar','entry-login','','text')}</header>
 <div class="en-grid"><section class="en-hero" aria-labelledby="en-h1"><p class="en-aud">Militares federais, veteranos, pensionistas e famílias</p><h1 id="en-h1">Muda a cidade. Fica a sua rede.</h1><p class="en-lead">Guia da cidade, comunidades e serviços indicados por quem já mora lá. Só entra quem tem o vínculo confirmado.</p>
 <div class="en-ctas">${btn('Quero fazer parte','entry-join','','filled')}${btn('Recebi um convite de familiar','entry-invite','','outlined','person_add')}</div><p class="en-note">Gratuito · Não é um canal oficial das Forças</p><p class="en-note en-legal">${legalLink('privacidade')} · ${legalLink('conduta')} · <button type="button" class="en-inline" data-action="support-open" data-value="ajuda">Ajuda</button></p></section>
 <section class="en-sample" aria-labelledby="en-sample-t"><h2 id="en-sample-t">Amostra grátis: veja o que a comunidade sabe</h2><p>Exemplos aprovados para divulgação, sem identificar os membros.</p>${filterChips(CITY_NAMES.map(c=>[c,c]),city,'entry-sample-city')}<div class="en-cards" id="en-cards">${entrySample(city)}</div></section></div></div>`;
}
// Sair: os dados de teste ficam neste dispositivo; entrar de novo volta para o mesmo perfil.
function entrySignOut(){confirm('Sair do Bivaque?','Você volta para a página inicial. Os dados de teste continuam neste dispositivo.',()=>{if(mutate(()=>{state.signedOut=true;},{redraw:false})){entrySampleCity=null;entryForgotSent='';entryInviteCode='';closePalette(false);navigate('entrar',null,{replace:true});}});}
function entrySignInBack(){if(state.accountDeletedAt){entryError('Esta conta foi apagada. Crie uma nova.');return;}if(!mutate(()=>{state.signedOut=false;},{redraw:false}))return;navigate('inicio',null,{replace:true});notify(`Você entrou como ${state.profile.name} (modo teste).`,'check_circle');}
async function entryAction(action,value){
 if(!action.startsWith('entry-')&&!['sign-out','onboarding'].includes(action))return false;
 if(await entryFlowAction(action,value))return true;
 if(action==='sign-out'){entrySignOut();return true;}
 if(action==='entry-sample-city'){entrySampleCity=value;const c=$('#en-cards');if(c)c.innerHTML=entrySample(value);for(const ch of $$('[data-action="entry-sample-city"]'))ch.selected=ch.dataset.value===value;return true;}
 // Entrar sempre abre o formulário: quem está no meio da entrada retoma ao entrar com o e-mail dela,
 // e quem quer usar outra conta não fica preso.
 if(action==='entry-login'){navigate('entrar','login');return true;}
 if(action==='entry-join'){navigate('entrar','conta');return true;}
 if(action==='entry-invite'){entryInviteCode='';navigate('entrar','convite');return true;}
 return false;
}
