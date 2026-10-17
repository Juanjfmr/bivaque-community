// Rodada 32: agenda agrupada por dia, com filtro por público (referência do Mobbin: Luma).
let agendaFilter='all';
const AGENDA_AUDIENCE=[['all','Todos'],['chegando','Para quem chega'],['moro','Para quem mora'],['saindo','Para quem sai']];
// Encontro criado pela pessoa não escolhe público: vale para todos.
const eventModes=e=>e.modes?.length?e.modes:['chegando','moro','saindo'];
function agendaDay(iso){const today=dateISO(0),tomorrow=dateISO(1);if(iso===today)return 'Hoje';if(iso===tomorrow)return 'Amanhã';const t=new Date(`${iso}T12:00:00`).toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long'});return t.charAt(0).toUpperCase()+t.slice(1);}
function renderAgenda(){
 const all=state.events.filter(e=>e.city===state.city&&e.date>=dateISO()).sort((a,b)=>a.date.localeCompare(b.date)||(a.time||'').localeCompare(b.time||''));
 const count=v=>v==='all'?all.length:all.filter(e=>eventModes(e).includes(v)).length;
 if(!AGENDA_AUDIENCE.some(([v])=>v===agendaFilter)||!count(agendaFilter))agendaFilter='all';
 const es=agendaFilter==='all'?all:all.filter(e=>eventModes(e).includes(agendaFilter));
 const days=[];for(const e of es){const last=days.at(-1);if(last?.date===e.date)last.items.push(e);else days.push({date:e.date,items:[e]});}
 const chips=all.length?filterChips(AGENDA_AUDIENCE.filter(([v])=>v==='all'||count(v)).map(([v,l])=>[v,`${l} · ${count(v)}`]),agendaFilter,'agenda-filter'):'';
 return `<div class="page-head"><div><h1>Agenda da cidade</h1><p>Encontros da comunidade de ${esc(state.city)}.</p></div>${!readonly()?btn('Criar encontro','create-event','','tonal','add'):''}</div>${readonlyHtml()}${chips}${es.length?days.map(d=>`<section class="agenda-day" aria-labelledby="ad-${d.date}"><h2 class="agenda-date" id="ad-${d.date}">${esc(agendaDay(d.date))}</h2><div class="list">${d.items.map(eventRow).join('')}</div></section>`).join(''):all.length?empty('Nenhum encontro para esse público','Veja todos os encontros da cidade.','event','agenda-filter','Ver todos'):empty('Nenhum encontro agendado','Os próximos encontros aparecerão aqui.','event',readonly()?'':'create-event',readonly()?'':'Criar encontro')}`;
}
function renderEvent(){
 const e=state.events.find(x=>x.id===route.id);if(!accessibleRecord(e))return unavailable();
 actionsBar(`${iconBtn('share','share',`evento|${e.id}`,'Compartilhar encontro')}${e.mine?btn('Editar encontro','edit-event',e.id,'filled','edit'):btn(e.on?'Presença confirmada':'Confirmar presença','attend-event',e.id,'filled',e.on?'check':'event_available')}`);
 return `<div class="detail-title"><span>${pill('Encontro da comunidade','','event')}</span><h1>${esc(e.title)}</h1><p class="muted">${dateLabel(e.date)} · ${esc(e.time)}</p></div><div class="context-strip readonly" style="margin-top:0">${icon('location_on')}<span class="grow">${esc(e.place)}<br>${esc(e.city)}</span>${btn('Ver local','map',`${e.place}|${e.city}`,'text')}</div><section class="section">${sectionTitle('Sobre o encontro')}<p class="detail-copy">${esc(e.description)}</p></section><section class="section"><div class="facts" style="max-width:450px"><div class="fact"><b>${e.going||0}</b><span>confirmados</span></div><div class="fact"><b>${e.max||'Livre'}</b><span>${e.max?'vagas totais':'participação'}</span></div><div class="fact"><b>${e.on?'Sim':'—'}</b><span>sua presença</span></div></div></section>${e.mine?`<section class="section">${btn('Cancelar encontro','delete-event',e.id,'outlined','event_busy').replace('<md-outlined-button','<md-outlined-button class="danger"')}</section>`:''}`;
}
