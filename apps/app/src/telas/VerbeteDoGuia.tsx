"use client"

import { useParams } from "@tanstack/react-router"

import { CabecaDePagina } from "@/components/bivaque/cabeca-de-pagina"
import { useRolagemEFoco } from "@/lib/navegacao/react"
import { CARGA_CONCLUIDA } from "@/lib/navegacao/restauracao"
import { validarParametros } from "@/lib/navegacao/rotas"
import { Verbete } from "@/src/guia/Verbete"
import { TelaIndisponivel } from "@/src/telas/TelaIndisponivel"

/**
 * O verbete do Guia em tela própria (F08), no molde do anúncio: o id vem do
 * endereço `/app/guia/<id>`, então a leitura sobrevive à recarga e o Voltar do
 * sistema volta para a lista — o que a folha local não fazia.
 *
 * A tela é a moldura; carregar, salvar e sugerir continuam no `Verbete`, que já
 * distingue carregando, sem acesso, não encontrado e falha recuperável.
 */
export function VerbeteDoGuia() {
  const parametros = useParams({ strict: false }) as Record<string, string | undefined>
  const id = parametros["id"] ?? ""
  useRolagemEFoco(CARGA_CONCLUIDA)

  const validacao = validarParametros("verbete", { id })
  if (!validacao.ok) return <TelaIndisponivel motivo={validacao.motivo} />

  return (
    <section data-tela="verbete" className="grid gap-2">
      <CabecaDePagina titulo="Referência" />
      <Verbete id={id} />
    </section>
  )
}
