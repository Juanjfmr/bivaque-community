"use client"

import { useRef, useState } from "react"

import { Botao } from "@/components/bivaque/botao"
import { Campo, Selecao } from "@/components/bivaque/campos"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { FalhaDaApi } from "@/lib/api/cliente"
import {
  type AcaoDeSituacao,
  type AnuncioDaLista,
  editarDesapego,
  mudarSituacao,
} from "@/lib/dados/mercado"

/**
 * Gerenciar o próprio anúncio (LAN-F06, prancha 21 no molde das telas): editar
 * texto, preço e foto — só desapego; imóvel continua pela jornada própria — e
 * mudar a situação pela sessão (pausar, reativar, encerrar, vendido). Nada é
 * otimista: a situação mostrada é a que o servidor devolveu, e o erro preserva
 * o que a pessoa digitou.
 */

const OPCOES_CATEGORIA = [
  { valor: "casa_moveis", titulo: "Casa e móveis" },
  { valor: "eletronicos", titulo: "Eletrônicos" },
  { valor: "esporte", titulo: "Esporte" },
  { valor: "infantil", titulo: "Infantil" },
  { valor: "veiculos", titulo: "Veículos" },
  { valor: "outros", titulo: "Outros" },
]

const OPCOES_CONDICAO = [
  { valor: "used", titulo: "Usado" },
  { valor: "new", titulo: "Novo" },
]

const ROTULOS_DE_ACAO: Record<AcaoDeSituacao, string> = {
  pause: "Pausar",
  reactivate: "Reativar",
  close: "Encerrar",
  sell: "Marcar como vendido",
}

// Pausar e encerrar tiram o anúncio da vista da cidade: pedem segunda confirmação
// antes de transicionar (F06 — o mesmo cuidado que encerrar já tinha).
const ROTULOS_DE_CONFIRMACAO: Record<"pause" | "close", string> = {
  pause: "Confirmar pausa",
  close: "Confirmar encerramento",
}

const ROTULOS_EM_ANDAMENTO: Record<"pause" | "close", string> = {
  pause: "Pausando…",
  close: "Encerrando…",
}

/** Espelha o que a RPC aceita para a situação atual; o servidor é a autoridade. */
export function acoesDeSituacao(anuncio: AnuncioDaLista): readonly AcaoDeSituacao[] {
  switch (anuncio.status) {
    case "active":
      return anuncio.tipo === "item" ? ["pause", "sell", "close"] : ["pause", "close"]
    case "paused":
    case "reserved":
    case "sold":
      return ["reactivate", "close"]
    default:
      // rascunho publica pelo criar; encerrado é terminal.
      return []
  }
}

/** Centavos para o campo de preço, no formato que a validação da web entende. */
export function precoParaCampo(precoCents: number | null): string {
  if (precoCents === null) return ""
  return precoCents % 100 === 0
    ? String(precoCents / 100)
    : (precoCents / 100).toFixed(2).replace(".", ",")
}

