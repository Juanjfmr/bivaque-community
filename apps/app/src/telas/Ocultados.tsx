"use client"

import { CabecaDePagina } from "@/components/bivaque/cabeca-de-pagina"
import { EstadoVazio } from "@/components/bivaque/estado-vazio"
import { useNavegacao, useRolagemEFoco } from "@/lib/navegacao/react"
import { CARGA_CONCLUIDA } from "@/lib/navegacao/restauracao"

/**
 * Ocultados (onda 8): ocultar é pessoal e reversível (protótipo:
 * features/profile/hidden.js). A demonstração não tem itens ocultos; o vazio
 * explica o que aparece aqui.
 */
export function Ocultados() {
  const navegacao = useNavegacao()
  useRolagemEFoco(CARGA_CONCLUIDA)

  return (
    <section data-tela="ocultados" className="grid gap-2">
      <CabecaDePagina
        titulo="Ocultados"
        subtitulo="O que você ocultou das suas listas — só você vê isto."
      />
      <EstadoVazio
        titulo="Nada oculto por aqui"
        texto="Ocultar tira o item das suas listas sem avisar ninguém, e você pode mostrar de novo quando quiser."
        icone="visibility_off"
        acao={{
          rotulo: "Ver perguntas da comunidade",
          aoAcionar: () => void navegacao.irPara("comunidade"),
        }}
      />
    </section>
  )
}
