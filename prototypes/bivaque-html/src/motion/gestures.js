let openSwipe=null;
function makeSwipe(content,actions){
 const sw=document.createElement('div');sw.className='swipe-row';content.replaceWith(sw);sw.appendChild(content);content.classList.add('swipe-content');
 const box=document.createElement('div');box.className='swipe-actions';box.innerHTML=actions.map(([ic,label,action,value,color])=>`<button type="button" data-action="${action}" data-value="${esc(value)}" aria-label="${esc(label)}" style="background:${color}">${icon(ic)}<span>${esc(label)}</span></button>`).join('');sw.prepend(box);
 const width=actions.length*62+16;let drag=null,opened=false;
 const set=(x,animated)=>{content.style.transition=animated?'transform .3s cubic-bezier(.2,0,0,1)':'none';content.style.transform=`translateX(${x}px)`;};
 const close=()=>{opened=false;set(0,true);if(openSwipe===close)openSwipe=null;};
 content.addEventListener('pointerdown',e=>{if(e.button>0)return;drag={x:e.clientX,y:e.clientY,base:opened?-width:0,id:e.pointerId,moved:false};});
 content.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.id)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(!drag.moved){if(Math.abs(dy)>8&&Math.abs(dy)>Math.abs(dx)){drag=null;return;}if(Math.abs(dx)<=8||Math.abs(dx)<=Math.abs(dy))return;drag.moved=true;try{content.setPointerCapture(e.pointerId);}catch{}if(openSwipe&&openSwipe!==close)openSwipe();}let x=drag.base+dx;if(x>0)x*=.25;if(x<-width)x=-width+(x+width)*.3;set(x,false);});
 const end=e=>{if(!drag||e.pointerId!==drag.id)return;const d=drag;drag=null;if(!d.moved)return;sw._swiped=true;setTimeout(()=>sw._swiped=false,80);if(e.type!=='pointercancel'&&d.base+e.clientX-d.x<-width*.45){opened=true;set(-width,true);openSwipe=close;}else close();};
 content.addEventListener('pointerup',end);content.addEventListener('pointercancel',end);
 content.addEventListener('click',e=>{if(sw._swiped||opened){e.preventDefault();e.stopPropagation();if(opened)close();}},true);
 box.addEventListener('click',close);
}
function longPress(el,fn){
 let timer=null,startX=0,startY=0,held=false;
 const cancel=()=>{clearTimeout(timer);el.style.scale='';};
 el.addEventListener('pointerdown',e=>{if(e.button>0||createOpen)return;startX=e.clientX;startY=e.clientY;timer=setTimeout(()=>{held=true;el.style.scale='';fn(el);},480);el.style.scale='.97';});
 el.addEventListener('pointermove',e=>{if(Math.hypot(e.clientX-startX,e.clientY-startY)>8)cancel();});
 for(const name of ['pointerup','pointercancel','pointerleave'])el.addEventListener(name,cancel);
 el.addEventListener('click',e=>{if(held){held=false;e.preventDefault();e.stopPropagation();}},true);
 el.addEventListener('contextmenu',e=>{e.preventDefault();cancel();fn(el);});
}
function bindOriginalGestures(){
 for(const card of $$('.photo-card > .card-link[data-action="open-item"]',root)){longPress(card,anchor=>{const id=anchor.dataset.value,i=itemById(id);if(!i)return;openCreate(anchor,[['bookmark',i.saved?'Remover dos salvos':'Salvar','save-item','',id],['share','Compartilhar com a família','share','','anuncio|'+id],['chat_bubble','Tenho interesse','item-interest','',id],['flag','Denunciar…','report','','item|'+id]],true);});}
 if(route.name==='comunidade'&&communityTab==='ind')for(const row of $$('[data-action="open-question"]',root)){const q=askById(row.dataset.value);if(q)makeSwipe(row,[[q.following?'notifications_off':'notifications_active',q.following?'Parar':'Seguir','follow-question',q.id,'#31647a'],['visibility_off','Ocultar','hide-question',q.id,'#6c7378']]);}
 if(route.name==='conversas')for(const row of $$('.list > .list-row',root)){const t=threadById($('[data-action="open-thread"]',row)?.dataset.value);if(t)makeSwipe(row,[['push_pin',t.pinned?'Soltar':'Fixar','pin-thread',t.id,'#654112'],['delete','Apagar','swipe-delete-thread',t.id,'#ba1a1a']]);}
}
(function restoreEdgeBack(){
 let drag=null;
 document.addEventListener('pointerdown',e=>{if(innerWidth>=720||e.button>0||e.pointerType==='mouse'||createOpen||dialog.open)return;const android=/Android/i.test(navigator.userAgent),side=e.clientX<28?'left':android&&e.clientX>innerWidth-20?'right':null;if(!side||route.name==='inicio')return;drag={x:e.clientX,y:e.clientY,id:e.pointerId,side,time:Date.now(),dx:0};});
 document.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.id)return;const dx=drag.side==='left'?e.clientX-drag.x:drag.x-e.clientX,dy=e.clientY-drag.y;if(Math.abs(dy)>8&&Math.abs(dy)>Math.abs(dx)){drag=null;return;}drag.dx=Math.max(0,dx);if(drag.dx>6){try{root.setPointerCapture(e.pointerId);}catch{}$('#page').style.translate=drag.dx+'px 0';}});
 const end=e=>{if(!drag||e.pointerId!==drag.id)return;const d=drag;drag=null;$('#page').style.translate='';if(e.type!=='pointercancel'&&(d.dx>innerWidth*.33||(d.dx>40&&d.dx/Math.max(1,Date.now()-d.time)>.6))){if(['comunidade','conversas','voce'].includes(route.name))navigate('inicio');else back();}};
 document.addEventListener('pointerup',end);document.addEventListener('pointercancel',end);
})();
