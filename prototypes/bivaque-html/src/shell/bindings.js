let navigationBootstrapped=false;
function bindScreen(){
 if(!navigationBootstrapped){navigationBootstrapped=true;const context=history.state?.navigation;if(history.state?.dialog||history.state?.createMenu||history.state?.confirm)try{const {dialog:dialogEntry,createMenu,confirm:confirmEntry,...base}=history.state;const depth=history.state.overlayDepth||[history.state.dialog,history.state.createMenu,history.state.confirm].filter(Boolean).length;history.replaceState({...base,reloadedOverlayDepth:depth},'',location.href);navigationGhostDepth=depth;navigationGhostParent=base.parent||null;}catch{}if(context){root.scrollTop=context.scroll||0;if(route.name!=='conversa')navigationFocus(context.focus);}}
 bindMessagingScreen();
 bindOriginalGestures();
 const q=$('#search-query');if(q)requestAnimationFrame(()=>q.focus({preventScroll:true}));
 q?.addEventListener('input',()=>{searchQuery=q.value;clearTimeout(searchTimer);searchTimer=setTimeout(()=>{$('#search-results').innerHTML=searchResults();},120);});q?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();saveRecent(q.value);}});
 const bs=$('#biz-search');bs?.addEventListener('input',()=>{bizQuery=bs.value;clearTimeout(searchTimer);searchTimer=setTimeout(()=>{const html=renderBusinesses(),tmp=document.createElement('div');tmp.innerHTML=html;$('#business-results').innerHTML=$('#business-results',tmp).innerHTML;pagedWatch();},120);});
 $('#digest-switch')?.addEventListener('change',e=>mutate(()=>{state.prefs.digest=e.target.selected;},{redraw:false}));
 const gs=$('#group-search');gs?.addEventListener('input',()=>{groupQuery=gs.value;clearTimeout(searchTimer);searchTimer=setTimeout(()=>{$('#groups-body').innerHTML=groupsBody();},120);});
 const tabs=$('#community-tabs');if(tabs)tabs.activeTabIndex=['ind','grp','biz'].indexOf(communityTab);
}
function saveRecent(q){q=q.trim();if(!q)return;mutate(()=>{state.recent=[q,...state.recent.filter(x=>x!==q)].slice(0,8);},{redraw:false});}
function bindDialog(){
 if(editor)$$('md-outlined-text-field,md-outlined-select,input[type=date],input[type=time]',dialog).forEach(e=>{e.addEventListener('input',()=>{editorDirty=true;});e.addEventListener('change',()=>{editorDirty=true;});});
 bindChipEntries(dialog);
 $('#ask-input')?.addEventListener('input',()=>{clearTimeout(searchTimer);searchTimer=setTimeout(updateSimilar,160);});
 $('#upload-photos')?.addEventListener('change',async e=>{await addEditorPhotos(e.target.files);e.target.value='';});bindPhotoDrop();
}
function external(url){window.open(url,'_blank','noopener,noreferrer');}
