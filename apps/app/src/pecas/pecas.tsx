import {
  type ComponentProps,
  type CSSProperties,
  type PointerEvent,
  type ReactNode,
  type Ref,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react"
import { Icone } from "@/components/bivaque/icone"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import type { NomeDeIcone } from "@/lib/icones"
import { prefersReduzido } from "@/lib/movimento"
import { SeletorDeFoto } from "@/lib/nativo/SeletorDeFoto"
import { iniciais } from "@/lib/texto"
import {
  animacaoDaFolha,
  comecaArrasto,
  deslocamentoVisivel,
  duracaoDaAbertura,
  duracaoDoFechamento,
  fechaAoSoltar,
  transicaoDoFechamento,
  transicaoDoRetorno,
} from "./gesto-da-folha"
import "./pecas.css"

/**
 * As peças do Bivaque (rodada de identidade, 02/11/2026). Toda prévia monta a
 * tela com estas peças e não redesenha botão, chip, cartão ou campo por conta
 * própria; a regra de cada uma está em
 * docs/agents/regua-nextdoor/IDENTIDADE-DAS-PECAS.md.
 */

const base = import.meta.env.BASE_URL

const juntar = (...classes: (string | false | undefined)[]): string =>
  classes.filter(Boolean).join(" ")

// ── botão ──────────────────────────────────────────────────────────────────
export type TomDoBotao = "principal" | "tom" | "contorno" | "texto"

/**
 * Todo botão é pílula. `principal` é a ação de concluir em ardósia
 * (--pc-acao): no máximo uma por tela. `aria-pressed` liga a seleção (Grafite).
 * A Brasa não mora aqui — só no começar a criar (FAB e Criar da barra,
 * ADR-20261118).
 */
export function Botao({
  tom = "tom",
  compacto = false,
  cheio = false,
  icone,
  carregando = false,
  children,
  className,
  type = "button",
  ...props
}: ComponentProps<"button"> & {
  tom?: TomDoBotao
  compacto?: boolean
  cheio?: boolean
  icone?: NomeDeIcone | undefined
  carregando?: boolean
}) {
  // Ícone cheio só quando o botão está ligado (Útil marcado, salvo).
  const ligado = props["aria-pressed"] === true || props["aria-pressed"] === "true"
  return (
    <button
      type={type}
      className={juntar("pc-botao", className)}
      data-tom={tom}
      data-tamanho={compacto ? "compacto" : undefined}
      data-largura={cheio ? "cheia" : undefined}
      aria-busy={carregando ? "true" : undefined}
      {...props}
    >
      {carregando ? <span className="pc-girando" aria-hidden="true" /> : null}
      {!carregando && icone ? <Icone nome={icone} preenchido={ligado} /> : null}
      {children}
    </button>
  )
}

export function BotaoDeIcone({
  rotulo,
  nome,
  tom,
  compacto = false,
  preenchido = false,
  className,
  type = "button",
  ...props
}: ComponentProps<"button"> & {
  /** Nome acessível: o ícone é enfeite e não entra no nome. */
  rotulo: string
  nome: NomeDeIcone
  /** `sobre-foto`: círculo escuro translúcido, para agir em cima de uma imagem. */
  tom?: "principal" | "tom" | "sobre-foto"
  /** Desenho de 32 px; a área de toque continua com 44. */
  compacto?: boolean
  preenchido?: boolean
}) {
  // O eixo FILL da fonte é o que desenha o "ligado"; `aria-pressed` já o diz.
  const ligado = preenchido || props["aria-pressed"] === true || props["aria-pressed"] === "true"
  return (
    <button
      type={type}
      aria-label={rotulo}
      className={juntar("pc-botao-icone", className)}
      data-tom={tom}
      data-tamanho={compacto ? "compacto" : undefined}
      {...props}
    >
      <Icone nome={nome} preenchido={ligado} />
    </button>
  )
}

// ── chip ───────────────────────────────────────────────────────────────────
export function Chip({
  selecionado,
  children,
  ...props
}: Omit<ComponentProps<"button">, "type"> & { selecionado: boolean }) {
  return (
    <button type="button" className="pc-chip" aria-pressed={selecionado} {...props}>
      {selecionado ? <Icone nome="check" /> : null}
      {children}
    </button>
  )
}

// ── cartão e linha ─────────────────────────────────────────────────────────
export function Cartao({ className, ...props }: ComponentProps<"article">) {
  return <article className={juntar("pc-cartao", className)} {...props} />
}

/** Linha de lista tocável: marca à esquerda, título e apoio, e um acessório. */
export function Linha({
  marca,
  titulo,
  apoio,
  acessorio = <Icone nome="chevron_right" />,
  className,
  ...props
}: Omit<ComponentProps<"button">, "type" | "title"> & {
  marca?: ReactNode
  titulo: ReactNode
  apoio?: ReactNode
  acessorio?: ReactNode
}) {
  return (
    <button type="button" className={juntar("pc-linha", className)} {...props}>
      {marca ?? <span />}
      <span className="pc-linha-texto">
        <span className="pc-linha-titulo">{titulo}</span>
        {apoio ? <span className="pc-apoio">{apoio}</span> : null}
      </span>
      <span className="pc-linha-acessorio">{acessorio}</span>
    </button>
  )
}

// ── avatar, selo e ilustração ──────────────────────────────────────────────
function tomDoNome(nome: string): number {
  let soma = 0
  for (const letra of nome) soma = (soma + (letra.codePointAt(0) ?? 0)) % 997
  return soma % 4
}

/** Pessoa sem foto ganha as iniciais num dos tons da família, sempre o mesmo. */
export function Avatar({
  nome,
  foto,
  tamanho = 40,
}: {
  nome: string
  foto?: string | null
  tamanho?: 32 | 40 | 56
}) {
  return (
    <span
      className="pc-avatar"
      data-tom={foto ? undefined : tomDoNome(nome)}
      style={{ "--pc-avatar": `${tamanho}px` } as CSSProperties}
      aria-hidden="true"
    >
      {foto ? <img src={`${base}${foto}`} alt="" /> : iniciais(nome)}
    </span>
  )
}

export const ILUSTRACOES = [
  "porta",
  "conta",
  "vinculo",
  "cidade",
  "chegando",
  "morando",
  "saindo",
  "encontro",
  "familias",
] as const

export type NomeDaIlustracao = (typeof ILUSTRACOES)[number]

export const SELOS = [
  "chegadas",
  "morando",
  "escolas",
  "saude",
  "mudancas",
  "pets",
  "conjuges",
  "saindo",
  "corrida",
  "familias",
] as const

export type NomeDoSelo = (typeof SELOS)[number]

export const caminhoDaIlustracao = (nome: NomeDaIlustracao): string =>
  `${base}ilustracoes/${nome}.webp`

export const caminhoDoSelo = (nome: NomeDoSelo): string => `${base}ilustracoes/selo-${nome}.webp`

/** Cena da família de ilustrações. É enfeite: `alt` vazio. */
export function Ilustracao({
  nome,
  proporcao = "3 / 2",
  enquadre = "50% 50%",
  prioridade = false,
  className,
}: {
  nome: NomeDaIlustracao
  proporcao?: string
  /** `object-position` do recorte, quando a proporção corta a cena. */
  enquadre?: string
  /** A ilustração do topo da primeira tela carrega já, sem esperar rolagem. */
  prioridade?: boolean
  className?: string | undefined
}) {
  return (
    <span className={juntar("pc-ilustracao", className)} style={{ aspectRatio: proporcao }}>
      <img
        src={caminhoDaIlustracao(nome)}
        alt=""
        width={1200}
        height={800}
        loading={prioridade ? "eager" : "lazy"}
        decoding="async"
        style={{ objectPosition: enquadre }}
      />
    </span>
  )
}

/**
 * Selo de grupo: um objeto da família, no lugar do monograma. Sem `tamanho`, o
 * CSS da tela pode mudar o tamanho por `--pc-selo` (ex.: 64 na grade do computador).
 */
export function Selo({ nome, tamanho }: { nome: NomeDoSelo; tamanho?: 40 | 48 | 64 | 112 }) {
  return (
    <span
      className="pc-selo"
      style={tamanho ? ({ "--pc-selo": `${tamanho}px` } as CSSProperties) : undefined}
      aria-hidden="true"
    >
      <img src={caminhoDoSelo(nome)} alt="" loading="lazy" decoding="async" />
    </span>
  )
}

// ── campos ─────────────────────────────────────────────────────────────────
function Mensagens({
  idErro,
  idAjuda,
  erro,
  ajuda,
}: {
  idErro: string
  idAjuda: string
  erro: string | null | undefined
  ajuda: ReactNode
}) {
  return (
    <>
      <p id={idErro} className="pc-erro" aria-live="polite">
        {erro ? (
          <>
            <Icone nome="error" />
            {erro}
          </>
        ) : null}
      </p>
      {ajuda && !erro ? (
        <p id={idAjuda} className="pc-apoio">
          {ajuda}
        </p>
      ) : null}
    </>
  )
}

/**
 * Campo com o rótulo dentro, que sobe com foco ou texto: o nome do campo nunca
 * some e não há rótulo em negrito solto em cima.
 */
export function Campo({
  rotulo,
  ajuda,
  erro,
  acessorio,
  id: idExterno,
  ...entrada
}: {
  rotulo: string
  ajuda?: ReactNode
  erro?: string | null
  acessorio?: ReactNode
  /** Id conhecido por quem chama (as provas apontam para ele); sem ele, um gerado. */
  id?: string
} & Omit<ComponentProps<"input">, "placeholder" | "id">) {
  const gerado = useId()
  const id = idExterno ?? gerado
  const idAjuda = `${id}-ajuda`
  const idErro = `${id}-erro`
  return (
    <div className="pc-campo-bloco">
      <div className="pc-campo" data-erro={erro ? "sim" : "nao"}>
        <input
          id={id}
          placeholder=" "
          aria-invalid={erro ? "true" : undefined}
          aria-describedby={`${idErro} ${ajuda ? idAjuda : ""}`.trim()}
          {...entrada}
        />
        <label htmlFor={id}>{rotulo}</label>
        {acessorio ? <span className="pc-campo-acessorio">{acessorio}</span> : null}
      </div>
      <Mensagens idErro={idErro} idAjuda={idAjuda} erro={erro} ajuda={ajuda} />
    </div>
  )
}

/** Escolha numa lista curta, com o mesmo rótulo de dentro do `Campo`. */
export function CampoDeEscolha({
  rotulo,
  erro,
  opcoes,
  value,
  id: idExterno,
  ...entrada
}: {
  rotulo: string
  erro?: string | null
  opcoes: readonly { valor: string; rotulo: string }[]
  value: string
  id?: string
} & Omit<ComponentProps<"select">, "children" | "value" | "id">) {
  const gerado = useId()
  const id = idExterno ?? gerado
  const idErro = `${id}-erro`
  return (
    <div className="pc-campo-bloco">
      <div className="pc-campo" data-erro={erro ? "sim" : "nao"}>
        <select
          id={id}
          value={value}
          data-vazio={value === "" ? "sim" : "nao"}
          aria-invalid={erro ? "true" : undefined}
          aria-describedby={idErro}
          {...entrada}
        >
          <option value="" disabled hidden />
          {opcoes.map((opcao) => (
            <option key={opcao.valor} value={opcao.valor}>
              {opcao.rotulo}
            </option>
          ))}
        </select>
        <label htmlFor={id}>{rotulo}</label>
        <span className="pc-campo-acessorio">
          <Icone nome="expand_more" />
        </span>
      </div>
      <Mensagens idErro={idErro} idAjuda={`${id}-ajuda`} erro={erro} ajuda={null} />
    </div>
  )
}

/** Texto longo. O rótulo fica para o leitor de tela; a dica vai no placeholder. */
export function AreaDeTexto({
  rotulo,
  erro,
  id: idExterno,
  ...entrada
}: { rotulo: string; erro?: string | null; id?: string } & Omit<ComponentProps<"textarea">, "id">) {
  const gerado = useId()
  const id = idExterno ?? gerado
  const idErro = `${id}-erro`
  return (
    <div className="pc-campo-bloco">
      <label htmlFor={id} className="sr-only">
        {rotulo}
      </label>
      <textarea
        id={id}
        className="pc-area"
        data-erro={erro ? "sim" : "nao"}
        aria-invalid={erro ? "true" : undefined}
        aria-describedby={idErro}
        {...entrada}
      />
      <Mensagens idErro={idErro} idAjuda={`${id}-ajuda`} erro={erro} ajuda={null} />
    </div>
  )
}

/**
 * O código que chega por e-mail, em casas. Um campo só por baixo (cola e
 * preenchimento automático do celular funcionam); as casas são o desenho.
 */
export function CampoDeCodigo({
  rotulo,
  valor,
  aoMudar,
  erro,
  casas = 6,
}: {
  rotulo: string
  valor: string
  aoMudar: (digitos: string) => void
  erro?: string | null
  casas?: number
}) {
  const id = useId()
  const idErro = `${id}-erro`
  return (
    <div className="pc-campo-bloco">
      <div className="pc-casas" data-erro={erro ? "sim" : "nao"}>
        {Array.from({ length: casas }, (_, indice) => (
          <span
            // As casas são fixas e não mudam de ordem.
            // biome-ignore lint/suspicious/noArrayIndexKey: posição é a identidade da casa.
            key={indice}
            className="pc-casa"
            data-atual={indice === valor.length ? "sim" : "nao"}
            aria-hidden="true"
          >
            {valor[indice] ?? ""}
          </span>
        ))}
        <input
          id={id}
          className="pc-casas-entrada"
          aria-label={rotulo}
          aria-invalid={erro ? "true" : undefined}
          aria-describedby={idErro}
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={casas}
          value={valor}
          onChange={(evento) => aoMudar(evento.target.value.replace(/\D/g, "").slice(0, casas))}
        />
      </div>
      <Mensagens idErro={idErro} idAjuda={`${id}-ajuda`} erro={erro} ajuda={null} />
    </div>
  )
}

export type OpcaoIlustrada<T extends string> = { valor: T; rotulo: string; selo: NomeDoSelo }

/**
 * Escolha única entre poucas opções, cada uma com o seu selo. São rádios de
 * verdade: setas trocam a opção e o leitor de tela lê o grupo pela legenda.
 */
export function EscolhaIlustrada<T extends string>({
  legenda,
  nome,
  opcoes,
  valor,
  aoEscolher,
  erro,
}: {
  legenda: string
  /** Nome do grupo de rádios no formulário. */
  nome: string
  opcoes: readonly OpcaoIlustrada<T>[]
  valor: T | ""
  aoEscolher: (valor: T) => void
  erro?: string | null
}) {
  const id = useId()
  const idErro = `${id}-erro`
  return (
    <fieldset className="pc-escolha" aria-describedby={idErro}>
      <legend className="pc-subtitulo">{legenda}</legend>
      <div className="pc-escolha-opcoes">
        {opcoes.map((opcao) => (
          <label key={opcao.valor} className="pc-escolha-opcao">
            <input
              type="radio"
              name={nome}
              value={opcao.valor}
              checked={valor === opcao.valor}
              className="sr-only"
              onChange={() => aoEscolher(opcao.valor)}
            />
            <span className="pc-escolha-arte">
              <img src={caminhoDoSelo(opcao.selo)} alt="" decoding="async" />
            </span>
            <span className="pc-escolha-rotulo">{opcao.rotulo}</span>
            <span className="pc-escolha-marca" aria-hidden="true">
              <Icone nome="check_circle" preenchido />
            </span>
          </label>
        ))}
      </div>
      <Mensagens idErro={idErro} idAjuda={`${id}-ajuda`} erro={erro} ajuda={null} />
    </fieldset>
  )
}

/** Envio de um arquivo: a área inteira abre o seletor; mostra o que foi escolhido. */
export function CampoDeArquivo({
  rotulo,
  dica,
  escolhido,
  aceitar,
  aoEscolher,
  erro,
  id: idExterno,
}: {
  rotulo: string
  dica: string
  /** Descrição do arquivo já escolhido ("PDF, 120 KB"), ou nada. */
  escolhido: string | null
  aceitar: string
  aoEscolher: (arquivo: File | undefined) => void
  erro?: string | null
  id?: string
}) {
  const gerado = useId()
  const id = idExterno ?? gerado
  const idErro = `${id}-erro`
  return (
    <div className="pc-campo-bloco">
      <label
        htmlFor={id}
        className="pc-arquivo"
        data-escolhido={escolhido ? "sim" : "nao"}
        data-erro={erro ? "sim" : "nao"}
      >
        <Icone nome={escolhido ? "check_circle" : "upload"} preenchido={escolhido !== null} />
        <span>
          <strong>{escolhido ? "Arquivo pronto" : rotulo}</strong>
          {escolhido ?? dica}
        </span>
      </label>
      <SeletorDeFoto
        id={id}
        type="file"
        accept={aceitar}
        className="sr-only"
        aria-describedby={idErro}
        onChange={(evento) => aoEscolher(evento.target.files?.[0])}
      />
      <Mensagens idErro={idErro} idAjuda={`${id}-ajuda`} erro={erro} ajuda={null} />
    </div>
  )
}

/**
 * Onde se escreve um comentário: o campo em pílula que cresce com o texto e o
 * envio em ardósia ao lado, que é a ação de concluir da tela que o usa
 * (ADR-20261118).
 */
export function Compositor({
  rotulo,
  rotuloDoEnvio,
  valor,
  aoMudar,
  campoRef,
  placeholder,
}: {
  rotulo: string
  rotuloDoEnvio: string
  valor: string
  aoMudar: (texto: string) => void
  campoRef?: Ref<HTMLTextAreaElement>
  placeholder?: string
}) {
  const id = useId()
  return (
    <div className="pc-compositor">
      <label htmlFor={id} className="sr-only">
        {rotulo}
      </label>
      <textarea
        id={id}
        ref={campoRef}
        rows={1}
        placeholder={placeholder}
        value={valor}
        onChange={(evento) => aoMudar(evento.target.value)}
      />
      <BotaoDeIcone
        type="submit"
        tom="principal"
        rotulo={rotuloDoEnvio}
        nome="send"
        disabled={valor.trim() === ""}
      />
    </div>
  )
}

export function CampoDeBusca({
  rotulo,
  ...entrada
}: { rotulo: string } & Omit<ComponentProps<"input">, "type">) {
  return (
    <label className="pc-busca">
      <Icone nome="search" />
      <span className="sr-only">{rotulo}</span>
      <input type="search" {...entrada} />
    </label>
  )
}

// ── estado, nota e progresso ───────────────────────────────────────────────
/** O que já está feito: vínculo confirmado, pergunta resolvida. */
export function Estado({
  icone = "check_circle",
  children,
}: {
  icone?: NomeDeIcone
  children: ReactNode
}) {
  return (
    <span className="pc-estado">
      <Icone nome={icone} preenchido />
      {children}
    </span>
  )
}

/** Uma informação que pede atenção, sem ser erro. */
export function Nota({
  icone = "info",
  children,
  ...props
}: { icone?: NomeDeIcone; children: ReactNode } & ComponentProps<"p">) {
  return (
    <p className="pc-nota" {...props}>
      <Icone nome={icone} />
      <span>{children}</span>
    </p>
  )
}

export function Progresso({
  fracao,
  rotulo,
  maximo = 100,
  valor,
}: {
  fracao: number
  rotulo: string
  maximo?: number
  valor?: number
}) {
  return (
    <div
      className="pc-progresso"
      role="progressbar"
      aria-label={rotulo}
      aria-valuemin={0}
      aria-valuemax={maximo}
      aria-valuenow={valor ?? Math.round(fracao * maximo)}
    >
      <span style={{ transform: `scaleX(${fracao})` }} />
    </div>
  )
}

// ── topo e barra de ação ───────────────────────────────────────────────────
export function Topo({
  titulo,
  aoVoltar,
  acao,
  children,
}: {
  titulo?: string
  aoVoltar?: (() => void) | null
  acao?: ReactNode
  children?: ReactNode
}) {
  return (
    <header className="pc-topo">
      {aoVoltar ? <BotaoDeIcone rotulo="Voltar" nome="arrow_back" onClick={aoVoltar} /> : null}
      {titulo ? <p className="pc-topo-titulo">{titulo}</p> : null}
      {children}
      {acao ?? null}
    </header>
  )
}

/** A ação da tela: fixa no rodapé do celular, no fim do conteúdo no computador. */
export function BarraDeAcao({ children }: { children: ReactNode }) {
  return (
    <div className="pc-barra">
      <div className="pc-barra-dentro">{children}</div>
    </div>
  )
}

// ── folha que sobe de baixo ────────────────────────────────────────────────
/**
 * A Folha única do app (NAV-001): toda sobreposição de ação é esta peça.
 *
 * A caixa é a do Radix (`DialogContent`), que já prende o foco, fecha no Esc e
 * no fundo e devolve o foco a quem abriu. Arrastar a alça — ou o topo do
 * conteúdo, quando ele está rolado até o início — acompanha o dedo; soltar
 * antes do limite volta ao lugar com a curva do ANIMATION.md, e depois dele
 * fecha. `modo="painel"` é a mesma caixa em painel central, para o Criar e a
 * paleta no computador.
 */
export function Folha({
  aberta,
  aoFechar,
  titulo,
  descricao,
  modo = "folha",
  focoInicial,
  sobreposicao,
  acaoDoCabecalho,
  fundoProps,
  className,
  children,
}: {
  aberta: boolean
  aoFechar: () => void
  titulo: string
  descricao?: ReactNode
  modo?: "folha" | "painel"
  /** Seletor do que recebe o foco ao abrir; sem ele, o primeiro focável. */
  focoInicial?: string
  /** Id publicado em `data-sobreposicao`, para a casca e as provas. */
  sobreposicao?: string
  /** No lugar do botão Fechar padrão (o Criar mantém o dele). */
  acaoDoCabecalho?: ReactNode
  /** Atributos do fundo, para quem já o pinta por CSS (`data-criar-fundo`). */
  fundoProps?: Readonly<Record<`data-${string}`, string | undefined>>
  className?: string
  children: ReactNode
}) {
  const caixa = useRef<HTMLDivElement>(null)
  // Quem abriu a Folha: o Radix devolve o foco ao gatilho, e a Folha não tem
  // `DialogTrigger` — sem isto, SugerirLugar (aberta por estado local) perde o
  // foco no fechamento.
  const quemAbriu = useRef<HTMLElement | null>(null)
  const inicio = useRef<{
    y: number
    quando: number
    capturado: boolean
  } | null>(null)
  const reduzido = useMovimentoReduzido()
  // O fechamento por arrasto termina depois da animação de saída; sair da tela
  // antes disso não pode deixar um `aoFechar` atrasado na fila.
  const saida = useRef<number | null>(null)
  useEffect(
    () => () => {
      if (saida.current !== null) window.clearTimeout(saida.current)
    },
    [],
  )

  const deslocar = (deslocamento: number) => {
    const folha = caixa.current
    if (folha === null) return
    folha.style.transition = "none"
    folha.style.transform = deslocamento > 0 ? `translateY(${deslocamento}px)` : ""
  }
  const soltar = (deslocamento: number, velocidade: number) => {
    inicio.current = null
    const folha = caixa.current
    if (fechaAoSoltar(deslocamento, velocidade)) {
      if (folha === null) {
        aoFechar()
        return
      }
      // A saída parte da posição atual e desce até sumir; só então a caixa
      // desmonta. Voltar ao topo antes de fechar dava um salto para cima.
      const duracao = duracaoDoFechamento(reduzido)
      folha.style.transition = transicaoDoFechamento(reduzido)
      folha.style.transform = "translateY(100%)"
      folha.style.opacity = "0"
      if (duracao === 0) {
        aoFechar()
        return
      }
      if (saida.current !== null) window.clearTimeout(saida.current)
      saida.current = window.setTimeout(aoFechar, duracao)
      return
    }
    if (folha !== null) {
      folha.style.transition = transicaoDoRetorno(reduzido)
      folha.style.transform = ""
    }
  }
  const aoDescer = (evento: PointerEvent<HTMLElement>) => {
    const folha = caixa.current
    if (folha === null) return
    // O corpo só arrasta a folha quando o conteúdo está no início; rolado no
    // meio, o gesto é da lista.
    const noCorpo = evento.currentTarget.classList.contains("pc-folha-corpo")
    if (noCorpo) {
      if (!comecaArrasto(folha.scrollTop)) return
      // No conteúdo, o toque em campo, botão ou link é da peça, não da folha —
      // inclusive os seletores nativos, cujo ponteiro sai da página no menu.
      const alvo = evento.target as Element | null
      if (alvo !== null && alvo.closest("input, select, textarea, button, a, label") !== null)
        return
    }
    // O arrasto interrompe a abertura no estado atual (ANIMATION §4): a
    // animação de entrada não pode segurar o dedo.
    if (typeof folha.getAnimations === "function") {
      for (const animacao of folha.getAnimations()) animacao.finish()
    }
    inicio.current = { y: evento.clientY, quando: performance.now(), capturado: !noCorpo }
    // A captura no corpo só vem quando o gesto prova que é arrasto: capturar no
    // toque desviaria o clique dos botões para o corpo.
    if (!noCorpo) evento.currentTarget.setPointerCapture(evento.pointerId)
  }
  const aoMover = (evento: PointerEvent<HTMLElement>) => {
    const comeco = inicio.current
    if (comeco === null) return
    const deslocamento = evento.clientY - comeco.y
    if (!comeco.capturado) {
      if (deslocamento < 8) return
      comeco.capturado = true
      evento.currentTarget.setPointerCapture(evento.pointerId)
    }
    deslocar(deslocamentoVisivel(deslocamento))
  }
  const aoSoltar = (evento: PointerEvent<HTMLElement>) => {
    const comeco = inicio.current
    if (comeco === null) return
    const deslocamento = evento.clientY - comeco.y
    const decorrido = Math.max(1, performance.now() - comeco.quando)
    if (!comeco.capturado) {
      inicio.current = null
      return
    }
    soltar(deslocamento, deslocamento / decorrido)
  }
  const gesto = modo === "folha"

  return (
    <Dialog
      open={aberta}
      onOpenChange={(aberto) => {
        if (!aberto) aoFechar()
      }}
    >
      <DialogContent
        unstyled
        showCloseButton={false}
        ref={caixa}
        className={juntar("pc-folha", className)}
        data-modo={modo}
        data-animacao={animacaoDaFolha(reduzido)}
        data-sobreposicao={sobreposicao}
        style={
          {
            "--pc-folha-entrada": `${duracaoDaAbertura(reduzido, modo)}ms`,
          } as CSSProperties
        }
        {...(fundoProps === undefined ? {} : { overlayProps: fundoProps })}
        onOpenAutoFocus={(evento) => {
          // Antes de o Radix mover o foco: aqui ainda é quem abriu.
          const ativo = document.activeElement
          quemAbriu.current = ativo instanceof HTMLElement ? ativo : null
          if (focoInicial === undefined) return
          const alvo = caixa.current?.querySelector<HTMLElement>(focoInicial)
          if (!alvo) return
          evento.preventDefault()
          alvo.focus()
        }}
        onCloseAutoFocus={(evento) => {
          // Sobreposição de histórico: a volta da entrada já devolve o foco.
          if (sobreposicao !== undefined) return
          const alvo = quemAbriu.current
          quemAbriu.current = null
          if (alvo === null || alvo === document.body || !alvo.isConnected) return
          evento.preventDefault()
          alvo.focus()
        }}
      >
        {gesto ? (
          <button
            type="button"
            className="pc-folha-alca"
            aria-label="Arraste para fechar"
            tabIndex={-1}
            onPointerDown={aoDescer}
            onPointerMove={aoMover}
            onPointerUp={aoSoltar}
            onPointerCancel={aoSoltar}
          />
        ) : null}
        <div className="pc-folha-cabeca">
          <div className="grid min-w-0 gap-0.5">
            <DialogTitle className="pc-subtitulo">{titulo}</DialogTitle>
            {descricao === undefined ? null : (
              <DialogDescription className="pc-apoio">{descricao}</DialogDescription>
            )}
          </div>
          {acaoDoCabecalho ?? <BotaoDeIcone rotulo="Fechar" nome="close" onClick={aoFechar} />}
        </div>
        <div
          className="pc-folha-corpo"
          onPointerDown={gesto ? aoDescer : undefined}
          onPointerMove={gesto ? aoMover : undefined}
          onPointerUp={gesto ? aoSoltar : undefined}
          onPointerCancel={gesto ? aoSoltar : undefined}
        >
          {children}
        </div>
      </DialogContent>
    </Dialog>
  )
}

/**
 * `prefers-reduced-motion` ao vivo: a pessoa pode trocar no meio da sessão e a
 * próxima abertura já sai do jeito certo.
 */
function useMovimentoReduzido(): boolean {
  const [reduzido, setReduzido] = useState(prefersReduzido)
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return
    const consulta = window.matchMedia("(prefers-reduced-motion: reduce)")
    const aoMudar = () => setReduzido(consulta.matches)
    consulta.addEventListener("change", aoMudar)
    return () => consulta.removeEventListener("change", aoMudar)
  }, [])
  return reduzido
}

