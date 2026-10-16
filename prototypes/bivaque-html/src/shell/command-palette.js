// Rodada 14: paleta de busca e comandos (Ctrl+K ou ⌘K, e "/"), só no desktop. Referências:
// paletas de comando do 21st.dev (Command Menu with Global Search, Command Palette). Busca
// agrupada (negócios, anúncios, perguntas, grupos), páginas, ações de criar e buscas recentes.
const PALETTE_MAC=/Mac|iPhone|iPad/.test(navigator.platform||'');
const PALETTE_PAGES=[['home','Início','nav','inicio','inicio'],['forum','Comunidade','nav','comunidade','perguntas indicacoes grupos'],['chat_bubble','Conversas','nav','conversas','mensagens'],['storefront','Negócios locais','businesses','','servicos empresas'],['sell','Desapegos e imóveis','catalog-all','','anuncios catalogo'],['event','Agenda da cidade','agenda','','encontros eventos'],['bookmark','Salvos','saved','','favoritos'],['build','Pedidos de serviço','requests','','propostas orcamento'],['map','Guia da cidade','guide','','chegada mudanca'],['person','Você','nav','voce','perfil conta']];
const PALETTE_CREATE=[['volunteer_activism','Pedir indicação','ask','','pergunta comunidade'],['build','Contratar serviço','create-request','','pedido proposta orcamento'],['sell','Anunciar desapego','create-item','','vender anuncio'],['apartment','Anunciar imóvel','create-property','','aluguel venda casa'],['event','Criar encontro','create-event','','evento agenda'],['add_business','Indicar um negócio','indicate','','recomendar']];
let paletteItems=[],paletteActive=0,paletteReturn=null;
const PALETTE_BEHIND=['#main','#nav','#topbar','#fab','#detail-actions'];
function paletteEl(){let el=$('#palette');if(el)return el;document.body.insertAdjacentHTML('beforeend',`<div id="palette" class="palette" hidden><div class="palette-scrim" data-palette-close></div><div class="palette-box" role="dialog" aria-modal="true" aria-label="Buscar e ir para"><div class="palette-field">${icon('search')}<input id="palette-input" type="text" role="combobox" aria-label="Buscar ou ir para" aria-expanded="true" aria-controls="palette-list" aria-autocomplete="list" autocomplete="off" spellcheck="false" placeholder="Buscar negócios, anúncios, perguntas ou ir para…"><kbd data-palette-close>Esc</kbd></div><div id="palette-list" class="palette-list" role="listbox" aria-label="Resultados"></div><div id="palette-count" class="palette-live" aria-live="polite"></div><div class="palette-foot" aria-hidden="true"><span><kbd>↑</kbd><kbd>↓</kbd> navegar</span><span><kbd>↵</kbd> abrir</span><span><kbd>Esc</kbd> fechar</span></div></div></div>`);el=$('#palette');
 el.addEventListener('click',e=>{if(e.target.closest('[data-palette-close]')){closePalette();return;}const opt=e.target.closest('[data-palette-index]');if(opt)runPalette(Number(opt.dataset.paletteIndex));});
 el.addEventListener('mousemove',e=>{const opt=e.target.closest('[data-palette-index]');if(opt&&Number(opt.dataset.paletteIndex)!==paletteActive)setPaletteActive(Number(opt.dataset.paletteIndex),false);});
 el.addEventListener('mousedown',e=>{if(!e.target.closest('#palette-input'))e.preventDefault();});
 el.addEventListener('keydown',e=>{if(e.key==='Tab'){e.preventDefault();$('#palette-input').focus();}else if(e.key==='Escape'&&e.target.id!=='palette-input'){e.preventDefault();e.stopPropagation();closePalette();}});
 const input=$('#palette-input');input.addEventListener('input',()=>renderPalette(input.value));input.addEventListener('keydown',paletteKeys);return el;}
function paletteIsOpen(){const el=$('#palette');return Boolean(el&&!el.hidden);}
// Destaca os termos buscados sem depender de acento (norm preserva o comprimento do texto).
function paletteMark(text,q){const terms=queryTerms(q).filter(t=>t.length>1);if(!terms.length)return esc(text);const chars=[...text],owner=[];let n='';chars.forEach((ch,ci)=>{const part=norm(ch);for(let k=0;k<part.length;k++)owner.push(ci);n+=part;});const hit=new Array(chars.length).fill(false);for(const t of terms){let i=n.indexOf(t);while(i>=0){for(let k=i;k<i+t.length;k++)hit[owner[k]]=true;i=n.indexOf(t,i+t.length);}}
 // Acento solto (texto já decomposto) acompanha a letra anterior.
 chars.forEach((ch,ci)=>{if(ci&&!norm(ch))hit[ci]=hit[ci-1];});let out='',open=false;chars.forEach((ch,i)=>{if(hit[i]&&!open){out+='<mark>';open=true;}if(!hit[i]&&open){out+='</mark>';open=false;}out+=esc(ch);});return out+(open?'</mark>':'');}
