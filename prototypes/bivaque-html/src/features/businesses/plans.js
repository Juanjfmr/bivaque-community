// Rodada 63: planos do negócio. A tela de planos promete e o protótipo cumpre:
// Grátis = até 5 novas conversas respondidas por mês. Destaque de momento = a página aparece no espaço
// Patrocinado por 7 dias. Plano do negócio = conversas sem limite e 4 destaques por mês (7 dias cada).
// Pagar não muda a ordem das indicações da comunidade: o patrocínio só ocupa o espaço Patrocinado.
// Modo teste: nenhuma cobrança. A aprovação comercial (R3) continua pendente com o dono do produto.
const PLAN_FREE_REPLIES=5,PLAN_BOOSTS=4,PLAN_SPOT_MS=7*864e5;
const planSub=()=>state.subscription||{tier:'free'};
const planMonth=()=>dateISO().slice(0,7);
const planDay=ts=>new Date(ts).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'});
const planRenewDay=()=>{const d=new Date();return planDay(new Date(d.getFullYear(),d.getMonth()+1,1).getTime());};
// Mês novo zera o uso (só dentro de mutate).
function planRoll(s){if(s.month!==planMonth()){s.month=planMonth();s.repliedThreadIds=[];s.boosts=0;}}
const planReplied=()=>{const s=planSub();return s.month===planMonth()?(s.repliedThreadIds||[]).length:0;};
const planBoostsLeft=()=>{const s=planSub();return Math.max(0,PLAN_BOOSTS-(s.month===planMonth()?s.boosts||0:0));};
// Destaque em andamento da página da própria pessoa; página pausada ou suspensa não aparece em Patrocinado.
const spotActive=b=>!!b&&state.myBiz?.id===b.id&&(planSub().spot?.until||0)>Date.now()&&bizOpen(b);
const isSpon=b=>!!b&&(!!b.spon||spotActive(b));

// Caixa da página: responder uma conversa nova além do limite do plano grátis é recusado.
function planReplyGate(t){
 if(!state.myBiz?.live||t.about?.type!=='biz'||t.about.id!==state.myBiz.id)return {track:false};
 const isNew=!t.msgs.some(m=>m.me);
 return {track:true,isNew,blocked:isNew&&planSub().tier==='free'&&planReplied()>=PLAN_FREE_REPLIES};
}
function planCountReply(t){const s=state.subscription;planRoll(s);if(!s.repliedThreadIds.includes(t.id))s.repliedThreadIds.push(t.id);}
function planLimitDialog(){showDialog('Limite do plano grátis',`<p class="form-note">Você já respondeu ${PLAN_FREE_REPLIES} conversas novas neste mês. As conversas que você já respondeu continuam livres. As novas voltam em ${planRenewDay()}, ou agora com um plano.</p>`,`${btn('Agora não','close-dialog','','text')}${btn('Conhecer os planos','plans','','filled','trending_up')}`,'plan-limit');}

const planConvoText=()=>planSub().tier==='free'||!planSub().tier?`${planReplied()} de ${PLAN_FREE_REPLIES} conversas novas respondidas neste mês`:'Conversas novas sem limite';
function planSpotText(){
 const s=planSub();if(spotActive(state.myBiz))return `Patrocinado até ${planDay(s.spot.until)}`;
 if(s.tier==='plan')return planBoostsLeft()?`Restam ${planBoostsLeft()} de ${PLAN_BOOSTS} destaques neste mês`:`Os ${PLAN_BOOSTS} destaques do mês já foram usados. Voltam em ${planRenewDay()}`;
 return s.tier==='moment'?'Destaque de 7 dias no espaço Patrocinado':'Sem destaque no plano grátis';
}
const planCanBoost=()=>{const s=planSub();return !spotActive(state.myBiz)&&(s.tier==='moment'||s.tier==='plan'&&planBoostsLeft()>0);};
function planStatusHtml(){
 return `<div class="stack" style="margin-top:12px"><div class="choice">${icon('forum')}<span class="txt"><b>Conversas</b><small>${esc(planConvoText())}</small></span></div><div class="choice">${icon('trending_up')}<span class="txt"><b>Destaque</b><small>${esc(planSpotText())}</small></span>${planCanBoost()?btn('Destacar por 7 dias','biz-boost','','tonal'):''}</div></div>`;
}