// ── aviso com desfazer ─────────────────────────────────────────────────────
const DURACAO_DO_AVISO_MS = 5000

export type AvisoDaTela = { id: number; texto: string; desfazer?: () => void }

/**
 * Confirmação curta no rodapé; some sozinha e pode oferecer Desfazer. Enquanto
 * o dedo, o ponteiro ou o foco estão nela, o tempo para: ninguém perde o
 * Desfazer no meio do gesto. Um aviso novo substitui o anterior, e o Desfazer
 * do anterior deixa de existir junto.
 */
export function Aviso({ aviso, aoSumir }: { aviso: AvisoDaTela | null; aoSumir: () => void }) {
  return (
    <div role="status" aria-live="polite">
      {aviso ? <AvisoAtivo key={aviso.id} aviso={aviso} aoSumir={aoSumir} /> : null}
    </div>
  )
}

function AvisoAtivo({ aviso, aoSumir }: { aviso: AvisoDaTela; aoSumir: () => void }) {
  // Foco e ponteiro pausam cada um por si: o ponteiro sair não solta o tempo
  // enquanto o foco continua no Desfazer, e vice-versa.
  const [comFoco, setComFoco] = useState(false)
  const [comPonteiro, setComPonteiro] = useState(false)
  const pausado = comFoco || comPonteiro

  useEffect(() => {
    if (pausado) return
    const cronometro = window.setTimeout(aoSumir, DURACAO_DO_AVISO_MS)
    return () => window.clearTimeout(cronometro)
  }, [pausado, aoSumir])

  return (
    // Os eventos só pausam o tempo; a ação do aviso continua no botão.
    // biome-ignore lint/a11y/noStaticElementInteractions: pausa de tempo, não é ação.
    <div
      className="pc-aviso"
      onPointerEnter={() => setComPonteiro(true)}
      onPointerLeave={() => setComPonteiro(false)}
      onFocus={() => setComFoco(true)}
      onBlur={(evento) => {
        if (!evento.currentTarget.contains(evento.relatedTarget as Node | null)) setComFoco(false)
      }}
    >
      <span>{aviso.texto}</span>
      {aviso.desfazer ? (
        <Botao
          tom="texto"
          compacto
          onClick={() => {
            aviso.desfazer?.()
            aoSumir()
          }}
        >
          Desfazer
        </Botao>
      ) : null}
    </div>
  )
}

