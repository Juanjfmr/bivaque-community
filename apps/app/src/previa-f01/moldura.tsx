import {
  type ComponentProps,
  createContext,
  type FormEvent,
  type ReactNode,
  useContext,
  useEffect,
  useId,
  useRef,
} from "react"
import { Icone } from "@/components/bivaque/icone"
import { Button } from "@/components/ui/button"
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
 * computador a etapa ganha o painel das fases ao lado.
 */
export function Moldura({
  titulo,
  apoio,
  children,
  acao,
  secundaria,
  aoEnviar,
}: {
  titulo: ReactNode
  apoio?: ReactNode
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
          <h1 ref={tituloRef} tabIndex={-1} className="f01-titulo">
            {titulo}
          </h1>
          {apoio ? <p className="f01-apoio">{apoio}</p> : null}
          <div className="f01-conteudo">{children}</div>
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
      <PainelDasFases />
    </div>
  )
}

function BotaoDeAcao({ acao, principal = false }: { acao: Acao; principal?: boolean }) {
  const tipo = principal && acao.aoTocar === undefined ? "submit" : "button"
  return (
    <Button
      type={tipo}
      variant={principal ? "default" : "ghost"}
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

const ESTADO_DO_VINCULO: Partial<
  Record<Verificacao, { texto: string; icone: "hourglass_top" | "verified_user" | "info" }>
> = {
  consultando: { texto: "Consultando vínculo", icone: "hourglass_top" },
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
      ) : null}
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
const FASES: readonly { titulo: string; etapas: readonly IdDaEtapa[]; foto: string }[] = [
  {
    titulo: "Sua conta",
    etapas: ["email", "codigo", "aceite"],
    foto: "demo/convite-paisagem.webp",
  },
  { titulo: "Seu vínculo", etapas: ["cpf", "verificacao", "documento"], foto: "demo/mesa.webp" },
  { titulo: "Você e sua cidade", etapas: ["nome", "cidade"], foto: "demo/moro-aqui.webp" },
  {
    titulo: "Sua comunidade",
    etapas: ["previa-cidade", "interesses", "combinado", "avisos"],
    foto: "demo/landing-encontro.webp",
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
  const foto = FASES[atual]?.foto ?? FASES[0]?.foto
  return (
    <aside className="f01-lado" aria-label="Fases do cadastro">
      <img className="f01-lado-foto" src={`${base}${foto}`} alt="" />
      <div className="f01-lado-texto">
        <img
          className="f01-lado-logo"
          src={`${base}brand/bivaque-logo-horizontal-white.svg`}
          alt="Bivaque"
        />
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
      </div>
    </aside>
  )
}

// ── Campo com o rótulo dentro ───────────────────────────────────────────────
/**
 * Campo com rótulo que sobe quando há texto ou foco: sem rótulo em negrito
 * solto em cima do campo, e o nome do campo nunca some (não é placeholder).
 */
export function Campo({
  rotulo,
  ajuda,
  erro,
  acessorio,
  ...entrada
}: {
  rotulo: string
  ajuda?: ReactNode
  erro?: string | null
  acessorio?: ReactNode
} & Omit<ComponentProps<"input">, "placeholder">) {
  const id = useId()
  const idAjuda = `${id}-ajuda`
  const idErro = `${id}-erro`
  return (
    <div className="f01-campo-bloco">
      <div className="f01-campo" data-erro={erro ? "sim" : "nao"}>
        <input
          id={id}
          placeholder=" "
          aria-invalid={erro ? "true" : undefined}
          aria-describedby={`${idErro} ${ajuda ? idAjuda : ""}`.trim()}
          {...entrada}
        />
        <label htmlFor={id}>{rotulo}</label>
        {acessorio ? <span className="f01-campo-acessorio">{acessorio}</span> : null}
      </div>
      <p id={idErro} className="f01-erro" aria-live="polite">
        {erro ? (
          <>
            <Icone nome="error" />
            {erro}
          </>
        ) : null}
      </p>
      {ajuda && !erro ? (
        <p id={idAjuda} className="f01-ajuda">
          {ajuda}
        </p>
      ) : null}
    </div>
  )
}
