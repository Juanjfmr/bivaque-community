"use client"

import { CabecaDePagina } from "@/components/bivaque/cabeca-de-pagina"
import { EstadoVazio } from "@/components/bivaque/estado-vazio"
import { useNavegacao, useRolagemEFoco } from "@/lib/navegacao/react"
import { CARGA_CONCLUIDA } from "@/lib/navegacao/restauracao"

/** Meus chamados (onda 8): o histórico de suporte responde no backend. */
export function Chamados() {
  const navegacao = useNavegacao()
  useRolagemEFoco(CARGA_CONCLUIDA)

  return (
    <section data-tela="chamados" className="grid gap-2">
      <CabecaDePagina titulo="Meus chamados" subtitulo="O que você já nos contou e a resposta." />
      <EstadoVazio
        titulo="Nenhum chamado aberto"
        texto="Quando precisar, escreva para a gente — a resposta chega por e-mail."
        icone="inbox"
        acao={{
          rotulo: "Fale com a gente",
          aoAcionar: () => void navegacao.irPara("contato"),
        }}
      />
    </section>
  )
}
