// Rodada 25: alerta de busca salva (referências do Mobbin: buscas salvas com notificação da
// Vestiaire, confirmação curta da Insight Timer). Com filtros ativos, "Avise-me" guarda a busca;
// um anúncio novo de outra pessoa que caiba nela vira aviso na central. Tudo só no aparelho;
// a chegada de anúncios novos é simulada pelo painel do protótipo.
// Exclusão feita dentro da lista: o desfazer fica na própria lista (o aviso de rodapé fica
// por baixo do diálogo e não pode ser tocado).
let alertDeleted=null;
// Mesma busca, qualquer ordem de clique: listas comparadas ordenadas.
// Rodada 67: dist zerada não conta (alertas salvos antes da distância continuam iguais).
const alertKey=attrs=>JSON.stringify(Object.keys(attrs).filter(k=>k!=='dist'||attrs.dist).sort().map(k=>[k,Array.isArray(attrs[k])?[...attrs[k]].sort():attrs[k]]));
const alertSame=(a,kind,attrs)=>a.kind===kind&&a.city===state.city&&alertKey(a.attrs)===alertKey(attrs);
const currentAlert=kind=>(state.alerts||[]).find(a=>alertSame(a,kind,catalogAttrs[kind]));
function alertLabel(kind,a){
 const parts=[kind==='imovel'?'Imóveis':'Desapegos'];
 if(kind==='imovel'){if(a.ptypes.length)parts.push(a.ptypes.join(' ou '));}else if(a.cats.length)parts.push(a.cats.join(' ou '));
 if(a.min||a.max)parts.push(priceLabel(kind,a.min,a.max).replace(/^Até/,'até').replace(/^A partir/,'a partir'));
 if(kind==='imovel'){if(a.beds)parts.push(`${a.beds}+ quartos`);if(a.parking)parts.push(`${a.parking}+ ${a.parking===1?'vaga':'vagas'}`);if(a.area)parts.push(`${a.area} m²+`);for(const k of a.amen)parts.push(amenityLabel(k).toLowerCase());if(a.avail)parts.push(availLabel(a.avail).toLowerCase());}
 else{if(a.cond)parts.push(a.cond.toLowerCase());if(a.pickup)parts.push(a.pickup==='now'?'retirada imediata':'retirada em até 30 dias');}
 if(a.hoods.length)parts.push(a.hoods.length===1?a.hoods[0]:`${a.hoods.length} bairros`);
 if(a.dist)parts.push(`até ${a.dist} km do seu bairro`);
 return parts.join(' · ');
}
function alertMatches(x,al){const a=al.attrs;return x.city===al.city&&x.status==='active'&&itemVisible(x)&&x.kind===al.kind&&(!hasPrice(a.min)||itemTotal(x)>=Number(a.min))&&(!hasPrice(a.max)||itemTotal(x)<=Number(a.max))&&catalogMatches(x,al.kind,a);}
// Faixa abaixo da contagem: só aparece com filtros ativos, que é quando um alerta faz sentido.
function alertBannerHtml(kind){
 if(!filterActiveCount(kind))return '';const al=currentAlert(kind);
 return al?`<div class="falert is-on" role="status">${icon('notifications_active')}<span class="grow">Alerta ativo para esta busca${al.notify?'':' (pausado)'}.</span>${btn('Gerenciar','search-alerts','','text')}</div>`
  :`<div class="falert">${icon('notifications_none')}<span class="grow">Quer saber quando aparecer ${kind==='imovel'?'outro imóvel':'outro desapego'} assim?</span>${btn('Avise-me','search-alert','','tonal','notifications')}</div>`;
}
function createSearchAlert(){
 const kind=catalogKind();if(!filterActiveCount(kind)){notify('Escolha ao menos um filtro para criar o alerta.','info');return;}
 if(currentAlert(kind)){openSearchAlerts();return;}
 const alert={id:uid('al'),kind,city:state.city,attrs:structuredClone(catalogAttrs[kind]),label:alertLabel(kind,catalogAttrs[kind]),notify:true,createdAt:Date.now()};
 if(!mutate(()=>{state.alerts=[alert,...(state.alerts||[])];},{redraw:false}))return;
 render();globalFocus('search-alerts');
 notify('Alerta criado: avisaremos quando aparecer um anúncio assim.','notifications',()=>{if(mutate(()=>{state.alerts=state.alerts.filter(a=>a.id!==alert.id);}))notify('Alerta removido','delete');});askPushSoon('alert');
}
function alertRow(a){
 const n=state.items.filter(x=>alertMatches(x,a)).length;
 return `<div class="list-row alert-row${a.notify?'':' is-paused'}"><button type="button" class="txt" data-action="alert-open" data-value="${esc(a.id)}"><b>${esc(a.label)}</b><small>${esc(a.city)} · ${n} ${n===1?'anúncio':'anúncios'} hoje · ${a.notify?'avisos ligados':'avisos pausados'}</small></button>${iconBtn(a.notify?'notifications_active':'notifications_off','alert-toggle',a.id,a.notify?`Pausar avisos de ${a.label}`:`Ligar avisos de ${a.label}`,`aria-pressed="${a.notify}"`)}${iconBtn('delete','alert-delete',a.id,`Excluir alerta ${a.label}`)}</div>`;
}
function openSearchAlerts(focus,message=''){
 const list=state.alerts||[];
 const note=message?`<div class="falert" role="status">${icon('info')}<span class="grow">${esc(message)}</span></div>`:'';
 const undo=alertDeleted?`<div class="falert" role="status">${icon('delete')}<span class="grow">Alerta “${esc(alertDeleted.alert.label)}” excluído.</span>${btn('Desfazer','alert-undo','','text')}</div>`:'';
 showDialog('Alertas de busca',`<p class="form-note">Avisamos na central quando aparecer um anúncio novo de outra pessoa que caiba na busca. Fica só neste aparelho.</p>${note}${undo}${list.length?`<div class="list">${list.map(alertRow).join('')}</div>`:empty('Nenhum alerta ainda','Filtre imóveis ou desapegos e toque em “Avise-me”.','notifications_none')}`,btn('Fechar','close-dialog','','text'));
 if(focus)globalFocus(focus[0],focus[1],dialog);
}
async function alertAction(action,value){
 if(!['search-alert','search-alerts','alert-open','alert-toggle','alert-delete','alert-undo','simulate-alert'].includes(action))return false;
 if(action!=='alert-undo'&&action!=='alert-delete')alertDeleted=null;
 if(action==='search-alert'){createSearchAlert();return true;}
 if(action==='search-alerts'){openSearchAlerts();return true;}
 if(action==='simulate-alert'){simulateAlertListing();return true;}
 if(action==='alert-undo'){const d=alertDeleted;alertDeleted=null;if(d&&mutate(()=>{const list=[...state.alerts];list.splice(Math.min(d.index,list.length),0,d.alert);state.alerts=list;},{redraw:false})){render();openSearchAlerts(['alert-open',d.alert.id]);}return true;}
 const al=(state.alerts||[]).find(a=>a.id===value);if(!al){openSearchAlerts(null,'Este alerta não existe mais.');return true;}
 if(action==='alert-open'){
  if(al.city!==state.city){openSearchAlerts(['alert-open',al.id],`Este alerta é de ${al.city}. Troque a cidade para ver os anúncios.`);return true;}
  if(dialog.open)await closeDialog(true);catalogFilter=al.kind;catalogAttrs={...catalogAttrs,[al.kind]:structuredClone({...CATALOG_DEFAULTS[al.kind],...al.attrs})};
  navigate(al.kind==='imovel'?'imoveis':'desapegos');return true;
 }
 if(action==='alert-toggle'){if(mutate(()=>{const a=state.alerts.find(x=>x.id===value);a.notify=!a.notify;},{redraw:false})){render();openSearchAlerts([action,value]);}return true;}
 const index=state.alerts.findIndex(a=>a.id===value);
 if(mutate(()=>{state.alerts=state.alerts.filter(a=>a.id!==value);},{redraw:false})){alertDeleted={alert:al,index};render();openSearchAlerts(['alert-undo','']);}
 return true;
}
// Painel do protótipo: chega um anúncio de outra pessoa que cabe no primeiro alerta ligado.
function simulateAlertListing(){
 const al=(state.alerts||[]).find(a=>a.notify&&a.city===state.homeCity);
 if(!al){notify(`Crie um alerta com avisos ligados em ${state.homeCity} primeiro.`,'info');return;}
 if(isBlocked('Paula V.')){notify('Paula V. está nas suas pessoas bloqueadas. Nenhum anúncio de exemplo chegou.','info');return;}
 const a=al.attrs,min=Number(a.min)||0,max=hasPrice(a.max)?Number(a.max):0,kind=al.kind;
 const price=max?Math.max(min,max>=20?Math.floor(max*0.9/10)*10:max):Math.max(min,kind==='imovel'?2300:350);
 const hood=a.hoods[0]||(a.dist&&hoodOrigin(al.city)?.name)||hoodPopular(al.city)[0]?.name||'',id=uid('i');
 const base={id,kind,city:al.city,status:'active',saved:false,demo:true,views:0,createdAt:Date.now(),numPrice:price,price:money(price),hood,seller:'Paula V.',sini:'PV',stone:'c2',note:'Membro da comunidade'};
 const item=kind==='imovel'
  ?(()=>{const ptype=a.ptypes[0]||'Apartamento',beds=Math.max(a.beds,2);return {...base,per:'/mês',flag:'Aluguel',ptype,beds,area:Math.max(a.area,64),parking:a.parking,condo:0,amen:[...a.amen],avail:'',photos:[ptype.startsWith('Casa')?'kitchen':'apartment'],title:`${ptype} com ${beds} quartos em ${hood}`,desc:'Anúncio de exemplo criado para demonstrar o alerta de busca.'};})()
  :(()=>{const cat=a.cats[0]||'Móveis';return {...base,per:'',flag:'',cat,cond:a.cond||'Seminovo',photos:cat==='Móveis'?['sofa']:[],icon:'sell',title:`${cat}: oportunidade em ${hood}`,desc:'Anúncio de exemplo criado para demonstrar o alerta de busca.'};})();
 if(!alertMatches(item,al)){notify('Não deu para montar um exemplo que caiba nesse alerta.','info');return;}
 if(mutate(()=>{state.items.unshift(item);state.notices.unshift({id:uid('n'),city:al.city,unread:true,text:`Novo ${kind==='imovel'?'imóvel':'desapego'} para o seu alerta “${al.label}”: ${item.title}.`,go:['anuncio',id],when:'Agora'});}))notify('Anúncio de exemplo publicado e aviso enviado','notifications');
}