function paletteGroups(q){
 const t=q.trim(),entry=([ic,label,action,value,kw])=>({ic,label,action,value,kw}),canCreate=!readonly();
 const pages=PALETTE_PAGES.map(entry),create=canCreate?PALETTE_CREATE.map(entry):[];
 if(!t||!queryTerms(t).length)return [['Ações',create.slice(0,3)],['Ir para',pages.slice(0,6)],['Buscas recentes',state.recent.slice(0,4).map(x=>({ic:'history',label:x,action:'recent-search',value:x}))]];
 const hit=x=>matches(t,`${x.label} ${x.kw||''}`);
 const biz=cityBiz().filter(b=>matches(t,`${b.name} ${b.cat} ${(b.specs||[]).join(' ')} ${b.svc.join(' ')} ${b.hoods.join(' ')}`,b.kw||[])).sort((a,b)=>b.recN-a.recN).slice(0,4).map(b=>({ic:'storefront',label:b.name,sub:`${b.cat}${b.recN?` · ${b.recN} ${b.recN===1?'indicação':'indicações'}`:''}`,action:'open-biz',value:b.id}));
 const items=cityItems().filter(x=>x.status==='active'&&matches(t,`${x.title} ${x.desc||''} ${x.hood}`)).slice(0,4).map(x=>({ic:x.kind==='imovel'?'apartment':'sell',label:x.title,sub:`${money(x.numPrice)}${x.per?' / mês':''} · ${x.hood}`,action:'open-item',value:x.id}));
 const asks=cityAsks().filter(x=>matches(t,x.q)).slice(0,3).map(x=>({ic:'forum',label:x.q,sub:`${x.answers.length} ${x.answers.length===1?'resposta':'respostas'}`,action:'open-question',value:x.id}));
 const groups=state.groups.filter(g=>g.city===state.city&&matches(t,g.t)).slice(0,3).map(g=>({ic:'groups',label:g.t,sub:g.on?'Você participa':'Grupo da cidade',action:'open-group',value:g.id}));
 return [['Negócios',biz],['Anúncios',items],['Perguntas',asks],['Grupos',groups],['Ações',create.filter(hit)],['Ir para',pages.filter(hit)],['',[{ic:'search',label:`Buscar “${t}” em tudo`,action:'recent-search',value:t,all:true}]]];
}
function renderPalette(q){
 const groups=paletteGroups(q).filter(([,list])=>list.length);paletteItems=groups.flatMap(([,list])=>list);let i=0;
 $('#palette-list').innerHTML=groups.map(([title,list])=>`<div class="palette-group" role="group"${title?` aria-label="${esc(title)}"`:''}>${title?`<div class="palette-title" aria-hidden="true">${esc(title)}</div>`:''}${list.map(x=>{const n=i++;return `<div class="palette-option${x.all?' palette-all':''}" role="option" id="palette-opt-${n}" data-palette-index="${n}" aria-selected="false">${icon(x.ic)}<span class="palette-text"><b>${x.all?esc(x.label):paletteMark(x.label,q)}</b>${x.sub?`<small>${esc(x.sub)}</small>`:''}</span><span class="palette-go">${icon('chevron_right')}</span></div>`;}).join('')}</div>`).join('')||`<p class="palette-empty">Nada encontrado.</p>`;
 setPaletteActive(0,false);const count=paletteItems.length;$('#palette-count').textContent=q.trim()?`${count} ${count===1?'resultado':'resultados'}`:'';
}
function setPaletteActive(n,scroll=true){if(!paletteItems.length)return;paletteActive=(n+paletteItems.length)%paletteItems.length;for(const el of $$('.palette-option',$('#palette-list')))el.setAttribute('aria-selected',String(Number(el.dataset.paletteIndex)===paletteActive));$('#palette-input').setAttribute('aria-activedescendant',`palette-opt-${paletteActive}`);if(scroll)$(`#palette-opt-${paletteActive}`)?.scrollIntoView({block:'nearest'});}
function paletteKeys(e){if(e.isComposing||e.keyCode===229)return;if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();setPaletteActive(paletteActive+(e.key==='ArrowDown'?1:-1));}else if(e.key==='Enter'){e.preventDefault();runPalette(paletteActive);}else if(e.key==='Escape'){e.preventDefault();e.stopPropagation();closePalette();}}
function openPalette(){
 if(createOpen||dialog.open||confirmDialog.open)return;const el=paletteEl();if(!el.hidden)return;paletteReturn=document.activeElement;
 el.hidden=false;for(const id of PALETTE_BEHIND)$(id)&&($(id).inert=true);const input=$('#palette-input');input.value='';renderPalette('');
 requestAnimationFrame(()=>{el.classList.add('open');input.focus({preventScroll:true});});
}
function closePalette(restoreFocus=true){const el=$('#palette');if(!el||el.hidden)return;el.classList.remove('open');el.hidden=true;for(const id of PALETTE_BEHIND)$(id)&&($(id).inert=false);syncMobileNavigation();if(restoreFocus&&paletteReturn?.isConnected)paletteReturn.focus({preventScroll:true});paletteReturn=null;}
async function runPalette(n){const x=paletteItems[n];if(!x)return;closePalette(false);await perform(x.action,x.value??'',null);}
// Ctrl+K ou ⌘K em qualquer lugar; "/" fora de campos de texto.
document.addEventListener('keydown',e=>{
 if(!createPanelMQ.matches||e.isComposing||e.defaultPrevented)return;
 if(e.repeat)return;const k=e.key.toLowerCase(),combo=(e.ctrlKey||e.metaKey)&&!e.altKey&&!e.shiftKey&&k==='k',slash=k==='/'&&!e.ctrlKey&&!e.metaKey&&!e.altKey;
 if(!combo&&!slash)return;
 if(slash&&e.composedPath().some(el=>el.matches?.('input,textarea,select,[contenteditable],md-outlined-text-field,md-filled-text-field,md-outlined-select')))return;
 if(paletteIsOpen()){if(combo){e.preventDefault();closePalette();}return;}
 if(createOpen||dialog.open||confirmDialog.open)return;e.preventDefault();openPalette();
});
createPanelMQ.addEventListener('change',()=>{if(!createPanelMQ.matches)closePalette(false);});
window.addEventListener('popstate',()=>closePalette(false));
