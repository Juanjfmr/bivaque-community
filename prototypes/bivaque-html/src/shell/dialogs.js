let dialogReturnDescriptor=null,confirmReturnDescriptor=null,dialogOpenPromise=Promise.resolve();
function showDialog(title,content,actions,kind='generic'){
 if(!dialog.open)dialogReturnDescriptor=globalActionElement?.closest('#create-menu')?createReturnDescriptor:globalFocusDescriptor(globalActionElement?.isConnected?globalActionElement:document.activeElement);
 closeCreateMenu(false);
 dialog.dataset.kind=kind;dialog.innerHTML=`<div slot="headline" class="dialog-title"><span class="sheet-grab" aria-hidden="true"></span><span>${esc(title)}</span>${iconBtn('close','close-dialog','','Fechar')}</div><div slot="content">${content}</div><div slot="actions" class="dialog-actions">${actions}</div>`;
 if(!dialog.open){pushDialogHistory();dialogOpenPromise=dialog.show();}else dialogOpenPromise=dialog.updateComplete;if(kind!=='editor'){editor=null;editorDirty=false;}bindDialog();bindSheetDrag();
}
function pushDialogHistory(){try{history.pushState({...history.state,bivaque:true,dialog:true,overlayDepth:(history.state?.overlayDepth||0)+1},'',location.href);}catch{}}
function dropDialogHistory(){
 if(!dialogClosingHistory&&history.state?.dialog){dialogClosingHistory=true;dialogHistoryPromise=new Promise(resolve=>dialogHistoryDone=resolve);history.back();}
 return dialogHistoryPromise||Promise.resolve();
}
async function closeDialog(force=false,dropHistory=true){if(editorDirty&&!force){confirm('Descartar alterações?','Você pode continuar editando ou descartar o que ainda não foi salvo.',async()=>{editorDirty=false;await dialog.close();await dropDialogHistory();editor=null;});return;}editorDirty=false;editor=null;await dialog.close();if(dropHistory)await dropDialogHistory();}
function confirm(title,text,fn,{ok='Confirmar',cancel='Continuar',danger=false}={}){confirmReturnDescriptor=globalFocusDescriptor(document.activeElement);confirmDialog.innerHTML=`<div slot="headline">${esc(title)}</div><div slot="content">${esc(text)}</div><div slot="actions" class="dialog-actions">${btn(cancel,'cancel-confirm','','text')}${danger?btn(ok,'accept-confirm','','filled').replace('<md-filled-button','<md-filled-button class="danger-fill"'):btn(ok,'accept-confirm','','filled')}</div>`;confirmDialog._accept=fn;if(!confirmDialog.open)try{history.pushState({...history.state,bivaque:true,confirm:true,overlayDepth:(history.state?.overlayDepth||0)+1},'',location.href);}catch{}confirmDialog.show();}
function dropConfirmHistory(){if(!confirmClosingHistory&&history.state?.confirm){confirmClosingHistory=true;confirmHistoryPromise=new Promise(resolve=>confirmHistoryDone=resolve);history.back();}return confirmHistoryPromise||Promise.resolve();}
confirmDialog.addEventListener('closed',()=>{dropConfirmHistory();if(dialog.open){const target=confirmReturnDescriptor?.id?document.getElementById(confirmReturnDescriptor.id):null;(target||$('[data-action="close-dialog"]',dialog))?.focus({preventScroll:true});}else navigationFocus(confirmReturnDescriptor);});
dialog.addEventListener('cancel',e=>{if(editorDirty){e.preventDefault();closeDialog();}});
dialog.addEventListener('closed',()=>{editor=null;editorDirty=false;dropDialogHistory();navigationFocus(dialogReturnDescriptor);});
function overlayAnimation(open){
 if(matchMedia('(prefers-reduced-motion: reduce)').matches)return {dialog:[],scrim:[]};
 const drawer=dialog.dataset.kind==='prototype',from=drawer?'translateX(100%)':'translateY(105%)';
 return {dialog:[[[{transform:open?from:'none'},{transform:open?'none':from}],{duration:open?500:240,easing:'cubic-bezier(.32,.72,0,1)'}]],scrim:[[[{opacity:open?0:.32},{opacity:open?.32:0}],{duration:open?300:200}]]};
}
dialog.getOpenAnimation=()=>overlayAnimation(true);dialog.getCloseAnimation=()=>overlayAnimation(false);
function bindSheetDrag(){
 const grab=$('.sheet-grab',dialog);if(!grab)return;let drag=null;
 grab.addEventListener('pointerdown',e=>{if(innerWidth>=720||dialog.dataset.kind==='prototype')return;drag={id:e.pointerId,y:e.clientY,t:Date.now(),dy:0};grab.setPointerCapture(e.pointerId);e.preventDefault();});
 grab.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.id)return;drag.dy=Math.max(0,e.clientY-drag.y);dialog.shadowRoot.querySelector('dialog').style.translate='0 '+drag.dy+'px';});
 const end=e=>{if(!drag||e.pointerId!==drag.id)return;const d=drag;drag=null;dialog.shadowRoot.querySelector('dialog').style.translate='';if(e.type!=='pointercancel'&&(d.dy>110||(d.dy>30&&d.dy/Math.max(1,Date.now()-d.t)>.5)))closeDialog();};
 grab.addEventListener('pointerup',end);grab.addEventListener('pointercancel',end);
}
