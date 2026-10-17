const SYNONYMS={dentista:'odonto odontopediatra odontopediatria',pediatra:'pediatria',escola:'colegio escolas',mecanico:'mecanica oficina',eletricista:'eletrica',diarista:'faxina limpeza',mudanca:'transportadora frete',berco:'berço',imovel:'apartamento casa imóveis',saude:'odontopediatria pediatra clinica',pets:'veterinario veterinaria',climatizacao:'ar condicionado split',carro:'mecanica oficina despachante',casa:'eletrica limpeza reparos',aula:'aulas reforco'};
function queryTerms(q){return norm(q).split(/[^a-z0-9]+/).filter(x=>x.length>1&&!['de','da','do','das','dos','em','no','na','para','com','um','uma','por','perto'].includes(x));}
function matches(q,text,keywords=[]){const terms=queryTerms(q);if(!terms.length)return true;const hay=norm(text+' '+keywords.join(' '));return terms.every(w=>hay.includes(w)||(SYNONYMS[w]||'').split(' ').some(s=>s&&hay.includes(norm(s))));}
function matchingBiz(q){return cityBiz().filter(b=>b.claimed!==false&&matches(q,b.name+' '+b.cat+' '+b.svc.join(' ')+' '+(b.specs||[]).join(' '),b.kw||[])).slice(0,3);}
function searchLists(){const q=searchQuery.trim();return {items:cityItems().filter(i=>i.status==='active'&&matches(q,i.title+' '+i.desc+' '+i.hood)),biz:cityBiz().filter(b=>matches(q,b.name+' '+b.cat+' '+b.svc.join(' ')+' '+(b.specs||[]).join(' ')+' '+b.hoods.join(' '),b.kw||[])),asks:cityAsks().filter(a=>matches(q,a.q+' '+a.topic,a.keywords||[])),groups:cityGroups().filter(g=>matches(q,g.t+' '+g.about)),events:state.events.filter(e=>e.city===state.city&&e.date>=dateISO()&&matches(q,e.title+' '+e.description+' '+e.place))};}
function renderSearch(){return `<div class="page-head search-head"><div><h1>Buscar em ${esc(state.city)}</h1><p>Encontre oportunidades, negócios e respostas da comunidade.</p></div></div>${filterChips([['all','Tudo'],['items','Anúncios'],['biz','Negócios'],['asks','Indicações'],['groups','Grupos'],['events','Encontros']],searchType,'search-type')}<div id="search-results">${searchResults()}</div>`;}
function searchResults(){
 if(!searchQuery.trim())return searchStartSections();
 const groups=searchLists(),count=Object.entries(groups).filter(([k])=>searchType==='all'||searchType===k).reduce((n,[,v])=>n+v.length,0),suggest=searchSuggestHtml(searchQuery,groups);
 if(!count)return `${suggest}<section class="section">${empty('Nada sobre “'+searchQuery+'”','Tente termos mais simples. Se a dúvida ainda não tiver resposta, pergunte à comunidade.','search_off',readonly()?'':'ask-from-search',readonly()?'':'Pedir indicação')}</section>`;
 let h=`${suggest}<p class="small muted" style="margin-top:18px">${count} ${count===1?'resultado':'resultados'} em ${esc(state.city)}</p>`;
 if(groups.items.length&&(searchType==='all'||searchType==='items'))h+=`<section class="section">${sectionTitle('Anúncios')}<div class="card-grid">${groups.items.map(photoCard).join('')}</div></section>`;
 if(groups.biz.length&&(searchType==='all'||searchType==='biz'))h+=`<section class="section">${sectionTitle('Negócios')}<div class="card-grid">${groups.biz.map(businessCard).join('')}</div></section>`;
 if(groups.asks.length&&(searchType==='all'||searchType==='asks'))h+=`<section class="section">${sectionTitle('Indicações e respostas')}<div class="list">${groups.asks.map(questionRow).join('')}</div></section>`;
 if(groups.groups.length&&(searchType==='all'||searchType==='groups'))h+=`<section class="section">${sectionTitle('Grupos')}<div class="list">${groups.groups.map(groupRow).join('')}</div></section>`;
 if(groups.events.length&&(searchType==='all'||searchType==='events'))h+=`<section class="section">${sectionTitle('Encontros')}<div class="list">${groups.events.map(eventRow).join('')}</div></section>`;return h;
}

