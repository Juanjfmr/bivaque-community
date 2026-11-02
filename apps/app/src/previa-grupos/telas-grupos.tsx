import { type ReactNode, useEffect, useRef, useState } from "react"
import { Icone } from "@/components/bivaque/icone"
import { Button } from "@/components/ui/button"
import { EU, type Grupo, type Publicacao, ROTULO_DO_TIPO } from "./dados"
import type { Acao, Estado } from "./estado"

const base = import.meta.env.BASE_URL

export type Navegar = (
  tela:
    | { nome: "lista" }
    | { nome: "grupo"; id: string }
    | { nome: "publicacao"; id: string; responder?: boolean }
    | { nome: "escrever"; grupo: string; texto?: string },
) => void

export type PropsDaTela = {
  estado: Estado
  despachar: (acao: Acao) => void
  navegar: Navegar
  voltar: () => void
}

// ── peças comuns ────────────────────────────────────────────────────────────
export function Avatar({ nome }: { nome: string }) {
  const iniciais = nome
    .split(" ")
    .map((parte) => parte.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase()
  return (
    <span className="pg-avatar" aria-hidden="true">
      {iniciais}
    </span>
  )
}

function MarcaDoGrupo({ grupo, tamanho = "p" }: { grupo: Grupo; tamanho?: "p" | "g" }) {
  if (grupo.capa) {
    return <img className="pg-marca" data-tamanho={tamanho} src={`${base}${grupo.capa}`} alt="" />
  }
  const letras = grupo.nome
    .split(" ")
    .filter((parte) => parte.length > 2)
    .slice(0, 2)
    .map((parte) => parte.charAt(0))
    .join("")
    .toUpperCase()
  return (
    <span className="pg-marca pg-marca-letras" data-tamanho={tamanho} aria-hidden="true">
      {letras}
    </span>
  )
}

/** Barra do topo de cada tela, com voltar e título. */
export function Topo({
  titulo,
  aoVoltar,
  acao,
}: {
  titulo: string
  aoVoltar?: () => void
  acao?: ReactNode
}) {
  return (
    <header className="pg-topo">
      {aoVoltar ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-lg"
          className="pg-topo-voltar"
          aria-label="Voltar"
          onClick={aoVoltar}
        >
          <Icone nome="arrow_back" />
        </Button>
      ) : null}
      <p className="pg-topo-titulo">{titulo}</p>
      {acao ?? null}
    </header>
  )
}

/** Foca o título ao abrir a tela, para o leitor de tela anunciar onde está. */
function useFocoNoTitulo() {
  const ref = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    ref.current?.focus()
    window.scrollTo({ top: 0 })
  }, [])
  return ref
}

const membros = (total: number): string => `${total.toLocaleString("pt-BR")} membros`

