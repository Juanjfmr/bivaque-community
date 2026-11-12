import { useEffect, useRef, useState } from "react"
import { FalhaDaApi } from "@/lib/api/cliente"
import { publicarDesapego } from "@/lib/dados/criar"
import { AreaDeTexto, Botao, Campo, CampoDeArquivo, CampoDeEscolha } from "@/src/pecas/pecas"
import { type CampoDoDesapego, errosDoDesapego, precoBRL, semErros } from "./formularios"
import { excluirRascunho, guardarRascunho, lerRascunho } from "./rascunho"

const CATEGORIAS = [
  { valor: "casa_moveis", rotulo: "Casa e móveis" },
  { valor: "eletronicos", rotulo: "Eletrônicos" },
  { valor: "esporte", rotulo: "Esporte" },
  { valor: "infantil", rotulo: "Infantil" },
  { valor: "veiculos", rotulo: "Veículos" },
  { valor: "outros", rotulo: "Outros" },
] as const

const CONDICOES = [
  { valor: "used", rotulo: "Usado" },
  { valor: "new", rotulo: "Novo" },
] as const

export function Desapego({
  cidade,
  aoCancelar,
  aoSalvar,
}: {
  cidade: string
  aoCancelar: () => void
  aoSalvar: (id: string) => void
}) {
  const chave = `bivaque:f03:desapego:${cidade}`
  const [dados, setDados] = useState(() =>
    lerRascunho(chave, {
      chave: crypto.randomUUID(),
      titulo: "",
      bairro: "",
      preco: "",
      descricao: "",
      categoria: "outros",
      condicao: "used",
      foto: "",
    }),
  )
  const [revisando, setRevisando] = useState(false)
  // O erro de um campo aparece depois que a pessoa passou por ele: o obrigatório
  // vazio não acusa quem ainda não digitou, e o que já foi escrito fica.
  const [tocados, setTocados] = useState<ReadonlySet<CampoDoDesapego>>(new Set())
  const [erroDaFoto, setErroDaFoto] = useState<string | null>(null)
  const [erro, setErro] = useState("")
  const [aviso, setAviso] = useState("")
  const [salvando, setSalvando] = useState(false)
  const controle = useRef<AbortController | null>(null)
  const leitor = useRef<FileReader | null>(null)
  useEffect(
    () => () => {
      controle.current?.abort()
      leitor.current?.abort()
    },
    [],
  )
  // O rascunho é local e automático: voltar/avançar devolve os campos ainda não publicados.
  useEffect(() => {
    guardarRascunho(chave, dados)
  }, [chave, dados])

  const erros = errosDoDesapego(dados)
  const podeRevisar = semErros(erros)
  const erroDe = (campo: CampoDoDesapego): string | null =>
    tocados.has(campo) ? (erros[campo] ?? null) : null
  const tocar = (campo: CampoDoDesapego): void =>
    setTocados((atual) => (atual.has(campo) ? atual : new Set(atual).add(campo)))
  const mudar = (pedaco: Partial<typeof dados>): void =>
    setDados((atual) => ({ ...atual, ...pedaco }))

  async function publicar() {
    if (controle.current) return
    const envio = new AbortController()
    controle.current = envio
    setSalvando(true)
    setErro("")
    guardarRascunho(chave, dados)
    try {
      const id = await publicarDesapego(dados, { signal: envio.signal })
      if (envio.signal.aborted) return
      excluirRascunho(chave)
      aoSalvar(id)
    } catch (falha) {
      if (!envio.signal.aborted) {
        setRevisando(false)
        setErro(
          falha instanceof FalhaDaApi && falha.codigo === "sem-sessao"
            ? "Sua sessão expirou. Entre de novo para publicar. Os campos foram mantidos."
            : falha instanceof FalhaDaApi && falha.mensagem
              ? falha.mensagem
              : "Não foi possível publicar o anúncio. Os campos e a foto foram mantidos. Tente de novo.",
        )
      }
    } finally {
      controle.current = null
      if (!envio.signal.aborted) setSalvando(false)
    }
  }

  return (
    <div data-formulario-criacao="create-item" className="pc pc-embutido grid min-w-0 gap-3">
      <header className="grid gap-1">
        <h2 className="pc-subtitulo">Anunciar desapego</h2>
        <p className="pc-apoio">Descreva o item, preço e condições. Revise antes de publicar.</p>
      </header>
      <form
        className="grid gap-3"
        aria-busy={salvando}
        noValidate
        onSubmit={(evento) => {
          evento.preventDefault()
          if (revisando) void publicar()
          else {
            setErro("")
            if (podeRevisar) setRevisando(true)
            else setTocados(new Set(["titulo", "bairro", "preco", "descricao"]))
          }
        }}
      >
        {revisando ? (
          <div data-revisao="desapego" className="grid gap-2">
            <b>Revise seu anúncio</b>
            <p className="break-words">{dados.titulo}</p>
            <p className="text-sm">
              {precoBRL(dados.preco)} · {dados.bairro} ·{" "}
              {dados.condicao === "new" ? "Novo" : "Usado"}
            </p>
            <p className="whitespace-pre-wrap break-words text-sm">{dados.descricao}</p>
            <p className="pc-miudo">Será publicado para a cidade da sua conta.</p>
          </div>
        ) : (
          <>
            <Campo
              id="criacao-titulo"
              rotulo="Qual item quer anunciar?"
              value={dados.titulo}
              onChange={(evento) => mudar({ titulo: evento.target.value })}
              onBlur={() => tocar("titulo")}
              erro={erroDe("titulo")}
              maxLength={120}
              autoComplete="off"
              required
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Campo
                id="criacao-complemento"
                rotulo="Bairro de retirada"
                value={dados.bairro}
                onChange={(evento) => mudar({ bairro: evento.target.value })}
                onBlur={() => tocar("bairro")}
                erro={erroDe("bairro")}
                maxLength={80}
                autoComplete="off"
                required
              />
              <Campo
                id="criacao-preco"
                rotulo="Preço pedido (R$)"
                value={dados.preco}
                onChange={(evento) => mudar({ preco: evento.target.value })}
                onBlur={() => tocar("preco")}
                erro={erroDe("preco")}
                ajuda="Só números, como 650 ou 650,00"
                type="number"
                inputMode="decimal"
                min="1"
                step="0.01"
                max="1000000"
                required
              />
            </div>
            <CampoDeEscolha
              id="criacao-categoria"
              rotulo="Categoria"
              value={dados.categoria}
              opcoes={CATEGORIAS}
              onChange={(evento) => mudar({ categoria: evento.target.value })}
            />
            <CampoDeEscolha
              id="criacao-condicao"
              rotulo="Condição"
              value={dados.condicao}
              opcoes={CONDICOES}
              onChange={(evento) => mudar({ condicao: evento.target.value })}
            />
            <AreaDeTexto
              id="criacao-descricao"
              rotulo="Estado de conservação e retirada"
              value={dados.descricao}
              onChange={(evento) => mudar({ descricao: evento.target.value })}
              onBlur={() => tocar("descricao")}
              erro={erroDe("descricao")}
              maxLength={2000}
              rows={4}
            />
            <CampoDeArquivo
              id="criacao-foto"
              rotulo="Foto do item (opcional)"
              dica="JPEG, PNG ou WebP de até 10 MB"
              escolhido={dados.foto === "" ? null : "Foto escolhida"}
              aceitar="image/jpeg,image/png,image/webp"
              erro={erroDaFoto}
              aoEscolher={(file) => {
                if (!file) return
                if (
                  !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
                  file.size === 0 ||
                  file.size > 10 * 1024 * 1024
                ) {
                  setErroDaFoto("Escolha uma imagem JPEG, PNG ou WebP de até 10 MB.")
                  return
                }
                setErroDaFoto(null)
                leitor.current?.abort()
                const leitura = new FileReader()
                leitor.current = leitura
                leitura.onload = () => {
                  if (typeof leitura.result === "string") {
                    const foto = leitura.result
                    setDados((atual) => ({ ...atual, foto }))
                  }
                }
                leitura.onerror = () =>
                  setErroDaFoto("Não foi possível ler a foto. Escolha outra imagem.")
                leitura.readAsDataURL(file)
              }}
            />
          </>
        )}
        {dados.foto && (
          <div className="grid justify-items-start gap-2">
            <img
              src={dados.foto}
              alt="Foto escolhida para o anúncio"
              className="max-h-40 max-w-full rounded-xl object-contain"
            />
            {!revisando && (
              <Botao tom="texto" onClick={() => mudar({ foto: "" })}>
                Remover foto
              </Botao>
            )}
          </div>
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
            tom="texto"
            disabled={salvando}
            onClick={() => (revisando ? setRevisando(false) : aoCancelar())}
          >
            {revisando ? "Editar" : "Voltar"}
          </Botao>
          {!revisando && (
            <Botao
              tom="contorno"
              data-acao="salvar-rascunho-criacao"
              onClick={() =>
                setAviso(
                  guardarRascunho(chave, dados)
                    ? "Rascunho salvo nesta aba. Abra Anunciar desapego para continuar."
                    : "Não foi possível salvar o rascunho nesta aba. Os campos e a foto continuam aqui.",
                )
              }
            >
              Salvar rascunho
            </Botao>
          )}
          <Botao
            tom="principal"
            type="submit"
            disabled={salvando || (!revisando && !podeRevisar)}
            carregando={salvando}
          >
            {salvando ? "Publicando…" : revisando ? "Publicar anúncio" : "Revisar anúncio"}
          </Botao>
        </div>
      </form>
    </div>
  )
}
