// Rodada 35: Início do celular e do tablet com a organização da Início do desktop (Rodada 13),
// aprovada em 17/10/2026 (versão 6 da maquete): serviços e oportunidades em carrossel, patrocinado
// no 2º cartão, grupos e encontro compactos, chegada pelo momento e "Tem um negócio?" no fim. Os
// avisos ficam só no sino. A cidade faz parte do título e troca com um toque. A busca mostra um
// exemplo que gira (referência: Placeholders and Vanish Input, no 21st.dev); com movimento
// reduzido, fica o primeiro.
var HOME_SEARCH_EXAMPLES=['diarista de confiança','escola perto de casa','berço','apartamento de 2 quartos','pediatra pelo plano'],homeSearchTimer=0;
function homeSearchRotate(){
 clearInterval(homeSearchTimer);if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;let i=0;
 homeSearchTimer=setInterval(()=>{const el=$('#home-search .home-search-ex');if(!el||i===HOME_SEARCH_EXAMPLES.length-1||$('#home-search').matches(':focus-within,:hover')){clearInterval(homeSearchTimer);return;}i+=1;el.textContent=`“${HOME_SEARCH_EXAMPLES[i]}”`;el.animate([{opacity:0,transform:'translateY(4px)'},{opacity:1,transform:'none'}],{duration:260,easing:'ease-out'});},3200);
}
function homeQuickActions(){
 if(readonly())return '';
 return '<div class="home-r73-actions" role="group" aria-label="Participar da comunidade">'+
  '<button type="button" class="home-r73-action home-r73-action-ask" data-action="ask">'+icon('forum')+'<span><b>Pedir indicação</b><small>Quem conhece pode ajudar</small></span>'+icon('arrow_forward')+'</button>'+
  '<button type="button" class="home-r73-action home-r73-action-recommend" data-action="indicate">'+icon('person_add')+'<span><b>Indicar alguém</b><small>Compartilhe um bom contato</small></span>'+icon('arrow_forward')+'</button></div>';
}
function renderHome(){
 if(HOME_DESKTOP.matches)return renderHomeDesktop();
 const arriving=state.mode==='chegando'&&!readonly(),leaving=state.mode==='saindo'&&!readonly();
 const city='<button type="button" class="h1-city" data-action="city" aria-haspopup="dialog" title="Trocar de cidade">'+esc(state.city)+icon('expand_more')+'</button>';
 const subtitle=arriving?countDays(state.arrival)+' dias para chegar · '+dateLabel(state.arrival):leaving?countDays(state.leaveDate)+' dias para sua mudança para '+state.dest:'';
 let h='<div class="home-mob home-r73"><header class="home-r73-intro"><div class="page-head"><div><h1>'+(readonly()?'Conheça':'Sua comunidade em')+' '+city+'</h1>'+(subtitle?'<p>'+esc(subtitle)+'</p>':'')+'</div></div>'+
  '<button type="button" id="home-search" class="home-search-button home-r73-search" data-action="search" aria-label="Buscar no Bivaque">'+icon('search')+'<span>O que você procura?</span>'+icon('tune')+'</button>'+
  homeQuickActions()+'</header>';
 h+=readonlyHtml()+homeResumeHtml();
 if((arriving||leaving)&&state.plan[state.mode])h+=renderPlan(state.mode);
 h+=homeTrustSpotlight();
 h+=homeOpportunityMosaic();
 h+=homeCommunityAnswers();
 h+=homeDeskGroups()+homeDeskEvent();
 h+='<section class="section home-r73-guide">'+sectionTitle('Descubra '+state.city,'Abrir Guia','guide')+
  '<button type="button" class="home-r73-guide-link" data-action="guide">'+icon('map')+'<span><b>Conheça sua cidade</b><small>Bairros, moradia, serviços e a experiência de quem já vive aqui.</small></span>'+icon('arrow_forward')+'</button></section>';
 h+=homeDeskArrival(arriving,leaving);
 if(!readonly())h+='<div class="context-strip readonly home-biz-cta">'+icon('add_business')+'<span class="grow"><b>Tem um negócio?</b><br>Crie sua página e receba pedidos da comunidade.</span>'+btn(state.myBiz?.live?'Minha página':'Criar página','my-biz','','text')+'</div>';
 return h+'</div>';
}
// Rodada 15: o plano vira uma linha do tempo (referências: Timeline da Dice UI e Vertical Titled Stepper no 21st.dev). Cada etapa é um nó na trilha: concluída, próxima ou pendente.
function renderPlan(kind,full=false){const steps=state.plan[kind],n=steps.filter(x=>x.done).length,current=steps.findIndex(x=>!x.done),raw=countDays(kind==='chegando'?state.arrival:state.leaveDate),days=Number.isFinite(raw)?raw:null,all=steps.length&&n===steps.length;return `<section class="section"><div class="progress-wrap plan-card"><div class="plan-head">${planRing(n,steps.length)}<div class="grow"><h3>${kind==='chegando'?'Sua chegada':'Sua saída'}</h3><span class="small muted">${n} de ${steps.length} etapas</span></div>${all?`<span class="plan-days plan-done">${icon('check_circle')}Tudo pronto</span>`:days===null?'':`<span class="plan-days" aria-label="${days} ${days===1?'dia':'dias'} ${kind==='chegando'?'para chegar':'para a mudança'}">${icon(kind==='chegando'?'flight_land':'local_shipping')}<b>${days}</b> ${days===1?'dia':'dias'}</span>`}</div><ol class="plan-steps">${steps.map((x,i)=>[x,i]).slice(full?0:Math.max(0,Math.min(current<0?0:current-1,steps.length-3)),full?steps.length:Math.max(0,Math.min(current<0?0:current-1,steps.length-3))+3).map(([x,i])=>`<li class="plan-step ${x.done?'is-done':i===current?'is-current':'is-todo'}"><span class="plan-node"><md-checkbox ${x.done?'checked':''} aria-label="Marcar ${esc(x.t)} como concluído" data-action="plan-check" data-value="${kind}|${x.id}"></md-checkbox></span><button type="button" data-action="plan-go" data-value="${kind}|${x.id}"><b>${esc(x.t)}${i===current?'<span class="plan-now">Próxima</span>':''}</b><small>${esc(x.s)}</small></button>${icon('chevron_right')}</li>`).join('')}</ol>${full?'':planNextHtml(kind,steps,current)}${full?'':btn('Ver plano completo','plan',kind,'text','checklist')}</div></section>`;}
// Rodada 26: anel de progresso e "Continuar" na próxima etapa (Mobbin: Rakuten, Shopify, Fitbit).
function planRing(done,total){const r=21,c=2*Math.PI*r,f=total?done/total:0;return `<svg class="plan-ring" viewBox="0 0 52 52" role="img" aria-label="${done} de ${total} etapas concluídas"><circle class="track" cx="26" cy="26" r="${r}"/><circle class="fill" cx="26" cy="26" r="${r}" stroke-dasharray="${(c*f).toFixed(1)} ${c.toFixed(1)}"/><text x="26" y="30" text-anchor="middle">${done}/${total}</text></svg>`;}
function planNextHtml(kind,steps,current){const x=steps[current];if(!x)return '';return x.go?`<div class="plan-next">${btn('Continuar','plan-go',`${kind}|${x.id}`,'filled','chevron_right').replace('<md-filled-button',`<md-filled-button aria-label="${esc(`Continuar: ${x.t}`)}"`)}</div>`:'';}
// "Continue de onde parou": o mesmo na Início do celular e na do desktop (Rodada 13).
// Rodada 64: o registro só volta se ainda está visível (não removido, oculto, de pessoa bloqueada, nem página pausada).
function resumeRecord(l){const x=!l?null:l.type==='item'?itemById(l.id):l.type==='biz'?bizById(l.id):l.type==='ask'?askById(l.id):null;return (l?.type==='item'?itemVisible(x):l?.type==='biz'?bizVisible(x):askVisible(x))?x:null;}
function homeResumeHtml(){if(readonly()||state.lastViewed?.city!==state.city)return '';const l=state.lastViewed,x=resumeRecord(l);return x?`<div class="context-strip"><button type="button" data-action="resume" data-value="${l.type}|${l.id}">${icon('history')}<span class="grow"><b>Continue de onde parou</b><br>${esc(x.title||x.name||x.q)}</span>${icon('chevron_right')}</button></div>`:'';}
