// Rodada 51: Cidades do Painel do Bivaque. Saúde de cada cidade (a pior primeiro), detalhe no painel
// lateral com embaixadores e "Convidar embaixador"; "Ver perguntas paradas" abre a fila filtrada.
const OWNER_HEALTH=c=>c.served<.5||!c.ambassadors?'bad':c.served<.75||c.unanswered>1?'warn':'ok';
const OWNER_HEALTH_LABEL={ok:'Saudável',warn:'Atenção',bad:'Precisa de ajuda'};
function ownerCityStats(name){
 const base=OWNER_DEMO.cities[name],c={...base,unanswered:ownerStaleBy().by[name]||0},invited=(ownerData().invites||[]).filter(i=>i.city===name);
 return {...c,name,invited,health:OWNER_HEALTH(c)};
}
function renderOwnerCities(){
 const rank={bad:0,warn:1,ok:2},list=ownerCities().map(ownerCityStats).sort((a,b)=>rank[a.health]-rank[b.health]||a.served-b.served);
 const row=c=>`<tr><th scope="row"><button type="button" class="ow-link" data-action="owner-city-open" data-value="${esc(c.name)}"><span class="ow-dot ow-dot-${c.health}" aria-hidden="true"></span>${esc(c.name)}</button><small>${OWNER_HEALTH_LABEL[c.health]}</small></th><td class="n" data-label="Famílias">${c.fam.toLocaleString('pt-BR')}</td><td class="n" data-label="Chegam em 60 dias">${c.arriving}</td><td class="n" data-label="Chegadas atendidas">${Math.round(c.served*100)}%</td><td class="n" data-label="Sem resposta">${c.unanswered}</td><td class="n" data-label="Embaixadores">${c.ambassadors}${c.invited.length?` <small>+${c.invited.length} convite${c.invited.length>1?'s':''}</small>`:''}</td></tr>`;
 return `<h1 class="ow-h1">Cidades</h1><p class="ow-lead">Como cada cidade está atendendo quem chega. A que mais precisa de ajuda vem primeiro.</p>
 <section class="ow-card"><table class="ow-table"><caption class="ow-sr">Saúde das cidades</caption><thead><tr><th scope="col">Cidade</th><th scope="col" class="n">Famílias</th><th scope="col" class="n">Chegam em 60 dias</th><th scope="col" class="n">Chegadas atendidas</th><th scope="col" class="n">Sem resposta</th><th scope="col" class="n">Embaixadores</th></tr></thead><tbody>${list.map(row).join('')}</tbody></table></section>`;
}
function ownerCityOpen(name){
 const c=ownerCityStats(name);if(!OWNER_DEMO.cities[name])return;
 const amb=(OWNER_DEMO.ambassadors?.[name]||[]).map(a=>`<li><span class="ow-who"><i aria-hidden="true">${esc(initals(a))}</i>${esc(a)}</span></li>`).join('');
 const inv=c.invited.map(i=>`<li><span class="ow-who"><i aria-hidden="true">${esc(initals(i.name))}</i>${esc(i.name)} · convite enviado</span></li>`).join('');
 showDialog(name,`<div class="ow-review"><p><span class="ow-dot ow-dot-${c.health}" aria-hidden="true"></span>${OWNER_HEALTH_LABEL[c.health]}</p>
 <div class="ow-mini"><div><small>Famílias</small><b>${c.fam.toLocaleString('pt-BR')}</b></div><div><small>Chegam em 60 dias</small><b>${c.arriving}</b></div><div><small>Chegadas atendidas</small><b>${Math.round(c.served*100)}%</b></div><div><small>Sem resposta há 48 h</small><b>${c.unanswered}</b></div></div>
 <h3>Embaixadores</h3>${amb||inv?`<ul class="ow-amb">${amb}${inv}</ul>`:`<p class="small muted">Ninguém ainda. Quem chega a ${esc(name)} fica sem quem responda rápido.</p>`}
 <h3>Convidar embaixador</h3>${field('owner-invite-name','Nome de quem mora em '+name,'','maxlength="60" autocomplete="off"')}<p class="form-note">No app, o convite vai pelo próprio Bivaque e a pessoa precisa ser verificada para aceitar. Aqui ele fica registrado neste dispositivo.</p></div>`,
 `${c.unanswered?btn('Ver perguntas paradas','owner-city-stale',name,'text'):''}${btn('Convidar','owner-invite',name,'filled','person_add')}`,'owner-review');ownerClearErrors();
}
function ownerInvite(city){
 const f=$('#owner-invite-name'),name=(f?.value||'').trim().replace(/\s+/g,' ');
 if(name.length<3){if(f){f.error=true;f.errorText='Escreva o nome de quem você quer convidar.';f.focus();}return;}
 if(!mutate(()=>{const o=state.owner||(state.owner={decisions:{},log:[]});o.invites=[...(o.invites||[]),{id:uid('inv'),city,name:name.slice(0,60),at:Date.now()}];o.log=[{at:Date.now(),text:`Convite de embaixador em ${city}: ${name.slice(0,60)}`},...o.log].slice(0,50);},{redraw:false}))return;
 closeDialog(true).then(()=>{render();ownerFocusHeading();notify(`Convite para ${name} ser embaixador em ${city} registrado (modo teste).`,'person_add');});
}
