/**
 * O gesto da folha (NAV-001), em regras puras — a prova roda sem DOM.
 *
 * A folha segue o dedo enquanto se arrasta para baixo, volta ao lugar quando o
 * arrasto é curto e fecha quando passa do limite ou quando o gesto é rápido.
 * Os tempos e a curva são os do ANIMATION.md: a entrada usa `expand` (480 ms);
 * o painel do Criar, `morph` (420 ms); a volta assenta em `slow` (240 ms), e o
 * fechamento usa 180 ms, porque sair é mais rápido que entrar.
 *
 * Movimento reduzido não impede o gesto: o que acaba é o deslocamento animado.
 * A abertura vira opacidade de 120 ms e a volta é imediata, sem deslizar.
 */

export const GESTO_DA_FOLHA = {
  /** Da alça (ou do topo do conteúdo no início): abaixo disto a folha volta. */
  limiteParaFechar: 96,
  /** Um gesto curto, mas rápido, também fecha. */
  limiteComVelocidade: 24,
  velocidadeParaFechar: 0.5,
  /** `expand`: a folha que sobe (ANIMATION §2, 450–500 ms). */
  duracaoDaEntrada: 480,
  /** `morph`: o contêiner que muda de forma — o Criar em painel (380–420 ms). */
  duracaoDoMorfo: 420,
  duracaoDoRetorno: 240,
  duracaoDoFechamento: 180,
  duracaoReduzida: 120,
  curva: "cubic-bezier(0.16, 1, 0.3, 1)",
} as const

/** O conteúdo só arrasta a folha quando está rolado até o início. */
export function comecaArrasto(rolagemDoConteudo: number): boolean {
  return rolagemDoConteudo <= 0
}

/** Arrastar para cima é do conteúdo; a folha nunca sobe além do lugar dela. */
export function deslocamentoVisivel(deslocamento: number): number {
  return Math.max(0, deslocamento)
}

/** O arrasto solto fecha? Pelo limite, ou por um gesto curto e rápido. */
export function fechaAoSoltar(deslocamento: number, velocidade: number): boolean {
  if (deslocamento > GESTO_DA_FOLHA.limiteParaFechar) return true
  return (
    deslocamento > GESTO_DA_FOLHA.limiteComVelocidade &&
    velocidade > GESTO_DA_FOLHA.velocidadeParaFechar
  )
}

export type AnimacaoDaFolha = "desliza" | "esmaece"

/** Sem movimento: a folha aparece e some por opacidade, sem deslocamento. */
export function animacaoDaFolha(reduzido: boolean): AnimacaoDaFolha {
  return reduzido ? "esmaece" : "desliza"
}

export function duracaoDaAbertura(
  reduzido: boolean,
  modo: "folha" | "painel" = "folha",
): number {
  if (reduzido) return GESTO_DA_FOLHA.duracaoReduzida
  return modo === "painel" ? GESTO_DA_FOLHA.duracaoDoMorfo : GESTO_DA_FOLHA.duracaoDaEntrada
}

/** Quanto o arrasto cancelado leva para voltar ao lugar (0 = na hora). */
export function duracaoDoRetorno(reduzido: boolean): number {
  return reduzido ? 0 : GESTO_DA_FOLHA.duracaoDoRetorno
}

/** Quanto a saída do arrasto leva para descer até sumir (0 = na hora). */
export function duracaoDoFechamento(reduzido: boolean): number {
  return reduzido ? 0 : GESTO_DA_FOLHA.duracaoDoFechamento
}

/**
 * A saída depois de passar do limite: desce do lugar em que o dedo deixou a
 * folha, sem voltar ao topo antes de desmontar.
 */
export function transicaoDoFechamento(reduzido: boolean): string {
  const duracao = duracaoDoFechamento(reduzido)
  if (duracao === 0) return "none"
  return `transform ${duracao}ms ${GESTO_DA_FOLHA.curva}, opacity ${duracao}ms ${GESTO_DA_FOLHA.curva}`
}

export function transicaoDoRetorno(reduzido: boolean): string {
  const duracao = duracaoDoRetorno(reduzido)
  if (duracao === 0) return "none"
  return `transform ${duracao}ms ${GESTO_DA_FOLHA.curva}`
}
