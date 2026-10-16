// Rodada 27: anúncio de imóvel em etapas (referência do Mobbin: fluxo "Listing a product" do
// eBay, uma decisão por tela e revisão antes de publicar). Só para criar imóvel: editar continua
// no formulário único, e desapego continua numa página só, como no Depop. Os campos mantêm os
// mesmos ids, então publicar, salvar rascunho e fotos seguem os caminhos de sempre.
const WIZ_STEPS=[['O imóvel',['item-ptype','item-title','item-hood','item-beds','item-area']],['Valores e disponibilidade',['item-price']],['Comodidades e descrição',['item-desc']],['Fotos',[]],['Revisão',[]]];
let wizStep=1;
function propertyWizardHtml(x){
 const step=(n,body)=>`<section class="wiz-step form-grid" data-step="${n}" aria-labelledby="wiz-t${n}"${n===1?'':' hidden'}><h3 class="full wiz-title" id="wiz-t${n}" tabindex="-1">${WIZ_STEPS[n-1][0]}</h3>${body}</section>`;
 return `<div class="wiz"><div class="wiz-progress"><div class="wiz-bar" aria-hidden="true"><span></span></div><p class="wiz-count" id="wiz-count" aria-live="polite"></p></div>
${step(1,`${selectField('item-ptype','Tipo de imóvel',[['','Escolher tipo'],...PROPERTY_TYPES],x.ptype||'','required')}${field('item-title','Título do anúncio',x.title,'required minlength="5" maxlength="100" class="full" supporting-text="Ex.: Apartamento 2 quartos perto da Base Aérea"')}${selectField('item-hood','Bairro',[['','Escolher bairro'],...HOODS],x.hood,'required')}${field('item-beds','Quartos',x.beds,'type="number" min="0" max="20" required')}${field('item-area','Área (m²)',x.area,'type="number" min="10" max="100000" required')}${field('item-parking','Vagas',x.parking,'type="number" min="0" max="20"')}`)}
${step(2,`${field('item-price','Aluguel mensal (R$)',x.numPrice,'type="number" min="1" step="0.01" required inputmode="decimal"')}${field('item-condo','Condomínio (R$)',x.condo||'','type="number" min="0" inputmode="decimal"')}${field('item-avail','Disponível a partir de (opcional)',x.avail||'',`type="date" min="${dateISO(0)}" supporting-text="Em branco: disponível agora" class="full"`)}<p class="form-note full">Quem procura vê o total do mês: aluguel + condomínio.</p>`)}
${step(3,`<div class="full attr-group" role="group" aria-labelledby="item-amen-label"><span class="attr-label" id="item-amen-label">Comodidades</span><md-chip-set id="item-amen">${PROPERTY_AMENITIES.map(([v,l])=>`<md-filter-chip label="${esc(l)}" data-value="${v}" ${(x.amen||[]).includes(v)?'selected':''}></md-filter-chip>`).join('')}</md-chip-set></div>${field('item-desc','Descrição',x.desc,'type="textarea" rows="4" required minlength="12" maxlength="2000" class="full"')}`)}
${step(4,photoUploadHtml())}
${step(5,'<div class="full" id="wiz-review"></div>')}
<p class="form-note">Publicado em ${esc(state.homeCity)}. O endereço exato não aparece no anúncio.</p></div>`;
}
function propertyWizardActions(){return `${btn('Salvar rascunho','save-draft','','text')}<span class="wiz-gap"></span>${btn('Voltar','wiz-prev','','text')}${btn('Continuar','wiz-next','','filled')}${btn('Publicar anúncio','submit-item','','filled')}`;}
// Revisão: prévia do cartão como quem procura vai ver, e cada parte com atalho para corrigir.
function wizReviewHtml(){
 const d=itemForm(),total=(Number(d.numPrice)||0)+(Number(d.condo)||0),later=d.avail&&d.avail>dateISO(0);
 const preview={...d,id:'preview',city:state.homeCity,status:'active',per:'/mês',price:money(d.numPrice||0),saved:false,mine:false,demo:false};
 const row=(n,label,value)=>`<div class="wiz-row"><div><small>${label}</small><b>${esc(value)}</b></div>${btn('Editar','wiz-go',String(n),'text')}</div>`;
 const amen=(d.amen||[]).map(amenityLabel).filter(Boolean);
 return `<p class="form-note">Confira antes de publicar. É assim que o cartão aparece para quem procura.</p><div class="wiz-preview" inert>${photoCard(preview)}</div><div class="wiz-rows">${row(1,'O imóvel',[d.ptype,d.beds!=null&&d.beds!==''?`${d.beds} quartos`:'',d.area?`${d.area} m²`:'',d.parking?`${d.parking} vagas`:'',d.hood].filter(Boolean).join(' · '))}${row(2,'Total por mês',`${money(total)}${d.condo?` (aluguel ${money(d.numPrice||0)} + condomínio ${money(d.condo)})`:''} · ${later?`disponível a partir de ${new Date(`${d.avail}T12:00`).toLocaleDateString('pt-BR')}`:'disponível agora'}`)}${row(3,'Comodidades',amen.length?amen.join(', '):'Nenhuma marcada')}${row(4,'Fotos',d.photos.length?`${d.photos.length} ${d.photos.length===1?'foto':'fotos'}`:'Sem fotos: o cartão mostra um ícone')}</div>`;
}
function wizShow(n){
 const box=$('#dialog .wiz');if(!box)return;wizStep=Math.min(Math.max(1,n),WIZ_STEPS.length);
 for(const s of $$('.wiz-step',box))s.hidden=Number(s.dataset.step)!==wizStep;
 $('.wiz-bar span',box).style.width=`${Math.round(wizStep/WIZ_STEPS.length*100)}%`;
 $('#wiz-count').textContent=`Etapa ${wizStep} de ${WIZ_STEPS.length} · ${WIZ_STEPS[wizStep-1][0]}`;
 if(wizStep===WIZ_STEPS.length)$('#wiz-review').innerHTML=wizReviewHtml();
 const show=(action,on)=>{const b=$(`#dialog [data-action="${action}"]`);if(b)b.style.display=on?'':'none';};
 show('wiz-prev',wizStep>1);show('wiz-next',wizStep<WIZ_STEPS.length);show('submit-item',wizStep===WIZ_STEPS.length);
 requestAnimationFrame(()=>$(`#wiz-t${wizStep}`)?.focus({preventScroll:false}));
}
function openPropertyWizard(x,draftId){
 editor={kind:'item',type:'imovel',id:null,draftId,photos:[...(x.photos||[])],wizard:true};editorDirty=false;
 showDialog('Anunciar imóvel',propertyWizardHtml(x),propertyWizardActions(),'editor');
 wizStep=1;wizShow(1);
}
function wizardAction(action,value){
 if(!['wiz-next','wiz-prev','wiz-go'].includes(action))return false;
 if(!editor?.wizard||!$('#dialog .wiz'))return true;
 if(action==='wiz-prev'){wizShow(wizStep-1);return true;}
 if(action==='wiz-go'){wizShow(Number(value)||1);return true;}
 if(!validFields(WIZ_STEPS[wizStep-1][1]))return true;
 if(wizStep===1&&!PROPERTY_TYPES.includes($('#item-ptype').value)){notify('Escolha o tipo de imóvel.','error');$('#item-ptype').focus();return true;}
 wizShow(wizStep+1);return true;
}
// Publicar com algum campo inválido leva ao passo onde ele está.
function wizEnsureValid(){
 for(const [n,[,ids]] of WIZ_STEPS.entries()){const bad=ids.find(id=>{const e=$('#'+id);return e?.checkValidity&&!e.checkValidity();})||(n===0&&!PROPERTY_TYPES.includes($('#item-ptype')?.value)?'item-ptype':'');if(bad){wizShow(n+1);requestAnimationFrame(()=>{$('#'+bad)?.reportValidity?.();$('#'+bad)?.focus();});return false;}}
 return true;
}
