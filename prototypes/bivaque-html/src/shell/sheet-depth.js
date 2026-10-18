// Rodada 41: no celular, enquanto uma folha que sobe de baixo está aberta, a página de trás encolhe
// um pouco (referência: Vaul). Não vale para a gaveta de controles.
function sheetDepth(on){document.body.classList.toggle('sheet-depth',Boolean(on)&&innerWidth<720&&dialog.dataset.kind!=='prototype');}
dialog.addEventListener('open',()=>sheetDepth(true));
dialog.addEventListener('close',()=>sheetDepth(false));
addEventListener('resize',()=>{if(innerWidth>=720)sheetDepth(false);},{passive:true});
