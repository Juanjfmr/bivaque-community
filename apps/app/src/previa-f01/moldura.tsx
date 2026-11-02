import { createContext, type FormEvent, type ReactNode, useContext, useEffect, useRef } from "react"
import { Icone } from "@/components/bivaque/icone"
import {
  BarraDeAcao,
  Botao,
  BotaoDeIcone,
  caminhoDaIlustracao,
  Ilustracao,
  type NomeDaIlustracao,
  Progresso,
} from "@/src/pecas/pecas"
import type { IdDaEtapa, Verificacao } from "./fluxo"

/** O que a moldura precisa saber do fluxo, sem conhecer as etapas. */
export type ContextoDaMoldura = {
  etapa: IdDaEtapa
  concluidas: readonly IdDaEtapa[]
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

const base = import.meta.env.BASE_URL

export type Acao = {
  rotulo: string
  /** Sem `aoTocar`, o botão envia o formulário da etapa. */
  aoTocar?: () => void
  carregando?: boolean
}

/**
 * Uma etapa: título, uma linha de apoio (quando precisa), conteúdo e a barra de
 * ação. No celular a barra fica fixa no rodapé, sempre no mesmo lugar. No
 * computador a etapa ganha o painel das fases ao lado, com a ilustração da fase;
 * no celular, a etapa que tem ilustração mostra a cena em cima do título.
 */
export function Moldura({
  titulo,
  apoio,
  ilustracao,
  children,
  acao,
  secundaria,
  aoEnviar,
}: {
  titulo: ReactNode
  apoio?: ReactNode
  ilustracao?: NomeDaIlustracao
  children?: ReactNode
  acao?: Acao | undefined
  secundaria?: Acao | undefined
  aoEnviar?: () => void
}) {
  const tituloRef = useRef<HTMLHeadingElement>(null)

  // A prévia remonta a moldura a cada etapa (`key`): na montagem, o foco vai ao
  // título e o leitor de tela anuncia onde a pessoa está.
  useEffect(() => {
    tituloRef.current?.focus()
    window.scrollTo({ top: 0 })
  }, [])

  const enviar = (evento: FormEvent) => {
    evento.preventDefault()
    if (acao?.carregando) return
    aoEnviar?.()
  }

  return (
    <div className="f01-tela">
      <form className="f01-etapa" onSubmit={enviar} noValidate>
        <Cabecalho />
        <div className="f01-corpo">
          {ilustracao ? (
            <Ilustracao nome={ilustracao} proporcao="2 / 1" className="f01-cena" prioridade />
          ) : null}
          <h1 ref={tituloRef} tabIndex={-1} className="pc-titulo">
            {titulo}
          </h1>
          {apoio ? <p className="f01-apoio">{apoio}</p> : null}
          <div className="f01-conteudo">{children}</div>
        </div>
        {acao || secundaria ? (
          <BarraDeAcao>
            {acao ? <BotaoDeAcao acao={acao} principal /> : null}
            {secundaria ? <BotaoDeAcao acao={secundaria} /> : null}
          </BarraDeAcao>
        ) : null}
      </form>
      <PainelDasFases />
    </div>
  )
}

function BotaoDeAcao({ acao, principal = false }: { acao: Acao; principal?: boolean }) {
  const tipo = principal && acao.aoTocar === undefined ? "submit" : "button"
  return (
    <Botao
      type={tipo}
      tom={principal ? "principal" : "texto"}
      cheio
      data-principal={principal ? "sim" : "nao"}
      carregando={acao.carregando ?? false}
      onClick={acao.aoTocar}
    >
      {acao.rotulo}
    </Botao>
  )
}

const ESTADO_DO_VINCULO: Partial<
  Record<Verificacao, { texto: string; icone: "hourglass_top" | "verified_user" | "info" }>
> = {
  consultando: { texto: "Confirmando vínculo", icone: "hourglass_top" },
  confirmada: { texto: "Vínculo confirmado", icone: "verified_user" },
  "nao-encontrada": { texto: "Falta um documento", icone: "info" },
  "portal-fora": { texto: "Falta um documento", icone: "info" },
}

function Cabecalho() {
  const { fracao, aoVoltar, verificacao, etapa } = useMoldura()
  const vinculo =
    etapa === "nome" || etapa === "cidade" ? ESTADO_DO_VINCULO[verificacao] : undefined
  return (
    <header className="f01-cabecalho">
      {aoVoltar ? (
        <BotaoDeIcone rotulo="Voltar" nome="arrow_back" className="f01-voltar" onClick={aoVoltar} />
      ) : null}
      {fracao === null ? null : (
        <div className="f01-progresso">
          <Progresso fracao={fracao} rotulo="Progresso do cadastro" />
        </div>
      )}
      <span className="f01-vinculo" aria-live="polite" data-estado={verificacao}>
        {vinculo ? (
          <>
            <Icone nome={vinculo.icone} preenchido={verificacao === "confirmada"} />
            {vinculo.texto}
          </>
        ) : null}
      </span>
    </header>
  )
}

// ── Painel das fases (computador) ───────────────────────────────────────────
const FASES: readonly { titulo: string; etapas: readonly IdDaEtapa[]; cena: NomeDaIlustracao }[] = [
  { titulo: "Sua conta", etapas: ["email", "codigo", "aceite"], cena: "conta" },
  { titulo: "Seu vínculo", etapas: ["cpf", "verificacao", "documento"], cena: "vinculo" },
  { titulo: "Você e sua cidade", etapas: ["nome", "cidade"], cena: "cidade" },
  {
    titulo: "Sua comunidade",
    etapas: ["previa-cidade", "interesses", "combinado", "avisos"],
    cena: "encontro",
  },
]

function PainelDasFases() {
  const { etapa, concluidas, verificacao } = useMoldura()
  const atual = Math.max(
    0,
    FASES.findIndex((fase) => fase.etapas.includes(etapa)),
  )
  const estado = (indice: number): "feito" | "atual" | "futuro" => {
    if (indice === atual) return "atual"
    const fase = FASES[indice]
    if (fase === undefined) return "futuro"
    const vinculoPronto = fase.titulo === "Seu vínculo" && verificacao === "confirmada"
    const feita = fase.etapas.some((id) => concluidas.includes(id)) && indice < atual
    return vinculoPronto || feita ? "feito" : "futuro"
  }
  const cena = FASES[atual]?.cena ?? "conta"
  return (
    <aside className="f01-lado" aria-label="Fases do cadastro">
      <picture className="f01-lado-logo">
        <source
          srcSet={`${base}brand/bivaque-logo-horizontal-white.svg`}
          media="(prefers-color-scheme: dark)"
        />
        <img src={`${base}brand/bivaque-logo-horizontal.svg`} alt="Bivaque" />
      </picture>
      <span className="pc-ilustracao f01-lado-cena">
        <img key={cena} src={caminhoDaIlustracao(cena)} alt="" width={1200} height={800} />
      </span>
      <ol className="f01-fases">
        {FASES.map((fase, indice) => (
          <li
            key={fase.titulo}
            data-estado={estado(indice)}
            aria-current={indice === atual ? "step" : undefined}
          >
            <span className="f01-fase-marca" aria-hidden="true">
              {estado(indice) === "feito" ? <Icone nome="check" /> : indice + 1}
            </span>
            {fase.titulo}
          </li>
        ))}
      </ol>
    </aside>
  )
}
