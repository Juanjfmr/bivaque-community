import { useEffect, useRef, useState } from "react"
import { Botao } from "@/components/bivaque/botao"
import { Campo } from "@/components/bivaque/campos"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { FalhaDaApi } from "@/lib/api/cliente"
import {
  anexarFotoAoGrupo,
  type GrupoReal,
  type PublicacaoCriada,
  publicarNoGrupo,
} from "@/lib/dados/grupos"
import {
  excluirRascunhoDoGrupo,
  guardarRascunhoDoGrupo,
  lerRascunhosDoGrupo,
} from "@/lib/grupos-locais"
import { useSobreposicaoDaEntrada } from "@/lib/navegacao/react"
import { type Recusa, recusaAoPublicar } from "./publicacao"

type Foto = { caminho: string; previa: string }

/** Limite de caracteres da publicação; o servidor recusa fora dele. */
export const LIMITE_DO_TEXTO = 2000

/**
 * O compositor de publicação do grupo.
 *
 * O envio não sai da tela: a publicação entra na lista do grupo e recebe o
 * foco (`aoPublicar`), sem passar pela página da publicação. A recusa do
 * servidor é traduzida em frase com próximo passo (`recusaAoPublicar`) — o
 * texto e as fotos continuam no compositor, aberto, para a pessoa corrigir ou
 * tentar de novo.
 */