async function planActivate(){
 const tier=$$('md-radio[name=plan]',dialog).find(x=>x.checked)?.value||'free',b=state.myBiz,now=Date.now();
 if(!bizOpen(b)){notify('Crie ou reative a página do negócio antes de ativar um plano.','info');return;}
 let started=false;
 if(!mutate(()=>{const s=state.subscription;planRoll(s);s.tier=tier;if(tier==='moment'&&!spotActive(b)){s.spot={from:now,until:now+PLAN_SPOT_MS};started=true;}},{redraw:false}))return;
 await closeDialog(true);render();
 notify(tier==='free'?'Plano grátis selecionado':started?`Plano de teste ativado, sem pagamento. Sua página aparece em Patrocinado até ${planDay(now+PLAN_SPOT_MS)}.`:tier==='plan'?`Plano de teste ativado, sem pagamento. Restam ${planBoostsLeft()} destaques neste mês.`:'Plano de teste ativado, sem pagamento.');
}
function planBoost(){
 const b=state.myBiz,s=planSub(),now=Date.now();
 if(!bizOpen(b)){notify('Sua página precisa estar ativa para ser destacada.','info');return;}
 if(spotActive(b)){notify(`Sua página já está em Patrocinado até ${planDay(s.spot.until)}.`,'info');return;}
 if(s.tier!=='moment'&&s.tier!=='plan'){notify('Destaque faz parte dos planos pagos.','info');openPlans();return;}
 if(s.tier==='plan'&&!planBoostsLeft()){notify(`Os ${PLAN_BOOSTS} destaques deste mês já foram usados. Voltam em ${planRenewDay()}.`,'info');return;}
 if(mutate(()=>{const x=state.subscription;planRoll(x);x.spot={from:now,until:now+PLAN_SPOT_MS};if(x.tier==='plan')x.boosts=(x.boosts||0)+1;}))notify(`Sua página aparece em Patrocinado até ${planDay(now+PLAN_SPOT_MS)}.`,'trending_up');
}
// Modo teste: um contato novo chega à caixa da página, para provar o limite de conversas.
const PLAN_TEST_NAMES=['Marina L.','Caio R.','Helena P.','Otávio S.','Bianca F.','Lúcio M.','Renata V.','Davi C.'];
function simulateBizContact(){
 const b=state.myBiz;if(!b?.live){notify('Crie a página do seu negócio antes de simular um contato.','info');return;}
 const who=PLAN_TEST_NAMES[state.threads.filter(t=>t.about?.type==='biz'&&t.about.id===b.id).length%PLAN_TEST_NAMES.length],id=uid('t'),at=Date.now();
 if(mutate(()=>{state.threads.unshift({id,who,ini:initals(who),city:b.city,about:{type:'biz',id:b.id},snapshot:{title:b.name,photo:b.photos?.[0],city:b.city},msgs:[{me:false,t:'Olá! Vocês atendem no meu bairro? Queria um orçamento.',at}],unread:true,updatedAt:at});state.notices.unshift({id:uid('n'),city:b.city,unread:true,text:`Novo contato de ${who} na página ${b.name}.`,go:['conversa',id],when:'Agora'});}))notify('Contato de teste criado em Conversas','chat_bubble');
}
async function planAction(action){
 switch(action){
 case 'activate-plan':await planActivate();return true;
 case 'biz-boost':planBoost();return true;
 case 'simulate-biz-contact':simulateBizContact();return true;
 }
 return false;
}
