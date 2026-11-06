// Rodada 13: Início do desktop (a partir de 1024 px) aprovada pelo usuário em 15/10/2026.
// Celular e tablet usam renderHome (Rodada 35), com estes mesmos blocos. Duas colunas: o que a pessoa procura
// à esquerda; grupos, próximo encontro e chegada à direita. Sem estrelas: o sinal é indicação.
const HOME_DESKTOP=matchMedia('(min-width:1024px)');
HOME_DESKTOP.addEventListener('change',()=>{if(route.name==='inicio')render();});
/* R73 — a Home começa pelo valor: confiança, oportunidades e a pergunta da cidade.
   Preserva a origem dos dados e todas as ações da R72. */
function homeTrustSpotlight(){
 const all=cityBiz(),organic=all.filter(b=>!isSpon(b)).sort((a,b)=>(b.recN||0)-(a.recN||0));
 const b=organic.find(x=>x.claimed!==false)||organic[0];
 let h='<section class="section home-r73-trust">'+sectionTitle('Quem a comunidade recomenda','Ver negócios','businesses');
 if(!b){
  h+=empty('Nenhuma indicação por aqui ainda','Compartilhe um contato útil para ajudar quem chegar depois.','storefront',readonly()?'':'indicate',readonly()?'':'Indicar alguém');
 }else{
  const says=bizSays(b),said=says.find(x=>x[3]),count=Math.max(0,Number(b.recN)||0);
  h+='<article class="home-r73-feature"><button type="button" class="home-r73-feature-open" data-action="open-biz" data-value="'+esc(b.id)+'">'+
    cover(b,b.claimed===false?'Indicado pela comunidade':'')+
    '<span class="home-r73-feature-info"><span class="home-r73-eyebrow">'+esc(b.cat)+'</span>'+
    '<strong>'+esc(b.name)+'</strong>'+
    '<span class="home-r73-feature-meta">'+icon('forum')+' '+(count?count+' '+(count===1?'indicação':'indicações'):'Novo na cidade')+
    (b.specs?.length?' · '+esc(b.specs.join(', ')):'')+'</span>'+
    '<span class="home-r73-open-label">Conhecer o negócio '+icon('arrow_forward')+'</span></span></button>'+
    (said?'<div class="home-r73-proof"><span class="home-r73-proof-label">'+icon('message_circle')+' Relato da comunidade</span><blockquote>“'+esc(said[3])+'”</blockquote><small>'+esc(said[2]||'Membro da comunidade')+'</small></div>':
      '<div class="home-r73-proof"><span class="home-r73-proof-label">'+icon('forum')+' Indicação da comunidade</span><p>'+ (b.claimed===false?'O responsável ainda não confirmou as informações.':'Veja os detalhes e conheça a origem das indicações.')+'</p></div>')+
    '</article>';
 }
 if(paidPlans()){
  const paid=all.find(b=>spotActive(b))||all.find(b=>b.spon&&b.claimed!==false);
  if(paid)h+='<div class="home-r73-sponsored"><span>Patrocinado</span><button type="button" data-action="open-biz" data-value="'+esc(paid.id)+'">'+esc(paid.name)+' '+icon('arrow_forward')+'</button></div>';
 }
 return h+'</section>';
}
function homeOpportunityMosaic(){
 const items=cityItems().filter(x=>x.status==='active').sort((a,b)=>b.createdAt-a.createdAt);
 const property=items.find(x=>x.kind==='imovel'),resale=items.find(x=>x.kind!=='imovel');
 const chosen=[property,resale].filter(Boolean);
 if(chosen.length<2){const second=items.find(x=>!chosen.some(y=>y.id===x.id));if(second)chosen.push(second);}
 let h='<section class="section home-r73-opportunities">'+sectionTitle('Oportunidades em '+state.city,'Ver desapegos','intent','desapego');
 h+=chosen.length?'<div class="home-r73-opportunity-grid">'+chosen.map(photoCard).join('')+'</div>':
  empty('As primeiras oportunidades aparecem aqui','Quando famílias anunciarem nesta cidade, você encontrará imóveis e desapegos.','sell',readonly()?'':'create-item',readonly()?'':'Anunciar');
 h+='<div class="home-r73-category-links">'+btn('Ver imóveis','intent','imovel','text','apartment')+btn('Ver desapegos','intent','desapego','text','sell')+'</div></section>';
 return h;
}
function homeCommunityAnswers(){
 const qs=cityAsks().filter(q=>q.status==='open').sort((a,b)=>a.answers.length-b.answers.length).slice(0,2);
 return '<section class="section home-r73-questions">'+sectionTitle('A comunidade está ajudando','Ver perguntas','nav','comunidade')+
  (qs.length?'<div class="home-r73-question-list">'+qs.map(questionRow).join('')+'</div>':
    empty('Sua pergunta pode começar aqui','Pergunte a quem conhece a cidade.','forum',readonly()?'':'ask',readonly()?'':'Pedir indicação'))+
  (!readonly()?'<div class="home-r73-inline-ask">'+btn('Fazer uma pergunta','ask','','text','edit_square')+'</div>':'')+'</section>';
}
function homeGuideEntry(){
 return '<section class="section home-r73-guide">'+sectionTitle('Guia de '+state.city,'Abrir guia','guide')+
  '<button type="button" class="home-r73-guide-link" data-action="guide">'+icon('map')+'<span><b>Descubra sua cidade</b><small>Bairros, moradia, serviços e dicas da comunidade.</small></span>'+icon('arrow_forward')+'</button></section>';
}
function renderHomeDesktop(){
 const arriving=state.mode==='chegando'&&!readonly(),leaving=state.mode==='saindo'&&!readonly();
 const city='<button type="button" class="h1-city" data-action="city" aria-haspopup="dialog" title="Trocar cidade">'+esc(state.city)+icon('expand_more')+'</button>';
 let h='<div class="home-desk home-desk-r73 home-r73"><header class="home-r73-intro">'+
  '<div class="page-head"><div><h1>'+(readonly()?'Conheça':'Sua comunidade em')+' '+city+'</h1><p>Encontre pessoas, serviços e oportunidades da sua cidade.</p></div></div>'+
  '<div class="home-r73-intro-bottom"><button type="button" id="home-search" class="home-search-button home-r73-search" data-action="search" aria-label="Buscar no Bivaque">'+icon('search')+'<span>Busque serviços, imóveis, desapegos ou respostas</span><kbd aria-hidden="true">'+(PALETTE_MAC?'⌘':'Ctrl')+' K</kbd></button>'+homeQuickActions()+'</div></header>';
 h+=readonlyHtml()+homeResumeHtml();
 const notice=homeDeskNotice();if(notice)h+='<div class="home-alerts home-r73-notice">'+notice+'</div>';
 if((arriving||leaving)&&state.plan[state.mode])h+=renderPlan(state.mode);
 h+='<div class="home-r73-feature-grid"><div class="home-r73-primary">'+homeTrustSpotlight()+'</div><aside class="home-r73-secondary">'+homeCommunityAnswers()+homeDeskEvent()+'</aside></div>';
 h+=homeOpportunityMosaic();
 h+='<div class="home-r73-lower-grid"><div>'+homeDeskGroups()+homeGuideEntry()+'</div><aside>'+homeDeskArrival(arriving,leaving)+
  (!readonly()?'<div class="home-r73-provider">'+icon('add_business')+'<b>Tem um negócio?</b><p>Crie sua página e receba pedidos da comunidade.</p>'+btn(state.myBiz?.live?'Minha página':'Criar página','my-biz','','outlined')+'</div>':'')+'</aside></div>';
 return h+'</div>';
}
// Aviso pessoal: resposta à minha pergunta, proposta ao meu pedido ou avisos não lidos (abre a lista).
function homeDeskNotice(){
 if(readonly())return '';
 const strip=(ic,title,sub,label,action,value)=>`<button type="button" class="home-notice" data-action="${action}" data-value="${esc(value)}">${icon(ic)}<span class="grow"><b>${esc(title)}</b><small>${esc(sub)}</small></span><span class="home-notice-go">${esc(label)}${icon('chevron_right')}</span></button>`;
 const ask=cityAsks().filter(q=>q.mine&&q.status!=='ok'&&askAnswers(q).length).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0))[0];
 if(ask){const n=askAnswers(ask).length;return strip('chat_bubble',`Sua pergunta recebeu ${n} ${n===1?'resposta':'respostas'}`,ask.q,'Ver respostas','open-question',ask.id);}
 const req=requestList().filter(r=>r.mine&&r.city===state.city&&requestActive(r)&&r.proposals.some(p=>p.status==='sent')).sort((a,b)=>b.createdAt-a.createdAt)[0];
 if(req){const n=req.proposals.filter(p=>p.status==='sent').length;return strip('request_quote',`Seu pedido recebeu ${n} ${n===1?'proposta':'propostas'}`,`${requestTitle(req)}${hoodShown(req)?' · '+req.hood:''}`,'Comparar','open-request',req.id);}
 const unread=noticeList().filter(n=>n.unread);
 if(unread.length){const n=unread[0],text=noticeText(n);return strip('notifications',unread.length===1?'Você tem 1 aviso novo':`Você tem ${unread.length} avisos novos`,text,'Ver avisos','notices','');}
 return '';
}
// Serviços: indicados e o patrocinado, sempre com rótulo. Sem estrelas. No desktop o patrocinado
// é o 3º cartão; no celular (Rodada 35), o 2º, para aparecer sem deslizar o carrossel.
function homeDeskServices(sponAt=2){
 const organic=cityBiz().filter(b=>!isSpon(b)).sort((a,b)=>b.recN-a.recN),spon=paidPlans()?cityBiz().find(b=>spotActive(b))||cityBiz().find(b=>b.spon&&b.claimed!==false):null;
 const list=spon?[...organic.slice(0,sponAt),spon,...organic.slice(sponAt,3)]:organic.slice(0,4);
 const card=b=>`<article class="photo-card home-biz"><button type="button" class="card-link" data-action="open-biz" data-value="${b.id}">${cover(b,isSpon(b)?'Patrocinado':b.claimed===false?'Indicado pela comunidade':'')}<div class="card-body"><h3>${esc(b.name)}</h3><p class="card-meta">${esc(b.cat)}${b.specs?.length===1?` · ${esc(b.specs[0])}`:''}</p><div class="home-biz-foot"><span class="card-line">${icon(b.claimed===false?'hourglass_top':'forum')}${b.claimed===false?'Aguardando o responsável':b.recN?`${countHtml(b.recN)} ${b.recN===1?'indicação':'indicações'}${avatarStack(bizSays(b),b.recN)}`:'Novo na cidade'}</span><span class="home-biz-go">Ver negócio${icon('chevron_right')}</span></div></div></button></article>`;
 return `<section class="section">${sectionTitle('Serviços recomendados','Ver negócios','businesses')}<p class="small muted home-sub">Indicados pela comunidade de ${esc(state.city)}</p>${list.length?`<div class="home-row">${list.map(card).join('')}</div>`:empty('Ainda sem negócios cadastrados','As indicações da comunidade ajudarão a formar o guia de serviços.','storefront')}</section>`;
}
function homeDeskItems(arriving,title='Oportunidades perto de você'){
 const items=cityItems().filter(x=>x.status==='active').sort((a,b)=>b.createdAt-a.createdAt).slice(0,4);
 return `<section class="section">${catalogSectionTitle(arriving?'Para a casa nova':title)}${items.length?`<div class="home-row">${items.map(photoCard).join('')}</div>`:empty('As primeiras oportunidades aparecem aqui','Quando alguém publicar nesta cidade, você poderá consultar e entrar em contato.','sell',readonly()?'':'create-item',readonly()?'':'Anunciar desapego')}</section>`;
}
// Lateral: atividade dos meus grupos, com o sinal do que mudou (respostas, comentários).
function homeDeskGroups(){
 if(readonly())return '';const mg=state.groups.filter(g=>g.on&&groupReadable(g));if(!mg.length)return '';
 const posts=mg.flatMap(g=>groupPosts(g).filter(p=>p.type!=='event'&&!p.hidden).map(p=>({g,p}))).sort((a,b)=>b.p.at-a.p.at).slice(0,2);
 const row=({g,p})=>{const n=postComments(p).length,what=p.type==='question'?(n===1?'resposta':'respostas'):(n===1?'comentário':'comentários');return `<button type="button" class="list-row" data-action="open-post" data-value="${g.id}~${p.id}"><span class="avatar">${esc(p.mine?initals(state.profile.name):p.ini)}</span><span class="txt"><b>${p.type==='offer'?'Oferta · ':''}${esc(p.text)}</b><small class="home-meta"><span class="home-meta-group">${esc(g.t)}</span>${n?`<span class="home-activity">${n} ${what}</span>`:''}<span>${gAgo(p.at)}</span></small></span>${icon('chevron_right')}</button>`;};
 return `<section class="home-card">${sectionTitle('Nos seus grupos','Ver grupos','groups')}<div class="list">${posts.length?posts.map(row).join(''):mg.slice(0,2).map(g=>groupRow(g)).join('')}</div></section>`;
}
// Lateral: o próximo encontro (do grupo ou da agenda), com confirmação em um toque.
function homeDeskEvent(){
 const today=dateISO(),groupEv=readonly()?null:state.groups.filter(g=>g.on&&!groupClosed(g)).flatMap(g=>groupPosts(g).filter(p=>p.type==='event'&&!p.hidden&&p.event.date>=today).map(p=>({g,p}))).sort((a,b)=>a.p.event.date.localeCompare(b.p.event.date))[0];
 const cityEv=state.events.filter(e=>e.city===state.city&&e.date>=today).sort((a,b)=>a.date.localeCompare(b.date))[0];
 const useGroup=groupEv&&(!cityEv||groupEv.p.event.date<=cityEv.date);if(!useGroup&&!cityEv)return '';
 const date=useGroup?groupEv.p.event.date:cityEv.date,d=new Date(date+'T12:00:00'),open=useGroup?['open-post',`${groupEv.g.id}~${groupEv.p.id}`]:['open-event',cityEv.id];
 const full=useGroup?groupEv.p.text:cityEv.title,title=full.split(/(?<=[.!?])\s/)[0].replace(/[.!?]$/,''),day=d.toLocaleDateString('pt-BR',{weekday:'short'}).replace('.',''),meta=`${day[0].toUpperCase()+day.slice(1)} · ${useGroup?groupEv.p.event.time:cityEv.time} · ${useGroup?groupEv.g.t:cityEv.place}`,on=useGroup?groupEv.p.event.on:cityEv.on,own=!useGroup&&cityEv.mine;
 const attend=useGroup?btn(on?'Confirmado':'Vou','attend-post',`${groupEv.g.id}|${groupEv.p.id}`,on?'tonal':'outlined',on?'check':''):own?btn('Editar','edit-event',cityEv.id,'outlined','edit'):btn(on?'Confirmado':'Vou','attend-event',cityEv.id,on?'tonal':'outlined',on?'check':'');
 return `<section class="home-card">${sectionTitle('Próximo encontro','Agenda','agenda')}<div class="list-row home-event"><button type="button" class="event-date" data-action="${open[0]}" data-value="${esc(open[1])}" aria-label="Ver ${esc(full)}"><small>${d.toLocaleDateString('pt-BR',{month:'short'}).replace('.','').toUpperCase()}</small><b>${d.getDate()}</b></button><button type="button" class="txt" data-action="${open[0]}" data-value="${esc(open[1])}" title="${esc(full)}"><b>${esc(title)}</b><small>${esc(meta)}</small></button><div class="home-event-go">${attend}</div></div></section>`;
}
// Lateral: chegada pelo momento da pessoa. Quem mora ajuda quem chega; quem chega se orienta.
function homeDeskArrival(arriving,leaving){
 if(readonly())return '';
 // titleHtml já vem escapado: só o contador entra como HTML.
 const card=(titleHtml,sub,label,action,value='',ic='flight_land')=>`<section class="home-card home-arrival">${icon(ic)}<div><h3>${titleHtml}</h3><p>${esc(sub)}</p>${btn(label,action,value,'text','chevron_right')}</div></section>`;
 if(arriving)return card(esc(`Chegando a ${state.city}?`),'Encontre orientações e indicações para a mudança.','Ver guia de chegada','guide');
 if(leaving)return card(esc(`Mudança para ${state.dest}`),'Acompanhe as etapas da sua saída.','Ver plano completo','plan','saindo','local_shipping');
 if(state.incoming)return card(`${countHtml(state.incoming)} famílias estão chegando`,'Uma indicação sua pode ajudar.','Ajudar quem chega','nav','comunidade');
 return '';
}