// Rodada 10: histórico e sugestões em seções separadas. Rodada 44 (maquete aprovada em 17/10/2026;
// referências: Fresha e Perplexity, no Mobbin): buscas recentes e sugestões viram linhas tocáveis,
// com a seta que completa o texto sem buscar, e "Explorar" leva direto à tela filtrada.
const SEARCH_EXPLORE=[['Saúde','svg-health'],['Educação','school'],['Casa e reparos','build'],['Mudança e transporte','local_shipping'],['Pets','pets'],['Festas e comida','cake'],['Limpeza e jardim','home']];
const SVG_HEALTH='<svg class="inline-svg" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="5"/><path d="M12 8v8M8 12h8"/></svg>';
function searchRow(text,ic,label=''){return `<div class="search-row"><button type="button" class="search-row-go" data-action="recent-search" data-value="${esc(text)}">${icon(ic)}<span class="grow">${label||esc(text)}</span></button><button type="button" class="search-fill" data-action="search-fill" data-value="${esc(text)}" aria-label="Completar com ${esc(text)}">${icon('arrow_back')}</button></div>`;}
function searchStartSections(){
 const suggestions=['escola','berço','mudança','mecânico'].filter(x=>!state.recent.some(r=>norm(r)===norm(x)));
 const recent=state.recent.length?`<section class="section search-sec"><div class="section-title"><h2>Buscas recentes</h2>${btn('Limpar','clear-recent','','text')}</div>${state.recent.slice(0,5).map(x=>searchRow(x,'history')).join('')}</section>`:'';
 const biz=cityBiz(),count=g=>biz.filter(b=>b.cat===g&&b.claimed!==false).length,items=cityItems().filter(x=>x.status==='active');
 const tiles=[...SEARCH_EXPLORE.filter(([g])=>count(g)).slice(0,6).map(([g,ic])=>[`biz|${g}`,ic,g,`${count(g)} ${count(g)===1?'negócio':'negócios'}`]),['imovel','apartment','Imóveis',`${items.filter(x=>x.kind==='imovel').length} para alugar`],['desapego','chair','Desapegos',`${items.filter(x=>x.kind!=='imovel').length} à venda`]];
 const explore=`<section class="section search-sec"><h2>Explorar em ${esc(state.city)}</h2><div class="search-tiles">${tiles.map(([v,ic,t,sub])=>`<button type="button" class="search-tile" data-action="search-explore" data-value="${esc(v)}">${ic==='svg-health'?SVG_HEALTH:icon(ic)}<span><b>${esc(t)}</b><small>${esc(sub)}</small></span></button>`).join('')}</div></section>`;
 const sug=suggestions.length?`<section class="section search-sec"><h2>Sugestões</h2>${suggestions.map(x=>searchRow(x,'trending_up')).join('')}</section>`:'';
 return recent+explore+sug;
}
// Enquanto digita: até duas palavras que completam o texto e, para cada tipo com resultado, um atalho.
function searchSuggestHtml(q,groups){
 const nq=norm(q).trim();if(nq.length<2)return '';
 const vocab=[...state.recent,...Object.keys(SYNONYMS),...SERVICE_GROUPS.flatMap(([g,specs])=>[g,...specs]),...ITEM_CATEGORIES,...cityBiz().flatMap(b=>b.hoods||[])];
 const seen=new Set(),words=[];
 for(const w of vocab){const nw=norm(w);if(nw===nq||seen.has(nw)||!(nw.startsWith(nq)||nw.split(/\s+/).some(t=>t.startsWith(nq))))continue;seen.add(nw);words.push(w.toLowerCase());if(words.length===2)break;}
 const mark=t=>norm(t.slice(0,q.trim().length))===norm(q.trim())?`<b>${esc(t.slice(0,q.trim().length))}</b>${esc(t.slice(q.trim().length))}`:esc(t);
 const scopes=[['biz','storefront','Negócios','negócio','negócios'],['items','sell','Anúncios','anúncio','anúncios'],['asks','forum','Indicações','resposta','respostas']].filter(([k])=>groups[k].length&&searchType==='all');
 const rows=[...words.map(w=>searchRow(w,'search',mark(w))),...scopes.map(([k,ic,label,one,many])=>`<div class="search-row"><button type="button" class="search-row-go" data-action="search-type" data-value="${k}">${icon(ic)}<span class="grow">${mark(q.trim())} em ${label}</span><small>${groups[k].length} ${groups[k].length===1?one:many}</small></button></div>`)];
 return rows.length?`<section class="search-sec search-suggest" aria-label="Sugestões para a busca">${rows.join('')}</section>`:'';
}
