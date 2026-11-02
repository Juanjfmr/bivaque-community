import { type FormEvent, useEffect, useRef, useState } from "react"
import { Icone } from "@/components/bivaque/icone"
import { Button } from "@/components/ui/button"
import { type Comentario, EU, ROTULO_DO_TIPO, type Tipo } from "./dados"
import { Avatar, Fotos, type PropsDaTela, Topo } from "./telas-grupos"

// ── Detalhe da publicação ───────────────────────────────────────────────────
export function PublicacaoTela({ estado, despachar, voltar, id }: PropsDaTela & { id: string }) {
  const [texto, setTexto] = useState("")
  const [respondendo, setRespondendo] = useState<Comentario | null>(null)
  const [recemEnviado, setRecemEnviado] = useState<number>(0)
  const campo = useRef<HTMLTextAreaElement>(null)
  const titulo = useRef<HTMLHeadingElement>(null)
  const publicacao = estado.publicacoes.find((p) => p.id === id)
  const grupo = estado.grupos.find((g) => g.id === publicacao?.grupo)

  useEffect(() => {
    titulo.current?.focus()
    window.scrollTo({ top: 0 })
  }, [])

  // Depois de enviar, leva o comentário novo para a vista.
  useEffect(() => {
    if (recemEnviado === 0) return
    document.querySelector('[data-recente="sim"]')?.scrollIntoView({ block: "center" })
  }, [recemEnviado])

  if (publicacao === undefined || grupo === undefined) return null
  const minha = publicacao.autor === EU.curto
  const pergunta = publicacao.tipo === "pergunta"
  const resolveu = publicacao.comentarios.find((item) => item.id === publicacao.resolvida)

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

  const ultimoMeu = [...publicacao.comentarios].reverse().find((item) => item.autor === EU.curto)

  return (
    <div className="pg-detalhe">
      <Topo
        titulo={grupo.nome}
        aoVoltar={voltar}
        acao={
          <Button
            type="button"
            variant="ghost"
            size="icon-lg"
            aria-label={publicacao.salva ? "Remover dos salvos" : "Salvar publicação"}
            aria-pressed={publicacao.salva}
            onClick={() => despachar({ tipo: "salvar", publicacao: id })}
          >
            <Icone nome={publicacao.salva ? "bookmark" : "bookmark_border"} />
          </Button>
        }
      />
      <main className="pg-tela pg-detalhe-corpo">
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
        <h1 ref={titulo} tabIndex={-1} className="pg-detalhe-texto">
          {publicacao.texto}
        </h1>
        <Fotos fotos={publicacao.fotos} rotulo={`Publicação de ${publicacao.autor}`} />
        {resolveu ? (
          <a className="pg-resolvida pg-resolvida-link" href={`#comentario-${resolveu.id}`}>
            <Icone nome="check_circle" preenchido /> Resolvida pela resposta de {resolveu.autor}
          </a>
        ) : null}
        <footer className="pg-acoes">
          <button
            type="button"
            className="pg-acao"
            aria-pressed={publicacao.marcouUtil}
            onClick={() => despachar({ tipo: "util", publicacao: id })}
          >
            <Icone nome="thumb_up" preenchido={publicacao.marcouUtil} />
            Útil{publicacao.uteis > 0 ? ` ${publicacao.uteis}` : ""}
          </button>
        </footer>

        <section aria-labelledby="pg-comentarios" className="pg-comentarios">
          <h2 id="pg-comentarios" className="pg-secao">
            {publicacao.comentarios.length === 0
              ? "Ninguém comentou ainda"
              : `${publicacao.comentarios.length} ${publicacao.comentarios.length === 1 ? "comentário" : "comentários"}`}
          </h2>
          {publicacao.comentarios.length === 0 ? (
            <p className="pg-vazio">
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
                  className="pg-comentario"
                  data-resposta={comentario.respondeA ? "sim" : "nao"}
                  data-resolveu={ehResolucao ? "sim" : "nao"}
                  data-recente={comentario.id === ultimoMeu?.id && recemEnviado > 0 ? "sim" : "nao"}
                >
                  <Avatar nome={comentario.autor} />
                  <div className="pg-comentario-corpo">
                    <p className="pg-comentario-cabeca">
                      <strong>{comentario.autor}</strong> {comentario.quando}
                    </p>
                    {ehResolucao ? (
                      <p className="pg-selo-resolveu">
                        <Icone nome="check_circle" preenchido /> Resolveu
                      </p>
                    ) : null}
                    <p className="pg-comentario-texto">
                      {comentario.para ? <span className="pg-para">{comentario.para} </span> : null}
                      {comentario.texto}
                    </p>
                    <div className="pg-comentario-acoes">
                      <button
                        type="button"
                        className="pg-acao pg-acao-miuda"
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
                      </button>
                      <button
                        type="button"
                        className="pg-acao pg-acao-miuda"
                        aria-label={`Responder a ${comentario.autor}`}
                        onClick={() => responder(comentario)}
                      >
                        Responder
                      </button>
                      {minha && pergunta && comentario.autor !== EU.curto ? (
                        <button
                          type="button"
                          className="pg-acao pg-acao-miuda"
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
                        </button>
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
            Respondendo a <strong>{respondendo.autor}</strong>
            <button
              type="button"
              aria-label="Cancelar resposta"
              onClick={() => setRespondendo(null)}
            >
              <Icone nome="close" />
            </button>
          </p>
        ) : null}
        <div className="pg-barra-comentar-linha">
          <label htmlFor="pg-comentar" className="sr-only">
            {respondendo ? `Responder a ${respondendo.autor}` : "Escrever comentário"}
          </label>
          <textarea
            id="pg-comentar"
            ref={campo}
            rows={1}
            placeholder={respondendo ? `Responder a ${respondendo.autor}` : "Escreva um comentário"}
            value={texto}
            onChange={(evento) => setTexto(evento.target.value)}
          />
          <Button
            type="submit"
            size="icon-lg"
            className="pg-enviar"
            aria-label="Enviar comentário"
            disabled={texto.trim() === ""}
          >
            <Icone nome="send" />
          </Button>
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
  grupo: idDoGrupo,
  textoInicial,
}: PropsDaTela & { grupo: string; textoInicial: string }) {
  const [tipo, setTipo] = useState<Tipo>(textoInicial ? "conversa" : "pergunta")
  const [texto, setTexto] = useState(textoInicial)
  const [fotos, setFotos] = useState<string[]>([])
  const [problema, setProblema] = useState<string | null>(null)
  const titulo = useRef<HTMLHeadingElement>(null)
  const grupo = estado.grupos.find((g) => g.id === idDoGrupo)

  useEffect(() => {
    titulo.current?.focus()
  }, [])

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
    despachar({
      tipo: "publicar",
      grupo: idDoGrupo,
      tipoDaPublicacao: tipo,
      texto: texto.trim(),
      fotos,
    })
    voltar()
  }

  return (
    <form className="pg-escrever-tela" onSubmit={publicar} noValidate>
      <Topo titulo="Nova publicação" aoVoltar={voltar} />
      <main className="pg-tela">
        <h1 ref={titulo} tabIndex={-1} className="pg-titulo pg-titulo-menor">
          Em {grupo.nome}
        </h1>
        <fieldset className="pg-tipos">
          <legend className="sr-only">Tipo de publicação</legend>
          {TIPOS.map((item) => (
            <button
              key={item.id}
              type="button"
              className="pg-chip"
              aria-pressed={tipo === item.id}
              onClick={() => setTipo(item.id)}
            >
              {item.rotulo}
            </button>
          ))}
        </fieldset>
        <label htmlFor="pg-texto" className="sr-only">
          Texto da publicação
        </label>
        <textarea
          id="pg-texto"
          className="pg-texto"
          rows={6}
          placeholder={dica}
          value={texto}
          aria-describedby="pg-escrever-erro"
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
                <button
                  type="button"
                  aria-label={`Tirar a foto ${indice + 1}`}
                  onClick={() => setFotos((atuais) => atuais.filter((item) => item !== foto))}
                >
                  <Icone nome="close" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        {fotos.length > 0 && regraDeFoto ? (
          <p className="pg-regra-foto">
            <Icone nome="info" />
            Neste grupo: {regraDeFoto.charAt(0).toLowerCase() + regraDeFoto.slice(1)}
          </p>
        ) : null}
        <p id="pg-escrever-erro" className="pg-erro" aria-live="polite">
          {problema}
        </p>
        <div className="pg-escrever-ferramentas">
          <label className="pg-anexar" data-cheio={fotos.length >= LIMITE_DE_FOTOS ? "sim" : "nao"}>
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
          <p className="pg-quem-ve">
            <Icone nome={grupo.privacidade === "fechado" ? "lock" : "group"} />
            {grupo.privacidade === "fechado"
              ? "Só membros do grupo veem"
              : "Membros de Manaus veem"}
          </p>
        </div>
      </main>
      <div className="pg-barra">
        <Button type="submit" className="pg-botao">
          Publicar
        </Button>
      </div>
    </form>
  )
}
