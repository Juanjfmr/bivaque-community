async function requestAction(action,value){
 switch(action){
 case 'create-request':openRequestEditor();return true;
 case 'requests':if(dialog.open)await closeDialog(true);seedProviderRequests();navigate('pedidos');return true;
 case 'open-request':if(dialog.open)await closeDialog(true);navigate('pedido',value);return true;
 case 'simulate-proposals':simulateProposals();return true;
 case 'submit-request':{
  if(!editor||editor.kind!=='request'||!canPost())return true;
  if(requestList().filter(r=>r.mine&&requestActive(r)).length>=REQUEST_OPEN_MAX){notify(`Você já tem ${REQUEST_OPEN_MAX} pedidos abertos. Encerre ou cancele um antes.`,'info');return true;}
  const cat=$('#request-cat').value,hood=$('#request-hood').value,desc=$('#request-desc').value.trim(),kind=$('#request-when').value,date=$('#request-date').value;
  const problem=!CAT_NAMES.includes(cat)||cat==='Todos'?'Escolha o tipo de serviço.':!HOODS.includes(hood)?'Escolha o bairro.':desc.length<20?'Descreva o serviço com pelo menos 20 caracteres.':desc.length>1000?'A descrição pode ter até 1000 caracteres.':kind!=='asap'&&!date?'Informe a data.':kind!=='asap'&&date<dateISO()?'A data precisa ser hoje ou depois.':'';
  if(problem){notify(problem,'error');return true;}
  const id=uid('r'),at=Date.now();
  if(mutate(()=>{state.requests=[{id,city:state.homeCity,cat,hood,desc,when:{kind,date:kind==='asap'?null:date},photos:editor.photos.slice(0,REQUEST_PHOTOS),status:'open',createdAt:at,expiresAt:at+REQUEST_DAYS*864e5,proposals:[],who:state.profile.name,mine:true},...requestList()];},{redraw:false})){await closeDialog(true);navigate('pedido',id);notify('Pedido enviado às empresas do ramo','send');}
  return true;
 }
 case 'choose-proposal':{
  const [rid,pid]=value.split('|'),r=requestById(rid),p=r?.proposals.find(x=>x.id===pid);if(!r?.mine||!canPost())return true;if(!requestActive(r)||p?.status!=='sent'){notify('Esta proposta não está mais disponível.','info');render();return true;}
  const b=bizById(p.bizId);
  confirm('Escolher esta proposta?',`${b?.name||'A empresa'} · ${proposalPrice(p)}. As outras propostas serão recusadas e a conversa com a empresa será aberta. ${REQUEST_NOTE}`,async()=>{if(!requestActive(r)||p.status!=='sent'){notify('Esta proposta não está mais disponível.','info');render();return;}let t=null;
   if(mutate(()=>{r.status='chosen';r.chosen=pid;for(const x of r.proposals)if(x.status==='sent')x.status=x.id===pid?'chosen':'declined';requestDeclinedNotice(r);if(b){t=ensureThread('biz',b.id,`Olá! Escolhi sua proposta para ${r.cat} em ${r.hood}. Podemos combinar os detalhes?`);r.threadId=t?.id||null;}},{redraw:false})){if(t){messagingDrafts.delete(t.id);navigate('conversa',t.id);}else render();notify('Proposta escolhida. Combine os detalhes na conversa.','check_circle');}});
  return true;
 }
 case 'cancel-request':{
  const r=requestById(value);if(!r?.mine)return true;if(!requestActive(r)){notify('Este pedido já foi encerrado.','info');render();return true;}
  confirm('Cancelar pedido?','As empresas deixam de ver o pedido e as propostas recebidas são encerradas.',()=>{if(!requestActive(r)){render();return;}if(mutate(()=>{r.status='cancelled';for(const x of r.proposals)if(x.status==='sent')x.status='declined';requestDeclinedNotice(r);}))notify('Pedido cancelado','close');});
  return true;
 }
 case 'propose':{const r=requestById(value);if(!r||!providerCanSee(r)||!requestActive(r)){notify('Este pedido não recebe mais propostas.','info');render();return true;}openProposalEditor(value);return true;}
 case 'submit-proposal':{
  const r=requestById(value);if(!r||!editor||editor.kind!=='proposal')return true;if(!providerCanSee(r)||!requestActive(r)){notify('Este pedido não recebe mais propostas.','info');await closeDialog(true);render();return true;}
  if(!validFields(['prop-duration','prop-msg']))return true;
  const kind=$('#prop-kind').value,v=Number($('#prop-value').value),min=Number($('#prop-min').value),max=Number($('#prop-max').value),date=$('#prop-date').value,valid=$('#prop-valid').value,duration=$('#prop-duration').value.trim(),msg=$('#prop-msg').value.trim();
  const problem=kind==='fixed'&&!(v>0)?'Informe o valor da proposta.':kind==='range'&&!(min>0&&max>min)?'Informe a faixa: o valor final precisa ser maior que o inicial.':!date||date<dateISO()?'A data disponível precisa ser hoje ou depois.':!valid||valid<dateISO()?'A validade precisa ser hoje ou depois.':duration.length<2?'Informe o prazo de execução.':duration.length>40?'O prazo pode ter até 40 caracteres.':msg.length<10?'Escreva uma mensagem com pelo menos 10 caracteres.':msg.length>400?'A mensagem pode ter até 400 caracteres.':'';
  if(problem){notify(problem,'error');return true;}
  const old=myProposal(r);if(!old&&requestFull(r)){notify(`Este pedido já recebeu ${REQUEST_LIMIT} propostas.`,'info');return true;}
  const data={price:{kind,min:kind==='fixed'?v:kind==='range'?min:null,max:kind==='range'?max:null},date,validUntil:valid,duration,msg};
  if(mutate(()=>{if(old)Object.assign(old,data);else r.proposals.push({id:uid('p'),bizId:state.myBiz.id,...data,status:'sent',at:Date.now()});},{redraw:false})){await closeDialog(true);render();notify(old?'Proposta atualizada':'Proposta enviada','send');}
  return true;
 }
 case 'withdraw-proposal':{
  const r=requestById(value),p=r&&myProposal(r);if(!p)return true;if(!requestActive(r)||p.status!=='sent'){notify('Esta proposta não pode mais ser retirada.','info');render();return true;}
  confirm('Retirar proposta?','O cliente deixa de ver sua proposta. Você pode enviar outra enquanto o pedido estiver aberto.',()=>{if(!requestActive(r)||p.status!=='sent'){render();return;}if(mutate(()=>{p.status='withdrawn';}))notify('Proposta retirada','undo');});
  return true;
 }
 }
 return false;
}
