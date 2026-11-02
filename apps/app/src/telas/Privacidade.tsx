"use client"

import { Botao } from "@/components/bivaque/botao"
import { CabecaDePagina } from "@/components/bivaque/cabeca-de-pagina"
import { useNavegacao, useRolagemEFoco } from "@/lib/navegacao/react"
import { CARGA_CONCLUIDA } from "@/lib/navegacao/restauracao"

/**
 * Política de privacidade (onda 8), texto de versão de teste do protótipo
 * (features/legal/pages.js). A versão final é do jurídico.
 */

const SECOES: readonly (readonly [titulo: string, texto: string])[] = [
  [
    "O que guardamos",
    "Seu nome, e-mail, cidade e o que você publica. O CPF serve só para confirmar o vínculo e não fica salvo.",
  ],
  ["Quem vê", "Só membros confirmados da família militar. Seu bairro só aparece se você permitir."],
  ["Seus direitos", "Ver, corrigir ou apagar seus dados a qualquer momento, em Configurações."],
  ["Neste teste", "Tudo o que você digita fica só neste aparelho. Nenhuma mensagem sai dele."],
]

export function Privacidade() {
  const navegacao = useNavegacao()
  useRolagemEFoco(CARGA_CONCLUIDA)

  return (
    <section data-tela="privacidade" className="grid gap-2">
      <CabecaDePagina titulo="Política de privacidade" subtitulo="Versão de teste · 18/10/2026" />
      {SECOES.map(([titulo, texto]) => (
        <article key={titulo} className="grid gap-1">
          <h2 className="text-[17px] leading-6">{titulo}</h2>
          <p className="text-[15px] leading-6 text-(--on-surface-variant)">{texto}</p>
        </article>
      ))}
      <Botao tom="texto" onClick={() => void navegacao.irPara("conduta")}>
        Ver o Código de conduta
      </Botao>
    </section>
  )
}
