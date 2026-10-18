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
function reportTarget(type,id){return type==='item'?itemById(id):type==='ask'?askById(id):type==='biz'?bizById(id):null;}
function reportTitle(type,t){return type==='item'?`Anúncio “${t.title}”`:type==='ask'?`Pergunta “${t.q}”`:type==='biz'?`Página de “${t.name}”`:type==='proposal'?'Proposta de prestador':'Pedido de orçamento';}
// Denúncias agrupadas por conteúdo: as de exemplo e as feitas neste dispositivo.
function ownerReports(){
 const all=[...OWNER_DEMO.reports.map(r=>({...r,at:Date.now()-r.hoursAgo*36e5,demo:true})),...(state.reports||[])];
 const groups=new Map();
 for(const r of all){const key=`${r.type}|${r.target}`;groups.set(key,[...(groups.get(key)||[]),r]);}
 return [...groups].map(([key,list])=>{
  const [type,target]=key.split('|'),t=reportTarget(type,target),first=Math.min(...list.map(r=>r.at)),reasons=[...new Set(list.map(r=>REPORT_REASONS[r.reason]||r.reason))];
  return {id:`report:${key}`,kind:'report',type,target,list,city:t?.city||state.homeCity,at:first,due:first+OWNER_SLA,icon:'report',tone:'red',
   title:t?reportTitle(type,t):'Conteúdo denunciado',sub:`${t?.city||state.homeCity} · ${list.length} ${list.length===1?'denúncia':'denúncias'}: ${reasons.join(', ')}`,gone:type==='item'&&t?.status==='removed'||type==='ask'&&t?.hidden};
 }).filter(x=>!x.gone);
}
function ownerStale(){
 const old=state.asks.filter(a=>!a.hidden&&a.status==='open'&&!a.answers.length&&Date.now()-(a.createdAt||Date.now())>2*OWNER_DAY);
 const by={...OWNER_DEMO.staleExtra};for(const a of old)by[a.city]=(by[a.city]||0)+1;
 const cities=Object.keys(by).filter(c=>by[c]),n=cities.reduce((s,c)=>s+by[c],0);if(!n)return [];
 return [{id:'stale',kind:'stale',city:cities.length===1?cities[0]:'',cities:by,asks:old,at:Date.now()-2*OWNER_DAY,due:Date.now()-1,icon:'forum',tone:'amber',
  title:`${n} ${n===1?'pergunta sem resposta':'perguntas sem resposta'} há 48 h`,sub:cities.sort((a,b)=>by[b]-by[a]).map(c=>`${by[c]} em ${c}`).join(', ')}];
}
function ownerQueue(){
 const v=OWNER_DEMO.verifications.map(x=>{const at=Date.now()-x.hoursAgo*36e5;return {id:`verify:${x.id}`,kind:'verify',data:x,city:x.city,at,due:at+OWNER_SLA,icon:'verified_user',tone:'blue',title:`${x.name} pediu verificação`,sub:`Chegando a ${x.city} ${x.when}`};});
 const c=OWNER_DEMO.claims.map(x=>{const b=bizById(x.biz);if(!b)return null;const at=Date.now()-x.hoursAgo*36e5;return {id:`claim:${x.id}`,kind:'claim',data:x,biz:b,city:b.city,at,due:at+3*OWNER_DAY,icon:'storefront',tone:'green',title:`${b.name} reivindicou a página`,sub:`Indicada em ${b.recN||1} ${b.recN===1?'conversa':'conversas'}`};}).filter(Boolean);
 return [...ownerReports(),...v,...c,...ownerStale()].filter(q=>!ownerDecided(q.id)&&(ownerCity==='Todas'||q.city===ownerCity||q.cities?.[ownerCity])).sort((a,b)=>a.due-b.due);
}
const ownerCities=()=>Object.keys(OWNER_DEMO.cities);
function ownerSpark(pts,bad){const max=Math.max(...pts),min=Math.min(...pts),d=pts.map((p,i)=>`${(i/(pts.length-1)*100).toFixed(1)},${(32-(p-min)/(max-min||1)*28).toFixed(1)}`).join(' ');return `<svg viewBox="0 0 100 34" preserveAspectRatio="none" aria-hidden="true"><polyline points="${d}" fill="none" stroke="${bad?'var(--owner-bad)':'var(--md-sys-color-primary)'}" stroke-width="2" vector-effect="non-scaling-stroke"/></svg>`;}
function ownerNum(k,share){const v=k.scale?Math.round(k.value*share):k.value;return k.fmt==='%'?`${v}%`:k.fmt==='R$'?`R$ ${v.toLocaleString('pt-BR')}`:v.toLocaleString('pt-BR');}
function ownerHero(){
 const cs=OWNER_DEMO.cities,names=ownerCity==='Todas'?ownerCities():[ownerCity],arr=names.reduce((s,c)=>s+cs[c].arriving,0),served=names.reduce((s,c)=>s+cs[c].arriving*cs[c].served,0)/Math.max(1,arr),pct=Math.round(served*100);
 const rows=ownerCities().map(c=>`<div class="ow-city${cs[c].served<.5?' low':''}${ownerCity!=='Todas'&&c!==ownerCity?' dim':''}"><span>${esc(c)}</span><span aria-hidden="true"><i style="width:${Math.round(cs[c].served*100)}%"></i></span><b>${Math.round(cs[c].served*100)}%</b></div>`).join('');
 return `<section class="ow-card ow-hero" aria-labelledby="ow-hero-t"><h2 id="ow-hero-t">Chegadas atendidas</h2><div class="ow-big"><b>${pct}%</b><span class="ow-up">▲ 6 pts</span></div><p>das ${arr} famílias que chegaram nos últimos 30 dias${ownerCity==='Todas'?'':` a ${esc(ownerCity)}`} tiveram resposta ou contato na primeira semana. Meta: 80%.</p><div class="ow-goal" role="img" aria-label="${pct}% de 80% da meta"><i style="width:${pct}%"></i><s style="left:80%"></s></div>${rows}</section>`;
}
function ownerKpis(){
 const cs=OWNER_DEMO.cities,total=ownerCities().reduce((s,c)=>s+cs[c].fam,0),share=ownerCity==='Todas'?1:cs[ownerCity].fam/total;
 return OWNER_DEMO.kpis.map(k=>`<div class="ow-card ow-kpi ow-kpi-${k.id}"><small>${esc(k.label)}</small><div class="v"><b>${ownerNum(k,share)}</b><span class="${k.up?'ow-up':'ow-down'}">${k.delta}</span></div>${ownerSpark(k.series,!k.up)}</div>`).join('');
}
function ownerChanges(){
 const list=OWNER_DEMO.changes.filter(c=>ownerCity==='Todas'||c.city===ownerCity);
 return `<section class="ow-card ow-changes" aria-labelledby="ow-chg-t"><h2 id="ow-chg-t">O que mudou</h2>${list.length?list.map(c=>`<div class="ow-chg">${icon(c.icon).replace('<md-icon',`<md-icon class="ow-${c.tone}"`)}<span class="t"><b>${esc(c.title)}</b>${esc(c.text)}</span>${c.go?btn(c.go==='report'?'Ver':'Ver perguntas','owner-tab',c.go,'text'):''}</div>`).join(''):`<p class="small muted">Nada fora do normal em ${esc(ownerCity)}.</p>`}</section>`;
}
function ownerRow(q){const [due,late]=ownerDue(q.due);return `<div class="ow-q" role="listitem"><span class="ow-ic ow-${q.tone}">${icon(q.icon)}</span><span class="t"><b>${esc(q.title)}</b><small>${esc(q.sub)}</small></span><span class="ow-sla${late?' late':''}">${due}</span>${btn('Revisar','owner-review',q.id,q.kind==='verify'?'filled':'outlined')}</div>`;}
function ownerQueueHtml(){
 const all=ownerQueue(),count=k=>k==='all'?all.length:all.filter(q=>q.kind===k).length,list=all.filter(q=>ownerTab==='all'||q.kind===ownerTab);
 return `<section class="ow-card ow-queue" aria-labelledby="ow-q-t"><h2 id="ow-q-t">Precisa de você</h2>${filterChips(OWNER_KINDS.filter(([k])=>k==='all'||count(k)).map(([k,l])=>[k,`${l} · ${count(k)}`]),ownerTab,'owner-tab')}${list.length?`<div class="ow-list" role="list">${list.map(ownerRow).join('')}</div>`:`<p class="ow-done">${icon('check')}Nada esperando por você${ownerCity==='Todas'?'':` em ${esc(ownerCity)}`}.</p>`}</section>`;
}
function renderOwner(){
 const name=state.profile.name.split(' ')[0];
 return `<div class="ow"><nav class="ow-nav" aria-label="Painel do Bivaque"><div class="ow-brand"><span class="ow-mark" aria-hidden="true">B</span><span>Painel do Bivaque<small>Dono · ${esc(state.profile.name)}</small></span></div><button type="button" class="ow-nav-item on" aria-current="page">${icon('home')}Visão geral</button><span class="ow-sp"></span><button type="button" class="ow-nav-item" data-action="owner-exit">${icon('arrow_back')}Voltar ao app</button></nav>
 <div class="ow-main"><div class="ow-top"><button type="button" class="ow-exit" data-action="owner-exit" aria-label="Voltar ao app">${icon('arrow_back')}</button><span class="ow-top-t">Painel do Bivaque</span><span class="ow-demo">Dados de exemplo</span></div>
 <h1 class="ow-h1">Bom dia, ${esc(name)}</h1><div class="ow-filters">${filterChips([['Todas','Todas as cidades'],...ownerCities().map(c=>[c,c])],ownerCity,'owner-city')}<span class="ow-period">Últimos 30 dias</span></div>
 <div class="ow-grid">${ownerHero()}${ownerKpis()}${ownerQueueHtml()}${ownerChanges()}</div></div></div>`;
}
