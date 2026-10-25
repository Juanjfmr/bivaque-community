import { useNavegacao, useRolagemEFoco } from "@/lib/navegacao/react"
import { CARGA_CONCLUIDA } from "@/lib/navegacao/restauracao"

/** O fallback visível de endereço inválido ou de parâmetro ausente. */
export function TelaIndisponivel({ motivo }: { motivo?: string }) {
  const navegacao = useNavegacao()
  useRolagemEFoco(CARGA_CONCLUIDA)
  return (
    <section data-tela="indisponivel">
      <h1 id="titulo-da-tela" data-titulo-da-tela tabIndex={-1}>
        Página indisponível
      </h1>
      <p>{motivo ?? "Esse endereço não existe no Bivaque."}</p>
      <button
        type="button"
        data-acao="ir-para-inicio"
        onClick={() => void navegacao.irPara("inicio", { replace: true })}
      >
        Ir para o início
      </button>
    </section>
  )
}
