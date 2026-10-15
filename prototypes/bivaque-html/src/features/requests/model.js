// Pedido aberto e propostas (Rodada 11, ADR-20261015-pedido-aberto-e-propostas, aprovado
// para o protótipo). A pessoa descreve a necessidade; empresas do ramo na cidade enviam até
// 5 propostas; a pessoa escolhe uma. O Bivaque mostra valores, mas não intermedeia pagamento.
const REQUEST_LIMIT=5,REQUEST_OPEN_MAX=3,REQUEST_DAYS=7,REQUEST_PHOTOS=4;
function requestList(){return state.requests||[];}
function requestById(id){return requestList().find(r=>r.id===id);}
function requestExpired(r){return r.status==='open'&&Date.now()>r.expiresAt;}
function requestStatus(r){if(requestExpired(r))return 'expired';if(r.status!=='open')return r.status;return r.proposals.some(p=>p.status==='sent')?'proposals':'open';}
function requestStatusLabel(r){return {open:'Aguardando propostas',proposals:'Com propostas',chosen:'Proposta escolhida',cancelled:'Cancelado',expired:'Expirado'}[requestStatus(r)];}
function requestActive(r){return r.status==='open'&&!requestExpired(r);}
function requestLiveProposals(r){return r.proposals.filter(p=>p.status!=='withdrawn');}
function requestFull(r){return requestLiveProposals(r).length>=REQUEST_LIMIT;}
// Elegíveis: mesma cidade e categoria, página assumida, que atendem o bairro; nunca a própria página.
function requestEligible(r){return state.biz.filter(b=>b.city===r.city&&b.cat===r.cat&&b.claimed!==false&&(!b.hoods?.length||b.hoods.includes(r.hood)||r.hood==='Outro bairro')&&b.id!==state.myBiz?.id);}
function requestWhenLabel(r){return r.when.kind==='asap'?'O quanto antes':r.when.kind==='until'?`Até ${dateLabel(r.when.date)}`:`Em ${dateLabel(r.when.date)}`;}
function proposalPrice(p){return p.price.kind==='fixed'?money(p.price.min):p.price.kind==='range'?`${money(p.price.min)} a ${money(p.price.max)}`:'A combinar após visita';}
function myProposal(r){return state.myBiz?r.proposals.find(p=>p.bizId===state.myBiz.id&&p.status!=='withdrawn'):null;}
// Lado do prestador: pedidos de outras pessoas no ramo da minha página.
// Revisão da Rodada 11: o prestador vê o pedido aberto se for elegível (cidade, ramo e bairro)
// ou se já enviou proposta; depois do fechamento, fotos e nome só para quem foi escolhido.
function providerHoodOk(r){const b=state.myBiz;return !b?.hoods?.length||b.hoods.includes(r.hood)||r.hood==='Outro bairro';}
function providerCanSee(r){const b=state.myBiz;if(!b?.live||!r||r.mine||r.city!==b.city||r.cat!==b.cat)return false;return (requestActive(r)&&providerHoodOk(r))||r.proposals.some(p=>p.bizId===b.id);}
function providerSeesDetails(r){return providerCanSee(r)&&(requestActive(r)||r.chosen&&r.proposals.find(p=>p.id===r.chosen)?.bizId===state.myBiz.id);}
function providerRequests(){return requestList().filter(providerCanSee);}
// Exemplos fictícios para quem testa o lado do prestador (só se ainda não houver nenhum).
function seedProviderRequests(){const b=state.myBiz;if(!b?.live||requestList().some(r=>!r.mine&&r.cat===b.cat&&r.city===b.city))return;const hood=b.hoods?.[0]||'Centro';const at=Date.now();mutate(()=>{state.requests=[...requestList(),...[['Família Andrade',`Preciso de ${b.cat.toLowerCase()} para um apartamento de 2 quartos. Prefiro atendimento no fim da tarde.`,'asap'],['Carla M.',`Procuro orçamento de ${b.cat.toLowerCase()} para esta semana. Posso enviar mais detalhes pela conversa.`,'until']].map(([who,desc,kind],i)=>({id:uid('r'),city:b.city,cat:b.cat,hood,desc,when:{kind,date:dateISO(5)},photos:[],status:'open',createdAt:at-i*36e5,expiresAt:at+REQUEST_DAYS*864e5,proposals:[],who,mine:false}))];},{redraw:false});}
// Controles do protótipo: empresas de exemplo respondem aos pedidos abertos da pessoa.
function simulateProposals(){const mine=requestList().filter(r=>r.mine&&requestActive(r)&&!requestFull(r));if(!mine.length){notify('Nenhum pedido aberto aguardando propostas.','info');return;}let added=0;const notes=[];const ok=mutate(()=>{for(const r of mine){let n=0;for(const b of requestEligible(r)){if(requestFull(r))break;if(r.proposals.some(p=>p.bizId===b.id))continue;const seed=[...b.id].reduce((a,c)=>a+c.charCodeAt(0),0),kind=['fixed','range','visit'][seed%3],base=150+(seed%9)*50;r.proposals.push({id:uid('p'),bizId:b.id,price:{kind,min:base,max:kind==='range'?base+150:null},date:dateISO(2+seed%5),duration:['1 dia','2 a 3 dias','Meio período'][seed%3],validUntil:dateISO(7),msg:`Atendemos ${r.hood}. ${kind==='visit'?'Preciso ver o local para fechar o valor.':'Valor inclui material básico.'}`,status:'sent',at:Date.now()});n++;added++;}if(n)notes.push({id:uid('n'),city:r.city,unread:true,text:`${n} nova${n>1?'s':''} proposta${n>1?'s':''} para seu pedido de ${r.cat}`,go:['pedido',r.id],when:'Agora'});}state.notices=[...notes,...state.notices];},{redraw:false});if(!ok)return;if(!added){notify('Não há empresas de exemplo desse ramo para responder.','info');return;}render();notify(`${added} proposta${added>1?'s':''} recebida${added>1?'s':''}`,'request_quote');}
// P4: a empresa recusada é avisada. No protótipo, só a página do próprio usuário tem caixa de avisos.
function requestDeclinedNotice(r){const mine=state.myBiz&&r.proposals.find(p=>p.bizId===state.myBiz.id&&p.status==='declined');if(mine)state.notices=[{id:uid('n'),city:r.city,unread:true,text:`Sua proposta para ${r.cat} em ${r.hood} não foi escolhida.`,go:['pedidos'],when:'Agora'},...state.notices];}
