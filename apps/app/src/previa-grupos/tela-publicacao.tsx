import { type FormEvent, useEffect, useRef, useState } from "react"
import { Icone } from "@/components/bivaque/icone"
import {
  AreaDeTexto,
  Avatar,
  BarraDeAcao,
  Botao,
  BotaoDeIcone,
  Chip,
  Compositor,
  Estado,
  Nota,
  Topo,
} from "@/src/pecas/pecas"
import { type Comentario, EU, type Tipo } from "./dados"
import { novoId } from "./estado"
import { MenuDaPublicacao } from "./menu-da-publicacao"
import { Autoria, Fotos, type PropsDaTela, useFocoNoTitulo } from "./telas-grupos"

// ── Detalhe da publicação ───────────────────────────────────────────────────
export function PublicacaoTela({
  estado,
  despachar,
  voltar,
  avisar,
  id,
}: PropsDaTela & { id: string }) {
  const [texto, setTexto] = useState("")
  const [respondendo, setRespondendo] = useState<Comentario | null>(null)
  const [recemEnviado, setRecemEnviado] = useState<number>(0)
  // O comentário para onde "Ver a resposta" levou; `vez` repete o destaque.
  const [destaque, setDestaque] = useState<{ id: string; vez: number } | null>(null)
  const campo = useRef<HTMLTextAreaElement>(null)
  const titulo = useFocoNoTitulo()
  // Oculta ou denunciada some para quem fez, como se não estivesse mais aqui.
  const publicacao = estado.ocultas.includes(id)
    ? undefined
    : estado.publicacoes.find((p) => p.id === id)
  const grupo = estado.grupos.find((g) => g.id === publicacao?.grupo)
  const existiaAoAbrir = useRef(publicacao !== undefined)
  const sumiu = publicacao === undefined

  // Desfazer a publicação, ocultar ou denunciar com ela aberta: a tela volta ao grupo.
  useEffect(() => {
    if (sumiu && existiaAoAbrir.current) voltar()
  }, [sumiu, voltar])

  // Depois de enviar, leva o comentário novo para a vista.
  useEffect(() => {
    if (recemEnviado === 0) return
    document.querySelector('[data-recente="sim"]')?.scrollIntoView({ block: "center" })
  }, [recemEnviado])

  if (publicacao === undefined || grupo === undefined) {
    return (
      <div className="pg-detalhe">
        <Topo aoVoltar={voltar} />
        <main className="pg-tela">
          <h1 ref={titulo} tabIndex={-1} className="pc-titulo">
            Esta publicação não está mais aqui
          </h1>
          <p className="pc-apoio">Quem publicou apagou. O resto do grupo continua igual.</p>
          <Botao className="pg-voltar" onClick={voltar}>
            Voltar
          </Botao>
        </main>
      </div>
    )
  }
  const minha = publicacao.autor === EU.curto
  const pergunta = publicacao.tipo === "pergunta"
  const resolveu = publicacao.comentarios.find((item) => item.id === publicacao.resolvida)

  // Sem âncora (#): a prévia navega pelo histórico, e um salto por âncora
  // virava troca de tela. O botão rola até a resposta, põe o foco nela e a destaca.
  const irParaResposta = (idDoComentario: string) => {
    const alvo = document.getElementById(`comentario-${idDoComentario}`)
    if (alvo === null) return
    const reduzido = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    alvo.scrollIntoView({ block: "center", behavior: reduzido ? "auto" : "smooth" })
    alvo.focus({ preventScroll: true })
    setDestaque((atual) => ({ id: idDoComentario, vez: (atual?.vez ?? 0) + 1 }))
  }

  const responder = (comentario: Comentario) => {
    setRespondendo(comentario)
    campo.current?.focus()
  }

  const enviar = (evento: FormEvent) => {
    evento.preventDefault()
    const limpo = texto.trim()
    if (limpo === "") return
    despachar({ tipo: "comentar", publicacao: id, texto: limpo, respondeA: respondendo })
    setTexto("")
    setRespondendo(null)
    setRecemEnviado((n) => n + 1)
  }

  const salvar = () => {
    if (publicacao.salva) {
      // O aviso novo substitui o "salva", e com ele some o Desfazer antigo.
      despachar({ tipo: "salvar", publicacao: id, valor: false })
      avisar("Tirada dos salvos.")
      return
    }
    despachar({ tipo: "salvar", publicacao: id, valor: true })
    avisar("Publicação salva.", () => despachar({ tipo: "salvar", publicacao: id, valor: false }))
  }

  const ultimoMeu = [...publicacao.comentarios].reverse().find((item) => item.autor === EU.curto)
  const total = publicacao.comentarios.length

  return (
    <div className="pg-detalhe">
      <Topo
        titulo={grupo.nome}
        aoVoltar={voltar}
        acao={
          <BotaoDeIcone
            rotulo={publicacao.salva ? "Remover dos salvos" : "Salvar publicação"}
            nome={publicacao.salva ? "bookmark" : "bookmark_border"}
            preenchido={publicacao.salva}
            aria-pressed={publicacao.salva}
            onClick={salvar}
          />
        }
      />
      <main className="pg-tela pg-detalhe-corpo">
        <Autoria
          publicacao={publicacao}
          menu={<MenuDaPublicacao publicacao={publicacao} despachar={despachar} avisar={avisar} />}
        />
        <h1 ref={titulo} tabIndex={-1} className="pg-detalhe-texto">
          {publicacao.texto}
        </h1>
        <Fotos fotos={publicacao.fotos} rotulo={`Publicação de ${publicacao.autor}`} />
        {resolveu ? (
          // O estado diz o que é; o botão-link, aonde ir. Juntos, não pareciam um atalho.
          <p className="pg-resolvida">
            <Estado>Resolvida</Estado>
            <button type="button" className="pc-link" onClick={() => irParaResposta(resolveu.id)}>
              Ver a resposta de {resolveu.autor}
            </button>
          </p>
        ) : null}
        <footer className="pg-acoes">
          <Botao
            tom="texto"
            compacto
            icone="thumb_up"
            className="pg-acao"
            aria-pressed={publicacao.marcouUtil}
            onClick={() => despachar({ tipo: "util", publicacao: id })}
          >
            Útil{publicacao.uteis > 0 ? ` ${publicacao.uteis}` : ""}
          </Botao>
        </footer>

        <section aria-labelledby="pg-comentarios" className="pg-comentarios">
          <h2 id="pg-comentarios" className="pc-subtitulo">
            {total === 0
              ? "Ninguém comentou ainda"
              : `${total} ${total === 1 ? "comentário" : "comentários"}`}
          </h2>
          {total === 0 ? (
            <p className="pc-apoio">
              {pergunta
                ? "Sabe a resposta? Seja a primeira pessoa a ajudar."
                : "Comece a conversa."}
            </p>
          ) : null}
          <ol className="pg-lista-comentarios">
            {publicacao.comentarios.map((comentario) => {
              const ehResolucao = publicacao.resolvida === comentario.id
              return (
                <li
                  key={comentario.id}
                  id={`comentario-${comentario.id}`}
                  tabIndex={-1}
                  className="pg-comentario"
                  data-destacado={destaque?.id === comentario.id ? "sim" : "nao"}
                  data-resposta={comentario.respondeA ? "sim" : "nao"}
                  data-resolveu={ehResolucao ? "sim" : "nao"}
                  data-recente={comentario.id === ultimoMeu?.id && recemEnviado > 0 ? "sim" : "nao"}
                >
                  <Avatar nome={comentario.autor} tamanho={comentario.respondeA ? 32 : 40} />
                  <div
                    className="pg-comentario-corpo"
                    // Remontar o corpo repete o destaque a cada "Ver a resposta".
                    key={destaque?.id === comentario.id ? destaque.vez : 0}
                  >
                    <p className="pg-comentario-cabeca">
                      <strong>{comentario.autor}</strong>
                      <span className="pc-miudo">{comentario.quando}</span>
                    </p>
                    {ehResolucao ? <Estado>Resolveu</Estado> : null}
                    <p className="pg-comentario-texto">
                      {comentario.para ? <span className="pg-para">{comentario.para} </span> : null}
                      {comentario.texto}
                    </p>
                    <div className="pg-comentario-acoes">
                      <Botao
                        tom="texto"
                        compacto
                        className="pg-acao"
                        aria-pressed={comentario.marcouUtil}
                        onClick={() =>
                          despachar({
                            tipo: "util-comentario",
                            publicacao: id,
                            comentario: comentario.id,
                          })
                        }
                      >
                        Útil{comentario.uteis > 0 ? ` ${comentario.uteis}` : ""}
                      </Botao>
                      <Botao
                        tom="texto"
                        compacto
                        className="pg-acao"
                        aria-label={`Responder a ${comentario.autor}`}
                        onClick={() => responder(comentario)}
                      >
                        Responder
                      </Botao>
                      {minha && pergunta && comentario.autor !== EU.curto ? (
                        <Botao
                          tom="texto"
                          compacto
                          className="pg-acao"
                          aria-pressed={ehResolucao}
                          onClick={() =>
                            despachar({
                              tipo: "resolveu",
                              publicacao: id,
                              comentario: comentario.id,
                            })
                          }
                        >
                          {ehResolucao ? "Desmarcar" : "Marcar que resolveu"}
                        </Botao>
                      ) : null}
                    </div>
                  </div>
                </li>
              )
            })}
          </ol>
        </section>
      </main>

      <form className="pg-barra-comentar" onSubmit={enviar}>
        {respondendo ? (
          <p className="pg-respondendo">
            <span>
              Respondendo a <strong>{respondendo.autor}</strong>
            </span>
            <BotaoDeIcone
              rotulo="Cancelar resposta"
              nome="close"
              onClick={() => setRespondendo(null)}
            />
          </p>
        ) : null}
        <div className="pg-barra-comentar-linha">
          <Compositor
            rotulo={respondendo ? `Responder a ${respondendo.autor}` : "Escrever comentário"}
            rotuloDoEnvio="Enviar comentário"
            valor={texto}
            aoMudar={setTexto}
            campoRef={campo}
            placeholder={respondendo ? `Responder a ${respondendo.autor}` : "Escreva um comentário"}
          />
        </div>
      </form>
    </div>
  )
}

