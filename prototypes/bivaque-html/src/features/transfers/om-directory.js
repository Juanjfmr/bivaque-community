// Consulta documental demonstrativa. Nao grava OM no perfil nem calcula distancia.
let omSelectedId='';
function omNormalize(x){return (x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();}
function omMatches(q){
 const text=omNormalize(q);
 return OM_DIRECTORY.filter(o=>text.length>=2 ?
   omNormalize([o.name,o.acronym,o.city,o.uf,o.force].join(' ')).includes(text):
   o.city===state.city).slice(0,40);
}
function omDirectoryResults(q){
 const rows=omMatches(q);
 if(!rows.length)return '<p class="form-note">Nenhuma OM encontrada. Busque por nome, sigla ou cidade.</p>';
 return rows.map(o=>'<button type="button" class="fchip" data-action="om-select" data-value="'+o.id+'" style="display:flex;width:100%;text-align:left;align-items:center;gap:8px;margin:5px 0;padding:12px;white-space:normal">'+icon('military_tech')+'<span><strong>'+esc(o.acronym||o.name)+'</strong>'+(o.acronym?' · '+esc(o.name):'')+'<small style="display:block">'+esc(o.force)+' · '+esc(o.city)+'/'+esc(o.uf)+'</small></span></button>').join('');
}
function renderOmGuidePanel(){
 const chosen=OM_DIRECTORY.find(o=>o.id===omSelectedId);
 let html='<article class="guide-card"><h3>Encontre uma Organização Militar</h3><p>Consulte por nome, sigla ou cidade. A lista é documental; não confirma a lotação de ninguém.</p>';
 if(chosen)html+='<p class="form-note"><strong>'+esc(chosen.acronym||chosen.name)+'</strong> · '+esc(chosen.city)+'/'+esc(chosen.uf)+' · '+esc(chosen.force)+'</p>';
 html+=btn(chosen?'Trocar OM':'Selecionar OM','om-open','','text','search');
 if(chosen)html+=btn('Limpar escolha','om-clear','','text','close');
 html+='<p class="form-note">Proximidade de imóveis indisponível até validar o acesso público da instalação. Enquanto isso, busque imóveis por cidade e bairro.</p>';
 if(chosen&&chosen.city===state.city)html+=btn('Imóveis desta cidade','intent','imovel','text','apartment');
 return html+'</article>';
}
async function omDirectoryAction(action,value){
 if(action==='om-open'){
  const body='<label for="om-directory-query">Nome, sigla ou cidade</label><input id="om-directory-query" class="input" type="search" placeholder="Digite pelo menos 2 caracteres" autocomplete="off"><p class="form-note">Nenhuma escolha é vinculada ao seu perfil.</p><div id="om-directory-results" style="max-height:48vh;overflow-y:auto">'+omDirectoryResults('')+'</div>';
  showDialog('Buscar Organização Militar',body,btn('Fechar','close-dialog','','text'),'om-directory');
  document.getElementById('om-directory-query')?.focus();return true;
 }
 if(action==='om-select'){
  if(!OM_DIRECTORY.some(o=>o.id===value))return true;
  omSelectedId=value;
  if(dialog.open)await closeDialog(true);
  render();notify('OM selecionada apenas para esta consulta.');return true;
 }
 if(action==='om-clear'){omSelectedId='';render();return true;}
 return false;
}
document.addEventListener('input',event=>{
 if(event.target?.id!=='om-directory-query')return;
 const box=document.getElementById('om-directory-results');
 if(box)box.innerHTML=omDirectoryResults(event.target.value);
});