export function GerenciarAnuncio({
  anuncio,
  aberto,
  aoFechar,
  aoGravar,
}: {
  readonly anuncio: AnuncioDaLista
  readonly aberto: boolean
  readonly aoFechar: () => void
  readonly aoGravar: () => void
}) {
  const item = anuncio.tipo === "item"
  const [dados, setDados] = useState({
    titulo: anuncio.titulo,
    bairro: anuncio.bairro ?? "",
    preco: precoParaCampo(anuncio.precoCents),
    descricao: anuncio.descricao ?? "",
    categoria: anuncio.categoria ?? "outros",
    condicao: anuncio.condicao ?? "used",
    foto: "",
  })
  const [status, setStatus] = useState(anuncio.status)
  const [aviso, setAviso] = useState("")
  const [salvando, setSalvando] = useState(false)
  const [mudando, setMudando] = useState<AcaoDeSituacao | null>(null)
  const [confirmarEncerrar, setConfirmarEncerrar] = useState(false)
  const [confirmarPausar, setConfirmarPausar] = useState(false)
  const controle = useRef<AbortController | null>(null)
  const leitor = useRef<FileReader | null>(null)

  async function salvar() {
    if (salvando || !item) return
    setSalvando(true)
    setAviso("")
    const envio = new AbortController()
    controle.current = envio
    try {
      await editarDesapego(anuncio.id, dados, { signal: envio.signal })
      setAviso("Alterações salvas.")
      aoGravar()
    } catch (falha) {
      if (!envio.signal.aborted) {
        setAviso(
          falha instanceof FalhaDaApi && falha.codigo === "sem-sessao"
            ? "Sua sessão expirou. Entre de novo para salvar. Os campos foram mantidos."
            : falha instanceof FalhaDaApi && falha.mensagem
              ? falha.mensagem
              : "Não foi possível salvar. Os campos e a foto foram mantidos. Tente de novo.",
        )
      }
    } finally {
      controle.current = null
      setSalvando(false)
    }
  }

  async function transicionar(acao: AcaoDeSituacao) {
    if (mudando !== null) return
    setMudando(acao)
    setAviso("")
    try {
      setStatus(await mudarSituacao(anuncio.id, acao))
      aoGravar()
    } catch (falha) {
      setAviso(
        falha instanceof FalhaDaApi && falha.mensagem
          ? falha.mensagem
          : "Não foi possível mudar a situação agora. Tente de novo.",
      )
    } finally {
      setMudando(null)
      if (acao === "close") setConfirmarEncerrar(false)
      if (acao === "pause") setConfirmarPausar(false)
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={(novo) => !novo && aoFechar()}>
      <DialogContent
        unstyled
        data-gerenciar-anuncio={anuncio.id}
        className="fixed inset-x-0 bottom-0 z-50 mx-auto grid max-h-[90dvh] w-full max-w-xl gap-3 overflow-y-auto rounded-t-2xl border border-(--outline-variant) bg-(--surface-lowest) p-5 shadow-xl sm:inset-x-4 sm:top-1/2 sm:bottom-auto sm:-translate-y-1/2 sm:rounded-2xl"
      >
        <DialogTitle className="pr-12 text-xl">Gerenciar anúncio</DialogTitle>
        <DialogDescription>
          Situação atual:{" "}
          {{
            draft: "Rascunho",
            active: "Ativo",
            paused: "Pausado",
            reserved: "Reservado",
            sold: "Vendido",
            closed: "Encerrado",
          }[status] ?? status}
          . As mudanças valem para toda a cidade.
        </DialogDescription>

        <div data-acoes-situacao="sim" className="flex flex-wrap gap-2">
          {acoesDeSituacao({ ...anuncio, status }).map((acao) => {
            const pedindoConfirmacao =
              (acao === "pause" && confirmarPausar) || (acao === "close" && confirmarEncerrar)
            if (pedindoConfirmacao)
              return (
                <Botao
                  key={acao}
                  tom="contornado"
                  data-acao={`confirmar-${acao}`}
                  disabled={mudando !== null}
                  onClick={() => void transicionar(acao)}
                >
                  {mudando === acao ? ROTULOS_EM_ANDAMENTO[acao] : ROTULOS_DE_CONFIRMACAO[acao]}
                </Botao>
              )
            if (acao === "pause" || acao === "close")
              return (
                <Botao
                  key={acao}
                  tom={acao === "pause" ? "contornado" : "texto"}
                  data-acao={`situacao-${acao}`}
                  disabled={mudando !== null}
                  onClick={() =>
                    acao === "pause" ? setConfirmarPausar(true) : setConfirmarEncerrar(true)
                  }
                >
                  {ROTULOS_DE_ACAO[acao]}
                </Botao>
              )
            return (
              <Botao
                key={acao}
                tom="tonal"
                data-acao={`situacao-${acao}`}
                disabled={mudando !== null}
                onClick={() => void transicionar(acao)}
              >
                {mudando === acao ? "Salvando…" : ROTULOS_DE_ACAO[acao]}
              </Botao>
            )
          })}
          {acoesDeSituacao({ ...anuncio, status }).length === 0 ? (
            <p className="text-sm text-(--on-surface-variant)">
              Este anúncio não tem mudança de situação disponível aqui.
            </p>
          ) : null}
        </div>

        {item ? (
          <form
            className="grid gap-3"
            aria-busy={salvando}
            onSubmit={(evento) => {
              evento.preventDefault()
              void salvar()
            }}
          >
            <Campo
              id="editar-titulo"
              rotulo="Título"
              valor={dados.titulo}
              aoMudar={(titulo) => setDados({ ...dados, titulo })}
              minLength={3}
              maxLength={120}
              required
            />
            <Campo
              id="editar-bairro"
              rotulo="Bairro de retirada"
              valor={dados.bairro}
              aoMudar={(bairro) => setDados({ ...dados, bairro })}
              maxLength={80}
              required
            />
            <Campo
              id="editar-preco"
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
              id="editar-categoria"
              rotulo="Categoria"
              valor={dados.categoria}
              aoMudar={(categoria) => setDados({ ...dados, categoria })}
              opcoes={OPCOES_CATEGORIA}
            />
            <Selecao
              id="editar-condicao"
              rotulo="Condição"
              valor={dados.condicao}
              aoMudar={(condicao) => setDados({ ...dados, condicao })}
              opcoes={OPCOES_CONDICAO}
            />
            <Campo
              id="editar-descricao"
              rotulo="Estado de conservação e retirada"
              valor={dados.descricao}
              aoMudar={(descricao) => setDados({ ...dados, descricao })}
              area
              minLength={10}
              maxLength={2000}
              required
            />
            <label className="grid gap-2 text-sm font-medium" htmlFor="editar-foto">
              Trocar foto (opcional)
              <input
                id="editar-foto"
                className="min-h-11 max-w-full"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(evento) => {
                  const arquivo = evento.target.files?.[0]
                  if (!arquivo) return
                  if (
                    !["image/jpeg", "image/png", "image/webp"].includes(arquivo.type) ||
                    arquivo.size === 0 ||
                    arquivo.size > 10 * 1024 * 1024
                  ) {
                    setAviso("Escolha uma imagem JPEG, PNG ou WebP de até 10 MB.")
                    return
                  }
                  leitor.current?.abort()
                  const leitura = new FileReader()
                  leitor.current = leitura
                  leitura.onload = () => {
                    if (typeof leitura.result === "string") {
                      setDados((atual) => ({ ...atual, foto: leitura.result as string }))
                      setAviso("")
                    }
                  }
                  leitura.onerror = () =>
                    setAviso("Não foi possível ler a foto. Escolha outra imagem.")
                  leitura.readAsDataURL(arquivo)
                }}
              />
            </label>
            {dados.foto === "" ? null : (
              <div className="grid justify-items-start gap-2">
                <img
                  src={dados.foto}
                  alt="Foto escolhida para o anúncio"
                  className="max-h-40 max-w-full rounded-xl object-contain"
                />
                <Botao type="button" tom="texto" onClick={() => setDados({ ...dados, foto: "" })}>
                  Manter a foto atual
                </Botao>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Botao type="button" tom="texto" onClick={aoFechar}>
                Fechar
              </Botao>
              <Botao type="submit" data-acao="salvar-edicao" disabled={salvando}>
                {salvando ? "Salvando…" : "Salvar alterações"}
              </Botao>
            </div>
          </form>
        ) : (
          <div className="flex justify-end gap-2">
            <p className="self-start text-sm text-(--on-surface-variant)">
              A edição do texto é para desapego; deste imóvel você muda só a situação.
            </p>
            <Botao tom="texto" onClick={aoFechar}>
              Fechar
            </Botao>
          </div>
        )}

        {aviso === "" ? null : (
          <p role="alert" className="text-sm text-(--destructive)">
            {aviso}
          </p>
        )}
      </DialogContent>
    </Dialog>
  )
}