/** Estado do aviso. `mostrar` e `limpar` têm identidade estável. */
export function useAviso() {
  const [aviso, setAviso] = useState<AvisoDaTela | null>(null)
  const mostrar = useCallback(
    (texto: string, desfazer?: () => void) =>
      setAviso((atual) => ({ id: (atual?.id ?? 0) + 1, texto, ...(desfazer ? { desfazer } : {}) })),
    [],
  )
  // Estável: o aviso arma o cronômetro uma vez por aviso, não a cada render.
  const limpar = useCallback(() => setAviso(null), [])
  return { aviso, mostrar, limpar }
}

// ── esqueleto ──────────────────────────────────────────────────────────────
export function Esqueleto({
  largura = "100%",
  altura = 16,
  redondo = false,
}: {
  largura?: string
  altura?: number
  redondo?: boolean
}) {
  return (
    <span
      className="pc-esqueleto"
      style={{ width: largura, height: altura, borderRadius: redondo ? "50%" : undefined }}
      aria-hidden="true"
    />
  )
}

// ── segmentos ──────────────────────────────────────────────────────────────
// Peça novo da correção do F07 (12/11): seções irmãs de uma página. Mora no
// próprio arquivo porque o CSS é Tailwind, como o resto de `components/bivaque`.
export { type ItemDeSegmento, Segmentos } from "./segmentos"
