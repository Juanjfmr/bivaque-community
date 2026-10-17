// Rodada 33: avisos empilhados com desfazer (referência: Sonner e a confirmação da Insight Timer
// no Mobbin). #snackbar continua sendo o aviso mais novo, com a mesma região viva e o mesmo
// "Desfazer". Quando chega outro aviso enquanto um desfazer ainda vale, o anterior sobe para a
// pilha com o próprio desfazer e o tempo que falta (no máximo dois). A barra fina mostra o tempo
// e pausa com o mouse ou o foco em cima.
// var, não let/const: um aviso disparado durante o carregamento (antes deste arquivo) não pode
// cair na zona morta das declarações.
var TOAST_MS=4200,TOAST_UNDO_MS=7000,TOAST_STACK_MAX=2,toastCurrent=null,toastStack=[],toastSeq=0;
function toastLeft(t){return Math.max(0,t.ms-(t.paused?t.pausedAt-t.start:performance.now()-t.start));}
function toastInner(t,stacked){return `${icon(t.ic)}<span class="grow">${esc(t.text)}</span>${t.undo?btn('Desfazer','undo',stacked?String(t.id):'','text').replace('<md-text-button',`<md-text-button aria-label="Desfazer: ${esc(t.text)}"`):''}<span class="toast-time" aria-hidden="true" style="animation-duration:${t.ms}ms;animation-delay:-${t.ms-toastLeft(t)}ms"></span>`;}
function toastStackBox(){let box=$('#toast-stack');if(!box){box=document.createElement('div');box.id='toast-stack';box.className='toast-stack';box.setAttribute('aria-live','off');document.body.appendChild(box);}return box;}
function toastRenderStack(){
 const box=toastStackBox(),bar=$('#snackbar');
 box.innerHTML=toastStack.map(t=>`<div class="snackbar toast-old show" data-toast="${t.id}">${toastInner(t,true)}</div>`).join('');
 const top=bar?.classList.contains('show')?bar.getBoundingClientRect().top:innerHeight-80;box.style.bottom=`${Math.max(16,innerHeight-top+8)}px`;
}
function toastExpire(t){clearTimeout(t.timer);t.timer=setTimeout(()=>{if(t===toastCurrent){$('#snackbar').classList.remove('show');toastUndo=null;toastCurrent=null;toastRenderStack();}else{toastStack=toastStack.filter(x=>x!==t);toastRenderStack();}},toastLeft(t));}
function notify(text,ic='check_circle',undo=null){
 const prev=toastCurrent;
 if(prev?.undo&&$('#snackbar').classList.contains('show')&&toastLeft(prev)>600){toastStack=[...toastStack,prev].slice(-TOAST_STACK_MAX);for(const t of toastStack)toastExpire(t);}
 else if(prev)clearTimeout(prev.timer);
 const t={id:++toastSeq,text,ic,undo,ms:undo?TOAST_UNDO_MS:TOAST_MS,start:performance.now()};toastCurrent=t;toastUndo=undo;
 const bar=$('#snackbar');bar.classList.remove('is-paused');bar.innerHTML=toastInner(t,false);bar.classList.add('show');
 toastExpire(t);requestAnimationFrame(toastRenderStack);
}
// Desfazer de um aviso da pilha (o do mais novo continua no case 'undo' de sempre).
function toastUndoStacked(id){const t=toastStack.find(x=>String(x.id)===String(id));if(!t?.undo)return false;toastStack=toastStack.filter(x=>x!==t);clearTimeout(t.timer);toastRenderStack();t.undo();return true;}
function toastPause(on){const t=toastCurrent,bar=$('#snackbar');if(!t)return;if(on&&!t.paused){t.paused=true;t.pausedAt=performance.now();clearTimeout(t.timer);bar.classList.add('is-paused');}else if(!on&&t.paused){t.start+=performance.now()-t.pausedAt;t.paused=false;bar.classList.remove('is-paused');toastExpire(t);}}
function bindToastPause(){const bar=$('#snackbar');if(!bar)return;bar.addEventListener('mouseenter',()=>toastPause(true));bar.addEventListener('mouseleave',()=>toastPause(false));bar.addEventListener('focusin',()=>toastPause(true));bar.addEventListener('focusout',()=>toastPause(false));}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bindToastPause);else bindToastPause();
