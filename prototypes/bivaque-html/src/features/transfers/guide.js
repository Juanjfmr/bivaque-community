/* R73 — Guia vivo: o conteúdo vem dos mesmos registros da cidade, sem dados inventados. */
function renderGuide(){
 const city=state.city,hoods=hoodPopular(city).slice(0,4);
 const properties=cityItems().filter(x=>x.kind==='imovel'&&x.status==='active').slice(0,2);
 const businesses=cityBiz().filter(x=>!isSpon(x)).sort((a,b)=>(b.recN||0)-(a.recN||0)).slice(0,3);
 const questions=cityAsks().filter(q=>q.status==='ok').slice(0,3);
 const groups=cityGroups().filter(g=>!groupClosed(g)).slice(0,3);
 let h='<div class="guide-r73"><header class="page-head"><div><h1>Guia de '+esc(city)+'</h1><p>O que a comunidade sabe sobre viver e chegar a esta cidade.</p></div></header>'+
  '<div class="guide-r73-actions">'+btn('Encontrar imóvel','intent','imovel','tonal','apartment')+btn('Ver serviços','businesses','','outlined','storefront')+btn('Perguntar','ask','','outlined','forum')+'</div>';
 h+='<section class="section"><div class="section-title"><h2>Bairros para conhecer</h2></div><p class="small muted">Explore imóveis por bairro. A lista utiliza os bairros mais presentes nas informações desta versão.</p>'+
   (hoods.length?'<div class="guide-r73-hoods">'+hoods.map(x=>'<button type="button" class="guide-r73-hood" data-action="guide-hood" data-value="'+esc(x.name)+'">'+icon('location_on')+'<span><b>'+esc(x.name)+'</b><small>'+esc(x.zone)+'</small></span>'+icon('arrow_forward')+'</button>').join('')+'</div>':empty('Sem bairros cadastrados','Comece pesquisando imóveis e serviços nesta cidade.','map','intent','Ver imóveis'))+'</section>';
 h+='<section class="section">'+sectionTitle('Moradia em '+city,'Todos os imóveis','intent','imovel')+
  (properties.length?'<div class="guide-r73-properties">'+properties.map(photoCard).join('')+'</div>':empty('Nenhum imóvel anunciado','Você pode acompanhar novos anúncios e consultar outras regiões.','apartment','intent','Ver imóveis'))+'</section>';
 h+='<section class="section">'+sectionTitle('Serviços que indicaram','Todos os negócios','businesses')+
  (businesses.length?'<div class="guide-r73-businesses">'+businesses.map(businessCard).join('')+'</div>':
  empty('Faltam indicações de serviços','Compartilhe um profissional que já ajudou sua família.','storefront',readonly()?'':'indicate',readonly()?'':'Indicar alguém'))+'</section>';
 h+='<section class="section">'+sectionTitle('Perguntas que já ajudaram','Abrir comunidade','nav','comunidade')+
  (questions.length?'<div class="list">'+questions.map(questionRow).join('')+'</div>':
  empty('As primeiras respostas aparecem aqui','Pergunte à comunidade e ajude outras famílias a encontrar informação.','forum',readonly()?'':'ask',readonly()?'':'Pedir indicação'))+'</section>';
 if(groups.length)h+='<section class="section">'+sectionTitle('Pessoas com interesses em comum','Encontrar grupos','groups')+
  '<div class="list">'+groups.map(g=>groupRow(g,{cta:true})).join('')+'</div></section>';
 h+='<section class="section guide-r73-checklist"><h2>Para organizar sua chegada</h2><div class="guide-r73-steps">'+
  '<div><b>Moradia e deslocamento</b><p>Compare bairros, escolas, distância e condições de locação.</p>'+btn('Pesquisar imóveis','intent','imovel','text','apartment')+'</div>'+
  '<div><b>Mudança e transporte</b><p>Solicite propostas com o mesmo inventário, prazos e cobertura de danos.</p>'+btn('Buscar prestadores','guide-search','mudança','text','local_shipping')+'</div>'+
  '<div><b>Escola e saúde</b><p>Consulte experiências locais e confirme a disponibilidade diretamente.</p>'+btn('Buscar escolas','guide-search','escola','text','school')+'</div>'+
  '</div></section></div>';
 return h;
}
