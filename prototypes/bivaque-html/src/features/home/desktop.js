// Rodada 13: Início do desktop (a partir de 1024 px) aprovada pelo usuário em 15/10/2026.
// Celular e tablet continuam com renderHome original. Duas colunas: o que a pessoa procura
// à esquerda; grupos, próximo encontro e chegada à direita. Sem estrelas: o sinal é indicação.
const HOME_DESKTOP=matchMedia('(min-width:1024px)');
HOME_DESKTOP.addEventListener('change',()=>{if(route.name==='inicio')render();});
function renderHomeDesktop(){
 const arriving=state.mode==='chegando'&&!readonly(),leaving=state.mode==='saindo'&&!readonly();
 const title=readonly()?`Conheça ${state.city}`:`O que você precisa em ${state.city}?`;
 const subtitle=arriving?`${countDays(state.arrival)} dias para chegar · ${dateLabel(state.arrival)}`:leaving?`${countDays(state.leaveDate)} dias para sua mudança para ${state.dest}`:'Serviços e oportunidades entre militares e famílias.';
 let main=`<div class="page-head"><div><h1>${esc(title)}</h1><p>${esc(subtitle)}</p></div></div><div class="home-top"><md-filled-tonal-button id="home-search" class="home-search-button" data-action="search" aria-label="Buscar no Bivaque">${icon('search','icon')}<span>Busque serviços, produtos, imóveis ou indicações</span><kbd class="home-kbd" aria-hidden="true">${PALETTE_MAC?'⌘':'Ctrl'} K</kbd></md-filled-tonal-button><nav class="intent-grid" aria-label="Áreas">${[['storefront','Negócios','biz'],['sell','Desapegos','desapego'],['apartment','Imóveis','imovel'],['volunteer_activism','Indicações','ind']].map(([ic,label,v])=>`<button type="button" class="intent" data-action="intent" data-value="${v}">${icon(ic)}<span>${label}</span></button>`).join('')}</nav></div>`;
 const hire=readonly()?'':`<button type="button" class="home-hire" data-action="create-request">${icon('build')}<span class="grow"><b>Precisa contratar?</b><small>Descreva o que precisa e receba até ${REQUEST_LIMIT} propostas.</small></span>${icon('chevron_right')}</button>`,notice=homeDeskNotice();
 main+=readonlyHtml()+(notice||hire?`<div class="home-alerts">${notice}${hire}</div>`:'')+homeResumeHtml();
 if((arriving||leaving)&&state.plan[state.mode])main+=renderPlan(state.mode);
 main+=homeDeskServices()+homeDeskItems(arriving);
 if(!readonly())main+=`<div class="context-strip readonly">${icon('add_business')}<span class="grow"><b>Tem um negócio?</b><br>Crie sua página e receba pedidos da comunidade.</span>${btn(state.myBiz?.live?'Minha página':'Criar página','my-biz','','text')}</div>`;
 const qs=cityAsks().filter(q=>q.status==='open').sort((a,b)=>a.answers.length-b.answers.length).slice(0,2);
 main+=`<section class="section">${sectionTitle('A comunidade procura','Ver perguntas','nav','comunidade')}${qs.length?`<div class="list">${qs.map(questionRow).join('')}</div>`:empty('Uma pergunta pode ajudar muita gente','Busque uma indicação ou compartilhe uma dúvida com sua cidade.','forum',readonly()?'':'ask',readonly()?'':'Pedir indicação')}</section>`;
 main+=`<section class="section">${sectionTitle(`Guia de ${state.city}`,'Abrir guia','guide')}<button type="button" class="list-row list" data-action="guide">${icon('map')}<span class="txt"><b>Organize moradia, mudança e serviços</b><small>Um roteiro prático para se estabelecer na cidade.</small></span>${icon('chevron_right')}</button></section>`;
 return `<div class="home-desk"><div class="home-main">${main}</div><aside class="home-side" aria-label="Sua cidade">${homeDeskGroups()}${homeDeskEvent()}${homeDeskArrival(arriving,leaving)}</aside></div>`;
}
// Aviso pessoal: resposta à minha pergunta, proposta ao meu pedido ou avisos não lidos (abre a lista).
function homeDeskNotice(){
 if(readonly())return '';
 const strip=(ic,title,sub,label,action,value)=>`<button type="button" class="home-notice" data-action="${action}" data-value="${esc(value)}">${icon(ic)}<span class="grow"><b>${esc(title)}</b><small>${esc(sub)}</small></span><span class="home-notice-go">${esc(label)}${icon('chevron_right')}</span></button>`;
 const ask=cityAsks().filter(q=>q.mine&&q.status!=='ok'&&q.answers.length).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0))[0];
 if(ask){const n=ask.answers.length;return strip('chat_bubble',`Sua pergunta recebeu ${n} ${n===1?'resposta':'respostas'}`,ask.q,'Ver respostas','open-question',ask.id);}
 const req=requestList().filter(r=>r.mine&&r.city===state.city&&requestActive(r)&&r.proposals.some(p=>p.status==='sent')).sort((a,b)=>b.createdAt-a.createdAt)[0];
 if(req){const n=req.proposals.filter(p=>p.status==='sent').length;return strip('request_quote',`Seu pedido recebeu ${n} ${n===1?'proposta':'propostas'}`,`${requestTitle(req)} · ${req.hood}`,'Comparar','open-request',req.id);}
 const unread=state.notices.filter(n=>n.unread&&n.city===state.homeCity);
 if(unread.length){const n=unread[0],text=noticeText(n);return strip('notifications',unread.length===1?'Você tem 1 aviso novo':`Você tem ${unread.length} avisos novos`,text,'Ver avisos','notices','');}
 return '';
}
// Serviços: dois indicados e o patrocinado, sempre com rótulo. Sem estrelas.
function homeDeskServices(){
 const organic=cityBiz().filter(b=>!b.spon).sort((a,b)=>b.recN-a.recN),spon=cityBiz().find(b=>b.spon&&b.claimed!==false);
 const list=spon?[...organic.slice(0,2),spon,...organic.slice(2,3)]:organic.slice(0,4);
 const card=b=>`<article class="photo-card home-biz"><button type="button" class="card-link" data-action="open-biz" data-value="${b.id}">${cover(b,b.spon?'Patrocinado':b.claimed===false?'Indicado pela comunidade':'')}<div class="card-body"><h3>${esc(b.name)}</h3><p class="card-meta">${esc(b.cat)}${b.specs?.length===1?` · ${esc(b.specs[0])}`:''}</p><div class="home-biz-foot"><span class="card-line">${icon(b.claimed===false?'hourglass_top':'forum')}${b.claimed===false?'Aguardando o responsável':b.recN?`${countHtml(b.recN)} ${b.recN===1?'indicação':'indicações'}${avatarStack(b.says,b.recN)}`:'Novo na cidade'}</span><span class="home-biz-go">Ver negócio${icon('chevron_right')}</span></div></div></button></article>`;
 return `<section class="section">${sectionTitle('Serviços recomendados','Ver negócios','businesses')}<p class="small muted home-sub">Indicados pela comunidade de ${esc(state.city)}</p>${list.length?`<div class="home-row">${list.map(card).join('')}</div>`:empty('Ainda sem negócios cadastrados','As indicações da comunidade ajudarão a formar o guia de serviços.','storefront')}</section>`;
}
function homeDeskItems(arriving){
 const items=cityItems().filter(x=>x.status==='active').sort((a,b)=>b.createdAt-a.createdAt).slice(0,4);
 return `<section class="section">${sectionTitle(arriving?'Para a casa nova':'Oportunidades perto de você','Ver todos','catalog-all')}${items.length?`<div class="home-row">${items.map(photoCard).join('')}</div>`:empty('As primeiras oportunidades aparecem aqui','Quando alguém publicar nesta cidade, você poderá consultar e entrar em contato.','sell',readonly()?'':'create-item',readonly()?'':'Anunciar desapego')}</section>`;
}
// Lateral: atividade dos meus grupos, com o sinal do que mudou (respostas, comentários).
function homeDeskGroups(){
 if(readonly())return '';const mg=state.groups.filter(g=>g.on);if(!mg.length)return '';
 const posts=mg.flatMap(g=>g.posts.filter(p=>p.type!=='event').map(p=>({g,p}))).sort((a,b)=>b.p.at-a.p.at).slice(0,2);
 const row=({g,p})=>{const n=p.comments.length,what=p.type==='question'?(n===1?'resposta':'respostas'):(n===1?'comentário':'comentários');return `<button type="button" class="list-row" data-action="open-post" data-value="${g.id}~${p.id}"><span class="avatar">${esc(p.mine?initals(state.profile.name):p.ini)}</span><span class="txt"><b>${esc(p.text)}</b><small class="home-meta"><span class="home-meta-group">${esc(g.t)}</span>${n?`<span class="home-activity">${n} ${what}</span>`:''}<span>${gAgo(p.at)}</span></small></span>${icon('chevron_right')}</button>`;};
 return `<section class="home-card">${sectionTitle('Nos seus grupos','Ver grupos','groups')}<div class="list">${posts.length?posts.map(row).join(''):mg.slice(0,2).map(g=>groupRow(g)).join('')}</div></section>`;
}
// Lateral: o próximo encontro (do grupo ou da agenda), com confirmação em um toque.
function homeDeskEvent(){
 const today=dateISO(),groupEv=readonly()?null:state.groups.filter(g=>g.on).flatMap(g=>g.posts.filter(p=>p.type==='event'&&p.event.date>=today).map(p=>({g,p}))).sort((a,b)=>a.p.event.date.localeCompare(b.p.event.date))[0];
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
