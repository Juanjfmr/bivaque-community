"use client"

import { Botao } from "@/components/bivaque/botao"
import { CabecaDePagina } from "@/components/bivaque/cabeca-de-pagina"
import { useNavegacao, useRolagemEFoco } from "@/lib/navegacao/react"
import { CARGA_CONCLUIDA } from "@/lib/navegacao/restauracao"

/**
 * Código de conduta (onda 8), texto de versão de teste do protótipo
 * (features/legal/pages.js). A versão final é do jurídico.
 */

const SECOES: readonly (readonly [titulo: string, texto: string])[] = [
  [
    "Respeito",
    "Trate cada pessoa com educação. Discordar é normal; ofender, ameaçar ou perseguir não é.",
  ],
  [
    "Nada de discriminação",
    "Não são aceitos preconceito de origem, cor, religião, gênero, orientação ou condição da família.",
  ],
  [
    "Dados de outras pessoas",
    "Não publique endereço, telefone, CPF, documentos ou fotos de outras pessoas sem a permissão delas. Isso vale também para crianças.",
  ],
  [
    "Comércio honesto",
    "Anuncie só o que você pode entregar, com preço e estado reais. Valores e pagamento são combinados entre vocês; o Bivaque não intermedeia pagamento.",
  ],
  [
    "Como denunciar",
    "Use Denunciar no menu do conteúdo. A equipe analisa e pode remover o conteúdo ou limitar a conta.",
  ],
]

export function Conduta() {
  const navegacao = useNavegacao()
  useRolagemEFoco(CARGA_CONCLUIDA)

  return (
    <section data-tela="conduta" className="grid gap-2">
      <CabecaDePagina titulo="Código de conduta" subtitulo="Versão de teste · 18/10/2026" />
      {SECOES.map(([titulo, texto]) => (
        <article key={titulo} className="grid gap-1">
          <h2 className="text-[17px] leading-6">{titulo}</h2>
          <p className="text-[15px] leading-6 text-(--on-surface-variant)">{texto}</p>
        </article>
      ))}
      <Botao tom="texto" onClick={() => void navegacao.irPara("privacidade")}>
        Ver a Política de privacidade
      </Botao>
    </section>
  )
}
