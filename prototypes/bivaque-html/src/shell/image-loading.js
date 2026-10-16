// Rodada 24: esqueleto só onde há espera de verdade. O protótipo não busca dados na rede, então
// nenhuma tela ganha atraso artificial; as fotos, sim, chegam depois (decodificação e rolagem).
// A moldura pisca até a foto carregar (ou falhar), e a foto entra com um esmaecer.
const IMAGE_FRAMES='.cover,.detail-hero,.gallery button,.photo-preview,.lightbox-stage';
function imageSettled(e){const img=e.target;if(img?.tagName!=='IMG')return;const frame=img.closest(IMAGE_FRAMES);if(frame)frame.classList.add('img-ready');img.classList.add('img-in');}
document.addEventListener('load',imageSettled,true);
document.addEventListener('error',imageSettled,true);
