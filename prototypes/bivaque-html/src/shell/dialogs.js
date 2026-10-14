function showDialog(title,content,actions,kind='generic'){
 closeCreateMenu(false);
 dialog.dataset.kind=kind;dialog.innerHTML=`<div slot="headline" class="dialog-title"><span class="sheet-grab" aria-hidden="true"></span><span>${esc(title)}</span>${iconBtn('close','close-dialog','','Fechar')}</div><div slot="content">${content}</div><div slot="actions" class="dialog-actions">${actions}</div>`;
 if(!dialog.open){pushDialogHistory();dialog.show();}if(kind!=='editor'){editor=null;editorDirty=false;}bindDialog();bindSheetDrag();
}
function pushDialogHistory(){try{history.pushState({bivaque:true,dialog:true},'',location.href);}catch{}}
function dropDialogHistory(){
 if(!dialogClosingHistory&&history.state?.dialog){dialogClosingHistory=true;dialogHistoryPromise=new Promise(resolve=>dialogHistoryDone=resolve);history.back();}
 return dialogHistoryPromise||Promise.resolve();
}
async function closeDialog(force=false,dropHistory=true){if(editorDirty&&!force){confirm('Descartar alterações?','Você pode continuar editando ou descartar o que ainda não foi salvo.',async()=>{editorDirty=false;await dialog.close();await dropDialogHistory();editor=null;});return;}editorDirty=false;editor=null;await dialog.close();if(dropHistory)await dropDialogHistory();}
function confirm(title,text,fn){confirmDialog.innerHTML=`<div slot="headline">${esc(title)}</div><div slot="content">${esc(text)}</div><div slot="actions" class="dialog-actions">${btn('Continuar','cancel-confirm','','text')}${btn('Confirmar','accept-confirm','','filled')}</div>`;confirmDialog._accept=fn;if(!confirmDialog.open)try{history.pushState({bivaque:true,confirm:true},'',location.href);}catch{}confirmDialog.show();}
function dropConfirmHistory(){if(!confirmClosingHistory&&history.state?.confirm){confirmClosingHistory=true;confirmHistoryPromise=new Promise(resolve=>confirmHistoryDone=resolve);history.back();}return confirmHistoryPromise||Promise.resolve();}
confirmDialog.addEventListener('closed',dropConfirmHistory);
dialog.addEventListener('cancel',e=>{if(editorDirty){e.preventDefault();closeDialog();}});
dialog.addEventListener('closed',()=>{editor=null;editorDirty=false;dropDialogHistory();});
function overlayAnimation(open){
 const drawer=dialog.dataset.kind==='prototype',full=dialog.dataset.kind==='onboarding',from=drawer?'translateX(100%)':full?'translateY(100%)':'translateY(105%)';
 return {dialog:[[[{transform:open?from:'none'},{transform:open?'none':from}],{duration:open?500:240,easing:'cubic-bezier(.32,.72,0,1)'}]],scrim:[[[{opacity:open?0:.32},{opacity:open?.32:0}],{duration:open?300:200}]]};
}
dialog.getOpenAnimation=()=>overlayAnimation(true);dialog.getCloseAnimation=()=>overlayAnimation(false);
function bindSheetDrag(){
 const grab=$('.sheet-grab',dialog);if(!grab)return;let drag=null;
 grab.addEventListener('pointerdown',e=>{if(innerWidth>=720||['prototype','onboarding'].includes(dialog.dataset.kind))return;drag={id:e.pointerId,y:e.clientY,t:Date.now(),dy:0};grab.setPointerCapture(e.pointerId);e.preventDefault();});
 grab.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.id)return;drag.dy=Math.max(0,e.clientY-drag.y);dialog.shadowRoot.querySelector('dialog').style.translate='0 '+drag.dy+'px';});
 const end=e=>{if(!drag||e.pointerId!==drag.id)return;const d=drag;drag=null;dialog.shadowRoot.querySelector('dialog').style.translate='';if(e.type!=='pointercancel'&&(d.dy>110||(d.dy>30&&d.dy/Math.max(1,Date.now()-d.t)>.5)))closeDialog();};
 grab.addEventListener('pointerup',end);grab.addEventListener('pointercancel',end);
}
