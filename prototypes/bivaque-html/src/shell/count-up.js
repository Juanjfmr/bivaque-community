// Rodada 19: números que sobem ao aparecer e avatares de quem indicou. Referência: Number
// Ticker Social Proof, do 21st.dev. O HTML já traz o valor final; a animação só roda com
// movimento permitido, uma vez por elemento e só na primeira vez que a tela é desenhada:
// redesenhos da mesma rota (salvar, tema, avisos) mostram o valor final sem recomeçar.
const COUNT_MS=900;
let countObserver=null,countRoute=null;
function animateCounts(scope=document){
 countObserver?.disconnect();
 const route=location.hash,again=route===countRoute;countRoute=route;
 const els=$$('[data-count-to]:not([data-counted])',scope);if(!els.length)return;
 if(again||matchMedia('(prefers-reduced-motion: reduce)').matches||!('IntersectionObserver' in window)){for(const el of els)el.dataset.counted='';return;}
 countObserver=new IntersectionObserver(entries=>{for(const e of entries){if(!e.isIntersecting)continue;countObserver.unobserve(e.target);countUp(e.target);}},{threshold:.6});
 // Quem já está inteiro na tela começa do zero agora, sem piscar o valor final por um quadro.
 for(const el of els){el.dataset.counted='';const r=el.getBoundingClientRect();if(Number(el.dataset.countTo)>=2&&r.top>=0&&r.bottom<=innerHeight)el.textContent='0';countObserver.observe(el);}
}
function countUp(el){
 const to=Number(el.dataset.countTo);if(!Number.isFinite(to)||to<2)return;
 // O leitor de tela lê só o valor final; os números intermediários ficam ocultos.
 const sr=document.createElement('span');sr.className='sr';sr.textContent=String(to);el.after(sr);el.setAttribute('aria-hidden','true');
 const start=performance.now(),ease=t=>1-Math.pow(1-t,3);
 const tick=now=>{if(!el.isConnected)return;const t=Math.min(1,(now-start)/COUNT_MS);el.textContent=String(Math.round(to*ease(t)));if(t<1)requestAnimationFrame(tick);else{el.removeAttribute('aria-hidden');sr.remove();}};
 el.textContent='0';requestAnimationFrame(tick);
}
// Contador com o valor final já escrito; o número é sempre inteiro (dados vêm do armazenamento).
function countHtml(n){const v=Math.max(0,Math.trunc(Number(n))||0);return `<b data-count-to="${v}">${v}</b>`;}
// Avatares sobrepostos de quem indicou (até 3) e "+N" para o restante.
function avatarStack(says,total=says.length){
 const shown=(says||[]).slice(0,3),extra=Math.max(0,(Math.trunc(Number(total))||0)-shown.length);if(!shown.length)return '';
 return `<span class="avatar-stack" aria-hidden="true">${shown.map(([ini,tone])=>`<span class="avatar ${esc(tone||'')}">${esc(ini)}</span>`).join('')}${extra?`<span class="avatar more">+${extra}</span>`:''}</span>`;
}
