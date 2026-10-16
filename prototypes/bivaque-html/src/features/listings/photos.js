// Rodada 18: fotos com arrastar e soltar e galeria em tela cheia. Referências: Image Preview
// Dropzone e File Upload with Preview, do 21st.dev. O processamento é o mesmo para o botão e
// para soltar; a galeria vale para anúncios e negócios, em todas as larguras.
const PHOTO_TYPES=['image/jpeg','image/png','image/webp','image/avif'];
const photoAccepted=f=>PHOTO_TYPES.includes(f.type)||(!f.type&&/\.(jpe?g|png|webp|avif)$/i.test(f.name||''));
async function addEditorPhotos(fileList){
 const current=editor;if(!current)return;if(current.photoBusy){notify('Aguarde terminar de preparar as fotos.','info');return;}
 const typed=[...fileList].filter(photoAccepted);if(typed.length<fileList.length)notify('Use imagens JPG, PNG, WebP ou AVIF.','error');
 const files=typed.slice(0,(current.maxPhotos||6)-current.photos.length).filter(file=>{if(file.size<=12*1024*1024)return true;notify('Use imagens de até 12 MB.','error');return false;});
 const progress=$('#photo-progress');const showProgress=i=>{if(!progress)return;const busy=i<files.length;progress.firstElementChild.style.display=busy?'':'none';progress.style.margin=busy?'8px 0':'0';progress.lastElementChild.textContent=!busy?'':files.length>1?`Preparando foto ${i+1} de ${files.length}…`:'Preparando foto…';};
 const max=current.maxPhotos||6;current.photoBusy=true;
 try{for(const [index,file] of files.entries()){if(current.photos.length>=max)break;showProgress(index);try{const bitmap=await createImageBitmap(file);const scale=Math.min(1,1400/Math.max(bitmap.width,bitmap.height));const canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();if(editor!==current)return;current.photos.push(canvas.toDataURL('image/jpeg',.78));editorDirty=true;$('#photo-previews').innerHTML=photoPreviews();}catch{notify('Não foi possível abrir essa imagem. Tente JPG, PNG ou WebP.','error');}}}finally{current.photoBusy=false;showProgress(files.length);}
}
// Área de fotos aceita arrastar e soltar; o contador de arrastos evita piscar ao passar por filhos.
function bindPhotoDrop(){
 const box=$('.photo-upload');if(!box||box.dataset.drop)return;box.dataset.drop='1';let depth=0;
 const files=e=>[...(e.dataTransfer?.items||[])].some(x=>x.kind==='file');
 box.addEventListener('dragenter',e=>{if(!files(e))return;e.preventDefault();depth++;box.classList.add('is-drag');});
 box.addEventListener('dragover',e=>{if(!files(e))return;e.preventDefault();e.dataTransfer.dropEffect='copy';});
 box.addEventListener('dragleave',()=>{depth=Math.max(0,depth-1);if(!depth)box.classList.remove('is-drag');});
 box.addEventListener('drop',async e=>{e.preventDefault();depth=0;box.classList.remove('is-drag');if(e.dataTransfer?.files?.length)await addEditorPhotos(e.dataTransfer.files);});
}
window.addEventListener('dragover',e=>{if(e.dataTransfer?.types?.includes('Files')&&!e.target.closest?.('.photo-upload')){e.preventDefault();e.dataTransfer.dropEffect='none';}});
window.addEventListener('drop',e=>{if(e.dataTransfer?.types?.includes('Files')&&!e.target.closest?.('.photo-upload'))e.preventDefault();});
function coverEditorPhoto(i){if(!editor||!(i>0&&i<editor.photos.length))return;const photos=[...editor.photos];const [p]=photos.splice(i,1);editor.photos=[p,...photos];editorDirty=true;$('#photo-previews').innerHTML=photoPreviews();globalFocus('remove-photo','0',$('#photo-previews'));notify(`A foto ${i+1} agora é a capa.`,'info');}
// Galeria em tela cheia: setas, contador, miniaturas, teclado, deslizar e foco preso.
let lightbox=null,lightboxClosingHistory=false;
const LIGHTBOX_BEHIND=['#main','#nav','#topbar','#fab','#detail-actions'];
function openLightbox(photos,index,title){
 if(!photos.length||dialog.open||confirmDialog.open)return;closeLightbox(false);
 lightbox={photos,index:Math.min(Math.max(0,index),photos.length-1),title,back:globalActionElement?.isConnected?globalActionElement:document.activeElement};
 try{history.pushState({...history.state,bivaque:true,lightbox:true,overlayDepth:(history.state?.overlayDepth||0)+1},'',location.href);}catch{}
 document.body.insertAdjacentHTML('beforeend',`<div id="lightbox" class="lightbox" role="dialog" aria-modal="true" tabindex="-1" aria-label="Fotos de ${esc(title)}"><div class="lightbox-top"><span id="lightbox-count" aria-live="polite"></span><button type="button" class="lightbox-btn" data-lightbox="close" aria-label="Fechar fotos">${icon('close')}</button></div><div class="lightbox-stage"><button type="button" class="lightbox-btn lightbox-prev" data-lightbox="prev" aria-label="Foto anterior">${icon('chevron_left')}</button><img id="lightbox-img" alt=""><button type="button" class="lightbox-btn lightbox-next" data-lightbox="next" aria-label="Próxima foto">${icon('chevron_right')}</button></div><div class="lightbox-thumbs" role="group" aria-label="Miniaturas">${photos.map((p,n)=>`<button type="button" data-lightbox="go" data-index="${n}" aria-label="Ver foto ${n+1}"><img src="${esc(p)}" alt=""></button>`).join('')}</div></div>`);
 const el=$('#lightbox');for(const id of LIGHTBOX_BEHIND)$(id)&&($(id).inert=true);
 el.addEventListener('click',e=>{const b=e.target.closest('[data-lightbox]');if(!b){if(e.target===el||e.target.classList.contains('lightbox-stage'))closeLightbox();else el.focus({preventScroll:true});return;}const k=b.dataset.lightbox;if(k==='close')closeLightbox();else if(k==='prev')stepLightbox(-1);else if(k==='next')stepLightbox(1);else showLightbox(Number(b.dataset.index));});
 let start=null;el.addEventListener('pointerdown',e=>{start=e.pointerType==='touch'&&e.isPrimary?{x:e.clientX,y:e.clientY}:null;});el.addEventListener('pointercancel',()=>{start=null;});el.addEventListener('pointerup',e=>{if(!start)return;const dx=e.clientX-start.x,dy=e.clientY-start.y;start=null;if(Math.abs(dx)>50&&Math.abs(dx)>Math.abs(dy)*1.5)stepLightbox(dx<0?1:-1);});
 showLightbox(lightbox.index);requestAnimationFrame(()=>el.querySelector('[data-lightbox="close"]').focus({preventScroll:true}));
}
function showLightbox(n){if(!lightbox)return;const total=lightbox.photos.length;lightbox.index=(n+total)%total;const img=$('#lightbox-img');img.src=lightbox.photos[lightbox.index];img.alt=`Foto ${lightbox.index+1} de ${total} de ${lightbox.title}`;$('#lightbox-count').textContent=`${lightbox.index+1} de ${total}`;$$('.lightbox-thumbs button').forEach((b,i)=>b.setAttribute('aria-current',String(i===lightbox.index)));const single=total<2;$$('.lightbox-prev,.lightbox-next,.lightbox-thumbs').forEach(x=>{x.hidden=single;});}
function stepLightbox(d){if(lightbox&&lightbox.photos.length>1)showLightbox(lightbox.index+d);}
function lightboxKeys(e){if(e.key==='Escape'){e.preventDefault();e.stopPropagation();closeLightbox();}else if(e.key==='ArrowRight'){e.preventDefault();stepLightbox(1);}else if(e.key==='ArrowLeft'){e.preventDefault();stepLightbox(-1);}else if(e.key==='Tab'){const items=$$('#lightbox button').filter(b=>!b.closest('[hidden]'));if(!items.length)return;const i=items.indexOf(document.activeElement);if(i<0){e.preventDefault();items[e.shiftKey?items.length-1:0].focus();}else if(e.shiftKey&&i===0){e.preventDefault();items.at(-1).focus();}else if(!e.shiftKey&&i===items.length-1){e.preventDefault();items[0].focus();}}}
function closeLightbox(restore=true,dropHistory=true){const el=$('#lightbox');if(!el)return;el.remove();if(dropHistory&&history.state?.lightbox){lightboxClosingHistory=true;history.back();}for(const id of LIGHTBOX_BEHIND)$(id)&&($(id).inert=false);syncMobileNavigation();const back=lightbox?.back;lightbox=null;if(restore&&back?.isConnected)back.focus({preventScroll:true});}
// Com a galeria aberta, Esc, setas e Tab são dela, e os atalhos de criar e buscar não disparam por baixo.
document.addEventListener('keydown',e=>{if(!lightbox)return;lightboxKeys(e);const k=e.key.toLowerCase();if(!e.defaultPrevented&&(k==='c'||k==='/'||((e.ctrlKey||e.metaKey)&&k==='k'))){e.preventDefault();e.stopImmediatePropagation();}},true);
