// Rodada 52: Negócios e planos e Pessoas e equipe do Painel do Bivaque. Planos e receita são de
// exemplo; os negócios vêm do protótipo. "Lembrar" e os convites ficam no registro do dono.
// Mesmo catálogo do app (Planos para o negócio): preço mensal para a receita, rótulo como no app.
const OWNER_PLAN_LABEL={free:'Grátis',moment:'Destaque de momento',plan:'Plano do negócio'};
const OWNER_PLAN_PRICE={moment:{label:'R$ 9,90/semana',month:40},plan:{label:'R$ 39/mês',month:39}};
function ownerPlan(b){if(!paidPlans())return {tier:'free'};if(state.myBiz&&b.id===state.myBiz.id&&state.subscription?.tier&&state.subscription.tier!=='free')return {tier:state.subscription.tier,renewDays:30,mine:true};return OWNER_DEMO.plans?.[b.id]||{tier:'free'};}
const ownerPlanMonth=p=>OWNER_PLAN_PRICE[p.tier]?.month||0;
// Planos pagos e receita: negócios do protótipo mais os planos de exemplo das outras cidades.
function ownerPlansTotal(city=ownerCity){const paid=[...(state.myBiz?.live?[state.myBiz]:[]),...state.biz].filter(b=>(city==='Todas'||b.city===city)&&ownerPlan(b).tier!=='free'),o=Object.entries(OWNER_DEMO.otherPlans||{}).filter(([c])=>city==='Todas'||c===city);return {count:paid.length+o.reduce((s,[,v])=>s+v.count,0),revenue:paid.reduce((s,b)=>s+ownerPlanMonth(ownerPlan(b)),0)+o.reduce((s,[,v])=>s+v.revenue,0)};}
function ownerBizAll(){return [...(state.myBiz?.live?[state.myBiz]:[]),...state.biz].filter(b=>ownerCity==='Todas'||b.city===ownerCity);}
function ownerClaimPending(b){return OWNER_DEMO.claims.some(c=>c.biz===b.id)&&ownerQueue().some(q=>q.kind==='claim'&&q.biz.id===b.id);}
function ownerBizRow(b){
 const p=ownerPlan(b),claimed=b.claimed!==false;
 return `<tr><th scope="row"><button type="button" class="ow-link" data-action="open-biz" data-value="${esc(b.id)}">${esc(b.name)}</button><small>${esc(b.cat)}</small></th><td data-label="Cidade">${esc(b.city)}</td><td data-label="Plano">${OWNER_PLAN_LABEL[p.tier]||p.tier}${OWNER_PLAN_PRICE[p.tier]?` · ${OWNER_PLAN_PRICE[p.tier].label}`:''}</td><td class="n" data-label="Indicações">${b.recN||0}</td><td data-label="Situação">${ownerClaimPending(b)?'Reivindicação em análise':claimed?'Com responsável':'Aguardando responsável'}</td></tr>`;
}
function renderOwnerBusiness(){
 const all=ownerBizAll(),paid=all.filter(b=>ownerPlan(b).tier!=='free'),tot=ownerPlansTotal(),spon=all.filter(isSpon).length,quotes=Object.entries(OWNER_DEMO.quotesByCity||{}).filter(([c])=>ownerCity==='Todas'||c===ownerCity).reduce((s,[,n])=>s+n,0),reminded=ownerData().reminded||{};
 const due=paid.filter(b=>ownerPlan(b).renewDays<=7).sort((a,b)=>ownerPlan(a).renewDays-ownerPlan(b).renewDays);
 const dueRow=b=>{const p=ownerPlan(b);return `<div class="ow-q ow-q-plan" role="listitem"><span class="ow-ic ow-amber">${icon('event_busy')}</span><span class="t"><b>${esc(b.name)}</b><small>${OWNER_PLAN_LABEL[p.tier]} · ${OWNER_PLAN_PRICE[p.tier]?.label||''} · vence em ${p.renewDays} ${p.renewDays===1?'dia':'dias'}</small></span><span class="ow-acts">${reminded[b.id]?`<span class="ow-sla">Lembrete registrado</span>`:ownerBtn('Lembrar','owner-remind',{id:b.id,title:b.name},'outlined')}</span></div>`;};
 if(!paidPlans())return ownerBusinessFree(all,quotes);
 return `<h1 class="ow-h1">Negócios e planos</h1><p class="ow-lead">Planos pagos, patrocínios e o que vence nos próximos dias.</p>
 <div class="ow-filters">${filterChips([['Todas','Todas as cidades'],...ownerCities().map(c=>[c,c])],ownerCity,'owner-city')}</div>
 <section class="ow-card"><div class="ow-mini ow-mini-4"><div><small>Planos pagos</small><b>${tot.count}</b></div><div><small>Receita do mês</small><b>R$ ${tot.revenue.toLocaleString('pt-BR')}</b></div><div><small>Patrocinados</small><b>${spon}</b></div><div><small>Pedidos de orçamento (30 dias)</small><b>${quotes}</b></div></div></section>
 <section class="ow-card"><h2>Vencem em 7 dias</h2>${due.length?`<div class="ow-list" role="list">${due.map(dueRow).join('')}</div>`:`<p class="ow-done">${icon('check')}Nenhum plano vence esta semana.</p>`}</section>
 <section class="ow-card"><h2>Todos os negócios</h2>${all.length?`<table class="ow-table"><caption class="ow-sr">Negócios e planos</caption><thead><tr><th scope="col">Negócio</th><th scope="col">Cidade</th><th scope="col">Plano</th><th scope="col" class="n">Indicações</th><th scope="col">Situação</th></tr></thead><tbody>${all.map(ownerBizRow).join('')}</tbody></table>`:`<p class="ow-done">Nenhum negócio nesta cidade.</p>`}</section>`;
}
// Rodada 69: sem cobrança no lançamento, a tela mostra os negócios e quem ainda espera o responsável.
function ownerBusinessFree(all,quotes){
 const claimed=all.filter(b=>b.claimed!==false).length,row=b=>`<tr><th scope="row"><button type="button" class="ow-link" data-action="open-biz" data-value="${esc(b.id)}">${esc(b.name)}</button><small>${esc(b.cat)}</small></th><td data-label="Cidade">${esc(b.city)}</td><td class="n" data-label="Indicações">${b.recN||0}</td><td data-label="Situação">${ownerClaimPending(b)?'Reivindicação em análise':b.claimed!==false?'Com responsável':'Aguardando responsável'}</td></tr>`;
 return `<h1 class="ow-h1">Negócios</h1><p class="ow-lead">Lançamento sem cobrança: toda página de negócio é gratuita e ninguém aparece como Patrocinado.</p>
 <div class="ow-filters">${filterChips([['Todas','Todas as cidades'],...ownerCities().map(c=>[c,c])],ownerCity,'owner-city')}</div>
 <section class="ow-card"><div class="ow-mini ow-mini-4"><div><small>Negócios</small><b>${all.length}</b></div><div><small>Com responsável</small><b>${claimed}</b></div><div><small>Aguardando responsável</small><b>${all.length-claimed}</b></div><div><small>Pedidos de orçamento (30 dias)</small><b>${quotes}</b></div></div></section>
 <section class="ow-card"><h2>Todos os negócios</h2>${all.length?`<table class="ow-table"><caption class="ow-sr">Negócios</caption><thead><tr><th scope="col">Negócio</th><th scope="col">Cidade</th><th scope="col" class="n">Indicações</th><th scope="col">Situação</th></tr></thead><tbody>${all.map(row).join('')}</tbody></table>`:`<p class="ow-done">Nenhum negócio nesta cidade.</p>`}</section>`;
}
function ownerRemind(id){
 const b=bizById(id);if(!b)return;
 if(!mutate(()=>{const o=state.owner||(state.owner={decisions:{},log:[]});o.reminded={...(o.reminded||{}),[id]:Date.now()};o.log=[{at:Date.now(),text:`Lembrete de renovação: ${b.name}`},...o.log].slice(0,50);},{redraw:false}))return;
 render();ownerFocusHeading();notify(`Lembrete de renovação para ${b.name} registrado (modo teste).`,'notifications');
}
function renderOwnerTeam(){
 const queue=ownerQueue(),assigned=queue.filter(q=>ownerWho(q)==='Você').length,mods=[...(OWNER_DEMO.moderators||[]).map(m=>({...m,items:queue.filter(q=>ownerWho(q)===m.name).length})),...(ownerData().team||[]).map(t=>({name:t.name,role:'Moderação · convite enviado',city:t.city,items:0}))];
 const modRow=m=>`<div class="ow-q ow-q-plan" role="listitem"><span class="ow-who"><i aria-hidden="true">${esc(initals(m.name))}</i></span><span class="t"><b>${esc(m.name)}</b><small>${esc(m.role)}${m.city?` · ${esc(m.city)}`:''}</small></span><span class="ow-sla">${m.items} ${m.items===1?'item':'itens'} na fila</span></div>`;
 const amb=ownerCities().map(c=>{const list=OWNER_DEMO.ambassadors?.[c]||[],inv=(ownerData().invites||[]).filter(i=>i.city===c);return `<div class="ow-amb-city"><b>${esc(c)}</b><span>${list.length?list.map(esc).join(', '):'Ninguém ainda'}${inv.length?` · ${inv.length} ${inv.length===1?'convite':'convites'}`:''}</span></div>`;}).join('');
 return `<h1 class="ow-h1">Pessoas e equipe</h1><p class="ow-lead">Quem cuida das filas e quem responde rápido em cada cidade.</p>
 <section class="ow-card"><div class="ow-card-head"><h2>Moderação</h2>${btn('Convidar moderador','owner-mod-invite','','outlined','person_add')}</div><div class="ow-list" role="list">${modRow({name:state.profile.name,role:'Dono',items:assigned})}${mods.map(modRow).join('')}</div></section>
 <section class="ow-card"><div class="ow-card-head"><h2>Embaixadores por cidade</h2>${btn('Ver cidades','owner-go','cidades','text')}</div>${amb}</section>`;
}
function ownerModInvite(){showDialog('Convidar moderador',`<div class="ow-review">${field('owner-mod-name','Nome','','maxlength="60" autocomplete="off"')}${selectField('owner-mod-city','Cidade',ownerCities().map(c=>[c,c]),ownerCity==='Todas'?state.homeCity:ownerCity)}<p class="form-note">Moderadores revisam denúncias e verificações da cidade. No app, a pessoa precisa ser verificada para aceitar; aqui o convite fica registrado neste dispositivo.</p></div>`,btn('Registrar convite','owner-mod-send','','filled','send'),'owner-review');ownerClearErrors();}
function ownerModSend(){
 const f=$('#owner-mod-name'),name=(f?.value||'').trim().replace(/\s+/g,' '),city=$('#owner-mod-city')?.value||state.homeCity;
 if(name.length<3){if(f){f.error=true;f.errorText='Escreva o nome de quem você quer convidar.';f.focus();}return;}
 if(!mutate(()=>{const o=state.owner||(state.owner={decisions:{},log:[]});o.team=[...(o.team||[]),{id:uid('mod'),name:name.slice(0,60),city,at:Date.now()}];o.log=[{at:Date.now(),text:`Convite de moderação em ${city}: ${name.slice(0,60)}`},...o.log].slice(0,50);},{redraw:false}))return;
 closeDialog(true).then(()=>{render();ownerFocusHeading();notify(`Convite de moderação para ${name} registrado (modo teste).`,'person_add');});
}
