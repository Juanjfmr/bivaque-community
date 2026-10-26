import { Botao } from "@/components/bivaque/botao"
import { CabecaDePagina } from "@/components/bivaque/cabeca-de-pagina"
import { EstadoVazio } from "@/components/bivaque/estado-vazio"
import { useNavegacao, useRolagemEFoco } from "@/lib/navegacao/react"
import { CARGA_CONCLUIDA } from "@/lib/navegacao/restauracao"

/** O fallback visível de endereço inválido ou de parâmetro ausente. */
export function TelaIndisponivel({ motivo }: { motivo?: string }) {
  const navegacao = useNavegacao()
  useRolagemEFoco(CARGA_CONCLUIDA)

  return (
    <section data-tela="indisponivel" className="grid gap-3">
      <CabecaDePagina titulo="Página indisponível" />
      <EstadoVazio
        titulo="Este endereço não existe"
        texto={motivo ?? "Esse endereço não existe no Bivaque."}
        icone="search_off"
      />
      <div className="flex justify-center">
        <Botao
          icone="home"
          data-acao="ir-para-inicio"
          onClick={() => void navegacao.irPara("inicio", { replace: true })}
        >
          Ir para o início
        </Botao>
      </div>
    </section>
  )
}
