import { useEffect, useRef, useState } from "react"
import { Botao } from "@/components/bivaque/botao"
import { Campo, Selecao } from "@/components/bivaque/campos"
import { FalhaDaApi } from "@/lib/api/cliente"
import { publicarDesapego } from "@/lib/dados/criar"
import { excluirRascunho, guardarRascunho, lerRascunho } from "./rascunho"

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
    <div data-formulario-criacao="create-item" className="grid min-w-0 gap-3">
      <header className="grid gap-1">
        <h2 className="text-lg font-semibold">Anunciar desapego</h2>
        <p className="text-sm text-(--on-surface-variant)">
          Descreva o item, preço e condições. Revise antes de publicar.
        </p>
      </header>
      <form
        className="grid gap-3"
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
          <div data-revisao="desapego" className="grid gap-2">
            <b>Revise seu anúncio</b>
            <p className="break-words">{dados.titulo}</p>
            <p className="text-sm">
              R$ {dados.preco} · {dados.bairro} · {dados.condicao === "new" ? "Novo" : "Usado"}
            </p>
            <p className="whitespace-pre-wrap break-words text-sm">{dados.descricao}</p>
            <p className="text-xs text-(--on-surface-variant)">
              Será publicado para a cidade da sua conta.
            </p>
          </div>
        ) : (
          <>
            <Campo
              id="criacao-titulo"
              rotulo="Qual item quer anunciar?"
              valor={dados.titulo}
              aoMudar={(titulo) => setDados({ ...dados, titulo })}
              minLength={5}
              maxLength={120}
              required
              placeholder="Mesa de jantar com quatro cadeiras"
            />
            <Campo
              id="criacao-complemento"
              rotulo="Bairro de retirada"
              valor={dados.bairro}
              aoMudar={(bairro) => setDados({ ...dados, bairro })}
              maxLength={80}
              required
            />
            <Campo
              id="criacao-preco"
              rotulo="Preço pedido (R$)"
              valor={dados.preco}
              aoMudar={(preco) => setDados({ ...dados, preco })}
              type="number"
              inputMode="decimal"
              min="1"
              step="0.01"
              max="1000000"
              required
            />
            <Selecao
              id="criacao-categoria"
              rotulo="Categoria"
              valor={dados.categoria}
              aoMudar={(categoria) => setDados({ ...dados, categoria })}
              opcoes={[
                { valor: "casa_moveis", titulo: "Casa e móveis" },
                { valor: "eletronicos", titulo: "Eletrônicos" },
                { valor: "esporte", titulo: "Esporte" },
                { valor: "infantil", titulo: "Infantil" },
                { valor: "veiculos", titulo: "Veículos" },
                { valor: "outros", titulo: "Outros" },
              ]}
            />
            <Selecao
              id="criacao-condicao"
              rotulo="Condição"
              valor={dados.condicao}
              aoMudar={(condicao) => setDados({ ...dados, condicao })}
              opcoes={[
                { valor: "used", titulo: "Usado" },
                { valor: "new", titulo: "Novo" },
              ]}
            />
            <Campo
              id="criacao-descricao"
              rotulo="Estado de conservação e retirada"
              valor={dados.descricao}
              aoMudar={(descricao) => setDados({ ...dados, descricao })}
              area
              minLength={10}
              maxLength={2000}
              required
              nota="Informe ao menos 10 caracteres. Evite documentos pessoais, telefones e endereços privados."
            />
            <label className="grid gap-2 text-sm font-medium" htmlFor="criacao-foto">
              Foto do item (opcional)
              <input
                id="criacao-foto"
                className="min-h-11 max-w-full"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(evento) => {
                  const file = evento.target.files?.[0]
                  if (!file) return
                  if (
                    !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
                    file.size === 0 ||
                    file.size > 10 * 1024 * 1024
                  ) {
                    setErro("Escolha uma imagem JPEG, PNG ou WebP de até 10 MB.")
                    return
                  }
                  leitor.current?.abort()
                  const leitura = new FileReader()
                  leitor.current = leitura
                  leitura.onload = () => {
                    if (typeof leitura.result === "string") {
                      const foto = leitura.result
                      setDados((atual) => ({ ...atual, foto }))
                      setErro("")
                    }
                  }
                  leitura.onerror = () =>
                    setErro("Não foi possível ler a foto. Escolha outra imagem.")
                  leitura.readAsDataURL(file)
                }}
              />
            </label>
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
              <Botao type="button" tom="texto" onClick={() => setDados({ ...dados, foto: "" })}>
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
            type="button"
            tom="texto"
            disabled={salvando}
            onClick={() => (revisando ? setRevisando(false) : aoCancelar())}
          >
            {revisando ? "Editar" : "Voltar"}
          </Botao>
          {!revisando && (
            <Botao
              type="button"
              tom="contornado"
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
          <Botao type="submit" disabled={salvando}>
            {salvando ? "Publicando…" : revisando ? "Publicar anúncio" : "Revisar anúncio"}
          </Botao>
        </div>
      </form>
    </div>
  )
}
