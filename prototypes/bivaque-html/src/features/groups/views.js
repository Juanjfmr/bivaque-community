function cycleOf(d){const x=new Date((d||dateISO())+'T12:00:00');return x.getMonth()>=10?x.getFullYear()+1:x.getFullYear();}
function turmaName(city,cyc){return `Chegadas ${cyc} em ${city}`;}
function turmaId(city,cyc){return `turma-${norm(city).replace(/[^a-z0-9]+/g,'-')}-${cyc}`;}
function gDefaults(g){return {city:'Manaus',privacy:'aberto',members:0,on:false,pending:false,role:null,notif:'destaques',requests:[],mods:[],allowOffers:false,pinned:'',unread:0,interests:[],posts:[],auto:false,...g,rules:g.rules||GTPL[g.tpl||'livre'].rules};}
function newTurma(city,cyc,members){return gDefaults({id:turmaId(city,cyc),city,t:turmaName(city,cyc),tpl:'turma',auto:true,cycle:cyc,members:members??(SOURCE.cities?.[city]?.fam||12),img:'arrival',about:`Quem chega a ${city} entre novembro de ${cyc-1} e outubro de ${cyc}. Mudança, escola, moradia e o primeiro encontro.`});}
function gPost(author,type,text,o={}){const at=Date.now()-(o.ago||2)*36e5;return {id:uid('p'),type,author,ini:initals(author),text,at,comments:(o.comments||[]).map((c,i)=>({id:uid('c'),author:c[0],ini:initals(c[0]),text:c[1],biz:c[2]||null,solved:!!c[3],at:at+(i+1)*18e5})),useful:o.useful||0,liked:false,mine:false,...(o.extra||{})};}
function buildGroups(stage){
 const cyc=cycleOf(dateISO(23)),seed=stage==='seed';
 const turma=newTurma('Manaus',cyc,seed?6:38);
 turma.img='friends';
 if(!seed)turma.posts=[
  gPost('Paulo R.','event','Café de boas-vindas para a turma que chega a partir de novembro. Tragam as crianças!',{ago:5,extra:{event:{date:dateISO(6),time:'09:00',place:'Padaria Trigo Bom, Adrianópolis',going:12,on:false}}}),
  gPost('Carla R.','question','Alguém já matriculou filho no 3º ano perto do Parque 10? Como foi a vaga?',{ago:20,comments:[['Marcos T.','Consegui vaga em setembro numa escola particular no Planalto. Vale ligar cedo.']]}),
  gPost('Jéssica L.','post','Dica de quem chegou antes: a vistoria do Detran foi agendada pelo app e saiu em 3 dias.',{ago:30,useful:6})];
 if(seed)return [turma,
  gDefaults({id:'g-familias',t:'Famílias com crianças pequenas',tpl:'familia',members:4,on:true,interests:['filhos'],img:'mesa',about:'Pediatras, escolas, festas e trocas de roupa infantil.'}),
  gDefaults({id:'g-pedal',t:'Pedal e corrida na orla',tpl:'esporte',members:3,interests:['corrida','ciclismo'],img:'sunset',about:'Treinos em grupo aos fins de semana.'})];
 return [turma,
  gDefaults({id:'g-familias',t:'Famílias com crianças pequenas',tpl:'familia',members:540,on:true,unread:2,interests:['filhos'],img:'mesa',allowOffers:true,pinned:'Fotos de crianças só com autorização dos pais. Ofertas de negócio de membro: uma por semana.',about:'Pediatras, escolas, festas e trocas de roupa infantil.',posts:[
   gPost('Ana P.','poll','Qual sábado para a festa coletiva de fim de ano?',{ago:3,extra:{poll:{options:[['6 de dezembro',8],['13 de dezembro',14],['20 de dezembro',5]],voted:null}}}),
   gPost('Luana M.','question','Pediatra que atenda sábado de manhã pelo plano?',{ago:9,comments:[['Mônica L.','A Dra. Helena atende sábado no Parque 10, pelo plano.'],['Ana P.','Para dentista infantil, a Sorriso Kids também atende sábado.','b9']]}),
   gPost('Cláudia M.','offer','Kit festa com 10% para a comunidade neste mês. Encomendas com 3 dias de antecedência.',{ago:26,extra:{biz:'b4'}})]}),
  gDefaults({id:'g-pedal',t:'Pedal e corrida na orla',tpl:'esporte',members:96,on:true,interests:['corrida','ciclismo'],img:'sunset',about:'Treinos em grupo aos fins de semana, com saída do calçadão da Ponta Negra.',posts:[
   gPost('Diego F.','event','Treino de 8 km no calçadão. Ritmo leve, ninguém fica para trás.',{ago:7,extra:{event:{date:dateISO(4),time:'06:00',place:'Calçadão da Ponta Negra',going:9,on:false}}})]}),
  gDefaults({id:'g-futebol',t:'Futebol de sábado',tpl:'esporte',privacy:'fechado',members:48,on:true,role:'admin',unread:1,interests:['futebol'],mods:['Renato A.'],about:'Pelada de sábado de manhã. Lista de confirmados na sexta.',requests:[{name:'Bruno C.',note:'Chegou em outubro, joga de zagueiro.'},{name:'Thiago S.',note:'Mora no Dom Pedro.'}],posts:[
   gPost('Renato A.','event','Pelada de sábado. Confirme até sexta para fecharmos os times.',{ago:10,extra:{event:{date:dateISO(5),time:'07:00',place:'Quadra do Parque 10',going:16,on:false}}})]}),
  gDefaults({id:'g-pets',t:'Pets de Manaus',tpl:'pets',members:210,interests:['pets'],img:'pets',about:'Veterinários, adoção responsável e achados e perdidos.',posts:[
   gPost('Bruna S.','question','Veterinário 24 horas na Zona Oeste?',{ago:40,extra:{resolved:true},comments:[['Luana M.','A Clínica Vet 24h Turismo atendeu meu gato às 23h.','b8',true]]})]}),
  gDefaults({id:'g-cmm',t:'Pais do Colégio Militar de Manaus',tpl:'escola',privacy:'fechado',members:180,interests:['filhos'],img:'classroom',about:'Avisos das turmas, caronas e trocas de uniforme.'}),
  gDefaults({id:'g-concursos',t:'Concurseiros EsPCEx, EEAR e CN',tpl:'livre',members:120,interests:['concursos'],about:'Material, simulados e grupos de estudo para os concursos militares.'}),
  gDefaults({id:'g-vizinhos',t:'Moradores do Residencial Parque das Laranjeiras',tpl:'vizinhanca',privacy:'fechado',members:64,img:'community',about:'Avisos do condomínio e ajuda entre vizinhos.'}),
  gDefaults({id:'g-culinaria',t:'Culinária e marmitas',tpl:'livre',members:75,interests:['culinaria'],img:'cake',about:'Receitas, encomendas entre vizinhos e dicas de feira.'}),
  gDefaults({id:'g-fe',t:'Fé e família',tpl:'familia',members:58,interests:['fe'],about:'Encontros, missas e cultos com horário para famílias.'})];
}
function ensureTurma(){
 if(!state||!state.groups)return;let changed=false;const want=[];
 if(state.mode==='chegando')want.push([state.homeCity,cycleOf(state.arrival)]);
 if(state.mode==='saindo'&&state.dest&&state.dest!==state.homeCity)want.push([state.dest,cycleOf(state.leaveDate)]);
 for(const [city,cyc] of want){const id=turmaId(city,cyc);let g=state.groups.find(x=>x.id===id);if(!g){g=newTurma(city,cyc);state.groups.push(g);changed=true;}if(!g.on&&!(state.leftAuto||[]).includes(id)){g.on=true;g.joinedAt=Date.now();changed=true;}}
 if(changed)try{localStorage.setItem(KEY,JSON.stringify(state));}catch{}
}
function gById(id){return state.groups.find(x=>x.id===id);}
function gMembers(g){const n=g.members+(g.on?1:0);return n>=10?`${n} membros`:'Grupo novo';}
function gAgo(at){const m=Math.max(1,Math.round((Date.now()-at)/6e4));if(m<60)return `há ${m} min`;const h=Math.round(m/60);if(h<24)return `há ${h} h`;const d=Math.round(h/24);return d===1?'ontem':`há ${d} dias`;}
function gThumb(g,cls='list-photo'){const p=image(g.img);return p?`<img class="${cls}" src="${p}" alt="">`:`<span class="${cls} g-tile g-${g.tpl}">${icon(GTPL[g.tpl]?.ic||'groups')}</span>`;}
function gLast(g){const p=[...g.posts].sort((a,b)=>b.at-a.at)[0];return p?`${p.mine?'Você':p.author.split(' ')[0]}: ${p.text}`:g.about;}
function gReason(g){
 if(g.auto&&state.mode==='chegando'&&g.city===state.homeCity&&g.cycle===cycleOf(state.arrival))return `Pela sua chegada em ${g.cycle}`;
 if(g.auto&&state.mode==='moro'&&g.city===state.homeCity)return `Chegam em ${g.cycle}. Uma indicação sua ajuda`;
 const hit=(state.profile.interests||[]).find(i=>g.interests.includes(i));if(hit)return `Você marcou ${INTERESTS.find(x=>x[0]===hit)[1]}`;
 return '';
}
function groupRow(g,opt){
 opt=opt&&typeof opt==='object'?opt:{};const pills=[g.privacy==='fechado'?pill('Fechado','','lock'):'',g.role==='admin'?pill('Admin','ok'):'',g.pending?pill('Aguardando aprovação'):'',g.auto?pill('Automático','','flight_land'):''].join('');
 const sub=opt.reason?`${icon('auto_awesome')}${esc(opt.reason)}`:esc(g.on?gLast(g):`${gMembers(g)} · ${g.privacy==='fechado'?'fechado':'aberto'}`);
 const cta=opt.cta&&!g.on&&!g.pending&&!readonly()?btn(g.privacy==='fechado'?'Pedir':'Entrar','join-group',g.id,'tonal'):'';
 return `<div class="list-row g-row">${`<button type="button" class="g-open" data-action="open-group" data-value="${g.id}" aria-label="Abrir ${esc(g.t)}">${gThumb(g)}</button>`}<button type="button" class="txt" data-action="open-group" data-value="${g.id}"><b>${esc(g.t)}${g.city!==state.city?` · ${esc(g.city)}`:''}</b><small class="g-sub">${sub}</small>${pills?`<span class="g-pills">${pills}</span>`:''}</button>${g.on&&g.unread?`<span class="g-badge" aria-label="${g.unread} novas">${g.unread}</span>`:''}${cta||(opt.cta?'':icon('chevron_right'))}</div>`;
}
function renderGroupsTab(){return `<div class="group-tools">${field('group-search','Buscar grupos',groupQuery,'type="search"')}</div><div id="groups-body">${groupsBody()}</div>`;}
function groupsBody(){
 const all=state.groups.filter(g=>g.city===state.city||(g.on&&g.auto)),q=norm(groupQuery.trim());
 let h='';
 if(q){const rs=all.filter(g=>norm(g.t+' '+g.about+' '+(GTPL[g.tpl]?.name||'')).includes(q));return `<div id="group-results">${rs.length?pagedHtml('group-search',`${state.city}|${q}`,rs,g=>groupRow(g,{cta:true}),{noun:'grupos',wrap:'list'}):empty('Nenhum grupo com esse nome','Crie o grupo e convide quem tem o mesmo interesse.','groups',readonly()?'':'create-group',readonly()?'':'Criar grupo')}</div>`;}
 const mine=all.filter(g=>g.on||g.pending).sort((a,b)=>(b.auto?1:0)-(a.auto?1:0)||(b.unread||0)-(a.unread||0));
 const rest=all.filter(g=>!g.on&&!g.pending&&g.city===state.city);
 const sug=rest.map(g=>({g,r:gReason(g)})).filter(x=>x.r).slice(0,4);
 const pop=rest.filter(g=>!sug.some(x=>x.g===g)).sort((a,b)=>b.members-a.members).slice(0,5);
 h+=`<section class="section">${sectionTitle('Seus grupos')}${mine.length?`<div class="list">${mine.map(g=>groupRow(g)).join('')}</div>`:empty('Você ainda não está em grupos','Entre em um grupo sugerido ou crie o seu.','groups')}</section>`;
 if(!(state.profile.interests||[]).length&&!readonly())h+=`<div class="context-strip readonly">${icon('interests')}<span class="grow"><b>Do que você quer participar?</b><br>Marque até 3 interesses para receber sugestões.</span>${btn('Escolher','edit-interests','','text')}</div>`;
 if(sug.length)h+=`<section class="section">${sectionTitle('Sugeridos para você',(state.profile.interests||[]).length?'Interesses':'','edit-interests')}<div class="list">${sug.map(x=>groupRow(x.g,{reason:x.r,cta:true})).join('')}</div></section>`;
 if(pop.length)h+=`<section class="section">${sectionTitle(`Populares em ${state.city}`)}<div class="list">${pop.map(g=>groupRow(g,{cta:true})).join('')}</div></section>`;
 return h;
}
function gPostCard(g,p,full=false){
 const type={question:['Pergunta','help'],event:['Evento','event'],poll:['Enquete','ballot'],offer:['Oferta','sell']}[p.type];
 let h=`<article class="gpost ${p.resolved?'resolved':''}"><div class="gpost-head"><span class="avatar ${p.mine?'me':''}">${esc(p.mine?initals(state.profile.name):p.ini)}</span><div class="grow"><b class="small">${esc(p.mine?state.profile.name:p.author)}</b><p class="tiny muted">${gAgo(p.at)}</p></div>${type?pill(type[0],p.type==='offer'?'ad':'',type[1]):''}${p.resolved?pill('Resolvida','ok','check_circle'):''}</div>`;
 h+=`<p class="detail-copy gpost-text">${esc(p.text)}</p>`;
 if(p.event){const d=new Date(p.event.date+'T12:00:00');h+=`<div class="gpost-event"><span class="event-date"><small>${d.toLocaleDateString('pt-BR',{month:'short'}).replace('.','').toUpperCase()}</small><b>${d.getDate()}</b></span><span class="grow"><b class="small">${esc(p.event.place)}</b><br><span class="tiny muted">${esc(p.event.time)} · ${p.event.going+(p.event.on?1:0)} confirmados</span></span>${btn(p.event.on?'Confirmado':'Vou','attend-post',`${g.id}|${p.id}`,p.event.on?'tonal':'outlined',p.event.on?'check':'')}</div>`;}
 if(p.poll){const tot=p.poll.options.reduce((s,o)=>s+o[1],0)+(p.poll.voted!=null?1:0);h+=`<div class="poll">${p.poll.options.map((o,i)=>{const v=o[1]+(p.poll.voted===i?1:0),pc=tot?Math.round(v/tot*100):0;return `<button type="button" class="poll-opt ${p.poll.voted===i?'on':''}" data-action="vote-poll" data-value="${g.id}|${p.id}|${i}" ${p.poll.voted!=null?'aria-disabled="true"':''}><span class="poll-bar" style="width:${p.poll.voted!=null?pc:0}%"></span><span class="poll-t">${p.poll.voted===i?icon('check_circle'):''}${esc(o[0])}</span>${p.poll.voted!=null?`<span class="poll-pc">${pc}%</span>`:''}</button>`;}).join('')}<p class="tiny muted">${p.poll.voted!=null?`${tot} votos`:'Toque para votar'}</p></div>`;}
 if(p.type==='offer'&&p.biz&&bizById(p.biz))h+=`<button type="button" class="answer-origin" data-action="open-biz" data-value="${p.biz}">${icon('storefront')}<span class="grow">${esc(bizById(p.biz).name)}</span>${icon('chevron_right')}</button>`;
 if(p.alsoCity)h+=`<button type="button" class="tiny-link" data-action="open-question" data-value="${p.alsoCity}">${icon('travel_explore')}Também perguntada à cidade · ver em Indicações</button>`;
 if(!full)h+=`<div class="gpost-actions">${btn(`Útil${p.useful+(p.liked?1:0)?' · '+(p.useful+(p.liked?1:0)):''}`,'like-post',`${g.id}|${p.id}`,p.liked?'tonal':'text','thumb_up')}${btn(p.comments.length?`${p.comments.length} ${p.comments.length===1?'comentário':'comentários'}`:'Comentar','open-post',`${g.id}~${p.id}`,'text','chat_bubble')}</div>`;
 return h+'</article>';
}
function renderGroup(){
 const g=gById(route.id);if(!g||(g.city!==state.city&&!g.on))return unavailable();
 const member=g.on,admin=g.role==='admin',canSee=g.privacy==='aberto'||member;
 if(!member&&!readonly())actionsBar(g.pending?btn('Cancelar pedido','cancel-join',g.id,'outlined','close'):btn(g.privacy==='fechado'?'Pedir para entrar':'Entrar no grupo','join-group',g.id,'filled','group_add'));
 const p=image(g.img);
 let h=`<div class="detail-hero g-hero" style="aspect-ratio:16/7">${p?`<img src="${p}" alt="">`:`<div class="g-tile g-${g.tpl} g-tile-hero">${icon(GTPL[g.tpl]?.ic||'groups')}</div>`}<span class="pill">${esc(GTPL[g.tpl]?.name||'Grupo')}</span></div><div class="detail-title"><h1>${esc(g.t)}</h1><p class="muted small g-meta">${icon(g.privacy==='fechado'?'lock':'public')}${g.privacy==='fechado'?'Fechado':'Aberto'} · ${gMembers(g)} · ${esc(g.city)}</p></div><p class="detail-copy">${esc(g.about)}</p>`;
 if(member)h+=`<div class="g-actions">${btn(`Participando · ${NOTIF[g.notif||'destaques'][1]}`,'group-menu',g.id,'tonal','expand_more')}${btn('Convidar','invite-group',g.id,'outlined','share')}${admin?btn('Gerenciar','manage-group',g.id,'outlined','admin_panel_settings'):''}</div>`;
 h+=`<details class="g-rules"><summary>${icon('gavel')}Regras do grupo</summary><p class="small">${esc(g.rules)}</p></details>`;
 if(!canSee)return h+`<div class="context-strip readonly">${icon('lock')}<span class="grow"><b>Grupo fechado</b><br>As publicações aparecem para quem for aprovado pelo admin.</span></div>`;
 if(g.pinned)h+=`<div class="context-strip g-pinned">${icon('push_pin')}<span class="grow"><b>Aviso fixado</b><br>${esc(g.pinned)}</span></div>`;
 const ev=g.posts.filter(x=>x.type==='event'&&x.event.date>=dateISO()).sort((a,b)=>a.event.date.localeCompare(b.event.date))[0];
 if(ev&&groupFilter==='all')h+=`<section class="section">${sectionTitle('Próximo encontro')}${gPostCard(g,ev)}</section>`;
 if(member&&!readonly())h+=`<button type="button" class="g-compose" data-action="new-post" data-value="${g.id}"><span class="avatar me">${esc(initals(state.profile.name))}</span><span class="grow">Escreva para o grupo…</span>${icon('photo_camera')}</button>`;
 h+=filterChips([['all','Tudo'],['question','Perguntas'],['event','Eventos']],groupFilter,'group-filter');
 const posts=g.posts.filter(x=>groupFilter==='all'?x!==ev:x.type===groupFilter).sort((a,b)=>b.at-a.at);
 h+=posts.length?pagedHtml(`feed-${g.id}`,groupFilter,posts,x=>gPostCard(g,x),{noun:'publicações',art:'as',wrap:'stack',size:10}):empty(member?'Comece uma conversa útil':'Ainda sem publicações',member?'Publique um aviso, uma pergunta, um evento ou uma enquete.':'Entre no grupo para participar.','forum',member&&!readonly()?'new-post-empty':'',member&&!readonly()?'Escrever':'');
 return h;
}
function renderPost(){
 const [gid,pid]=(route.id||'').split('~'),g=gById(gid),p=g?.posts.find(x=>x.id===pid);if(!g||!p||(g.privacy==='fechado'&&!g.on))return unavailable();
  let h=`<button type="button" class="g-back" data-action="open-group" data-value="${g.id}">${gThumb(g,'g-mini')}<span class="grow"><b class="small">${esc(g.t)}</b><br><span class="tiny muted">${gMembers(g)}</span></span>${icon('chevron_right')}</button>${gPostCard(g,p,true)}<div class="gpost-actions">${btn(`Útil${p.useful+(p.liked?1:0)?' · '+(p.useful+(p.liked?1:0)):''}`,'like-post',`${g.id}|${p.id}`,p.liked?'tonal':'text','thumb_up')}</div>`;
 h+=`<section class="section">${sectionTitle(p.comments.length?`${p.comments.length} ${p.comments.length===1?'comentário':'comentários'}`:'Comentários')}<div class="stack">${p.comments.map(c=>`<article class="answer ${c.solved?'accepted':''}"><div class="row"><span class="avatar ${c.mine?'me':''}">${esc(c.mine?initals(state.profile.name):c.ini)}</span><div class="grow"><b class="small">${esc(c.mine?state.profile.name:c.author)}</b><p class="tiny muted">${gAgo(c.at)}</p></div>${c.solved?pill('Resolveu','ok','check_circle'):''}</div><p class="detail-copy">${esc(c.text)}</p>${c.biz&&bizById(c.biz)?`<button type="button" class="answer-origin" data-action="open-biz" data-value="${c.biz}">${icon('storefront')}<span class="grow">${esc(bizById(c.biz).name)}</span>${icon('chevron_right')}</button>`:''}${p.type==='question'&&p.mine&&!p.resolved&&!c.mine?`<div class="answer-actions">${btn('Resolveu','solve-comment',`${g.id}|${p.id}|${c.id}`,'tonal','check_circle')}</div>`:''}</article>`).join('')||'<p class="small muted">Seja o primeiro a comentar.</p>'}</div></section>`;
 if(g.on&&!readonly())h+=`<section class="question-compose"><h3>${p.type==='question'?'Responder':'Comentar'}</h3>${field('comment-input',p.type==='question'?'Sua resposta':'Seu comentário','','type="textarea" rows="3" maxlength="2000"')}${p.type==='question'?`${selectField('comment-biz','Marcar um negócio (opcional)',[['','Nenhum'],...cityBiz().map(b=>[b.id,b.name])],'')}<p class="form-note">O negócio marcado ganha uma indicação. O texto fica só no grupo.</p>`:''}<div class="row" style="justify-content:flex-end">${btn(p.type==='question'?'Responder':'Comentar','send-comment',`${g.id}|${p.id}`,'filled','send')}</div></section>`;
 else if(!g.on)h+=`<div class="context-strip readonly">${icon('group_add')}<span class="grow">Entre no grupo para comentar.</span>${readonly()?'':btn(g.privacy==='fechado'?'Pedir':'Entrar','join-group',g.id,'text')}</div>`;
 return h;
}