export function Escrever({
  grupo,
  cidade,
  aoPublicar,
}: {
  grupo: GrupoReal
  cidade: string
  aoPublicar: (criada: PublicacaoCriada) => void
}) {
  const { aberto, aoMudarAberto: setAberto } = useSobreposicaoDaEntrada("grupo-escrever")
  const [texto, setTexto] = useState("")
  const [fotos, setFotos] = useState<readonly Foto[]>([])
  const [rascunhos, setRascunhos] = useState<readonly string[]>([])
  const [erro, setErro] = useState("")
  const [recusa, setRecusa] = useState<Recusa | null>(null)
  const [ocupado, setOcupado] = useState(false)
  // O limite é dito antes do envio: texto que o servidor recusaria não sai.
  const [avisoDoLimite, setAvisoDoLimite] = useState(false)
  const [enviandoFoto, setEnviandoFoto] = useState(false)
  const leitor = useRef<FileReader | null>(null)
  const [controle] = useState(() => new AbortController())
  useEffect(() => {
    setRascunhos(lerRascunhosDoGrupo(cidade, grupo.id))
  }, [cidade, grupo.id])
  useEffect(
    () => () => {
      leitor.current?.abort()
      controle.abort()
    },
    [controle],
  )
  async function anexar(arquivos: readonly File[]) {
    if (enviandoFoto || ocupado) return
    setErro("")
    if (fotos.length + arquivos.length > 4) {
      setErro("Escolha até quatro fotos por publicação.")
      return
    }
    setEnviandoFoto(true)
    try {
      for (const arquivo of arquivos) {
        if (
          !["image/jpeg", "image/png", "image/webp"].includes(arquivo.type) ||
          arquivo.size > 5 * 1024 * 1024
        ) {
          throw new Error("Escolha fotos JPEG, PNG ou WebP de até 5 MB.")
        }
        const previa = await new Promise<string>((resolve, reject) => {
          const leitura = new FileReader()
          leitor.current = leitura
          leitura.onload = () =>
            typeof leitura.result === "string"
              ? resolve(leitura.result)
              : reject(new Error("Não foi possível ler a foto."))
          leitura.onerror = () => reject(new Error("Não foi possível ler a foto."))
          leitura.onabort = () => reject(new DOMException("Cancelado", "AbortError"))
          leitura.readAsDataURL(arquivo)
        })
        const caminho = await anexarFotoAoGrupo(grupo.id, previa, { signal: controle.signal })
        if (!controle.signal.aborted) setFotos((atuais) => [...atuais, { caminho, previa }])
      }
    } catch (falha: unknown) {
      if (!controle.signal.aborted)
        setErro(
          falha instanceof FalhaDaApi
            ? "Não foi possível enviar a foto. Escolha uma imagem válida e tente de novo."
            : falha instanceof Error
              ? falha.message
              : "Não foi possível enviar a foto.",
        )
    } finally {
      if (!controle.signal.aborted) setEnviandoFoto(false)
    }
  }
  async function publicar() {
    if (ocupado || enviandoFoto) return
    setAvisoDoLimite(false)
    const escrito = texto.trim()
    if (escrito.length < 1) {
      setRecusa(null)
      setErro("Escreva alguma coisa antes de publicar.")
      return
    }
    if (escrito.length > LIMITE_DO_TEXTO) {
      setRecusa(null)
      setAvisoDoLimite(true)
      return
    }
    setOcupado(true)
    setErro("")
    setRecusa(null)
    try {
      const criada = await publicarNoGrupo(
        grupo.id,
        { texto, fotos: fotos.map((foto) => foto.caminho) },
        { signal: controle.signal },
      )
      if (controle.signal.aborted) return
      const indice = rascunhos.indexOf(texto)
      if (indice >= 0) {
        const lista = excluirRascunhoDoGrupo(cidade, grupo.id, indice)
        if (lista) setRascunhos(lista)
      }
      setTexto("")
      setFotos([])
      // A sobreposição se fecha sem `history.back()`: o compositor é o que
      // abriu esta entrada, e voltar demais tiraria a pessoa do grupo.
      setAberto(false)
      aoPublicar(criada)
    } catch (falha: unknown) {
      if (!controle.signal.aborted) setRecusa(recusaAoPublicar(falha))
    } finally {
      if (!controle.signal.aborted) setOcupado(false)
    }
  }
  function salvar() {
    const lista = guardarRascunhoDoGrupo(cidade, grupo.id, texto)
    if (lista === "limite") {
      setErro(
        "Limite de 10 rascunhos neste grupo atingido. Exclua um antes de salvar outro. Seu texto continua no formulário.",
      )
      return
    }
    if (!lista) {
      setErro("Informe 10 a 2000 caracteres e verifique o armazenamento da sessão.")
      return
    }
    setRascunhos(lista)
    setErro("")
    setAberto(false)
  }
  function tentarDeNovo() {
    setRecusa(null)
    void publicar()
  }
  return (
    <section
      data-compositor-grupo="sim"
      className="grid min-w-0 gap-2 rounded-2xl bg-(--surface-container) p-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <b className="text-sm">Publicações do grupo</b>
        <Botao
          tom="tonal"
          icone="edit_square"
          data-acao="escrever-grupo"
          onClick={() => setAberto(true)}
        >
          Escrever
        </Botao>
      </div>
      {rascunhos.length === 0 ? (
        <small className="text-xs text-(--on-surface-variant)">
          Escreva para conversar com os membros do grupo.
        </small>
      ) : (
        <div data-rascunhos-grupo="sim" className="grid gap-2">
          <small>Seus rascunhos — não publicados ({rascunhos.length})</small>
          {rascunhos.map((rascunho, indice) => (
            <article
              key={rascunho}
              data-rascunho-grupo="sim"
              className="grid gap-2 rounded-xl bg-(--surface-lowest) p-3"
            >
              <p className="whitespace-pre-wrap break-words text-sm">{rascunho}</p>
              <div className="flex justify-end gap-2">
                <Botao
                  tom="texto"
                  onClick={() => {
                    setTexto(rascunho)
                    setRecusa(null)
                    setAberto(true)
                  }}
                >
                  Continuar
                </Botao>
                <Botao
                  tom="texto"
                  data-acao="excluir-rascunho-grupo"
                  onClick={() => {
                    const lista = excluirRascunhoDoGrupo(cidade, grupo.id, indice)
                    if (lista) setRascunhos(lista)
                    else setErro("Não foi possível excluir o rascunho.")
                  }}
                >
                  Excluir
                </Botao>
              </div>
            </article>
          ))}
        </div>
      )}
      {recusa !== null && !aberto ? (
        <p role="alert" className="text-sm text-(--destructive)">
          {recusa.frase}
        </p>
      ) : null}
      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent data-dialogo="escrever-grupo" className="max-h-[90dvh] overflow-y-auto">
          <DialogTitle>Escrever no grupo</DialogTitle>
          <DialogDescription>
            A publicação será lida por quem tem acesso a {grupo.nome}. As fotos são tratadas para
            remover a localização.
          </DialogDescription>
          <Campo
            id="texto-grupo"
            rotulo="Sua publicação"
            valor={texto}
            aoMudar={(valor: string) => {
              setTexto(valor)
              if (valor.trim().length <= LIMITE_DO_TEXTO) setAvisoDoLimite(false)
            }}
            area
            nota={`${texto.length}/${LIMITE_DO_TEXTO} caracteres`}
          />
          {texto.length > LIMITE_DO_TEXTO || avisoDoLimite ? (
            <p data-aviso="limite-do-texto" className="text-sm text-(--destructive)">
              {`Sua publicação tem ${texto.length} caracteres; o limite é ${LIMITE_DO_TEXTO}. Encurte o texto para publicar — ele continua aqui.`}
            </p>
          ) : null}
          <p className="text-sm">
            {grupo.regras || "O grupo ainda não informou regras sobre fotos."}
          </p>
          <label className="grid gap-2 text-sm">
            Adicionar fotos (até 4, de até 5 MB)
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              disabled={ocupado || enviandoFoto || fotos.length >= 4}
              onChange={(evento) => {
                const arquivos = Array.from(evento.currentTarget.files ?? [])
                evento.currentTarget.value = ""
                void anexar(arquivos)
              }}
              className="min-h-11 max-w-full"
            />
          </label>
          {enviandoFoto ? <p role="status">Enviando foto…</p> : null}
          <div className="grid grid-cols-2 gap-2">
            {fotos.map((foto, indice) => (
              <div key={foto.caminho} className="grid gap-1">
                <img
                  src={foto.previa}
                  alt={`Foto ${indice + 1} escolhida para a publicação`}
                  className="h-28 w-full rounded-xl object-cover"
                />
                <Botao
                  tom="texto"
                  disabled={ocupado}
                  onClick={() =>
                    setFotos((atuais) => atuais.filter((item) => item.caminho !== foto.caminho))
                  }
                >
                  Remover foto {indice + 1}
                </Botao>
              </div>
            ))}
          </div>
          {recusa !== null ? (
            <div
              role="alert"
              data-recusa={recusa.tipo}
              className="grid gap-2 rounded-xl bg-(--surface-low) p-3 text-sm"
            >
              <p>{recusa.frase}</p>
              {recusa.tipo === "recuperavel" ? (
                <Botao tom="tonal" icone="refresh" disabled={ocupado} onClick={tentarDeNovo}>
                  Tentar de novo
                </Botao>
              ) : null}
              {recusa.tipo === "recusa" && recusa.tentavel ? (
                <small className="text-(--on-surface-variant)">
                  Seu texto e suas fotos continuam aqui.
                </small>
              ) : null}
            </div>
          ) : null}
          {erro ? (
            <p role="alert" className="text-sm text-(--destructive)">
              {erro}
            </p>
          ) : null}
          <div className="flex flex-wrap justify-end gap-2">
            <Botao tom="texto" onClick={() => setAberto(false)}>
              Cancelar
            </Botao>
            <Botao
              tom="contornado"
              data-acao="salvar-rascunho-grupo"
              disabled={ocupado || enviandoFoto}
              onClick={salvar}
            >
              Salvar rascunho
            </Botao>
            <Botao
              disabled={
                ocupado ||
                enviandoFoto ||
                texto.trim().length < 1 ||
                texto.trim().length > LIMITE_DO_TEXTO
              }
              onClick={() => void publicar()}
            >
              {ocupado ? "Publicando…" : "Publicar"}
            </Botao>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  )
}
