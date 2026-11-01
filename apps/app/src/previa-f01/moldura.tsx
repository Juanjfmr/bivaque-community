import { createContext, type FormEvent, type ReactNode, useContext, useEffect, useRef } from "react"
import { Icone } from "@/components/bivaque/icone"
import { Button } from "@/components/ui/button"
import type { IdDaEtapa, Verificacao } from "./fluxo"

/** O que a moldura precisa saber do fluxo, sem conhecer as etapas. */
export type ContextoDaMoldura = {
  etapa: IdDaEtapa
  fracao: number | null
  aoVoltar: (() => void) | null
  verificacao: Verificacao
}

export const MolduraContexto = createContext<ContextoDaMoldura | null>(null)

function useMoldura(): ContextoDaMoldura {
  const contexto = useContext(MolduraContexto)
  if (contexto === null) throw new Error("Moldura fora da prévia do F01")
  return contexto
}

export type Acao = {
  rotulo: string
  /** Sem `aoTocar`, o botão envia o formulário da etapa. */
  aoTocar?: () => void
  carregando?: boolean
  variante?: "default" | "brasa" | "outline" | "ghost"
}

/**
 * Uma etapa: título, texto, conteúdo e a barra de ação. No celular a barra fica
 * fixa no rodapé, sempre no mesmo lugar; no computador ela segue o conteúdo.
 * Tudo dentro de um formulário, para Enter enviar.
 */
export function Moldura({
  titulo,
  texto,
  children,
  acao,
  secundaria,
  aoEnviar,
  semCabecalho = false,
  larga = false,
}: {
  titulo: ReactNode
  texto?: ReactNode
  children?: ReactNode
  acao?: Acao | undefined
  secundaria?: Acao | undefined
  aoEnviar?: () => void
  semCabecalho?: boolean
  larga?: boolean
}) {
  useMoldura()
  const tituloRef = useRef<HTMLHeadingElement>(null)

  // Cada etapa nova leva o foco ao título: o leitor de tela anuncia onde a
  // pessoa está. O contorno não aparece (o título não é interativo). A prévia
  // remonta a moldura a cada etapa (`key`), então basta a montagem.
  useEffect(() => {
    tituloRef.current?.focus({ preventScroll: false })
    window.scrollTo({ top: 0 })
  }, [])

  const enviar = (evento: FormEvent) => {
    evento.preventDefault()
    if (acao?.carregando) return
    aoEnviar?.()
  }

  return (
    <form className="f01-etapa" data-larga={larga ? "sim" : "nao"} onSubmit={enviar} noValidate>
      {semCabecalho ? null : <Cabecalho />}
      <div className="f01-corpo">
        <h1 ref={tituloRef} tabIndex={-1} className="f01-titulo">
          {titulo}
        </h1>
        {texto ? <p className="f01-texto">{texto}</p> : null}
        {children}
      </div>
      {acao || secundaria ? (
        <div className="f01-barra">
          <div className="f01-barra-dentro">
            {acao ? <BotaoDeAcao acao={acao} principal /> : null}
            {secundaria ? <BotaoDeAcao acao={secundaria} /> : null}
          </div>
        </div>
      ) : null}
    </form>
  )
}

function BotaoDeAcao({ acao, principal = false }: { acao: Acao; principal?: boolean }) {
  const tipo = principal && acao.aoTocar === undefined ? "submit" : "button"
  return (
    <Button
      type={tipo}
      variant={acao.variante ?? (principal ? "default" : "ghost")}
      className="f01-botao"
      data-principal={principal ? "sim" : "nao"}
      aria-busy={acao.carregando ? "true" : undefined}
      onClick={acao.aoTocar}
    >
      {acao.carregando ? <span className="f01-girando" aria-hidden="true" /> : null}
      {acao.rotulo}
    </Button>
  )
}

const TEXTO_DA_VERIFICACAO: Partial<Record<Verificacao, string>> = {
  consultando: "Consultando seu vínculo…",
  confirmada: "Vínculo confirmado",
  "nao-encontrada": "Vamos precisar de um documento",
  "portal-fora": "Vamos precisar de um documento",
}

const ICONE_DA_VERIFICACAO: Partial<Record<Verificacao, "verified_user" | "hourglass_top">> = {
  consultando: "hourglass_top",
  confirmada: "verified_user",
}

function Cabecalho() {
  const { fracao, aoVoltar, verificacao, etapa } = useMoldura()
  const mostraVerificacao =
    (etapa === "nome" || etapa === "cidade") && TEXTO_DA_VERIFICACAO[verificacao] !== undefined
  return (
    <header className="f01-cabecalho">
      <div className="f01-cabecalho-linha">
        {aoVoltar ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-lg"
            className="f01-voltar"
            aria-label="Voltar"
            onClick={aoVoltar}
          >
            <Icone nome="arrow_back" />
          </Button>
        ) : (
          <span className="f01-voltar-vazio" aria-hidden="true" />
        )}
        {fracao === null ? null : (
          <div
            className="f01-progresso"
            role="progressbar"
            aria-label="Progresso do cadastro"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(fracao * 100)}
          >
            <span style={{ transform: `scaleX(${fracao})` }} />
          </div>
        )}
      </div>
      <p className="f01-vinculo" aria-live="polite" data-estado={verificacao}>
        {mostraVerificacao ? (
          <>
            <Icone
              nome={ICONE_DA_VERIFICACAO[verificacao] ?? "info"}
              className="f01-vinculo-icone"
            />
            {TEXTO_DA_VERIFICACAO[verificacao]}
          </>
        ) : null}
      </p>
    </header>
  )
}
