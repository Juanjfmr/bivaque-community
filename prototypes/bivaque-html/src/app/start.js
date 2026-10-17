document.addEventListener('click',async e=>{
 const el=e.composedPath().find(n=>n instanceof HTMLElement&&n.dataset?.action);if(!el||el.disabled)return;
 if(createOpen&&el.closest('#create-menu'))await closeCreateMenu(false);
 if(el.tagName.startsWith('MD-')&&el.getAttribute('type')==='submit')e.preventDefault();
 perform(el.dataset.action,el.dataset.value||'',el).catch(err=>{console.error('Bivaque action failed',el.dataset.action,err);notify('Não foi possível concluir essa ação. Tente novamente.','error');});
});
matchMedia('(prefers-color-scheme: dark)').addEventListener('change',theme);
route=parseRoute();if(!location.hash)try{history.replaceState({bivaque:true},'','#inicio');}catch{}
$('#loading').remove();$('#app-shell').hidden=false;render();
window.Bivaque={materialVersion:MATERIAL_VERSION,inspect:()=>({route:{...route},city:state.city,homeCity:state.homeCity,officialComponents:['md-filled-button','md-dialog','md-outlined-text-field','md-filter-chip'].every(n=>!!customElements.get(n))}),search:(q)=>{const prior=searchQuery;searchQuery=q;const result=searchLists();searchQuery=prior;return Object.fromEntries(Object.entries(result).map(([k,v])=>[k,v.map(x=>x.id)]));}};
})();
