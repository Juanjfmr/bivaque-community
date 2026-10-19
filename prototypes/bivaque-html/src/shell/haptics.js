// Rodada 42: vibração leve quando uma ação muda algo: salvar, indicar, passar do ponto no
// deslizar, soltar a foto para fechar e trocar a altura da folha do bairro. Só onde o navegador
// permite (Android); o iPhone ignora. Duas vibrações seguidas não se acumulam.
var hapticAt=0;
function haptic(ms=10){const now=performance.now();if(now-hapticAt<80)return;hapticAt=now;try{navigator.vibrate?.(ms);}catch{}}