// ── Lista de grupos ─────────────────────────────────────────────────────────
export function Lista({ estado, despachar, navegar }: PropsDaTela) {
  const [busca, setBusca] = useState("")
  const titulo = useFocoNoTitulo()
  const termo = busca.trim().toLowerCase()
  const filtrados = estado.grupos.filter(
    (g) =>
      termo === "" ||
      g.nome.toLowerCase().includes(termo) ||
      g.descricao.toLowerCase().includes(termo),
  )
  const meus = filtrados.filter((g) => g.participa)
  const outros = filtrados.filter((g) => !g.participa)

  return (
    <main className="pg-tela pg-lista">
      <h1 ref={titulo} tabIndex={-1} className="pg-titulo">
        Grupos
      </h1>
      <label className="pg-busca">
        <Icone nome="search" />
        <span className="sr-only">Buscar grupos</span>
        <input
          type="search"
          placeholder="Buscar grupos em Manaus"
          value={busca}
          onChange={(evento) => setBusca(evento.target.value)}
        />
      </label>
      {meus.length > 0 ? (
        <section aria-labelledby="pg-meus">
          <h2 id="pg-meus" className="pg-secao">
            Seus grupos
          </h2>
          <ul className="pg-linhas">
            {meus.map((grupo) => (
              <li key={grupo.id}>
                <button
                  type="button"
                  className="pg-linha-grupo"
                  onClick={() => navegar({ nome: "grupo", id: grupo.id })}
                >
                  <MarcaDoGrupo grupo={grupo} />
                  <span className="pg-linha-texto">
                    <strong>{grupo.nome}</strong>
                    {grupo.novas > 0 ? (
                      <span className="pg-novas">{grupo.novas} novas publicações</span>
                    ) : (
                      <span>{membros(grupo.membros)}</span>
                    )}
                  </span>
                  <Icone nome="chevron_right" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <section aria-labelledby="pg-outros">
        <h2 id="pg-outros" className="pg-secao">
          Para você em Manaus
        </h2>
        {outros.length === 0 ? (
          <p className="pg-vazio">
            Nenhum grupo com "{busca}". Tente outra palavra ou crie um grupo novo.
          </p>
        ) : null}
        <ul className="pg-linhas">
          {outros.map((grupo) => {
            const pediu = estado.pedidos.includes(grupo.id)
            const fechado = grupo.privacidade === "fechado"
            return (
              <li key={grupo.id} className="pg-linha-grupo">
                <button
                  type="button"
                  className="pg-linha-abrir"
                  onClick={() => navegar({ nome: "grupo", id: grupo.id })}
                >
                  <MarcaDoGrupo grupo={grupo} />
                  <span className="pg-linha-texto">
                    <strong>{grupo.nome}</strong>
                    <span>
                      {membros(grupo.membros)}
                      {fechado ? ", fechado" : ""}
                    </span>
                    <span className="pg-motivo">{grupo.motivo}</span>
                  </span>
                </button>
                <Button
                  type="button"
                  size="lg"
                  variant={pediu ? "secondary" : "outline"}
                  className="pg-pilula"
                  disabled={pediu}
                  aria-label={`${fechado ? "Pedir para entrar em" : "Entrar em"} ${grupo.nome}`}
                  onClick={() => {
                    if (fechado) {
                      despachar({ tipo: "pedir", grupo: grupo.id })
                      return
                    }
                    despachar({ tipo: "entrar", grupo: grupo.id })
                    navegar({ nome: "grupo", id: grupo.id })
                  }}
                >
                  {pediu ? "Pedido enviado" : fechado ? "Pedir" : "Entrar"}
                </Button>
              </li>
            )
          })}
        </ul>
      </section>
    </main>
  )
}

// ── Fotos da publicação ─────────────────────────────────────────────────────
export function Fotos({ fotos, rotulo }: { fotos: readonly string[]; rotulo: string }) {
  if (fotos.length === 0) return null
  const fonte = (foto: string) => (foto.startsWith("blob:") ? foto : `${base}${foto}`)
  return (
    <div className="pg-fotos" data-quantas={Math.min(fotos.length, 4)}>
      {fotos.slice(0, 4).map((foto, indice) => (
        <img
          key={foto}
          src={fonte(foto)}
          alt={`${rotulo}, foto ${indice + 1} de ${fotos.length}`}
        />
      ))}
    </div>
  )
}

// ── Uma publicação no grupo ─────────────────────────────────────────────────
function ItemDaPublicacao({
  publicacao,
  despachar,
  navegar,
}: {
  publicacao: Publicacao
  despachar: PropsDaTela["despachar"]
  navegar: Navegar
}) {
  const total = publicacao.comentarios.length
  const abrir = () => navegar({ nome: "publicacao", id: publicacao.id })
  return (
    <article className="pg-publicacao" aria-labelledby={`pg-pub-${publicacao.id}`}>
      <header className="pg-autor">
        <Avatar nome={publicacao.autor} />
        <span>
          <strong>{publicacao.autor}</strong>
          {publicacao.quando}
        </span>
        <span className="pg-tipo" data-tipo={publicacao.tipo}>
          {ROTULO_DO_TIPO[publicacao.tipo]}
        </span>
      </header>
      <button type="button" className="pg-publicacao-corpo" onClick={abrir}>
        <span id={`pg-pub-${publicacao.id}`} className="pg-publicacao-texto">
          {publicacao.texto}
        </span>
      </button>
      <Fotos fotos={publicacao.fotos} rotulo={`Publicação de ${publicacao.autor}`} />
      {publicacao.resolvida ? (
        <p className="pg-resolvida">
          <Icone nome="check_circle" preenchido /> Resolvida
        </p>
      ) : null}
      <footer className="pg-acoes">
        <button
          type="button"
          className="pg-acao"
          aria-pressed={publicacao.marcouUtil}
          onClick={() => despachar({ tipo: "util", publicacao: publicacao.id })}
        >
          <Icone nome="thumb_up" preenchido={publicacao.marcouUtil} />
          Útil{publicacao.uteis > 0 ? ` ${publicacao.uteis}` : ""}
        </button>
        <button type="button" className="pg-acao" onClick={abrir}>
          <Icone nome="chat_bubble" />
          {total === 0 ? "Comentar" : `${total} ${total === 1 ? "comentário" : "comentários"}`}
        </button>
      </footer>
    </article>
  )
}

// ── Grupo ───────────────────────────────────────────────────────────────────
export function GrupoTela({
  estado,
  despachar,
  navegar,
  voltar,
  id,
}: PropsDaTela & { id: string }) {
  const [filtro, setFiltro] = useState<"recentes" | "sem-resposta">("recentes")
  const [copiado, setCopiado] = useState(false)
  const titulo = useFocoNoTitulo()
  const grupo = estado.grupos.find((g) => g.id === id)
  if (grupo === undefined) return null
  const publicacoes = estado.publicacoes
    .filter((p) => p.grupo === id)
    .filter((p) => filtro === "recentes" || (p.tipo === "pergunta" && p.comentarios.length === 0))
  const fechadoParaMim = grupo.privacidade === "fechado" && !grupo.participa
  const pediu = estado.pedidos.includes(id)
  const novo = estado.boasVindas.includes(id)

  const sobre = (
    <section className="pg-sobre" aria-labelledby="pg-sobre-titulo">
      <h2 id="pg-sobre-titulo" className="pg-secao">
        Sobre o grupo
      </h2>
      <p>{grupo.descricao}</p>
      {grupo.regras.length > 0 ? (
        <ul className="pg-regras">
          {grupo.regras.map((regra) => (
            <li key={regra}>{regra}</li>
          ))}
        </ul>
      ) : null}
    </section>
  )

  return (
    <div className="pg-grupo">
      <Topo titulo="Grupo" aoVoltar={voltar} />
      <div className="pg-grupo-colunas">
        <main className="pg-tela">
          <div className="pg-capa">
            {grupo.capa ? (
              <img src={`${base}${grupo.capa}`} alt="" />
            ) : (
              <MarcaDoGrupo grupo={grupo} tamanho="g" />
            )}
          </div>
          <h1 ref={titulo} tabIndex={-1} className="pg-titulo">
            {grupo.nome}
          </h1>
          <p className="pg-grupo-meta">
            {membros(grupo.membros)}
            <span className="pg-chip-estado">
              <Icone nome={grupo.privacidade === "fechado" ? "lock" : "public"} />
              {grupo.privacidade === "fechado" ? "Fechado" : "Aberto"}
            </span>
          </p>

          {grupo.participa ? null : (
            <Button
              type="button"
              className="pg-botao"
              disabled={pediu}
              onClick={() =>
                despachar(
                  fechadoParaMim ? { tipo: "pedir", grupo: id } : { tipo: "entrar", grupo: id },
                )
              }
            >
              {pediu ? "Pedido enviado" : fechadoParaMim ? "Pedir para entrar" : "Entrar no grupo"}
            </Button>
          )}

          {novo ? (
            <section className="pg-boas-vindas" aria-labelledby="pg-bv-titulo">
              <div className="pg-boas-vindas-cabeca">
                <h2 id="pg-bv-titulo">Você entrou. Comece por aqui:</h2>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Fechar boas-vindas"
                  onClick={() => despachar({ tipo: "fechar-boas-vindas", grupo: id })}
                >
                  <Icone nome="close" />
                </Button>
              </div>
              <ul className="pg-linhas">
                <li>
                  <button
                    type="button"
                    className="pg-linha-acao"
                    onClick={() =>
                      navegar({
                        nome: "escrever",
                        grupo: id,
                        texto:
                          "Oi, pessoal! Sou a Ana, cheguei agora em Manaus com dois filhos pequenos.",
                      })
                    }
                  >
                    <Icone nome="chat_bubble" />
                    <span>
                      <strong>Diga olá</strong>
                      Conte quem você é e o que procura aqui.
                    </span>
                    <Icone nome="chevron_right" />
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    className="pg-linha-acao"
                    onClick={() => {
                      void navigator.clipboard?.writeText(window.location.href)
                      setCopiado(true)
                    }}
                  >
                    <Icone nome="person_add" />
                    <span>
                      <strong>Convidar alguém</strong>
                      {copiado
                        ? "Link copiado. É só colar na conversa."
                        : "Copia o link do grupo para mandar a quem você conhece."}
                    </span>
                    <Icone nome={copiado ? "check" : "content_copy"} />
                  </button>
                </li>
              </ul>
            </section>
          ) : null}

          {fechadoParaMim ? (
            <>
              {sobre}
              <p className="pg-vazio">
                As publicações aparecem quando a moderação aceitar seu pedido.
              </p>
            </>
          ) : (
            <>
              <details className="pg-movel-sobre">
                <summary>
                  Sobre o grupo e regras
                  <Icone nome="expand_more" />
                </summary>
                {sobre}
              </details>
              {grupo.fixado ? (
                <p className="pg-fixado">
                  <Icone nome="info" />
                  {grupo.fixado}
                </p>
              ) : null}
              <div className="pg-filtros" role="tablist" aria-label="Publicações">
                {(
                  [
                    ["recentes", "Recentes"],
                    ["sem-resposta", "Sem resposta"],
                  ] as const
                ).map(([valor, rotulo]) => (
                  <button
                    key={valor}
                    type="button"
                    role="tab"
                    aria-selected={filtro === valor}
                    className="pg-filtro"
                    onClick={() => setFiltro(valor)}
                  >
                    {rotulo}
                  </button>
                ))}
              </div>
              {publicacoes[0]?.autor === EU.curto && publicacoes[0]?.quando === "agora" ? (
                <p className="pg-confirmacao" role="status">
                  <Icone nome="check_circle" preenchido /> Publicado. Os membros do grupo já podem
                  ver.
                </p>
              ) : null}
              {publicacoes.length === 0 ? (
                <p className="pg-vazio">Toda pergunta daqui já tem resposta.</p>
              ) : (
                <div className="pg-feed">
                  {publicacoes.map((publicacao) => (
                    <ItemDaPublicacao
                      key={publicacao.id}
                      publicacao={publicacao}
                      despachar={despachar}
                      navegar={navegar}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </main>
        <aside className="pg-lateral">{sobre}</aside>
      </div>
      {grupo.participa ? (
        <Button
          type="button"
          className="pg-escrever"
          onClick={() => navegar({ nome: "escrever", grupo: id })}
        >
          <Icone nome="edit_square" />
          Escrever
        </Button>
      ) : null}
    </div>
  )
}
