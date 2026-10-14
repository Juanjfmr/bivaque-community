// Movimento arrojado (Rodada 08, aprovado pelo usuário em 14/10/2026 como versão de teste).
// A foto do cartão voa até o topo do detalhe e volta ao cartão; o detalhe sobe em cascata;
// listas entram em cascata. Desliga com prefers-reduced-motion. Para suavizar, ajuste BOLD.
const BOLD={flight:560,rise:480,stagger:45,riseDistance:40,listRise:28,listMax:10,easing:'cubic-bezier(.2,0,0,1)'};
const MOTION_DETAIL={anuncio:'open-item',negocio:'open-biz'};
let motionLastRoute=null;
function motionOff(){return matchMedia('(prefers-reduced-motion: reduce)').matches||!Element.prototype.animate;}
function motionHero(){return $('#page #hero-image')||$('#page .detail-hero img');}
function motionCardImage(action,id){return [...document.querySelectorAll(`#main [data-action="${action}"] img`)].find(img=>{if(img.closest('[data-action]')?.dataset.value!==id)return false;return motionInView(img.getBoundingClientRect());});}
function motionInView(r){return r.width>0&&r.bottom>0&&r.top<innerHeight&&r.right>0&&r.left<innerWidth;}
function motionBeforeRender(){
 const prev=motionLastRoute,next={...route};motionLastRoute=next;
 if(motionOff()||!prev||(prev.name===next.name&&prev.id===next.id))return null;
 if(MOTION_DETAIL[next.name]&&next.id){const img=motionCardImage(MOTION_DETAIL[next.name],next.id);if(img)return {dir:'open',from:img.getBoundingClientRect(),src:img.currentSrc||img.src,radius:getComputedStyle(img).borderRadius,prev,next};}
 if(MOTION_DETAIL[prev.name]&&prev.id){const img=motionHero();if(img&&motionInView(img.getBoundingClientRect()))return {dir:'close',from:img.getBoundingClientRect(),src:img.currentSrc||img.src,radius:'0px',prev,next};}
 return {dir:'page',prev,next};
}
function motionAfterRender(f){
 if(!f)return;
 if(f.dir==='open'){const hero=motionHero();if(hero)hero.style.opacity='0';requestAnimationFrame(()=>{for(const a of $('#page')?.getAnimations()||[])a.cancel();if(hero)motionFly(f,hero,'0px');motionRise();});return;}
 if(f.dir==='close'){requestAnimationFrame(()=>{for(const a of $('#page')?.getAnimations()||[])a.cancel();const img=motionCardImage(MOTION_DETAIL[f.prev.name],f.prev.id);if(img){img.style.opacity='0';motionFly(f,img,getComputedStyle(img).borderRadius);}motionStagger(img?.closest('.photo-card,.list-row'));});return;}
 requestAnimationFrame(()=>motionStagger(null));
}
function motionFly(f,target,radius){
 for(const old of document.querySelectorAll('.motion-flight'))old.remove();const to=target.getBoundingClientRect();
 if(!motionInView(to)){target.style.opacity='';return;}
 const clone=document.createElement('img');clone.src=f.src;clone.alt='';clone.setAttribute('aria-hidden','true');clone.className='motion-flight';
 document.body.append(clone);
 const box=(r,br)=>({left:`${r.left}px`,top:`${r.top}px`,width:`${r.width}px`,height:`${r.height}px`,borderRadius:br});
 const a=clone.animate([box(f.from,f.radius),box(to,radius)],{duration:BOLD.flight,easing:BOLD.easing,fill:'forwards'});
 const done=()=>{target.style.opacity='';clone.remove();};a.finished.then(done,done);
}
function motionRise(){
 const parts=[...document.querySelectorAll('#page .detail-title, #page .detail-layout > * > :not(.detail-hero), #page > section, #page .section')].slice(0,8);
 parts.forEach((el,i)=>el.animate([{opacity:0,transform:`translateY(${BOLD.riseDistance}px)`},{opacity:1,transform:'none'}],{duration:BOLD.rise,delay:120+i*BOLD.stagger,easing:BOLD.easing,fill:'backwards'}));
}
function motionStagger(skip){
 const cards=[...document.querySelectorAll('#page .photo-card, #page .list-row, #page .guide-card')].filter(el=>{if(el===skip)return false;const r=el.getBoundingClientRect();return r.width>0&&r.bottom>0&&r.top<innerHeight;}).slice(0,BOLD.listMax);
 cards.forEach((el,i)=>el.animate([{opacity:0,transform:`translateY(${BOLD.listRise}px) scale(.98)`},{opacity:1,transform:'none'}],{duration:BOLD.rise,delay:i*BOLD.stagger,easing:BOLD.easing,fill:'backwards'}));
}
