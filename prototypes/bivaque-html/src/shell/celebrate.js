// Rodada 34: microanimação ao indicar um negócio. O número de indicações pulsa, oito pontos
// saem dele e o avatar novo entra na pilha. Dura menos de um segundo, não bloqueia nada e não
// acontece com movimento reduzido (o aviso de texto continua igual).
function celebrate(target){
 if(!target||matchMedia('(prefers-reduced-motion: reduce)').matches)return false;
 target.animate([{transform:'scale(1)'},{transform:'scale(1.35)'},{transform:'scale(1)'}],{duration:420,easing:'cubic-bezier(.2,.8,.2,1)'});
 // Centro do texto do número (a caixa do elemento ocupa a largura toda do cartão).
 const range=document.createRange();range.selectNodeContents(target);const r=range.getBoundingClientRect().width?range.getBoundingClientRect():target.getBoundingClientRect(),burst=document.createElement('span');burst.className='burst';burst.setAttribute('aria-hidden','true');
 burst.style.left=`${r.left+r.width/2}px`;burst.style.top=`${r.top+r.height/2}px`;
 burst.innerHTML=Array.from({length:8},(_,i)=>`<i style="--a:${i*45}deg"></i>`).join('');
 document.body.appendChild(burst);setTimeout(()=>burst.remove(),800);
 const me=$('#main .fact-proof .avatar-stack .avatar.me')||$('#main .fact-proof .avatar-stack .avatar:last-child');
 me?.animate([{transform:'translateY(8px) scale(.6)',opacity:0},{transform:'none',opacity:1}],{duration:360,delay:120,easing:'cubic-bezier(.2,.8,.2,1)',fill:'backwards'});
 return true;
}
