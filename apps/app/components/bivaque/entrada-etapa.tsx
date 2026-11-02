import type { ReactNode } from "react"

import { Icone } from "@/components/bivaque/icone"

/**
 * Composição B da entrada (aceite, vínculo e vínculo confirmado): barra com o
 * logo e "Sair", indicador de cinco passos e a coluna de conteúdo.
 *
 * A anatomia do indicador segue o Basic Stepper
 * (https://21st.dev/@sean0205/components/c-stepper-1), adaptada com os
 * componentes do app — sem copiar o código do bloco e sem Base UI.
 *
 * Os passos são só apresentação: o atual chega por prop e nada aqui navega.
 */

const PASSOS = [
  { nome: "Conta", opcional: false },
  { nome: "Vínculo", opcional: false },
  { nome: "Cidade", opcional: false },
  { nome: "Grupos", opcional: false },
  { nome: "Negócio", opcional: true },
] as const

export function EntradaEtapa({
  passo,
  titulo,
  apoio = "",
  apoioExtra = null,
  icone = null,
  aoSair,
  children,
}: {
  /** Passo atual, de 1 a 5. Os anteriores aparecem concluídos. Sem ele não há
   *  indicador nem "Sair": é o caso das boas-vindas, que já é o fim da entrada. */
  passo?: number
  titulo: string
  /** Frase de apoio; telas que só têm título passam nada. */
  apoio?: string
  /** Segunda linha do apoio, quando a tela precisa de duas frases. */
  apoioExtra?: string | null
  icone?: ReactNode
  aoSair?: () => void
  children: ReactNode
}) {
  const base = import.meta.env.BASE_URL
  const indiceAtual = passo ?? 1
  const atual = passo === undefined ? null : (PASSOS[passo - 1] ?? PASSOS[0])
  const estadoDo = (indice: number) =>
    indice < indiceAtual - 1 ? "concluido" : indice === indiceAtual - 1 ? "atual" : "futuro"

  return (
    <section data-tela="entrar" data-composicao="etapa" className="entrada-etapa">
      <header className="entrada-etapa-barra">
        <picture>
          <source
            media="(prefers-color-scheme: dark)"
            srcSet={`${base}brand/bivaque-logo-horizontal-white.svg`}
          />
          <img src={`${base}brand/bivaque-logo-horizontal.svg`} alt="Bivaque" />
        </picture>
        {aoSair === undefined ? null : (
          <button type="button" className="entrada-etapa-sair" onClick={aoSair}>
            Sair
          </button>
        )}
      </header>

      {/* O indicador inteiro é uma imagem para o leitor de tela: os círculos e a
          linha decoram e o nome do passo vai no rótulo. */}
      {atual === null ? null : (
        <div
          className="entrada-etapa-passos"
          role="img"
          aria-label={`Etapa ${passo} de 5: ${atual.nome}`}
        >
          <div className="entrada-etapa-trilha">
            {PASSOS.map((item, indice) => (
              <div key={item.nome} className="entrada-etapa-passo" data-estado={estadoDo(indice)}>
                <span className="entrada-etapa-circulo">
                  {indice < indiceAtual - 1 ? <Icone nome="check" /> : indice + 1}
                </span>
                <span className="entrada-etapa-linha" />
                <span className="entrada-etapa-rotulo">
                  {item.nome}
                  {item.opcional ? <span className="entrada-etapa-opcional">opcional</span> : null}
                </span>
              </div>
            ))}
          </div>
          <div className="entrada-etapa-resumo">
            <span className="entrada-etapa-legenda">
              {`Etapa ${passo} de 5 · ${atual.nome}${atual.opcional ? " (opcional)" : ""}`}
            </span>
            <span className="entrada-etapa-segmentos">
              {PASSOS.map((item, indice) => (
                <span key={item.nome} data-estado={estadoDo(indice)} />
              ))}
            </span>
          </div>
        </div>
      )}

      <div className="entrada-etapa-conteudo">
        {icone}
        <h1 id="titulo-da-tela" data-titulo-da-tela tabIndex={-1} className="entrada-etapa-titulo">
          {titulo}
        </h1>
        {apoio === "" ? null : <p className="entrada-etapa-apoio">{apoio}</p>}
        {apoioExtra ? <p className="entrada-etapa-apoio">{apoioExtra}</p> : null}
        <div className="entrada-etapa-corpo">{children}</div>
      </div>
    </section>
  )
}
