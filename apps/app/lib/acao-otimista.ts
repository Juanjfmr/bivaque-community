/**
 * A ação otimista comum (NAV-001).
 *
 * A tela responde na hora — o estado muda antes da resposta — e a gravação
 * corre atrás. Se o servidor recusar, o estado anterior volta e o motivo é
 * devolvido para quem chamou mostrar no Aviso. O Desfazer é a mesma ação
 * executada de novo com o estado anterior: ele grava de verdade, não só pinta.
 *
 * A guarda de concorrência é uma ref síncrona por chave, como no CONC-002: o
 * mesmo toque repetido durante a gravação é ignorado, e dois itens diferentes
 * podem gravar ao mesmo tempo (as duas remoções de Salvos). `aoGravando` é o que
 * a tela usa para mostrar `disabled` e `aria-busy`; a guarda não depende dele.
 */

export type ResultadoDoToque =
  | { readonly tipo: "ignorado" }
  | { readonly tipo: "sucesso" }
  | { readonly tipo: "recusa"; readonly mensagem: string }

export type PassoOtimista = {
  /** O estado que a tela passa a mostrar agora. */
  aplicar(): void
  /** A gravação de verdade; a recusa chega pelo `catch`. */
  gravar(): Promise<unknown>
  /** Devolve o estado anterior quando o servidor recusa. */
  reverter(): void
  /**
   * O motivo da recusa, na fala da ação. Texto vazio = nada a dizer (por
   * exemplo, a tela saiu e a chamada foi abortada).
   */
  mensagemDaRecusa(falha: unknown): string
  /** Opcional: o que a tela mostra enquanto grava (`disabled`, `aria-busy`). */
  aoGravando?(gravando: boolean): void
}

export type AcaoOtimista = {
  /** Já existe uma gravação desta chave em curso. */
  readonly gravando: (chave: string) => boolean
  executar(chave: string, passo: PassoOtimista): Promise<ResultadoDoToque>
}

export function criarAcaoOtimista(): AcaoOtimista {
  const emCurso = new Set<string>()
  return {
    gravando: (chave) => emCurso.has(chave),
    async executar(chave, passo) {
      if (emCurso.has(chave)) return { tipo: "ignorado" }
      // A guarda entra no `try`: se `aplicar` lançar, a chave não fica presa e o
      // toque seguinte da mesma ação continua valendo.
      try {
        emCurso.add(chave)
        passo.aoGravando?.(true)
        passo.aplicar()
        try {
          await passo.gravar()
          return { tipo: "sucesso" }
        } catch (falha) {
          passo.reverter()
          return { tipo: "recusa", mensagem: passo.mensagemDaRecusa(falha) }
        }
      } finally {
        emCurso.delete(chave)
        passo.aoGravando?.(false)
      }
    },
  }
}
