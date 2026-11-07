import { useEffect, useRef, useState } from "react"
import { Botao } from "@/components/bivaque/botao"
import { Campo } from "@/components/bivaque/campos"
import { ChipsDeFiltro } from "@/components/bivaque/chips-de-filtro"
import { FalhaDaApi } from "@/lib/api/cliente"
import { publicarPergunta } from "@/lib/dados/criar"
import { rotuloDoTopico, TOPICOS_DAS_PERGUNTAS } from "@/lib/dados/perguntas"
import { excluirRascunho, guardarRascunho, lerRascunho } from "./rascunho"

/** Chip inicial da escolha: "sem tópico" deixa a régua do texto decidir a categoria. */
const ITENS_DO_TOPICO = [
  { id: "nenhum", rotulo: "Sem tópico" },
  ...TOPICOS_DAS_PERGUNTAS.map(({ id, rotulo }) => ({ id, rotulo })),
]

export function Perguntar({
  cidade,
  aoCancelar,
  aoSalvar,
}: {
  cidade: string
  aoCancelar: () => void
  aoSalvar: (id: string) => void
}) {
  const chave = `bivaque:f03:pergunta:${cidade}`
  const [dados, setDados] = useState(() =>
    lerRascunho(chave, { titulo: "", assunto: "", topico: "" }),
  )
  const [revisando, setRevisando] = useState(false)
  const [erro, setErro] = useState("")
  const [aviso, setAviso] = useState("")
  const [salvando, setSalvando] = useState(false)
  const controle = useRef<AbortController | null>(null)
  useEffect(() => () => controle.current?.abort(), [])
  // O rascunho é local e automático: voltar/avançar devolve o texto ainda não publicado.
  useEffect(() => {
    guardarRascunho(chave, dados)
  }, [chave, dados])

  async function publicar() {
    if (controle.current) return
    const envio = new AbortController()
    controle.current = envio
    setSalvando(true)
    setErro("")
    guardarRascunho(chave, dados)
    try {
      const id = await publicarPergunta(dados, { signal: envio.signal })
      if (envio.signal.aborted) return
      excluirRascunho(chave)
      aoSalvar(id)
    } catch (falha) {
      if (!envio.signal.aborted) {
        setRevisando(false)
        setErro(
          falha instanceof FalhaDaApi && falha.codigo === "sem-sessao"
            ? "Sua sessão expirou. Entre de novo para publicar. Seu texto foi mantido."
            : "Não foi possível publicar a pergunta. Seu texto foi mantido. Tente de novo.",
        )
      }
    } finally {
      controle.current = null
      if (!envio.signal.aborted) setSalvando(false)
    }
  }

  return (
    <form
      className="mt-4 grid gap-4"
      aria-busy={salvando}
      onSubmit={(evento) => {
        evento.preventDefault()
        if (revisando) void publicar()
        else {
          setErro("")
          setRevisando(true)
        }
      }}
    >
      {revisando ? (
        <div data-revisao="pergunta" className="grid gap-3">
          <b>Revise sua pergunta</b>
          <p className="whitespace-pre-wrap break-words">{dados.titulo}</p>
          <p className="break-words text-sm">{dados.assunto}</p>
          {dados.topico !== "" ? (
            <p data-topico-revisado={dados.topico} className="text-sm">
              Tópico: {rotuloDoTopico(dados.topico)}
            </p>
          ) : null}
          <p className="text-sm text-(--on-surface-variant)">
            Será publicada para a cidade da sua conta.
          </p>
        </div>
      ) : (
        <>
          <Campo
            id="nova-pergunta"
            rotulo="O que você precisa saber?"
            valor={dados.titulo}
            aoMudar={(titulo) => setDados({ ...dados, titulo })}
            minLength={8}
            maxLength={300}
            required
            placeholder="Ex.: alguém indica um pediatra no bairro?"
          />
          <div data-topicos="pergunta">
            <ChipsDeFiltro
              rotulo="Tópico da pergunta"
              itens={ITENS_DO_TOPICO}
              valor={dados.topico === "" ? "nenhum" : dados.topico}
              aoEscolher={(id) => setDados({ ...dados, topico: id === "nenhum" ? "" : id })}
            />
          </div>
          <Campo
            id="topico-pergunta"
            rotulo="Assunto (opcional)"
            valor={dados.assunto}
            aoMudar={(assunto) => setDados({ ...dados, assunto })}
            maxLength={60}
            placeholder="Saúde, escola, serviços..."
          />
        </>
      )}
      {erro && (
        <p role="alert" className="text-sm text-(--destructive)">
          {erro}
        </p>
      )}
      {aviso && (
        <p role="status" className="text-sm">
          {aviso}
        </p>
      )}
      <div className="flex flex-wrap justify-end gap-2">
        <Botao
          type="button"
          tom="texto"
          disabled={salvando}
          onClick={() => (revisando ? setRevisando(false) : aoCancelar())}
        >
          {revisando ? "Editar" : "Cancelar"}
        </Botao>
        {!revisando && (
          <Botao
            type="button"
            tom="contornado"
            onClick={() =>
              setAviso(
                guardarRascunho(chave, dados)
                  ? "Rascunho salvo nesta aba. Abra Perguntar para continuar."
                  : "Não foi possível salvar nesta aba. Seu texto continua aqui.",
              )
            }
          >
            Salvar rascunho
          </Botao>
        )}
        <Botao type="submit" disabled={salvando || dados.titulo.trim().length < 8}>
          {salvando ? "Publicando…" : revisando ? "Publicar pergunta" : "Revisar pergunta"}
        </Botao>
      </div>
    </form>
  )
}
