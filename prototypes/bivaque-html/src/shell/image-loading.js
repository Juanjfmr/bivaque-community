// Rodada 24: esqueleto só onde há espera de verdade. O protótipo não busca dados na rede, então
// nenhuma tela ganha atraso artificial; as fotos, sim, chegam depois (decodificação e rolagem).
// Só a foto que ainda não está pronta ao entrar na página (ou trocar de endereço) faz a moldura
// esperar; a mesma foto num redesenho já vem pronta e aparece direto, sem piscar.
const IMAGE_FRAMES='.cover,.detail-hero,.gallery button';
function imageWatch(img){const frame=img.closest?.(IMAGE_FRAMES);if(frame&&!img.complete)frame.classList.add('img-wait');}
function imageSettled(e){
 const img=e.target;if(img?.tagName!=='IMG')return;const frame=img.closest(IMAGE_FRAMES);if(!frame?.classList.contains('img-wait'))return;
 frame.classList.remove('img-wait');if(!matchMedia('(prefers-reduced-motion: reduce)').matches)img.animate([{opacity:0},{opacity:1}],{duration:280,easing:'ease-out'});
}
document.addEventListener('load',imageSettled,true);
document.addEventListener('error',imageSettled,true);
new MutationObserver(records=>{for(const r of records){if(r.type==='attributes'){if(r.target.tagName==='IMG')imageWatch(r.target);continue;}for(const n of r.addedNodes){if(n.nodeType!==1)continue;if(n.tagName==='IMG')imageWatch(n);else for(const img of n.querySelectorAll('img'))imageWatch(img);}}}).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['src']});
