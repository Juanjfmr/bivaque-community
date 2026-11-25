"use client"

import { Botao } from "@/components/bivaque/botao"
import { CabecaDePagina } from "@/components/bivaque/cabeca-de-pagina"
import { useNavegacao, useRolagemEFoco } from "@/lib/navegacao/react"
import { CARGA_CONCLUIDA } from "@/lib/navegacao/restauracao"

/**
 * Termo de Uso, resumo da tela. O documento integral — o que o aceite cobre —
 * é docs/legal/TERMOS_DE_USO.md, servido pela web em /termos-de-uso.
 */

const SECOES: readonly (readonly [titulo: string, texto: string])[] = [
  [
    "O que é",
    "Comunidade fechada e gratuita para militares federais, veteranos, pensionistas e familiares convidados, organizada por cidade. Em teste, pode mudar ou ser suspensa.",
  ],
  [
    "Sua conta",
    "Pessoal e intransferível, com a elegibilidade conferida. Quem convida responde pelo convite — inclusive por não convidar menores de 18 anos.",
  ],
  [
    "O que você publica",
    "O conteúdo é responsabilidade de quem publica. O Bivaque pode exibi-lo dentro da plataforma, sem ficar com a titularidade.",
  ],
  [
    "Anúncios e negócios",
    "Você pode anunciar o que é seu, com honestidade. Negócio entre membros é entre membros: o Bivaque não intermedeia nem garante.",
  ],
  [
    "Regime",
    "Relação de consumo pelo direito brasileiro. Uma ação pode ser proposta no foro da sua cidade.",
  ],
]

export function Termos() {
  const navegacao = useNavegacao()
  useRolagemEFoco(CARGA_CONCLUIDA)

  return (
    <section data-tela="termos-de-uso" className="grid gap-2">
      <CabecaDePagina
        titulo="Termo de Uso"
        subtitulo="Resumo da versão 1 · 25 de novembro de 2026"
      />
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