// ── Escrever ────────────────────────────────────────────────────────────────
const TIPOS: readonly { id: Tipo; rotulo: string; dica: string }[] = [
  { id: "pergunta", rotulo: "Pergunta", dica: "O que você quer saber?" },
  { id: "conversa", rotulo: "Conversa", dica: "O que você quer contar ao grupo?" },
  { id: "oferta", rotulo: "Oferta", dica: "O que você oferece, por quanto e até quando?" },
]
const LIMITE_DE_FOTOS = 4

export function Escrever({
  estado,
  despachar,
  voltar,
  avisar,
  grupo: idDoGrupo,
  textoInicial,
}: PropsDaTela & { grupo: string; textoInicial: string }) {
  const [tipo, setTipo] = useState<Tipo>(textoInicial ? "conversa" : "pergunta")
  const [texto, setTexto] = useState(textoInicial)
  const [fotos, setFotos] = useState<string[]>([])
  const [problema, setProblema] = useState<string | null>(null)
  const titulo = useFocoNoTitulo()
  const grupo = estado.grupos.find((g) => g.id === idDoGrupo)

  if (grupo === undefined) return null
  const dica = TIPOS.find((item) => item.id === tipo)?.dica ?? ""
  const regraDeFoto = grupo.regras.find((regra) => regra.toLowerCase().includes("foto"))

  const anexar = (arquivos: FileList | null) => {
    if (arquivos === null) return
    const imagens = [...arquivos].filter((arquivo) => arquivo.type.startsWith("image/"))
    const cabem = LIMITE_DE_FOTOS - fotos.length
    if (imagens.length > cabem) setProblema(`Cabem até ${LIMITE_DE_FOTOS} fotos por publicação.`)
    else setProblema(null)
    setFotos((atuais) => [
      ...atuais,
      ...imagens.slice(0, cabem).map((arquivo) => URL.createObjectURL(arquivo)),
    ])
  }

  const publicar = (evento: FormEvent) => {
    evento.preventDefault()
    if (texto.trim().length < 3) {
      setProblema("Escreva algo antes de publicar.")
      return
    }
    const id = novoId("p")
    despachar({
      tipo: "publicar",
      grupo: idDoGrupo,
      tipoDaPublicacao: tipo,
      texto: texto.trim(),
      fotos,
      id,
    })
    avisar("Publicado. Os membros do grupo já podem ver.", () =>
      despachar({ tipo: "apagar", publicacao: id }),
    )
    voltar()
  }

  return (
    <form className="pg-escrever-tela" onSubmit={publicar} noValidate>
      <Topo titulo="Nova publicação" aoVoltar={voltar} />
      <main className="pg-tela">
        <h1 ref={titulo} tabIndex={-1} className="pc-titulo">
          Em {grupo.nome}
        </h1>
        <fieldset className="pc-chips">
          <legend className="sr-only">Tipo de publicação</legend>
          {TIPOS.map((item) => (
            <Chip key={item.id} selecionado={tipo === item.id} onClick={() => setTipo(item.id)}>
              {item.rotulo}
            </Chip>
          ))}
        </fieldset>
        <AreaDeTexto
          rotulo="Texto da publicação"
          rows={6}
          placeholder={dica}
          value={texto}
          erro={problema}
          onChange={(evento) => {
            setTexto(evento.target.value)
            setProblema(null)
          }}
        />
        {fotos.length > 0 ? (
          <ul className="pg-anexos" aria-label="Fotos anexadas">
            {fotos.map((foto, indice) => (
              <li key={foto}>
                <img src={foto} alt={`Foto ${indice + 1}`} />
                <BotaoDeIcone
                  rotulo={`Tirar a foto ${indice + 1}`}
                  nome="close"
                  tom="sobre-foto"
                  compacto
                  className="pg-anexo-tirar"
                  onClick={() => setFotos((atuais) => atuais.filter((item) => item !== foto))}
                />
              </li>
            ))}
          </ul>
        ) : null}
        {fotos.length > 0 && regraDeFoto ? (
          <Nota icone="info">
            Neste grupo: {regraDeFoto.charAt(0).toLowerCase() + regraDeFoto.slice(1)}
          </Nota>
        ) : null}
        <div className="pg-escrever-ferramentas">
          <label
            className="pc-botao pg-anexar"
            data-tom="contorno"
            data-tamanho="compacto"
            data-cheio={fotos.length >= LIMITE_DE_FOTOS ? "sim" : "nao"}
          >
            <Icone nome="add_photo_alternate" />
            {fotos.length >= LIMITE_DE_FOTOS ? "4 de 4 fotos" : `Fotos (${fotos.length} de 4)`}
            <input
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              disabled={fotos.length >= LIMITE_DE_FOTOS}
              onChange={(evento) => {
                anexar(evento.target.files)
                evento.target.value = ""
              }}
            />
          </label>
          <p className="pc-miudo pg-quem-ve">
            <Icone nome={grupo.privacidade === "fechado" ? "lock" : "group"} />
            {grupo.privacidade === "fechado"
              ? "Só membros do grupo veem"
              : "Membros de Manaus veem"}
          </p>
        </div>
      </main>
      <BarraDeAcao>
        <Botao type="submit" tom="principal" cheio>
          Publicar
        </Botao>
      </BarraDeAcao>
    </form>
  )
}
