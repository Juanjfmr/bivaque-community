// Rodada 49: Painel do Bivaque, o console do dono da plataforma (maquete v2 aprovada em 17/10/2026;
// referências: Shopify, Reddit, Employment Hero e Fresha, no Mobbin). Fica fora da navegação do app,
// com "Voltar ao app". A fila junta o que existe no protótipo (denúncias feitas no app, perguntas
// paradas) com pedidos de exemplo; métricas e cidades são de exemplo e a tela diz isso.
var ownerCity='Todas',ownerTab='all';
const OWNER_DAY=864e5,OWNER_SLA=OWNER_DAY;
const REPORT_REASONS={spam:'spam',fraud:'golpe ou informação enganosa',privacy:'dados pessoais expostos',abuse:'ofensa',other:'outro motivo'};
const OWNER_KINDS=[['all','Tudo'],['report','Denúncias'],['verify','Verificações'],['claim','Negócios'],['stale','Perguntas']];
function ownerData(){return state.owner||{decisions:{},log:[]};}
function ownerDecided(id){return !!ownerData().decisions[id];}
function ownerAgo(ms){const h=Math.round((Date.now()-ms)/36e5);return h<1?'agora':h<24?`há ${h} h`:h<48?'ontem':`há ${Math.round(h/24)} dias`;}
function ownerDue(due){const left=due-Date.now();if(left<=0)return ['atrasada',true];const h=Math.ceil(left/36e5);return [h<24?`vence em ${h} h`:`vence em ${Math.ceil(h/24)} dias`,h<=2];}
// Proposta denunciada: a proposta e o pedido em que ela está (para o dono saber o que julga).
function proposalTarget(id){for(const r of state.requests||[]){const p=(r.proposals||[]).find(x=>x.id===id);if(p)return {...p,request:r,city:r.city,name:bizById(p.bizId)?.name||'Prestador'};}return null;}
function reportTarget(type,id){return type==='item'?itemById(id):type==='ask'?askById(id):type==='biz'?bizById(id):type==='request'?requestById(id):type==='proposal'?proposalTarget(id):null;}
function reportTitle(type,t){return type==='item'?`Anúncio “${t.title}”`:type==='ask'?`Pergunta “${t.q}”`:type==='biz'?`Página de “${t.name}”`:type==='proposal'?`Proposta de ${t.name} (${t.request.cat})`:`Pedido de orçamento: ${t.cat}${t.desc?` · “${String(t.desc).slice(0,40)}”`:''}`;}
// Denúncias abertas agrupadas por conteúdo: as de exemplo e as feitas neste dispositivo. O id leva o
// momento da primeira denúncia aberta: decidir fecha o grupo; uma denúncia nova abre outro.
const REPORT_TYPE_TITLE={proposal:'Proposta de prestador',request:'Pedido de orçamento'};
function ownerReports(){
 const closed=ownerData().closedDemo||[];
 const all=[...OWNER_DEMO.reports.filter(r=>!closed.includes(r.id)).map(r=>({...r,at:Date.now()-r.hoursAgo*36e5,demo:true})),...(state.reports||[]).filter(r=>r.status!=='closed')];
 const groups=new Map();
 for(const r of all){const key=`${r.type}|${r.target}`;groups.set(key,[...(groups.get(key)||[]),r]);}
 return [...groups].map(([key,list])=>{
  const [type,target]=key.split('|'),t=reportTarget(type,target),oldest=list.reduce((a,b)=>b.at<a.at?b:a),first=oldest.at,reasons=[...new Set(list.map(r=>REPORT_REASONS[r.reason]||r.reason))],city=t?.city||state.homeCity;
  return {id:`report:${key}:${oldest.id}`,kind:'report',type,target,list,city,at:first,due:first+OWNER_SLA,icon:'report',tone:'red',removable:!!t&&(type==='item'||type==='ask'),
   title:t?reportTitle(type,t):REPORT_TYPE_TITLE[type]||'Conteúdo denunciado',sub:`${city} · ${list.length} ${list.length===1?'denúncia':'denúncias'}: ${reasons.join(', ')}`,gone:type==='item'&&t?.status==='removed'||type==='ask'&&t?.hidden};
 }).filter(x=>!x.gone);
}
// Perguntas sem resposta há 48 h por cidade: as do protótipo e as de exemplo das outras cidades.
function ownerStaleBy(){
 const old=state.asks.filter(a=>!a.hidden&&a.status==='open'&&!a.answers.length&&Date.now()-(a.createdAt||Date.now())>2*OWNER_DAY);
 const by={...OWNER_DEMO.staleExtra};for(const a of old)by[a.city]=(by[a.city]||0)+1;
 return {by,old};
}
// Perguntas paradas: a decisão e o responsável valem por cidade (id stale:<cidade>:<perguntas>); o
// item da fila junta as cidades do escopo que ainda não foram tratadas.
function ownerStaleCityId(city,by,old){return `stale:${city}:${by[city]}:${old.filter(a=>a.city===city).map(a=>a.id).join(',')}`;}
function ownerStale(){
 const {by:all,old}=ownerStaleBy(),scope=ownerCity==='Todas'?Object.keys(all):[ownerCity];
 const open=scope.filter(c=>all[c]&&!ownerDecided(ownerStaleCityId(c,all,old)));
 const by=Object.fromEntries(open.map(c=>[c,all[c]])),n=open.reduce((s,c)=>s+by[c],0);if(!n)return [];
 const cityIds=open.map(c=>ownerStaleCityId(c,all,old));
 return [{id:`stale+${cityIds.join('+')}`,cityIds,kind:'stale',city:open.length===1?open[0]:'',cities:by,asks:old.filter(a=>by[a.city]),at:Date.now()-2*OWNER_DAY,due:Date.now()-1,icon:'forum',tone:'amber',
  title:`${n} ${n===1?'pergunta sem resposta':'perguntas sem resposta'} há 48 h`,sub:[...open].sort((a,b)=>by[b]-by[a]).map(c=>`${by[c]} em ${c}`).join(', ')}];
}
function ownerQueue(){
 const v=OWNER_DEMO.verifications.map(x=>{const at=Date.now()-x.hoursAgo*36e5;return {id:`verify:${x.id}`,kind:'verify',data:x,city:x.city,at,due:at+OWNER_SLA,icon:'verified_user',tone:'blue',title:`${x.name} pediu verificação`,sub:`Chegando a ${x.city} ${x.when}`};});
 const c=OWNER_DEMO.claims.map(x=>{const b=bizById(x.biz);if(!b)return null;const at=Date.now()-x.hoursAgo*36e5;return {id:`claim:${x.id}`,kind:'claim',data:x,biz:b,city:b.city,at,due:at+3*OWNER_DAY,icon:'storefront',tone:'green',title:`${b.name} reivindicou a página`,sub:`Indicada em ${b.recN||1} ${b.recN===1?'conversa':'conversas'}`};}).filter(Boolean);
 return [...ownerReports(),...v,...c,...ownerStale()].filter(q=>!ownerDecided(q.id)&&(ownerCity==='Todas'||q.city===ownerCity||q.cities?.[ownerCity])).sort((a,b)=>a.due-b.due);
}
const ownerCities=()=>Object.keys(OWNER_DEMO.cities);
function ownerSpark(pts,bad){const max=Math.max(...pts),min=Math.min(...pts),d=pts.map((p,i)=>`${(i/(pts.length-1)*100).toFixed(1)},${(32-(p-min)/(max-min||1)*28).toFixed(1)}`).join(' ');return `<svg viewBox="0 0 100 34" preserveAspectRatio="none" aria-hidden="true"><polyline points="${d}" fill="none" stroke="${bad?'var(--owner-bad)':'var(--md-sys-color-primary)'}" stroke-width="2" vector-effect="non-scaling-stroke"/></svg>`;}
function ownerNum(k,share){const v=k.revenue?ownerPlansTotal().revenue:k.scale?Math.round(k.value*share):k.value;return k.fmt==='%'?`${v}%`:k.fmt==='R$'?`R$ ${v.toLocaleString('pt-BR')}`:v.toLocaleString('pt-BR');}
function ownerHero(){
 const cs=OWNER_DEMO.cities,names=ownerCity==='Todas'?ownerCities():[ownerCity],arr=names.reduce((s,c)=>s+cs[c].arrived30,0),served=names.reduce((s,c)=>s+cs[c].arrived30*cs[c].served,0)/Math.max(1,arr),pct=Math.round(served*100);
 const rows=ownerCities().map(c=>`<div class="ow-city${cs[c].served<.5?' low':''}${ownerCity!=='Todas'&&c!==ownerCity?' dim':''}"><span>${esc(c)}</span><span aria-hidden="true"><i style="width:${Math.round(cs[c].served*100)}%"></i></span><b>${Math.round(cs[c].served*100)}%</b></div>`).join('');
 return `<section class="ow-card ow-hero" aria-labelledby="ow-hero-t"><h2 id="ow-hero-t">Chegadas atendidas</h2><div class="ow-big"><b>${pct}%</b><span class="ow-up">▲ 6 pts</span></div><p>das ${arr} famílias que chegaram nos últimos 30 dias${ownerCity==='Todas'?'':` a ${esc(ownerCity)}`} tiveram resposta ou contato na primeira semana. Meta: 80%.</p><div class="ow-goal" role="img" aria-label="${pct}% de 80% da meta"><i style="width:${pct}%"></i><s style="left:80%"></s></div>${rows}</section>`;
}
function ownerKpis(){
 const cs=OWNER_DEMO.cities,total=ownerCities().reduce((s,c)=>s+cs[c].fam,0),share=ownerCity==='Todas'?1:cs[ownerCity].fam/total;
 return OWNER_DEMO.kpis.map(k=>`<div class="ow-card ow-kpi ow-kpi-${k.id}"><small>${esc(k.label)}</small><div class="v"><b>${ownerNum(k,share)}</b><span class="${k.up?'ow-up':'ow-down'}">${k.delta}</span></div>${ownerSpark(k.series,!k.up)}</div>`).join('');
}
function ownerChanges(){
 const list=OWNER_DEMO.changes.filter(c=>ownerCity==='Todas'||c.city===ownerCity);
 return `<section class="ow-card ow-changes" aria-labelledby="ow-chg-t"><h2 id="ow-chg-t">O que mudou</h2>${list.length?list.map(c=>`<div class="ow-chg">${icon(c.icon).replace('<md-icon',`<md-icon class="ow-${c.tone}"`)}<span class="t"><b>${esc(c.title)}</b>${esc(c.text)}</span>${c.go.startsWith('page:')?btn('Ver','owner-go',c.go.slice(5),'text'):c.go?btn(c.go==='report'?'Ver':'Ver perguntas','owner-tab',c.go,'text'):''}</div>`).join(''):`<p class="small muted">Nada fora do normal em ${esc(ownerCity)}.</p>`}</section>`;
}
function ownerRow(q){const [due,late]=ownerDue(q.due);return `<div class="ow-q" role="listitem"><span class="ow-ic ow-${q.tone}">${icon(q.icon)}</span><span class="t"><b>${esc(q.title)}</b><small>${esc(q.sub)}</small></span><span class="ow-sla${late?' late':''}">${due}</span>${ownerBtn('Revisar','owner-review',q,q.kind==='verify'?'filled':'outlined')}</div>`;}
// Botão da fila com o item no nome acessível ("Revisar: Carla R. pediu verificação").
function ownerBtn(label,action,q,kind){return btn(label,action,q.id,kind).replace(/^<(md-[a-z-]+)/,`<$1 aria-label="${esc(label)}: ${esc(q.title)}"`);}
// Depois de uma decisão, o foco vai ao título da página (o controle de antes saiu da tela).
function ownerFocusHeading(){requestAnimationFrame(()=>{const h=$('#main .ow-h1');if(h){h.tabIndex=-1;h.focus({preventScroll:true});}});}
function ownerQueueHtml(){
 const all=ownerQueue(),count=k=>k==='all'?all.length:all.filter(q=>q.kind===k).length;if(ownerTab!=='all'&&!count(ownerTab))ownerTab='all';
 const list=all.filter(q=>ownerTab==='all'||q.kind===ownerTab);
 return `<section class="ow-card ow-queue" aria-labelledby="ow-q-t"><div class="ow-card-head"><h2 id="ow-q-t">Precisa de você</h2>${btn('Abrir filas','owner-go','filas','text')}</div>${filterChips(OWNER_KINDS.filter(([k])=>k==='all'||count(k)).map(([k,l])=>[k,`${l} · ${count(k)}`]),ownerTab,'owner-tab')}${list.length?`<div class="ow-list" role="list">${list.map(ownerRow).join('')}</div>`:`<p class="ow-done">${icon('check')}Nada esperando por você${ownerCity==='Todas'?'':` em ${esc(ownerCity)}`}.</p>`}</section>`;
}
const OWNER_PAGES=[['','Visão geral','home'],['filas','Filas','inbox'],['cidades','Cidades','apartment'],['negocios','Negócios e planos','storefront'],['equipe','Pessoas e equipe','group']];
function renderOwner(){
 const name=state.profile.name.split(' ')[0],sub=OWNER_PAGES.some(([p])=>p===(route.id||''))?route.id||'':'',open=ownerQueue().length;
 const nav=OWNER_PAGES.map(([p,l,ic])=>`<button type="button" class="ow-nav-item${p===sub?' on':''}" data-action="owner-go" data-value="${p}"${p===sub?' aria-current="page"':''}>${icon(ic)}${l}${p==='filas'&&open?`<b class="ow-badge" aria-label="${open} abertos">${open}</b>`:''}</button>`).join('');
 const body=sub==='filas'?renderOwnerQueues():sub==='cidades'?renderOwnerCities():sub==='negocios'?renderOwnerBusiness():sub==='equipe'?renderOwnerTeam():renderOwnerOverview(name);
 return `<div class="ow"><nav class="ow-nav" aria-label="Painel do Bivaque"><div class="ow-brand"><span class="ow-mark" aria-hidden="true">B</span><span>Painel do Bivaque<small>Dono · ${esc(state.profile.name)}</small></span></div>${nav}<span class="ow-sp"></span><button type="button" class="ow-nav-item" data-action="owner-exit">${icon('arrow_back')}Voltar ao app</button></nav>
 <div class="ow-main"><div class="ow-top"><button type="button" class="ow-exit" data-action="owner-exit" aria-label="Voltar ao app">${icon('arrow_back')}</button><span class="ow-top-t">Painel do Bivaque</span><span class="ow-demo">Dados de exemplo</span></div>
 <div class="ow-subnav">${filterChips(OWNER_PAGES.map(([p,l])=>[p,p==='filas'?`${l} · ${open}`:l]),sub,'owner-go')}</div>${body}</div></div>`;
}
function renderOwnerOverview(name){return `<h1 class="ow-h1">Bom dia, ${esc(name)}</h1><div class="ow-filters">${filterChips([['Todas','Todas as cidades'],...ownerCities().map(c=>[c,c])],ownerCity,'owner-city')}<span class="ow-period">Últimos 30 dias</span></div>
 <div class="ow-grid">${ownerHero()}${ownerKpis()}${ownerQueueHtml()}${ownerChanges()}</div>`;}
