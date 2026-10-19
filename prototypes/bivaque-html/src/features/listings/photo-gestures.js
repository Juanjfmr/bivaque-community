// Rodada 40: galeria com gestos de app (referências: Photo Browser do Framework7; Perplexity,
// Fresha e Tripadvisor no Mobbin). A foto acompanha o dedo: para o lado troca de foto, para baixo
// fecha a galeria. Pinça e toque duplo ampliam até 4x e, ampliada, a foto se arrasta. No mouse, o
// clique duplo e Ctrl + roda ampliam; no teclado, + e - ampliam e 0 volta ao tamanho normal.
var lbZoom={scale:1,x:0,y:0},lbTouchZoomAt=0;
const LB_MAX=4,LB_DOUBLE=2.5;
function lbReduced(){return matchMedia('(prefers-reduced-motion: reduce)').matches;}
function lbApply(animated){
 const img=$('#lightbox-img');if(!img)return;
 img.style.transition=animated&&!lbReduced()?'transform .25s cubic-bezier(.2,0,0,1)':'none';
 img.style.transform=`translate(${lbZoom.x}px,${lbZoom.y}px) scale(${lbZoom.scale})`;
 $('#lightbox')?.classList.toggle('zoomed',lbZoom.scale>1);
}
// Ampliada, a foto não sai da área visível.
function lbClamp(){
 const img=$('#lightbox-img'),stage=img?.parentElement;if(!img||!stage)return;
 const mx=Math.max(0,(img.offsetWidth*lbZoom.scale-stage.clientWidth)/2),my=Math.max(0,(img.offsetHeight*lbZoom.scale-stage.clientHeight)/2);
 lbZoom.x=Math.min(mx,Math.max(-mx,lbZoom.x));lbZoom.y=Math.min(my,Math.max(-my,lbZoom.y));
}
function resetLightboxZoom(animated=false){lbZoom={scale:1,x:0,y:0};lbApply(animated);$('#lightbox')?.style.setProperty('--lb-fade','1');}
// Amplia mantendo parado o ponto (cx, cy) da tela.
function lbZoomTo(scale,cx,cy,base=lbZoom){
 const stage=$('#lightbox .lightbox-stage');if(!stage)return;const r=stage.getBoundingClientRect(),ox=r.left+r.width/2,oy=r.top+r.height/2;
 const s=Math.min(LB_MAX,Math.max(1,scale)),px=(cx-ox-base.x)/base.scale,py=(cy-oy-base.y)/base.scale;
 lbZoom={scale:s,x:cx-ox-px*s,y:cy-oy-py*s};lbClamp();
}
function lbToggleZoom(cx,cy){if(lbZoom.scale>1){resetLightboxZoom(true);return;}lbZoomTo(LB_DOUBLE,cx,cy,{scale:1,x:0,y:0});lbApply(true);}
function lbZoomKey(key){
 const stage=$('#lightbox .lightbox-stage');if(!stage)return false;const r=stage.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;
 if(key==='+'||key==='='){lbZoomTo(lbZoom.scale*1.5,cx,cy);lbApply(true);return true;}
 if(key==='-'){if(lbZoom.scale/1.5<=1.01)resetLightboxZoom(true);else{lbZoomTo(lbZoom.scale/1.5,cx,cy);lbApply(true);}return true;}
 if(key==='0'){resetLightboxZoom(true);return true;}
 return false;
}
// Troca de foto com um deslize curto na direção do movimento.
function lbSlideIn(d){const img=$('#lightbox-img');if(!img||lbReduced())return;img.animate([{translate:`${d*48}px 0`,opacity:.35},{translate:'0 0',opacity:1}],{duration:200,easing:'cubic-bezier(.2,0,0,1)'});}
function lbAxis(dx,dy){return lbZoom.scale>1?'pan':Math.abs(dx)>Math.abs(dy)?(lightbox?.photos.length>1?'x':'none'):dy>0?'down':'none';}
function bindLightboxGestures(el){
 const stage=el.querySelector('.lightbox-stage'),pts=new Map();let g=null,lastTap=null,moved=false;
 // Ampliada ou não, um toque só vira arraste depois que o dedo anda; assim o toque duplo também
 // funciona com a foto ampliada.
 const one=(id,p)=>({type:'one',id,x0:p.x,y0:p.y,t:performance.now(),zx:lbZoom.x,zy:lbZoom.y,axis:null});
 stage.addEventListener('pointerdown',e=>{
  if(e.button>0||e.target.closest('button'))return;
  pts.set(e.pointerId,{x:e.clientX,y:e.clientY});moved=false;
  if(pts.size===2){const [a,b]=[...pts.values()];g={type:'pinch',dist:Math.max(1,Math.hypot(a.x-b.x,a.y-b.y)),cx:(a.x+b.x)/2,cy:(a.y+b.y)/2,base:{...lbZoom}};}
  else if(pts.size===1)g=one(e.pointerId,{x:e.clientX,y:e.clientY});
 });
 stage.addEventListener('pointermove',e=>{
  if(!pts.has(e.pointerId)||!g)return;pts.set(e.pointerId,{x:e.clientX,y:e.clientY});
  // O ponteiro só fica preso ao palco quando o gesto começa: um clique simples continua na foto.
  if(g.type==='pinch'){for(const id of pts.keys())try{stage.setPointerCapture(id);}catch{}if(pts.size<2)return;const [a,b]=[...pts.values()];lbZoomTo(g.base.scale*Math.hypot(a.x-b.x,a.y-b.y)/g.dist,g.cx,g.cy,g.base);lbApply(false);moved=true;return;}
  if(e.pointerId!==g.id)return;const dx=e.clientX-g.x0,dy=e.clientY-g.y0;
  if(!g.axis){if(Math.hypot(dx,dy)<8)return;g.axis=lbAxis(dx,dy);try{stage.setPointerCapture(e.pointerId);}catch{}}
  moved=true;
  if(g.axis==='pan'){lbZoom.x=g.zx+dx;lbZoom.y=g.zy+dy;lbClamp();lbApply(false);}
  else if(g.axis==='x'){lbZoom.x=dx;lbApply(false);}
  else if(g.axis==='down'){if(dy>120&&!g.armed)haptic(8);g.armed=dy>120;lbZoom.y=Math.max(0,dy);el.style.setProperty('--lb-fade',String(Math.max(.2,1-dy/420)));lbApply(false);}
 });
 const end=e=>{
  if(!pts.has(e.pointerId))return;pts.delete(e.pointerId);if(!g)return;
  if(g.type==='pinch'){
   if(pts.size===1){const [id,p]=[...pts.entries()][0];g=one(id,p);return;}
   g=null;if(lbZoom.scale<1.05)resetLightboxZoom(true);else{lbClamp();lbApply(true);}lbTouchZoomAt=performance.now();return;
  }
  if(e.pointerId!==g.id)return;const cur=g,dx=e.clientX-cur.x0,dy=e.clientY-cur.y0,dt=Math.max(1,performance.now()-cur.t);g=null;
  // Deslize rápido sem movimento intermediário: a direção vem da posição final.
  if(!cur.axis&&Math.hypot(dx,dy)>=8&&e.type!=='pointercancel'){cur.axis=lbAxis(dx,dy);if(cur.axis==='pan'){lbZoom.x=cur.zx+dx;lbZoom.y=cur.zy+dy;}moved=true;}
  if(e.type==='pointercancel'){if(lbZoom.scale>1){lbClamp();lbApply(true);}else resetLightboxZoom(true);return;}
  if(!cur.axis||cur.axis==='none'){
   if(cur.axis==='none'){resetLightboxZoom(true);return;}
   // Toque duplo (dedo ou caneta): o mouse usa o clique duplo.
   if(e.pointerType==='mouse')return;
   const now=performance.now();
   if(lastTap&&now-lastTap.t<320&&Math.hypot(e.clientX-lastTap.x,e.clientY-lastTap.y)<30){lastTap=null;moved=true;lbTouchZoomAt=now;lbToggleZoom(e.clientX,e.clientY);}
   else lastTap={t:now,x:e.clientX,y:e.clientY};
   return;
  }
  if(cur.axis==='x'){if(Math.abs(dx)>60||Math.abs(dx)/dt>.5){const d=dx<0?1:-1;stepLightbox(d);lbSlideIn(d);}else{lbZoom.x=0;lbApply(true);}return;}
  if(cur.axis==='down'){if(dy>120||dy/dt>.6)closeLightbox();else{lbZoom.y=0;el.style.setProperty('--lb-fade','1');lbApply(true);}return;}
  lbClamp();lbApply(true);
 };
 stage.addEventListener('pointerup',end);stage.addEventListener('pointercancel',end);
 // O clique que vem depois de um gesto não fecha a galeria nem troca de foto. Qualquer toque novo
 // (inclusive em botões) zera a marca, para o toque seguinte a um gesto não ser engolido.
 el.addEventListener('pointerdown',()=>{moved=false;},true);
 el.addEventListener('click',e=>{if(moved){moved=false;e.stopImmediatePropagation();e.preventDefault();}},true);
 stage.addEventListener('dblclick',e=>{if(e.target.closest('button')||performance.now()-lbTouchZoomAt<600)return;e.preventDefault();lbToggleZoom(e.clientX,e.clientY);});
 // Pinça no trackpad chega como roda com Ctrl.
 stage.addEventListener('wheel',e=>{if(!e.ctrlKey)return;e.preventDefault();lbZoomTo(lbZoom.scale*Math.exp(-e.deltaY/200),e.clientX,e.clientY);if(lbZoom.scale<1.02)resetLightboxZoom();else lbApply(false);},{passive:false});
}
