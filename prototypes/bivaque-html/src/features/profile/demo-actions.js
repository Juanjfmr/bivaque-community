function openPlans(){showDialog('Planos para o negócio',`<p class="form-note">Compare os benefícios. Nesta versão você ativa um plano de teste; nenhum pagamento é realizado.</p>${[['free','Grátis','R$ 0','Página na cidade e até 5 novas conversas respondidas por mês.'],['moment','Destaque de momento','R$ 9,90 / semana','Um espaço separado e identificado como Patrocinado.'],['plan','Plano do negócio','R$ 39 / mês','Quatro destaques por mês e conversas sem limite.']].map(([v,t,p,d])=>`<label class="choice"><md-radio name="plan" value="${v}" ${state.subscription.tier===v?'checked':''} aria-label="${t}"></md-radio><span class="txt"><b>${t} · ${p}</b><small>${d}</small></span></label>`).join('')}<p class="form-note">Pagar não altera a ordem das indicações da comunidade.</p>`,`${btn('Cancelar','close-dialog','','text')}${btn('Ativar no modo teste','activate-plan','','filled')}`);}
function openFamily(){
 if(!state.prefs.familyOnly){showDialog('Família convidada',`<p class="form-note">Os convites locais estão desativados nas suas Configurações. Ative “Convites de família” para criar um código de demonstração.</p>`,`${btn('Fechar','close-dialog','','text')}${btn('Abrir Configurações','family-settings','','filled','settings')}`);return;}
 showDialog('Família convidada',`<p class="form-note">Use nomes fictícios. Estes códigos testam o cadastro apenas neste navegador; nenhum convite real é enviado.</p><div class="stack">${state.invites.map(x=>`<div class="choice"><span class="txt"><b>${esc(x.name)}</b><small>Código: ${esc(x.code)} · ${x.used?'utilizado':'disponível'}</small></span>${iconBtn('content_copy','copy-invite',x.code,'Copiar convite',x.used?'disabled':'')}${iconBtn('delete','remove-invite',x.code,'Revogar convite',x.used?'disabled':'')}</div>`).join('')||'<p class="small muted">Nenhum convite criado.</p>'}</div>${field('invite-name','Nome fictício do familiar','','required minlength="2" maxlength="80" autocomplete=\"off\"')}<p id="family-status" class="form-note" role="status" aria-live="polite"></p><div id="family-copy"></div>`,`${btn('Fechar','close-dialog','','text')}${btn('Criar convite','new-invite','','filled','person_add')}`);
}
function profileFeedback(text,id='family-status'){const status=$('#'+id);if(status)status.textContent=text;else notify(text,'info');}
function profileFamilyAllowed(){
 if(!state.prefs.familyOnly){openFamily();return false;}
 if(readonly()||!state.profile.verified){profileFeedback(readonly()?`Volte à sua cidade, ${state.homeCity}, para criar ou revogar convites locais.`:'Verifique o perfil de teste antes de criar ou revogar convites locais.');return false;}
 return true;
}
function noticeText(n){return n.text||String(n.html||'Aviso local').replace(/<[^>]*>/g,'');}
// Rodada 17: central de avisos (referência: Notification Inbox Popover do 21st.dev). Abas Todos e
// Não lidos, "Marcar todos como lidos", ícone por tipo e separação entre hoje e anteriores. As ações
// de abrir e marcar um aviso continuam as mesmas.
let noticesTab='all';
const NOTICE_ICONS={conversa:'chat_bubble',conversas:'chat_bubble',anuncio:'sell',catalogo:'sell',desapegos:'sell',imoveis:'apartment',negocio:'storefront',negocios:'storefront',pedido:'request_quote',pedidos:'request_quote',pergunta:'forum',comunidade:'forum',evento:'event',agenda:'event',grupo:'groups',publicacao:'groups'};
function noticeRow(n){return `<div class="list-row notice-row${n.unread?' is-unread':''}"><span class="notice-ico">${icon(NOTICE_ICONS[n.go?.[0]]||'notifications')}</span><button type="button" class="txt" data-action="notice-open" data-value="${esc(n.id)}"><b>${esc(noticeText(n))}</b><small>${esc(n.when||'Agora')} · ${n.unread?'não lido':'lido'}</small></button>${iconBtn(n.unread?'drafts':'done','notice-read',n.id,n.unread?'Marcar aviso como lido':'Aviso lido',n.unread?'':'disabled')}</div>`;}
function openNotices(){
 const ns=state.notices.filter(n=>n.city===state.homeCity),unread=ns.filter(n=>n.unread).length,list=noticesTab==='unread'?ns.filter(n=>n.unread):ns;
 const recent=n=>['Agora','Hoje'].includes(n.when||'Agora')||/^há \d+ (min|h)/.test(n.when||''),groups=[['Hoje',list.filter(recent)],['Anteriores',list.filter(n=>!recent(n))]].filter(([,g])=>g.length);
 const tabs=ns.length?`<div class="notice-head"><md-chip-set aria-label="Mostrar avisos">${[['all',`Todos (${ns.length})`],['unread',`Não lidos (${unread})`]].map(([v,label])=>`<md-filter-chip label="${label}" ${noticesTab===v?'selected':''} data-action="notices-tab" data-value="${v}"></md-filter-chip>`).join('')}</md-chip-set>${unread?btn('Marcar todos como lidos','notices-read-all','','text','check_circle'):''}</div>`:'';
 const body=!ns.length?empty('Nenhum aviso nesta cidade','Os avisos de demonstração da sua cidade atual aparecerão aqui.','notifications_none'):!list.length?empty('Tudo em dia','Você leu todos os avisos desta cidade.','check_circle'):groups.map(([title,g])=>`<p class="notice-group">${title}</p><div class="list">${g.map(noticeRow).join('')}</div>`).join('');
 showDialog('Avisos',`<p class="form-note">Avisos fictícios guardados neste navegador. Nenhuma notificação real é entregue.</p>${tabs}${body}<p id="notice-status" class="form-note" role="status" aria-live="polite"></p>${state.city!==state.homeCity?btn(`Consultar ${state.homeCity}`,'notice-home','','text','home'):''}`,btn('Fechar','close-dialog','','text'));
}
function profileRestoreOverlay(kind){if(kind!=='notices')return false;noticesTab='all';openNotices();return true;}
function noticeDestination(n){
 if(n.city!==state.homeCity||n.city!==state.city||!Array.isArray(n.go))return null;
 const [name,id]=n.go,roots=['inicio','comunidade','conversas','voce','catalogo','desapegos','imoveis','negocios','agenda','guia'];
 if(roots.includes(name)&&!id)return {name,id:null};
 const record=name==='anuncio'?itemById(id):name==='negocio'?bizById(id):name==='pergunta'?askById(id):name==='grupo'?gById(id):name==='conversa'?threadById(id):name==='evento'?state.events.find(e=>e.id===id):null;
 return accessibleRecord(record)&&!record.deleted&&!record.hidden?{name,id}:null;
}
async function profileGlobalAction(action,value,el){
 if(!['saved','my-ads','saved-filter','my-ads-filter','family','family-settings','new-invite','copy-invite','remove-invite','notices','notices-tab','notices-read-all','notice-open','notice-read','notice-home','cap'].includes(action))return false;
 switch(action){
 case 'saved':if(dialog.open)await closeDialog(true);navigate('salvos');break;
 case 'my-ads':if(state.city!==state.homeCity&&!mutate(()=>{state.city=state.homeCity;},{redraw:false}))break;if(dialog.open)await closeDialog(true);navigate('meus-anuncios');break;
 case 'saved-filter':if(['all','items','biz'].includes(value)){savedType=value;render();globalFocus(action,value);}break;
 case 'my-ads-filter':if(['active','sold','drafts'].includes(value)){myAdsFilter=value;render();globalFocus(action,value);}break;
 case 'family':openFamily();break;
 case 'family-settings':if(dialog.open)await closeDialog(true);openSettings();break;
 case 'new-invite':{
  if(!profileFamilyAllowed())break;const input=$('#invite-name'),name=(input?.value||'').trim();
  if(name.length<2||name.length>80){if(input){input.error=true;input.errorText='Use um nome fictício entre 2 e 80 caracteres.';input.focus({preventScroll:true});}profileFeedback('Use um nome fictício entre 2 e 80 caracteres.');break;}
  let code='';for(let attempt=0;attempt<3;attempt++){const candidate='DEMO-'+crypto.randomUUID().replaceAll('-','').slice(0,8).toUpperCase();if(!state.invites.some(x=>x.code===candidate)){code=candidate;break;}}
  if(!code){profileFeedback('Não foi possível criar um código único. Tente novamente.');break;}
  if(!mutate(()=>{state.invites.push({name,code,used:false});},{redraw:false})){profileFeedback('Não foi possível salvar o convite. O nome foi mantido; libere espaço e tente novamente.');break;}
  render();openFamily();profileFeedback('Código de demonstração criado apenas neste navegador.');globalFocus('copy-invite',code,dialog);break;
 }
 case 'copy-invite':{
  const invite=state.invites.find(x=>x.code===value&&!x.used);
  if(!state.prefs.familyOnly||!invite){profileFeedback('Este código não está disponível para copiar.');break;}
  if(await copyText(invite.code)){profileFeedback('Código local copiado. Ele funciona apenas neste navegador.');el?.focus({preventScroll:true});}
  else{const recovery=$('#family-copy');if(recovery){recovery.innerHTML=field('invite-copy','Copie o código local',invite.code,'readonly');requestAnimationFrame(()=>{$('#invite-copy')?.focus({preventScroll:true});$('#invite-copy')?.shadowRoot?.querySelector('input')?.select();});}profileFeedback('A cópia automática falhou. Selecione o código abaixo e copie manualmente.');}break;
 }
 case 'remove-invite':{
  if(!profileFamilyAllowed())break;const invite=state.invites.find(x=>x.code===value&&!x.used);if(!invite){profileFeedback('Este convite foi utilizado ou não está mais disponível.');break;}
  confirm('Revogar código local?',`O código de demonstração de ${invite.name} será removido deste navegador.`,()=>{
   if(!profileFamilyAllowed())return;if(!state.invites.some(x=>x.code===value&&!x.used)){profileFeedback('Este convite não está mais disponível.');return;}
   if(mutate(()=>{state.invites=state.invites.filter(x=>x.code!==value);},{redraw:false})){render();openFamily();profileFeedback('Código local revogado. Nenhum convite real foi enviado.');globalFocus('new-invite','',dialog);}else profileFeedback('Não foi possível revogar o código. Ele permanece disponível.');
  });break;
 }
 case 'notices':noticesTab='all';openNotices();break;
 case 'notices-tab':noticesTab=value==='unread'?'unread':'all';openNotices();globalFocus('notices-tab',noticesTab,dialog);break;
 case 'notices-read-all':{const ns=state.notices.filter(n=>n.city===state.homeCity&&n.unread);if(!ns.length)break;if(!mutate(()=>{for(const n of state.notices)if(n.city===state.homeCity)n.unread=false;},{redraw:false})){profileFeedback('Não foi possível salvar a leitura. Os avisos continuam não lidos.','notice-status');break;}render();openNotices();profileFeedback('Avisos marcados como lidos apenas neste navegador.','notice-status');globalFocus('notices-tab',noticesTab,dialog);break;}
 case 'notice-home':if(mutate(()=>{state.city=state.homeCity;},{redraw:false})){render();openNotices();}break;
 case 'notice-read':case 'notice-open':{
  const n=state.notices.find(x=>x.id===value&&x.city===state.homeCity);if(!n){profileFeedback('Este aviso não está mais disponível.','notice-status');break;}
  const dest=action==='notice-open'?noticeDestination(n):null;
  if(action==='notice-open'&&!dest){profileFeedback(state.city!==n.city?`Consulte ${n.city} para abrir este aviso.`:'O conteúdo deste aviso não está mais disponível. O aviso permanece nesta lista.','notice-status');break;}
  if(n.unread&&!mutate(()=>{state.notices.find(x=>x.id===value&&x.city===state.homeCity).unread=false;},{redraw:false})){profileFeedback('Não foi possível salvar a leitura. O aviso permanece não lido.','notice-status');break;}
  render();if(action==='notice-read'){openNotices();profileFeedback('Aviso marcado como lido apenas neste navegador.','notice-status');if(!globalFocus('notice-open',value,dialog))globalFocus('notices-tab',noticesTab,dialog);}else{if(dialog.open)await closeDialog(true);navigate(dest.name,dest.id,{returnOverlay:'notices'});}break;
 }
 case 'cap':{
  const delta=Number(value),current=state.prefs.cap;if(![-1,1].includes(delta)||!Number.isSafeInteger(current)){notify('O limite local de avisos precisa ser um número inteiro válido.','error');break;}
  const next=current+delta;if(next<0||!Number.isSafeInteger(next)){notify(current===0?'O limite de avisos já está em zero.':'O limite atingiu a capacidade numérica do protótipo.','info');globalFocus(action,value);break;}
  if(mutate(()=>{state.prefs.cap=next;})){globalFocus(action,value);notify(`Preferência local salva: até ${next} avisos por dia. Nenhum aviso real é enviado.`);}break;
 }
 }return true;
}
function openReport(type,id){showDialog('Denunciar conteúdo',`${selectField('report-reason','Motivo',[['','Escolher motivo'],['spam','Spam ou propaganda inadequada'],['fraud','Informação enganosa'],['privacy','Exposição de dados pessoais'],['abuse','Ofensa ou comportamento inadequado'],['other','Outro motivo']],'','required')}${field('report-details','Detalhes (opcional)','','type="textarea" rows="3" maxlength="1000"')}<p class="form-note">No modo teste, a denúncia fica registrada neste dispositivo.</p>`,`${btn('Cancelar','close-dialog','','text')}${btn('Registrar denúncia','submit-report',`${type}|${id}`,'filled')}`);}
