"use client"

import { Botao } from "@/components/bivaque/botao"
import { CabecaDePagina } from "@/components/bivaque/cabeca-de-pagina"
import type { NomeDeIcone } from "@/lib/icones"
import { useNavegacao, useRolagemEFoco } from "@/lib/navegacao/react"
import { CARGA_CONCLUIDA } from "@/lib/navegacao/restauracao"
import { useCasca } from "@/src/contexto/casca"

/**
 * O Guia da cidade da onda 2 (protótipo: features/transfers/guide.js).
 * Conteúdo estático em cinco passos; cada passo leva à rota que resolve.
 */

type Passo = {
  readonly titulo: string
  readonly texto?: string
  readonly itens?: readonly string[]
  readonly rotulo: string
  readonly rota: string
  readonly icone: NomeDeIcone
}

const PASSOS: readonly Passo[] = [
  {
    titulo: "1. Escolha a região antes do imóvel",
    texto:
      "Compare o trajeto para o trabalho, escola e serviços que você usa. Faça visitas em horários diferentes e confirme as condições de locação.",
    rotulo: "Ver imóveis da cidade",
    rota: "imoveis",
    icone: "apartment",
  },
  {
    titulo: "2. Planeje a mudança por escrito",
    itens: [
      "Solicite propostas com o mesmo inventário de móveis e caixas.",
      "Confirme embalagem, montagem, prazos e cobertura de danos.",
      "Registre contatos e condições combinadas.",
    ],
    rotulo: "Buscar serviços de mudança",
    rota: "busca",
    icone: "local_shipping",
  },
  {
    titulo: "3. Resolva escola e rotina",
    texto:
      "Confirme a série, os turnos e a disponibilidade diretamente com as instituições. As experiências da comunidade ajudam a comparar opções.",
    rotulo: "Buscar indicações de escolas",
    rota: "comunidade",
    icone: "school",
  },
  {
    titulo: "4. Monte sua rede de serviços",
    texto:
      "Salve os negócios que fazem sentido para você. Confira a origem das indicações e combine valor, horário e escopo antes de contratar.",
    rotulo: "Ver negócios locais",
    rota: "negocios",
    icone: "storefront",
  },
  {
    titulo: "5. Compartilhe o que funcionou",
    texto:
      "Quando uma indicação ajudar, marque a resposta que resolveu. Esse relato fica disponível para as próximas famílias.",
    rotulo: "Abrir a comunidade",
    rota: "comunidade",
    icone: "forum",
  },
]

export function Guia() {
  const casca = useCasca()
  const navegacao = useNavegacao()
  useRolagemEFoco(CARGA_CONCLUIDA)

  return (
    <section data-tela="guia" className="grid gap-2">
      <CabecaDePagina
        titulo={`Guia de ${casca.cidade}`}
        subtitulo="Um roteiro para organizar sua chegada e seus primeiros contatos."
      />

      <div className="grid gap-3">
        {PASSOS.map((passo) => (
          <article
            key={passo.titulo}
            data-guia="passo"
            className="grid gap-2 rounded-2xl bg-(--surface-lowest) p-4 ring-1 ring-(--outline-variant)"
          >
            <h3 className="text-[17px] leading-6">{passo.titulo}</h3>
            {passo.texto === undefined ? null : (
              <p className="text-sm text-(--on-surface-variant)">{passo.texto}</p>
            )}
            {passo.itens === undefined ? null : (
              <ul className="list-disc pl-5 text-sm text-(--on-surface-variant)">
                {passo.itens.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
            <Botao
              tom="texto"
              icone={passo.icone}
              onClick={() => void navegacao.irPara(passo.rota)}
              className="justify-self-start"
            >
              {passo.rotulo}
            </Botao>
          </article>
        ))}
      </div>
    </section>
  )
}
