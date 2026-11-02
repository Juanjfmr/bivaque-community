import { useEffect, useRef, useState } from "react"
import { Icone } from "@/components/bivaque/icone"
import {
  Avatar,
  Botao,
  BotaoDeIcone,
  CampoDeBusca,
  Cartao,
  Estado,
  Folha,
  Linha,
  Nota,
  Selo,
  Topo,
} from "@/src/pecas/pecas"
import { type Grupo, type Publicacao, ROTULO_DO_TIPO } from "./dados"
import type { Acao, Estado as EstadoDaPrevia } from "./estado"

const base = import.meta.env.BASE_URL

export type Navegar = (
  tela:
    | { nome: "lista" }
    | { nome: "grupo"; id: string }
    | { nome: "publicacao"; id: string; responder?: boolean }
    | { nome: "escrever"; grupo: string; texto?: string },
) => void

export type PropsDaTela = {
  estado: EstadoDaPrevia
  despachar: (acao: Acao) => void
  navegar: Navegar
  voltar: () => void
  /** Confirmação curta no rodapé, com Desfazer quando dá para desfazer. */
  avisar: (texto: string, desfazer?: () => void) => void
}

/** Foca o título ao abrir a tela, para o leitor de tela anunciar onde está. */
export function useFocoNoTitulo() {
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
      <h1 ref={titulo} tabIndex={-1} className="pc-titulo">
        Grupos
      </h1>
      <CampoDeBusca
        rotulo="Buscar grupos"
        placeholder="Buscar grupos em Manaus"
        value={busca}
        onChange={(evento) => setBusca(evento.target.value)}
      />
      {meus.length > 0 ? (
        <section aria-labelledby="pg-meus" className="pg-bloco">
          <h2 id="pg-meus" className="pc-subtitulo">
            Seus grupos
          </h2>
          <ul className="pc-lista">
            {meus.map((grupo) => (
              <li key={grupo.id}>
                <Linha
                  marca={<Selo nome={grupo.selo} />}
                  titulo={grupo.nome}
                  apoio={
                    grupo.novas > 0 ? (
                      <span className="pg-novas">{grupo.novas} novas publicações</span>
                    ) : (
                      membros(grupo.membros)
                    )
                  }
                  onClick={() => navegar({ nome: "grupo", id: grupo.id })}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <section aria-labelledby="pg-outros" className="pg-bloco">
        <h2 id="pg-outros" className="pc-subtitulo">
          Para você em Manaus
        </h2>
        {outros.length === 0 ? (
          <p className="pc-apoio">
            Nenhum grupo com "{busca}". Tente outra palavra ou crie um grupo novo.
          </p>
        ) : null}
        <ul className="pc-lista">
          {outros.map((grupo) => {
            const pediu = estado.pedidos.includes(grupo.id)
            const fechado = grupo.privacidade === "fechado"
            return (
              <li key={grupo.id} className="pg-sugestao">
                <button
                  type="button"
                  className="pg-sugestao-abrir"
                  onClick={() => navegar({ nome: "grupo", id: grupo.id })}
                >
                  <Selo nome={grupo.selo} />
                  <span className="pc-linha-texto">
                    <span className="pc-linha-titulo">{grupo.nome}</span>
                    <span className="pc-apoio">
                      {membros(grupo.membros)}
                      {fechado ? ", fechado" : ""}
                    </span>
                    <span className="pc-miudo">{grupo.motivo}</span>
                  </span>
                </button>
                <Botao
                  compacto
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
                </Botao>
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

/** Quem escreveu, quando e o tipo, no alto de publicação e de detalhe. */
export function Autoria({ publicacao }: { publicacao: Publicacao }) {
  return (
    <header className="pg-autor">
      <Avatar nome={publicacao.autor} />
      <span className="pc-linha-texto">
        <span className="pc-linha-titulo">{publicacao.autor}</span>
        <span className="pc-miudo">{publicacao.quando}</span>
      </span>
      <span className="pc-miudo pg-tipo">{ROTULO_DO_TIPO[publicacao.tipo]}</span>
    </header>
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
    <Cartao className="pg-publicacao" aria-labelledby={`pg-pub-${publicacao.id}`}>
      <Autoria publicacao={publicacao} />
      <button type="button" className="pg-publicacao-corpo" onClick={abrir}>
        <span id={`pg-pub-${publicacao.id}`} className="pg-publicacao-texto">
          {publicacao.texto}
        </span>
      </button>
      <Fotos fotos={publicacao.fotos} rotulo={`Publicação de ${publicacao.autor}`} />
      {publicacao.resolvida ? <Estado>Resolvida</Estado> : null}
      <footer className="pg-acoes">
        <Botao
          tom="texto"
          compacto
          icone="thumb_up"
          className="pg-acao"
          aria-pressed={publicacao.marcouUtil}
          onClick={() => despachar({ tipo: "util", publicacao: publicacao.id })}
        >
          Útil{publicacao.uteis > 0 ? ` ${publicacao.uteis}` : ""}
        </Botao>
        <Botao tom="texto" compacto icone="chat_bubble" className="pg-acao" onClick={abrir}>
          {total === 0 ? "Comentar" : `${total} ${total === 1 ? "comentário" : "comentários"}`}
        </Botao>
      </footer>
    </Cartao>
  )
}

// ── Sobre o grupo: folha no celular, coluna no computador ───────────────────
function Sobre({ grupo, comTitulo }: { grupo: Grupo; comTitulo: boolean }) {
  return (
    <div className="pg-sobre">
      {comTitulo ? <h2 className="pc-subtitulo">Sobre o grupo</h2> : null}
      <p className="pc-corpo">{grupo.descricao}</p>
      {grupo.regras.length > 0 ? (
        <>
          <h3 className="pg-sobre-regras-titulo">Regras</h3>
          <ul className="pg-regras">
            {grupo.regras.map((regra) => (
              <li key={regra}>{regra}</li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  )
}

// ── Grupo ───────────────────────────────────────────────────────────────────
export function GrupoTela({
  estado,
  despachar,
  navegar,
  voltar,
  avisar,
  id,
}: PropsDaTela & { id: string }) {
  const [filtro, setFiltro] = useState<"recentes" | "sem-resposta">("recentes")
  const [sobreAberto, setSobreAberto] = useState(false)
  const titulo = useFocoNoTitulo()
  const grupo = estado.grupos.find((g) => g.id === id)
  if (grupo === undefined) return null
  const publicacoes = estado.publicacoes
    .filter((p) => p.grupo === id)
    .filter((p) => filtro === "recentes" || (p.tipo === "pergunta" && p.comentarios.length === 0))
  const fechadoParaMim = grupo.privacidade === "fechado" && !grupo.participa
  const pediu = estado.pedidos.includes(id)
  const novo = estado.boasVindas.includes(id)

  return (
    <div className="pg-grupo">
      <Topo aoVoltar={voltar} />
      <div className="pg-grupo-colunas">
        <main className="pg-tela pg-grupo-principal">
          {grupo.capa ? <img className="pg-capa" src={`${base}${grupo.capa}`} alt="" /> : null}
          <div className="pg-cabeca">
            <Selo nome={grupo.selo} tamanho={64} />
            <div className="pg-cabeca-texto">
              <h1 ref={titulo} tabIndex={-1} className="pc-titulo">
                {grupo.nome}
              </h1>
              <p className="pc-apoio pg-grupo-meta">
                {membros(grupo.membros)}
                <span className="pg-privacidade">
                  <Icone nome={grupo.privacidade === "fechado" ? "lock" : "public"} />
                  {grupo.privacidade === "fechado" ? "Fechado" : "Aberto"}
                </span>
              </p>
            </div>
          </div>
          {fechadoParaMim ? null : (
            <Botao
              tom="texto"
              compacto
              icone="info"
              className="pg-movel-sobre"
              aria-haspopup="dialog"
              onClick={() => setSobreAberto(true)}
            >
              Sobre o grupo e regras
            </Botao>
          )}

          {grupo.participa ? null : (
            <Botao
              tom="principal"
              cheio
              className="pg-entrar"
              disabled={pediu}
              onClick={() =>
                despachar(
                  fechadoParaMim ? { tipo: "pedir", grupo: id } : { tipo: "entrar", grupo: id },
                )
              }
            >
              {pediu ? "Pedido enviado" : fechadoParaMim ? "Pedir para entrar" : "Entrar no grupo"}
            </Botao>
          )}

          {novo ? (
            <Cartao className="pg-boas-vindas" aria-labelledby="pg-bv-titulo">
              <div className="pg-boas-vindas-cabeca">
                <h2 id="pg-bv-titulo" className="pc-subtitulo">
                  Você entrou. Comece por aqui
                </h2>
                <BotaoDeIcone
                  rotulo="Fechar boas-vindas"
                  nome="close"
                  onClick={() => despachar({ tipo: "fechar-boas-vindas", grupo: id })}
                />
              </div>
              <div className="pg-boas-vindas-acoes">
                <Botao
                  compacto
                  icone="chat_bubble"
                  onClick={() =>
                    navegar({
                      nome: "escrever",
                      grupo: id,
                      texto:
                        "Oi, pessoal! Sou a Ana, cheguei agora em Manaus com dois filhos pequenos.",
                    })
                  }
                >
                  Diga olá
                </Botao>
                <Botao
                  compacto
                  icone="person_add"
                  onClick={() => {
                    void navigator.clipboard?.writeText(window.location.href)
                    avisar("Link do grupo copiado. É só colar na conversa.")
                  }}
                >
                  Convidar alguém
                </Botao>
              </div>
            </Cartao>
          ) : null}

          {fechadoParaMim ? (
            <>
              <Sobre grupo={grupo} comTitulo />
              <p className="pc-apoio">
                As publicações aparecem quando a moderação aceitar seu pedido.
              </p>
            </>
          ) : (
            <>
              {grupo.fixado ? <Nota icone="info">{grupo.fixado}</Nota> : null}
              <div className="pc-chips" role="tablist" aria-label="Publicações">
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
                    className="pc-chip"
                    onClick={() => setFiltro(valor)}
                  >
                    {rotulo}
                  </button>
                ))}
              </div>
              {publicacoes.length === 0 ? (
                <p className="pc-apoio">Toda pergunta daqui já tem resposta.</p>
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
        <aside className="pg-lateral" aria-label="Sobre o grupo">
          <Sobre grupo={grupo} comTitulo />
        </aside>
      </div>
      {grupo.participa ? (
        <Botao
          tom="principal"
          icone="edit_square"
          className="pc-flutuante pg-escrever"
          onClick={() => navegar({ nome: "escrever", grupo: id })}
        >
          Escrever
        </Botao>
      ) : null}
      <Folha aberta={sobreAberto} aoFechar={() => setSobreAberto(false)} titulo="Sobre o grupo">
        <Sobre grupo={grupo} comTitulo={false} />
      </Folha>
    </div>
  )
}
