"use client"

import { CabecaDePagina } from "@/components/bivaque/cabeca-de-pagina"
import { EstadoVazio } from "@/components/bivaque/estado-vazio"
import { useNavegacao, useRolagemEFoco } from "@/lib/navegacao/react"
import { CARGA_CONCLUIDA } from "@/lib/navegacao/restauracao"

/**
 * Pessoas bloqueadas (onda 8): quem está bloqueado não aparece mais para você
 * (protótipo: features/profile/blocks.js). A demonstração não tem bloqueios; o
 * vazio explica o efeito.
 */
export function Bloqueados() {
  const navegacao = useNavegacao()
  useRolagemEFoco(CARGA_CONCLUIDA)

  return (
    <section data-tela="bloqueados" className="grid gap-2">
      <CabecaDePagina titulo="Pessoas bloqueadas" subtitulo="Quem não aparece mais para você." />
      <EstadoVazio
        titulo="Ninguém bloqueado"
        texto="Bloquear esconde o que a pessoa publicou e fecha a conversa com ela, sem avisá-la. Você desfaz quando quiser."
        icone="person"
        acao={{
          rotulo: "Voltar para Você",
          aoAcionar: () => void navegacao.irPara("voce"),
        }}
      />
    </section>
  )
}
