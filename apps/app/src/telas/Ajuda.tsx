"use client"

import { CabecaDePagina } from "@/components/bivaque/cabeca-de-pagina"
import { LinhaDeLista } from "@/components/bivaque/lista"
import { Secao } from "@/components/bivaque/secao"
import { useNavegacao, useRolagemEFoco } from "@/lib/navegacao/react"
import { CARGA_CONCLUIDA } from "@/lib/navegacao/restauracao"

/**
 * Ajuda (onda 8), só o que o app faz hoje — as perguntas da conta, do
 * protótipo (features/support/help.js). Os demais temas e o histórico de
 * chamados ficam para o refino.
 */

const PERGUNTAS: readonly (readonly [pergunta: string, resposta: string])[] = [
  [
    "Por que pedem o CPF?",
    "Para confirmar seu vínculo na fonte oficial. O número só é conferido e não fica salvo no Bivaque.",
  ],
  [
    "Sou cônjuge ou dependente. Como entro?",
    "Pelo convite de quem é militar, veterano ou pensionista. Essa pessoa cria o código em Você → Família convidada. O convite vale só para o e-mail de quem foi convidado, por 7 dias, e não pede CPF.",
  ],
  [
    "A fonte oficial não confirmou meu vínculo.",
    "Envie um documento que mostre o vínculo, como o contracheque ou a identidade militar. A equipe responde em até 2 dias úteis e, enquanto isso, o conteúdo fica fechado.",
  ],
  ["Esqueci a senha.", "Na tela Entrar, toque em Esqueci minha senha e informe seu e-mail."],
  ["Como apago minha conta?", "Em Você → Apagar a conta. Você confirma digitando APAGAR."],
]

export function Ajuda() {
  const navegacao = useNavegacao()
  useRolagemEFoco(CARGA_CONCLUIDA)

  return (
    <section data-tela="ajuda" className="grid gap-2">
      <CabecaDePagina titulo="Ajuda" subtitulo="Perguntas frequentes, contato e chamados." />

      <Secao titulo="Conta e entrada">
        <div className="grid gap-3">
          {PERGUNTAS.map(([pergunta, resposta]) => (
            <details
              key={pergunta}
              className="rounded-2xl bg-(--surface-lowest) px-4 py-3 ring-1 ring-(--outline-variant)"
            >
              <summary className="cursor-pointer text-[15px] font-semibold">{pergunta}</summary>
              <p className="mt-2 text-[15px] leading-6 text-(--on-surface-variant)">{resposta}</p>
            </details>
          ))}
        </div>
      </Secao>

      <Secao titulo="Precisa falar com a gente?">
        <div className="grid gap-2">
          <LinhaDeLista
            icone="support"
            titulo="Fale com a gente"
            subtitulo="Escreva o que aconteceu; respondemos em até 2 dias úteis"
            onClick={() => void navegacao.irPara("contato")}
          />
          <LinhaDeLista
            icone="inbox"
            titulo="Meus chamados"
            subtitulo="O que você já nos contou"
            onClick={() => void navegacao.irPara("chamados")}
          />
        </div>
      </Secao>
    </section>
  )
}
