async function perform(action,value,el){
 globalActionElement=el;navigationPendingContext=navigationContext();
 if(typeof profileGlobalAction==='function'&&await profileGlobalAction(action,value,el))return;
 if(await messagingAction(action,value,el))return;
 if(await alertAction(action,value))return;
 if(wizardAction(action,value))return;
 if(await shareCardAction(action,value))return;
 if(await compareAction(action,value))return;
 if(await groupAction(action,value,el))return;if(await requestAction(action,value))return;
 switch(action){
 case 'nav':if(dialog.open)await closeDialog(true);navigate(value);break;
 case 'home':if(dialog.open)await closeDialog(true);navigate('inicio');break;
 case 'back':back();break;
 case 'guide':if(dialog.open)await closeDialog(true);navigate('guia');break;
 case 'agenda':if(dialog.open)await closeDialog(true);navigate('agenda');break;
 case 'open-event':{const event=state.events.find(x=>x.id===value);if(!accessibleRecord(event)){showGlobalDependency('evento-indisponivel');break;}if(dialog.open)await closeDialog(true);navigate('evento',value);break;}
 case 'resume':{const [type,id]=value.split('|'),ref=type==='item'?itemById(id):type==='biz'?bizById(id):type==='ask'?askById(id):null;if(!accessibleRecord(ref)||state.lastViewed?.city!==state.city){showDialog('Conteúdo anterior indisponível','<p class="form-note">A referência foi removida ou pertence a outra cidade. Seu restante de dados locais foi preservado.</p>',`${btn('Voltar','close-dialog','','text')}${btn('Explorar nesta cidade','catalog-all','','filled')}`);break;}await perform(type==='item'?'open-item':type==='biz'?'open-biz':'open-question',id,el);break;}
 case 'plan':openLocalPlan(value);break;
 case 'plan-check':{const [kind,id]=value.split('|'),step=state.plan[kind]?.find(x=>x.id===id);if(!['chegando','saindo'].includes(kind)||!step){showGlobalDependency('plano-indisponivel');break;}if(readonly()||!state.profile.verified){showDialog('Checklist indisponível',`<p class="form-note">${readonly()?`Você está consultando ${esc(state.city)}. As marcações locais estão disponíveis na sua cidade, ${esc(state.homeCity)}.`:'Seu perfil de teste precisa estar verificado antes de salvar marcações. Nenhuma etapa foi alterada.'}</p>`,`${btn('Voltar','close-dialog','','text')}${readonly()?btn('Voltar à minha cidade','home-city','','filled'):btn('Consultar verificação demonstrativa','onboarding','','filled')}`,'plan-permission');render();break;}const next=!step.done,saved=mutate(()=>{state.plan[kind].find(x=>x.id===id).done=next;},{redraw:false});if(dialog.dataset.kind==='local-plan'&&dialog.open)openLocalPlan(kind);else render();globalFocus('plan-check',value,dialog.open?dialog:root);if(saved)notify(next?'Etapa concluída neste dispositivo':'Etapa reaberta neste dispositivo');break;}
 case 'plan-go':{const [kind,id]=value.split('|'),step=state.plan[kind]?.find(x=>x.id===id);if(!['chegando','saindo'].includes(kind)||!step?.go){showGlobalDependency('plano-indisponivel');break;}if(dialog.open)await closeDialog(true);const [next,arg]=step.go;if(next==='filter')await perform('intent',arg,el);else if(next==='search')await perform('guide-search',arg,el);else if(next==='groups')await perform('groups','',el);else if(next==='publish')await perform(arg==='imovel'?'create-property':'create-item','',el);else if(next==='my-questions')await perform('my-questions','',el);else if(next==='destination'){if(!CITY_NAMES.includes(state.dest)){showGlobalDependency('plano-indisponivel');break;}if(mutate(()=>state.city=state.dest,{redraw:false}))navigate('guia');}else showGlobalDependency('plano-indisponivel');break;}
 case 'share':{const [type,id]=value.split('|');if(type==='anuncio'||type==='negocio')await openShareCard(type,id);else await share(type,id);break;}
 case 'copy-share':await copyText($('#share-link')?.value||'');break;
 case 'create-event':openEventEditor();break;
 case 'edit-event':openEventEditor(value);break;
 case 'submit-event':await submitEvent();break;
 case 'attend-event':{const e=state.events.find(x=>x.id===value);if(!accessibleRecord(e)||e.mine||!canPost())break;if(!e.on&&e.date<dateISO()){notify('Este encontro já aconteceu.','info');break;}if(!e.on&&e.max&&(e.going||0)>=e.max){notify('As vagas deste encontro acabaram.','info');break;}if(mutate(()=>{e.on=!e.on;e.going=Math.max(0,(e.going||0)+(e.on?1:-1));}))notify(e.on?'Presença confirmada neste dispositivo':'Presença cancelada',e.on?'event_available':'event_busy');break;}
 case 'delete-event':{const e=state.events.find(x=>x.id===value);if(!e?.mine||!canPost())break;confirm('Cancelar encontro?',`“${e.title}” sairá da agenda da cidade.`,()=>{const snapshot=structuredClone(e);if(mutate(()=>{state.events=state.events.filter(x=>x.id!==value);},{redraw:false})){navigate('agenda');notify('Encontro cancelado','event_busy',()=>mutate(()=>{state.events.unshift(snapshot);}));}});break;}
 case 'report':case 'submit-report':showGlobalDependency(action);break;
 case 'search':searchQuery='';navigate('busca');break;
 case 'search-from-home':searchQuery=$('#home-search')?.value.trim()||'';saveRecent(searchQuery);navigate('busca');break;
 case 'clear-search':if(!searchQuery){back();break;}searchQuery='';$('#search-query').value='';$('#search-results').innerHTML=searchResults();$('#search-query').focus();break;
 case 'recent-search':case 'guide-search':searchQuery=value;saveRecent(value);navigate('busca');break;
 case 'search-type':searchType=value;render();globalFocus(action,value);break;
 case 'intent':if(value==='biz'){bizQuery='';bizCat='Todos';navigate('negocios');}else if(value==='ind'){communityTab='ind';navigate('comunidade');}else{catalogFilter=value==='imovel'?'imovel':'desapego';catalogAttrs={...catalogAttrs,[catalogFilter]:structuredClone(CATALOG_DEFAULTS[catalogFilter])};navigate(catalogFilter==='imovel'?'imoveis':'desapegos');}break;
 case 'catalog-all':if(dialog.open)await closeDialog(true);catalogFilter='desapego';catalogAttrs={...catalogAttrs,desapego:structuredClone(CATALOG_DEFAULTS.desapego)};navigate('desapegos');break;
 case 'verified-info':openVerifiedInfo();break;
 case 'catalog-pill':openFilterPanel(value,el);break;
 case 'catalog-toggle':if(['pets','furnished'].includes(value)){catalogSetAttr('amen',value);render();globalFocus(action,value);}break;
 case 'catalog-filter':catalogFilter=value;render();globalFocus(action,value);break;
 case 'clear-filters':searchHood='Todos';searchMin=searchMax='';searchSort='recent';catalogAttrs=structuredClone(CATALOG_DEFAULTS);render();break;
 case 'businesses':bizCat='Todos';bizQuery='';navigate('negocios');break;
 case 'biz-filter':bizCat=value;render();globalFocus(action,value);break;
 case 'community-tab':communityTab=value;render();globalFocus(action,value);break;
 case 'question-filter':questionFilter=value;render();globalFocus(action,value);break;
 case 'city':openCity();break;
 case 'apply-city':{
  const city=$('#city-select').value,mode=$('#moment-select').value,dest=$('#destination-select').value,arrival=$('#arrival-date').value,leave=$('#leave-date').value;
  const momentProblem=!CITY_NAMES.includes(city)?'Escolha uma cidade da lista.':mode==='chegando'&&!arrival?'Informe a data de chegada.':mode==='saindo'&&!leave?'Informe a data de saída.':mode==='saindo'&&!CITY_NAMES.includes(dest)?'Escolha o destino da mudança.':'';if(momentProblem){notify(momentProblem,'error');break;}
  if(mutate(()=>{state.city=city;state.mode=mode;if(mode==='chegando')state.arrival=arrival;if(mode==='saindo'){state.leaveDate=leave;state.dest=dest;}},{redraw:false})){searchHood='Todos';searchMin=searchMax='';catalogAttrs=structuredClone(CATALOG_DEFAULTS);await closeDialog(true);navigate('inicio');}break;
 }
 case 'home-city':if(mutate(()=>state.city=state.homeCity,{redraw:false})){if(dialog.open)await closeDialog(true);navigate('inicio');}break;
 case 'settings':openSettings();break;
 case 'save-settings':if(validFields(['profile-name'])){const name=$('#profile-name').value.trim();if(name.length<3){notify('Informe um nome com pelo menos 3 letras.','error');break;}const appearance=$('#appearance-select').value,showHood=$('#privacy-hood').selected,familyOnly=$('#privacy-family').selected;if(mutate(()=>{state.profile.name=name;Object.assign(state.prefs,{appearance,showHood,familyOnly});},{redraw:false})){await closeDialog(true);render();notify('Configurações salvas');}}break;
 case 'prototype':openPrototype();break;
 case 'apply-prototype':{
  const stage=$('#prototype-stage').value,verified=$('#verified-test').selected,incoming=Math.min(10000,Math.max(0,Number($('#prototype-incoming').value)||0));
  if(stage!==state.stage){confirm('Trocar o cenário de teste?','Isso substitui as alterações locais pelos exemplos do cenário escolhido.',async()=>{const prior=state;state=normalizeListings(normalizeCategories(initial(stage)));state.profile.verified=verified;if(incoming!==prior.incoming)state.incoming=incoming;if(!mutate(()=>{}, {redraw:false})){state=prior;return;}await closeDialog(true);navigate('inicio');notify('Cenário atualizado');});}
  else if(mutate(()=>{state.profile.verified=verified;state.incoming=incoming;},{redraw:false})){await closeDialog(true);render();notify('Permissão de teste atualizada');}break;
 }
 case 'reset-prototype':confirm('Recomeçar do zero?','Anúncios, conversas, salvos e outras alterações feitas neste dispositivo serão substituídos pelos exemplos iniciais.',async()=>{const prior=state;state=normalizeListings(normalizeCategories(initial()));if(!mutate(()=>{}, {redraw:false})){state=prior;return;}await closeDialog(true);navigate('inicio');notify('Protótipo reiniciado');});break;
 case 'simulate-answer':simulateAnswer();break;
 case 'simulate-message':simulateMessage();break;
 case 'close-dialog':await closeDialog();break;
 case 'cancel-confirm':await confirmDialog.close();await dropConfirmHistory();break;
 case 'accept-confirm':{const f=confirmDialog._accept;await confirmDialog.close();await dropConfirmHistory();if(f)await f();break;}
 case 'create':openCreate(el);break;
 case 'create-item':openItemEditor('desapego');break;
 case 'create-property':openItemEditor('imovel');break;
 case 'edit-item':openItemEditor('desapego',value);break;
 case 'open-draft':openItemEditor('desapego',null,value);break;
 case 'save-draft':await saveDraft();break;
 case 'submit-item':await submitItem();break;
 case 'cover-photo':coverEditorPhoto(Number(value));break;
 case 'lightbox':{if(value==='item'){const i=itemById(route.id);if(!i)break;const photos=(i.photos||[]).map(image).filter(Boolean),sel=$('.gallery button.selected');openLightbox(photos,Number(sel?.dataset.value||0),i.title);}else if(value==='biz'){const b=bizById(route.id);if(!b)break;openLightbox((b.photos||[]).map(image).filter(Boolean),0,b.name);}break;}
 case 'remove-photo':if(editor){editor.photos.splice(Number(value),1);editorDirty=true;$('#photo-previews').innerHTML=photoPreviews();}break;
 case 'open-item':{
  const i=itemById(value);if(!i)break;if(i.city!==state.city)mutate(()=>state.city=i.city,{redraw:false});if(!i.mine)mutate(()=>i.views=(i.views||0)+1,{redraw:false});remember('item',value);if(dialog.open)await closeDialog(true);navigate('anuncio',value);break;
 }
 case 'save-item':{const i=itemById(value);if(!i)break;if(mutate(()=>i.saved=!i.saved))notify(i.saved?'Anúncio salvo':'Anúncio removido dos salvos',i.saved?'bookmark':'bookmark_remove');break;}
 case 'item-interest':await contact('item',value,'Olá! '+(itemById(value)?.kind==='imovel'?'O imóvel ainda está disponível?':'O anúncio ainda está disponível?'));break;
 case 'item-offer':{const i=itemById(value);if(!i||i.status!=='active'){notify('Este anúncio foi encerrado.','info');break;}showDialog('Fazer uma oferta',`${field('offer-amount','Sua oferta (R$)',Math.round(i.numPrice*.9),'type="number" min="1" required')}<p class="form-note">O valor será enviado como mensagem. O anunciante decide se aceita.</p>`,`${btn('Cancelar','close-dialog','','text')}${btn('Preparar oferta','send-offer',value,'filled')}`);break;}
 case 'send-offer':if(validFields(['offer-amount']))await contact('item',value,`Olá! Você aceitaria ${money($('#offer-amount').value)}?`);break;
 case 'item-visit':await contact('item',value,itemById(value)?.kind==='imovel'?'Olá! Podemos combinar uma visita ao imóvel?':'Olá! Como podemos combinar a retirada ou entrega?');break;
 case 'item-status':{const i=itemById(value);if(!i?.mine||i.city!==state.homeCity||!canPost())break;const previous=i.status;if(mutate(()=>{i.status=i.status==='sold'?'active':'sold';}))notify(i.status==='sold'?'Anúncio encerrado':'Anúncio reativado','check_circle',()=>mutate(()=>{i.status=previous;}));break;}
 case 'delete-item':{const i=itemById(value);if(!i?.mine||i.city!==state.homeCity||!canPost())break;confirm('Excluir anúncio?',`“${i.title}” sairá das ofertas. As conversas existentes serão preservadas.`,()=>{const snapshot=structuredClone(i);if(mutate(()=>{state.items=state.items.filter(x=>x.id!==value);if(state.lastViewed?.id===value)state.lastViewed=null;},{redraw:false})){myAdsFilter='active';navigate('meus-anuncios');notify('Anúncio excluído','delete',()=>mutate(()=>{state.items.unshift(snapshot);}));}});break;}
 case 'delete-draft':confirm('Excluir rascunho?','O texto e as fotos deste rascunho serão removidos.',()=>{if(mutate(()=>state.drafts=state.drafts.filter(d=>d.id!==value)))notify('Rascunho excluído');});break;
 case 'gallery':{const i=itemById(route.id);if(!i)break;$('#hero-image').src=image(i.photos[Number(value)]);$$('.gallery button').forEach((b,n)=>b.classList.toggle('selected',n===Number(value)));break;}
 case 'item-leads':case 'biz-leads':{
  const type=action==='item-leads'?'item':'biz',ts=state.threads.filter(t=>t.about.type===type&&t.about.id===value);showDialog('Contatos recebidos',ts.length?`<div class="list">${ts.map(t=>profileRow('chat_bubble',t.who,t.msgs.at(-1)?.t||'Conversa iniciada','open-thread',t.id)).join('')}</div>`:empty('Nenhum contato ainda','Os contatos sobre esta publicação aparecerão aqui.','chat_bubble'),btn('Fechar','close-dialog','','text'));break;
 }
 case 'open-biz':{const b=bizById(value);if(!b)break;if(b.city!==state.city)mutate(()=>state.city=b.city,{redraw:false});if(!b.mine)mutate(()=>b.views=(b.views||0)+1,{redraw:false});remember('biz',value);if(dialog.open)await closeDialog(true);navigate('negocio',value);break;}
 case 'save-biz':{const b=bizById(value);if(!b)break;if(mutate(()=>b.saved=!b.saved))notify(b.saved?'Negócio salvo':'Negócio removido dos salvos',b.saved?'bookmark':'bookmark_remove');break;}
 case 'my-biz':if(readonly())mutate(()=>state.city=state.homeCity,{redraw:false});if(state.myBiz?.live){if(dialog.open)await closeDialog(true);navigate('negocio',state.myBiz.id);}else openBusinessEditor();break;
 case 'edit-biz':openBusinessEditor(value);break;
 case 'submit-biz':await submitBusiness();break;
 case 'quote':await contact('biz',value,'Olá! Vi sua página no Bivaque. Pode me passar um orçamento?');break;
 case 'recommend-biz':{if(!canPost())break;const b=bizById(value);if(!b)break;if(b.myInd){notify('Você já indicou este negócio.','info');break;}showDialog('Indicar este negócio',field('recommend-why','Conte sua experiência','','type="textarea" rows="3" required minlength="12"'),`${btn('Cancelar','close-dialog','','text')}${btn('Publicar indicação','submit-recommend',value,'filled')}`);break;}
 case 'submit-recommend':{const b=bizById(value);if(!b||!canPost()||!validFields(['recommend-why']))break;const text=$('#recommend-why').value.trim();if(mutate(()=>{b.recN++;b.myInd=true;b.says.push([initals(state.profile.name),'me',state.profile.name,text]);},{redraw:false})){await closeDialog(true);render();notify('Sua indicação foi adicionada');}break;}
 case 'indicate':openIndicate();break;
 case 'submit-indicate':await submitIndicate();break;
 case 'invite-owner':await copyText(`A comunidade do Bivaque indicou seu negócio. Conheça sua página: ${location.href}`);break;
 case 'claim-biz':if(state.myBiz?.live){notify('Você já tem uma página. Abra “Meu negócio” para editar.','info');break;}showDialog('Assumir página no modo teste',`${field('claim-name','Seu nome',state.profile.name,'required minlength="3"')}<p class="form-note">Esta ação simula a confirmação do responsável. Na versão de produção, a propriedade precisará ser validada antes de editar a página.</p>`,`${btn('Cancelar','close-dialog','','text')}${btn('Assumir no modo teste','confirm-claim',value,'filled')}`);break;
 case 'confirm-claim':{const b=bizById(value);if(!b||!canPost()||!validFields(['claim-name']))break;if(mutate(()=>{state.myBiz={...b,mine:true,live:true,claimed:true,owner:$('#claim-name').value+' · responsável de teste'};state.biz=state.biz.filter(x=>x.id!==b.id);},{redraw:false})){await closeDialog(true);openBusinessEditor(b.id);}break;}
 case 'whatsapp':{const b=bizById(value);if(b?.whatsapp){let n=b.whatsapp;if(n.length<=11)n='55'+n;external('https://wa.me/'+n);}break;}
 case 'instagram':{const b=bizById(value);if(b?.instagram)external('https://www.instagram.com/'+encodeURIComponent(b.instagram)+'/');break;}
 case 'website':{const b=bizById(value);if(b?.website&&/^https?:\/\//.test(b.website))external(b.website);break;}
 case 'plans':openPlans();break;
 case 'activate-plan':{const tier=$$('md-radio[name=plan]',dialog).find(x=>x.checked)?.value||'free';if(mutate(()=>{state.subscription.tier=tier;},{redraw:false})){await closeDialog(true);render();notify(tier==='free'?'Plano grátis selecionado':'Plano de teste ativado. Nenhum pagamento realizado.');}break;}
 case 'open-question':{
  const q=askById(value);if(!q)break;if(q.city!==state.city)mutate(()=>state.city=q.city,{redraw:false});if(dialog.dataset.kind==='editor'&&editor?.kind==='ask')mutate(()=>state.askDraft=$('#ask-input')?.value||'',{redraw:false});remember('ask',value);if(dialog.open)await closeDialog(true);navigate('pergunta',value);break;
 }
 case 'ask':openAsk(state.askDraft||'');break;
 case 'ask-from-search':openAsk(searchQuery.endsWith('?')?searchQuery:`Onde encontro ${searchQuery}?`);break;
 case 'submit-ask':await submitAsk();break;
 case 'send-answer':{
  if(!canPost())break;const q=askById(value),text=$('#answer-input')?.value.trim();if(!q||!text||text.length<5){notify('Escreva uma resposta com um pouco mais de contexto.','error');break;}if(mutate(()=>{q.answers.push({id:uid('a'),who:state.profile.name,ini:initals(state.profile.name),t:text,mine:true,helped:0,solved:false});}))notify('Indicação enviada');break;
 }
 case 'solve-question':case 'reopen-question':{if(!canPost())break;const [id,aid]=value.split('|'),q=askById(id);if(!q?.mine)break;if(mutate(()=>{q.status=action==='solve-question'?'ok':'open';q.answers.forEach(a=>a.solved=action==='solve-question'&&a.id===aid);})){notify(action==='solve-question'?'Resolvida. Sua experiência fica disponível para a comunidade.':'Pergunta reaberta');}break;}
 case 'like-answer':{if(!canPost())break;const [id,aid]=value.split('|'),a=askById(id)?.answers.find(x=>x.id===aid);if(a)mutate(()=>{a.liked=!a.liked;a.helped=(a.helped||0)+(a.liked?1:-1);});break;}
 case 'follow-question':{const q=askById(value);if(q){mutate(()=>q.following=!q.following);notify(q.following?'Você acompanha as respostas':'Você deixou de acompanhar');}break;}
 case 'hide-question':{const q=askById(value);if(q&&mutate(()=>q.hidden=true))notify('Pergunta ocultada','visibility_off',()=>mutate(()=>q.hidden=false));break;}
 case 'answer-origin':{const [id,aid]=value.split('|'),q=askById(id),a=q?.answers.find(x=>x.id===aid);if(a?.originQuestion){navigate('pergunta',a.originQuestion);break;}showDialog('Origem da indicação',`<div class="choice">${icon('history_edu')}<span class="txt"><b>${esc(q?.q)}</b><small>${esc(q?.who)} · ${esc(q?.city)}</small></span></div><p class="detail-copy">${esc(a?.t)}</p>${a?.biz&&bizById(a.biz)?`<button type="button" class="answer-origin" data-action="open-biz" data-value="${a.biz}">${icon('storefront')}<span class="grow">${esc(bizById(a.biz).name)}</span>${icon('chevron_right')}</button>`:''}${q?.demo||q?.fromMemory?'<p class="form-note">Relato de exemplo preservado no arquivo da cidade.</p>':''}`,btn('Fechar','close-dialog','','text'));break;}
 case 'my-questions':mutate(()=>state.city=state.homeCity,{redraw:false});navigate('minhas');break;
 case 'groups':communityTab='grp';navigate('comunidade');break;
 case 'open-group':if(dialog.open)await closeDialog(true);navigate('grupo',value);break;
 case 'map':{const [place,city]=value.split('|');external('https://www.openstreetmap.org/search?query='+encodeURIComponent(place+', '+city+', Brasil'));break;}
 case 'onboarding':openOnboarding();break;
 case 'onboard-prev':onboardStep=Math.max(1,onboardStep-1);renderOnboarding();break;
 case 'onboard-next':{
  if(onboardStep===2){if(!validFields(['onboard-name'])||!$('#onboard-terms').checked){notify('Informe seu nome e aceite o uso do modo teste.','info');break;}onboardDraft.name=$('#onboard-name').value.trim();onboardDraft.role=$('#onboard-role').value;onboardDraft.force=$('#onboard-force').value;if(onboardDraft.role==='familia'){const code=$('#onboard-code')?.value.trim().toUpperCase(),invite=state.invites.find(x=>x.code===code&&!x.used);if(!invite){notify('Use um convite de teste válido criado no perfil.','error');break;}onboardDraft.invite=code;}}
  if(onboardStep===3)onboardDraft.verified=$$('md-radio[name=verify]',dialog).find(r=>r.checked)?.value==='yes';if(onboardStep===4){const city=$('#onboard-city').value,date=$('#onboard-date')?.value||'',dest=$('#onboard-dest')?.value||'';if(!CITY_NAMES.includes(city)||($('#onboard-mode').value!=='moro'&&!date)){notify(!CITY_NAMES.includes(city)?'Escolha sua cidade.':'Informe a data da chegada ou mudança.','error');break;}if($('#onboard-mode').value==='saindo'&&(!CITY_NAMES.includes(dest)||dest===city)){notify('Escolha um destino diferente da sua cidade atual.','error');break;}onboardDraft.city=city;onboardDraft.mode=$('#onboard-mode').value;if(date)onboardDraft[$('#onboard-mode').value==='saindo'?'leave':'arrival']=date;if(dest)onboardDraft.dest=dest;}onboardStep=Math.min(5,onboardStep+1);renderOnboarding();break;
 }
 case 'onboard-finish':{const {city,mode}=onboardDraft,date=mode==='saindo'?onboardDraft.leave:onboardDraft.arrival;if(!CITY_NAMES.includes(city)||(mode!=='moro'&&!date)){notify(!CITY_NAMES.includes(city)?'Escolha sua cidade.':'Informe a data da chegada ou mudança.','error');break;}if(mutate(()=>{state.profile={...state.profile,name:onboardDraft.name,role:onboardDraft.role,force:onboardDraft.force,verified:onboardDraft.verified};state.city=state.homeCity=city;state.mode=mode;if(mode==='chegando')state.arrival=date;if(mode==='saindo'){state.leaveDate=date;state.dest=onboardDraft.dest;}state.profile.interests=[...(onboardDraft.interests||[])];state.leftAuto=[];state.onboarded=true;if(onboardDraft.invite){const i=state.invites.find(x=>x.code===onboardDraft.invite);if(i)i.used=true;}},{redraw:false})){await closeDialog(true);navigate('inicio');const t=state.groups.find(g=>g.auto&&g.on&&g.joinedAt>Date.now()-5000);notify(!onboardDraft.verified?'Perfil em análise. Você pode consultar o conteúdo.':t?`Perfil pronto. Você entrou em ${t.t}`:'Perfil de teste pronto',t?'flight_land':'check_circle');}break;}
 case 'undo':if(toastUndo){const fn=toastUndo;toastUndo=null;fn();$('#snackbar').classList.remove('show');}break;
 default:showGlobalDependency(action);
 }
}
function openLocalPlan(kind){
 if(!['chegando','saindo'].includes(kind)||!Array.isArray(state.plan[kind])){showGlobalDependency('plano-indisponivel');return;}
 showDialog(kind==='chegando'?'Seu plano de chegada':'Seu plano de saída',`<p class="form-note">Checklist pessoal demonstrativo. As marcações ficam apenas neste dispositivo; nenhuma providência externa é realizada.</p>${renderPlan(kind,true)}`,btn('Fechar','close-dialog','','text'),'local-plan');
}
function showGlobalDependency(action){
 const titles={'create-event':'Criar encontro','edit-event':'Editar encontro','delete-event':'Cancelar encontro','attend-event':'Confirmar presença','submit-event':'Publicar encontro','evento-indisponivel':'Encontro indisponível','plano-indisponivel':'Etapa indisponível',report:'Denunciar conteúdo','submit-report':'Registrar denúncia'};
 const eventAction=['create-event','edit-event','delete-event','attend-event','submit-event'].includes(action),reportAction=['report','submit-report'].includes(action);
 const text=eventAction?'Esta operação depende da rodada de Encontros: criação, presença, lotação e cancelamento ainda precisam de suas regras e provas. Nenhum encontro ou confirmação foi alterado. Você pode consultar a agenda existente.':reportAction?'O tratamento de denúncias depende da rodada de segurança e moderação. Nenhuma denúncia foi enviada ou registrada por esta ação.':'Este recurso não está disponível neste contexto da demonstração. Consulte os dados existentes ou retorne à página anterior.';
 showDialog(titles[action]||'Ação indisponível nesta rodada',`<p class="form-note">${esc(text)}</p>`,`${btn('Voltar','close-dialog','','text')}${eventAction||action==='evento-indisponivel'?btn('Consultar Agenda','agenda','','filled'):btn('Ir para o início','home','','filled')}`,'dependency');
}
