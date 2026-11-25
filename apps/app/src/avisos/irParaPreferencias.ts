/**
 * A saída do vazio de Avisos (REGUA-003): as preferências moram na área Você,
 * na seção Avisos. A navegação do app não carrega âncora, então, depois de
 * abrir Você, espera a matriz de preferências e a leitura do perfil chegarem
 * (a restauração de rolagem da tela acontece nessa carga) e só então leva a
 * seção ao topo. Desiste em silêncio depois do limite: a pessoa continua na
 * tela certa, só sem a rolagem.
 */
const LIMITE_EM_MS = 5000

export async function irParaPreferencias(irPara: (destino: string) => Promise<void>) {
  await irPara("voce")
  const limite = performance.now() + LIMITE_EM_MS
  const procurar = () => {
    const alvo = document.querySelector('[data-preferencias-de-aviso="sim"]')
    const carregando = document.querySelector('[data-tela="voce"] [data-esqueleto]') !== null
    if (alvo !== null && !carregando) {
      requestAnimationFrame(() => alvo.scrollIntoView({ block: "start" }))
      return
    }
    if (performance.now() < limite) requestAnimationFrame(procurar)
  }
  requestAnimationFrame(procurar)
}
