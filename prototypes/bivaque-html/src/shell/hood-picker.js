// Rodada 66: campo de bairro com busca, no lugar da lista fixa de Manaus. Aceita o nome do bairro (sem
// acento), o CEP ou a localização do aparelho. O CEP e as coordenadas só servem para achar o bairro:
// não vão para o formulário nem para o armazenamento. Fora da base, a pessoa usa o texto como está.
const hoodNorm=s=>norm(s).replace(/\s+/g,' ').trim();
const hoodsOf=city=>(BAIRROS[city]||[]).map(([name,zone,pt])=>({name,zone,pt,city}));
const hoodInfo=(name,city=state.homeCity)=>{const q=hoodNorm(name);return q?hoodsOf(city).find(h=>hoodNorm(h.name)===q)||null:null;};
// Distância em km entre dois pontos [longitude, latitude] (fórmula de haversine).
function hoodKm([lng1,lat1],[lng2,lat2]){const r=Math.PI/180,a=Math.sin((lat2-lat1)*r/2)**2+Math.cos(lat1*r)*Math.cos(lat2*r)*Math.sin((lng2-lng1)*r/2)**2;return 12742*Math.asin(Math.sqrt(a));}
// Tem CEP: um trecho de pelo menos 5 números (com ponto, hífen ou espaço no meio), mesmo junto de texto
// ("CEP 59075-000", "Rua X, 69050-000"). Devolve os números desse trecho ou ''. "Parque 10" não é CEP.
const hoodCep=s=>(String(s||'').match(/\d[\d.\s-]*\d/g)||[]).map(x=>x.replace(/\D/g,'')).find(x=>x.length>=5)||'';
const HOOD_CEP_MSG='Escolha o bairro na lista. O CEP não fica salvo.';
const HOOD_FAR_KM=30;
// Os mais escolhidos da cidade: bairros que mais aparecem em anúncios, pedidos e negócios; depois a ordem da base.
function hoodPopular(city){
 const n=new Map(),add=h=>{const i=hoodInfo(h,city);if(i)n.set(i.name,(n.get(i.name)||0)+1);};
 for(const x of state.items||[])if(x.city===city)add(x.hood);
 for(const r of state.requests||[])if(r.city===city)add(r.hood);
 for(const b of state.biz||[])if(b.city===city)(b.hoods||[]).forEach(add);
 return hoodsOf(city).map((h,i)=>[h,n.get(h.name)||0,i]).sort((a,b)=>b[1]-a[1]||a[2]-b[2]).slice(0,4).map(([h])=>h);
}
// Valor do campo para gravar: o nome da base quando bate (sem acento ou com outra caixa), senão o texto limpo.
// Nunca devolve CEP: com CEP no campo, devolve vazio (vale para enviar e para salvar rascunho).
function hoodValue(id,city=state.homeCity){const v=String($('#'+id)?.value||'').replace(/\s+/g,' ').trim();return hoodCep(v)?'':hoodInfo(v,city)?.name||v;}
function hoodProblem(value,city=state.homeCity){return hoodCep(value)?HOOD_CEP_MSG:!value&&hoodsOf(city).length?'Escolha o bairro.':'';}
function hoodPicker(id,label,value='',{city=state.homeCity,required=hoodsOf(city).length>0,help='Só o bairro aparece no que você publica.'}={}){
 const info=hoodInfo(value,city),sup=info?`${city} · ${info.zone}`:help;
 const f=field(id,required?label:`${label} (opcional)`,value,`${required?'required ':''}maxlength="60" autocomplete="off" placeholder="Digite o bairro ou o CEP" supporting-text="${esc(sup)}"`).replace('></md-outlined-text-field>',`>${icon('search','leading-icon')}</md-outlined-text-field>`);
 return `<div class="hood-pick full" data-city="${esc(city)}" data-help="${esc(help)}">${f}<div class="hood-menu" id="${id}-menu" role="group" aria-label="Sugestões de bairro" hidden></div><span class="sr" aria-live="polite"></span>${hoodsOf(city).length?`<button type="button" class="hood-loc" data-hood-loc>${icon('place')}Usar minha localização</button>`:''}</div>`;
}
function hoodMark(name,q){const i=q?hoodNorm(name).indexOf(q):-1;return i<0?esc(name):`${esc(name.slice(0,i))}<mark>${esc(name.slice(i,i+q.length))}</mark>${esc(name.slice(i+q.length))}`;}
function hoodOpt(name,sub,ic='location_on',q=''){return `<button type="button" class="hood-opt" data-hood-name="${esc(name)}" data-hood-sub="${esc(sub)}">${icon(ic)}<span class="txt"><b>${hoodMark(name,q)}</b><small>${esc(sub)}</small></span></button>`;}
function hoodMenuHtml(raw,city){
 const cep=hoodCep(raw),list=hoodsOf(city);
 if(cep){
  const note=`<p class="hood-note">${icon('lock')}O CEP só serve para achar o bairro e não fica salvo.</p>`;
  if(cep.length<8)return `<p class="hood-note">${icon('pin')}Continue digitando: o CEP tem 8 números.</p>${note}`;
  const hit=cep.length===8?CEP_TESTE[cep]:null;
  if(!hit)return `<p class="hood-note">${icon('pin')}CEP não encontrado no modo teste. Digite o nome do bairro.</p>${note}`;
  if(hit[0]!==city)return `<p class="hood-note">${icon('pin')}Esse CEP é de ${esc(hit[0])}. Aqui vale um bairro de ${esc(city)}.</p>${note}`;
  return hoodOpt(hit[1],`${city} · pelo CEP`,'pin')+note;
 }
 const q=hoodNorm(raw);
 if(!q)return list.length?`<p class="hood-head">Mais escolhidos em ${esc(city)}</p>${hoodPopular(city).map(h=>hoodOpt(h.name,h.zone)).join('')}`:'';
 const found=list.filter(h=>hoodNorm(h.name).includes(q)).sort((a,b)=>hoodNorm(b.name).startsWith(q)-hoodNorm(a.name).startsWith(q)).slice(0,6);
 const text=String(raw).replace(/\s+/g,' ').trim(),free=found.some(h=>hoodNorm(h.name)===q)?'':`<button type="button" class="hood-opt hood-free" data-hood-name="${esc(text)}" data-hood-sub="${esc(city)} · bairro digitado">${icon('edit')}<span class="txt"><b>Usar “${esc(text)}” como está</b><small>${found.length?'Não é nenhum destes':'Não está na lista de '+esc(city)}</small></span></button>`;
 return found.map(h=>hoodOpt(h.name,`${city} · ${h.zone}`,'location_on',q)).join('')+free;
}
const hoodPickOf=el=>el?.closest?.('.hood-pick');
function hoodMenu(pick,open=true){
 const f=$('md-outlined-text-field',pick),m=$('.hood-menu',pick),html=open?hoodMenuHtml(f.value,pick.dataset.city):'';
 m.innerHTML=html;m.hidden=!html;
 // Leitor de tela: só a contagem é anunciada (a lista inteira seria relida a cada letra).
 const n=$$('.hood-opt',m).length,live=$('.sr',pick);if(live)live.textContent=open&&n?`${n} ${n===1?'sugestão':'sugestões'}. Use as setas para escolher.`:'';
}
function hoodSet(pick,name,sub){
 const f=$('md-outlined-text-field',pick);f.value=name;f.error=false;f.setCustomValidity?.('');f.supportingText=sub||pick.dataset.help;hoodMenu(pick,false);editorDirty=true;
}
// Ao sair do campo: nome da base escrito de outro jeito vira o nome certo; CEP sem escolha fica inválido.
function hoodSettle(pick){
 const f=$('md-outlined-text-field',pick),city=pick.dataset.city,info=hoodInfo(f.value,city);
 if(info){f.value=info.name;f.supportingText=`${city} · ${info.zone}`;}
 else if(!f.value.trim())f.supportingText=pick.dataset.help;
 f.setCustomValidity?.(hoodCep(f.value)?HOOD_CEP_MSG:'');
}
function hoodLocate(pick){
 const city=pick.dataset.city,list=hoodsOf(city);
 if(!navigator.geolocation){notify('Este aparelho não informa a localização. Digite o bairro ou o CEP.','info');return;}
 // A resposta pode chegar depois de a janela fechar: aí não mexe em nada.
 navigator.geolocation.getCurrentPosition(pos=>{if(!pick.isConnected)return;
  const here=[pos.coords.longitude,pos.coords.latitude],best=list.map(h=>[h,hoodKm(here,h.pt)]).sort((a,b)=>a[1]-b[1])[0];
  if(!best||best[1]>HOOD_FAR_KM){notify(`Sua localização não fica em ${city}. Digite o bairro.`,'info');return;}
  hoodSet(pick,best[0].name,`${city} · ${best[0].zone} · pela localização`);$('md-outlined-text-field',pick).focus();hoodMenu(pick,false);
 },()=>{if(pick.isConnected)notify('Não deu para usar a localização. Digite o bairro ou o CEP.','info');},{enableHighAccuracy:false,timeout:10000,maximumAge:0});
}
document.addEventListener('input',e=>{const pick=hoodPickOf(e.target);if(!pick||e.target.tagName!=='MD-OUTLINED-TEXT-FIELD')return;e.target.error=false;e.target.setCustomValidity?.('');e.target.supportingText=pick.dataset.help;hoodMenu(pick);});
document.addEventListener('focusin',e=>{const pick=hoodPickOf(e.target);if(pick&&e.target.tagName==='MD-OUTLINED-TEXT-FIELD')hoodMenu(pick);});
document.addEventListener('focusout',e=>{const pick=hoodPickOf(e.target);if(!pick||pick.contains(e.relatedTarget))return;hoodMenu(pick,false);hoodSettle(pick);});
// Tocar na sugestão não tira o foco do campo (o menu não some antes do clique).
document.addEventListener('mousedown',e=>{if(e.target.closest?.('.hood-opt'))e.preventDefault();});
document.addEventListener('click',e=>{
 const opt=e.target.closest?.('.hood-opt'),loc=e.target.closest?.('[data-hood-loc]'),pick=hoodPickOf(opt||loc);if(!pick)return;
 if(opt){hoodSet(pick,opt.dataset.hoodName,opt.dataset.hoodSub);$('md-outlined-text-field',pick).focus();hoodMenu(pick,false);}
 else hoodLocate(pick);
});
document.addEventListener('keydown',e=>{
 const pick=hoodPickOf(e.target);if(!pick)return;
 const opts=$$('.hood-opt',pick),i=opts.indexOf(document.activeElement);
 if(e.key==='Escape'&&!$('.hood-menu',pick).hidden){e.preventDefault();e.stopPropagation();$('md-outlined-text-field',pick).focus();hoodMenu(pick,false);}
 else if(e.key==='ArrowDown'&&opts.length){e.preventDefault();opts[Math.min(opts.length-1,i+1)].focus();}
 else if(e.key==='ArrowUp'&&i>=0){e.preventDefault();(i?opts[i-1]:$('md-outlined-text-field',pick)).focus();}
},true);
