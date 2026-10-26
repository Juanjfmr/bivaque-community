/**
 * Movimento: as regras puras da seção 6 do inventário.
 *
 * Duas famílias convivem no protótipo: movimento escrito em CSS (`@keyframes` e
 * `transition`, que o interruptor global desliga) e movimento escrito com a Web
 * Animations API (`elemento.animate()`, que o interruptor global **não**
 * alcança, por isso quase todo `.js` tem guarda própria). Aqui ficam as duas
 * guardas e os números do protótipo, para que a onda 1c possa provar cada um
 * sem depender de ler a tela.
 *
 * `prefersReduzido()` é a única função que consulta o navegador; o resto é
 * conta. Movimento reduzido **suprime o movimento, não o feedback**: o valor
 * final aparece na hora (contagem, celebração) e o gesto direto continua
 * (arrastar, retorno pela borda), como no protótipo (§6, "O que continua").
 */

/** A constante única de intensidade do protótipo (`motion/bold-transitions.js:4`). */
export const BOLD = {
  voo: 560,
  subida: 480,
  cascata: 45,
  distanciaDaSubida: 40,
  subidaDaLista: 28,
  maximoDaLista: 10,
  curva: "cubic-bezier(.2,0,0,1)",
} as const

/** Contagem animada (`shell/count-up.js:5`). */
export const CONTAGEM = {
  duracao: 900,
  minimoParaAnimar: 2,
} as const

/** A pilha de avisos (`shell/toasts.js:8,12`). */
export const AVISOS = {
  duracao: 4200,
  duracaoComDesfazer: 7000,
  maximoNaPilha: 2,
  restanteParaEmpilhar: 600,
} as const

/** Listas longas (`shell/paged-list.js:5`, `:42`). */
export const LISTA = {
  porBloco: 24,
  margemDeCarga: 600,
} as const

/** Minimizar a navegação ao rolar (`shell/navigation.js:97-101`). */
export const NAVEGACAO = {
  limiteParaMinimizar: 140,
  limiteParaDesminimizar: 60,
  folga: 6,
} as const

/** Título grande que sobe (`shell/navigation.js:87`). */
export const TITULO = {
  larguraDeDocagem: 720,
  folgaDaBarra: 4,
} as const

/** Arrasto da folha (`shell/dialogs.js:35`). */
export const FOLHA = {
  distanciaParaFechar: 110,
  distanciaComVelocidade: 30,
  velocidadeParaFechar: 0.5,
} as const

/** Durações dos overlays (`styles/sheets.css`, `styles/overlays.css`). */
export const SOBREPOSICAO = {
  abertura: 500,
  fechamento: 240,
  curva: "cubic-bezier(.32,.72,0,1)",
  encolhimentoDaPagina: 8,
  escalaDaPagina: 0.965,
} as const

/** Movimento reduzido pedido pela pessoa. */
export function prefersReduzido(): boolean {
  if (typeof globalThis.matchMedia !== "function") return false
  return globalThis.matchMedia("(prefers-reduced-motion: reduce)").matches
}

/**
 * Anima pela Web Animations API só quando a pessoa não pediu movimento
 * reduzido — a mesma guarda que o protótipo repete em cada arquivo de `.js`
 * (`motion/bold-transitions.js:7`, `shell/celebrate.js:5`, e por aí).
 */
export function animarSePossivel(
  elemento: Element | null,
  quadros: Keyframe[],
  opcoes: KeyframeAnimationOptions,
): Animation | null {
  if (elemento === null) return null
  if (prefersReduzido()) return null
  if (typeof (elemento as HTMLElement).animate !== "function") return null
  return (elemento as HTMLElement).animate(quadros, opcoes)
}

/** Passo da cascata de abertura do detalhe (`motion/bold-transitions.js:33-36`). */
export function atrasoDaSubida(indice: number): number {
  return 120 + indice * BOLD.cascata
}

/** Passo da cascata das listas (`motion/bold-transitions.js:37-39`). */
export function atrasoDaLista(indice: number): number {
  return indice * BOLD.cascata
}

/** Quantos itens entram na cascata, no máximo (`BOLD.maximoDaLista`). */
export function limiteDaCascata(quantos: number): number {
  return Math.min(quantos, BOLD.maximoDaLista)
}

/** Valor da contagem no tempo `t` (0..1), com a curva do protótipo. */
export function progressoDaContagem(t: number): number {
  return 1 - (1 - t) ** 3
}

/** Valor final imediato quando há movimento reduzido (`shell/count-up.js:11`). */
export function valorDaContagem(
  de: number,
  para: number,
  t: number,
  reduzido = prefersReduzido(),
): number {
  if (reduzido) return para
  return Math.round(de + (para - de) * progressoDaContagem(t))
}

export type EntradaDaMinimizacao = {
  readonly y: number
  readonly ultimoY: number
  readonly minimizada: boolean
  readonly largura: number
  readonly raiz: boolean
  readonly menuCriarAberto: boolean
}

/**
 * A decisão de minimizar a barra de baixo ao rolar (`shell/navigation.js:97-101`
 * e `syncMobileNavigation`, `:91-96`): só abaixo de 720 px, só nas rotas-raiz e
 * nunca com o menu Criar aberto.
 */
export function calcularMinimizada(entrada: EntradaDaMinimizacao): boolean {
  const { y, ultimoY, minimizada, largura, raiz, menuCriarAberto } = entrada
  if (largura >= 720) return false
  if (!raiz) return false
  if (menuCriarAberto) return false
  if (!minimizada && y > ultimoY + NAVEGACAO.folga && y > NAVEGACAO.limiteParaMinimizar) return true
  if (minimizada && (y < ultimoY - NAVEGACAO.folga || y < NAVEGACAO.limiteParaDesminimizar)) {
    return false
  }
  return minimizada
}

/**
 * O título grande sobe ao passar sob a barra (`syncTopTitle`,
 * `shell/navigation.js:87-89`). Onde ele não existe: Início, Busca e conversa,
 * e nunca a partir de 720 px.
 */
export function tituloPodeSubir(nomeDaRota: string, largura: number): boolean {
  if (largura >= TITULO.larguraDeDocagem) return false
  return !["inicio", "busca", "conversa"].includes(nomeDaRota)
}

export function tituloDeveDocar(
  fundoDoTitulo: number,
  baseDaBarra: number,
  podeSubir: boolean,
): boolean {
  if (!podeSubir) return false
  return fundoDoTitulo <= baseDaBarra + TITULO.folgaDaBarra
}

/** Arrastar a folha para fechar (`shell/dialogs.js:31-36`). */
export function distanciaFechaFolha(deslocamento: number, velocidade: number): boolean {
  if (deslocamento > FOLHA.distanciaParaFechar) return true
  return deslocamento > FOLHA.distanciaComVelocidade && velocidade > FOLHA.velocidadeParaFechar
}

/**
 * A página de trás encolhe com a folha aberta (`shell/sheet-depth.js:3-5`): só
 * abaixo de 720 px e fora da gaveta lateral.
 */
export function paginaEncolhe(largura: number, gaveta: boolean): boolean {
  return largura < 720 && !gaveta
}
