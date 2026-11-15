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
  editarImovel,
  mudarSituacao,
} from "@/lib/dados/mercado"
import { errosDoImovel } from "@/src/criar/formularios"
import {
  type EstadoDaGestao,
  type EventoDaGestao,
  GESTAO_LIVRE,
  transicaoDaGestao,
} from "@/src/mercado/estado-de-gestao"

/**
 * Gerenciar o próprio anúncio (LAN-F06, prancha 21 no molde das telas): editar
 * texto, preço e foto no desapego; texto, negócio, tipo e detalhes no imóvel —
 * as mesmas colunas da antiga `updatePropertyAction`; e mudar a situação pela
 * sessão (pausar, reativar, encerrar, vendido). Nada é otimista: a situação
 * mostrada é a que o servidor devolveu, e o erro preserva o que a pessoa
 * digitou.
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
  // O imóvel edita as colunas que a leitura do app expõe; suítes, vagas,
  // condomínio, IPTU e disponibilidade não vêm na lista, então o corpo não as
  // manda e o servidor preserva o gravado.
  const [imovel, setImovel] = useState({
    titulo: anuncio.titulo,
    tipoImovel: anuncio.tipoImovel === "house" ? "casa" : "apartamento",
    negocio: anuncio.deal === "sale" ? "venda" : "aluguel",
    bairro: anuncio.bairro ?? "",
    valor: precoParaCampo(anuncio.precoCents),
    quartos: anuncio.quartos === null ? "" : String(anuncio.quartos),
    area: anuncio.areaM2 === null ? "" : String(anuncio.areaM2),
    descricao: anuncio.descricao ?? "",
  })
  const [aviso, setAviso] = useState("")
  const [gestao, setGestao] = useState<EstadoDaGestao>(GESTAO_LIVRE)
  // A ref aplica a guarda no mesmo turno do clique, antes do próximo render.
  // Assim dois eventos rápidos não iniciam duas chamadas mesmo com React em lote.
  const gestaoAtual = useRef<EstadoDaGestao>(GESTAO_LIVRE)
  function despachar(evento: EventoDaGestao): boolean {
    const anterior = gestaoAtual.current
    const proximo = transicaoDaGestao(anterior, evento)
    if (proximo === anterior) return false
    gestaoAtual.current = proximo
    setGestao(proximo)
    return true
  }
  const ocupado = gestao.fase === "executando"
  const salvando = gestao.fase === "executando" && gestao.operacao === "edicao"
  const mudando: AcaoDeSituacao | null =
    gestao.fase === "executando" && gestao.operacao !== "edicao" ? gestao.operacao : null
  const confirmarPausar = gestao.fase === "confirmando" && gestao.acao === "pause"
  const confirmarEncerrar = gestao.fase === "confirmando" && gestao.acao === "close"
  const controle = useRef<AbortController | null>(null)
  const leitor = useRef<FileReader | null>(null)

  async function salvar() {
    if (!despachar({ tipo: "iniciar-edicao" })) return
    setAviso("")
    const primeiro = item
      ? undefined
      : Object.values(errosDoImovel({ ...imovel, vagas: "" })).find(
          (mensagem) => mensagem !== undefined,
        )
    if (primeiro !== undefined) {
      setAviso(primeiro)
      despachar({ tipo: "concluir" })
      return
    }
    const envio = new AbortController()
    controle.current = envio
    try {
      if (item) {
        await editarDesapego(anuncio.id, dados, { signal: envio.signal })
      } else {
        await editarImovel(
          anuncio.id,
          {
            title: imovel.titulo,
            deal: imovel.negocio === "venda" ? "sale" : "rent",
            propertyType: imovel.tipoImovel === "casa" ? "house" : "apartment",
            valor: imovel.valor,
            bedrooms: imovel.quartos,
            areaM2: imovel.area,
            description: imovel.descricao,
            neighborhood: imovel.bairro,
          },
          { signal: envio.signal },
        )
      }
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
      despachar({ tipo: "concluir" })
    }
  }

  async function transicionar(acao: AcaoDeSituacao) {
    if (!acoesDeSituacao({ ...anuncio, status }).includes(acao)) return
    if (!despachar({ tipo: "iniciar-situacao", acao })) return
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
      despachar({ tipo: "concluir" })
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={(novo) => !novo && !ocupado && aoFechar()}>
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
              (acao === "pause" && (confirmarPausar || mudando === "pause")) ||
              (acao === "close" && (confirmarEncerrar || mudando === "close"))
            if (pedindoConfirmacao)
              return (
                <Botao
                  key={acao}
                  tom="contornado"
                  data-acao={`confirmar-${acao}`}
                  disabled={ocupado}
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
                  disabled={ocupado || gestao.fase === "confirmando"}
                  onClick={() => {
                    despachar({ tipo: "pedir-confirmacao", acao })
                  }}
                >
                  {ROTULOS_DE_ACAO[acao]}
                </Botao>
              )
            return (
              <Botao
                key={acao}
                tom="tonal"
                data-acao={`situacao-${acao}`}
                disabled={ocupado || gestao.fase === "confirmando"}
                onClick={() => void transicionar(acao)}
              >
                {mudando === acao ? "Salvando…" : ROTULOS_DE_ACAO[acao]}
              </Botao>
            )
          })}
          {gestao.fase === "confirmando" ? (
            <Botao
              type="button"
              tom="texto"
              data-acao="cancelar-confirmacao"
              onClick={() => {
                despachar({ tipo: "cancelar-confirmacao" })
              }}
            >
              Cancelar
            </Botao>
          ) : null}
          {acoesDeSituacao({ ...anuncio, status }).length === 0 ? (
            <p className="text-sm text-(--on-surface-variant)">
              Este anúncio não tem mudança de situação disponível aqui.
            </p>
          ) : null}
        </div>

        {item ? (
          <form
            className="grid gap-3"
            aria-busy={ocupado}
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
              <Botao type="button" tom="texto" disabled={ocupado} onClick={aoFechar}>
                Fechar
              </Botao>
              <Botao type="submit" data-acao="salvar-edicao" disabled={gestao.fase !== "livre"}>
                {salvando ? "Salvando…" : "Salvar alterações"}
              </Botao>
            </div>
          </form>
        ) : (
          <form
            data-formulario="imovel"
            className="grid gap-3"
            aria-busy={ocupado}
            noValidate
            onSubmit={(evento) => {
              evento.preventDefault()
              void salvar()
            }}
          >
            <Campo
              id="editar-imovel-titulo"
              rotulo="Título"
              valor={imovel.titulo}
              aoMudar={(titulo) => setImovel({ ...imovel, titulo })}
              maxLength={120}
              required
            />
            <div className="grid grid-cols-2 gap-3">
              <Selecao
                id="editar-imovel-tipo"
                rotulo="Tipo"
                valor={imovel.tipoImovel}
                aoMudar={(tipoImovel) => setImovel({ ...imovel, tipoImovel })}
                opcoes={[
                  { valor: "apartamento", titulo: "Apartamento" },
                  { valor: "casa", titulo: "Casa" },
                ]}
              />
              <Selecao
                id="editar-imovel-negocio"
                rotulo="Finalidade"
                valor={imovel.negocio}
                aoMudar={(negocio) => setImovel({ ...imovel, negocio })}
                opcoes={[
                  { valor: "aluguel", titulo: "Aluguel" },
                  { valor: "venda", titulo: "Venda" },
                ]}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Campo
                id="editar-imovel-bairro"
                rotulo="Bairro"
                valor={imovel.bairro}
                aoMudar={(bairro) => setImovel({ ...imovel, bairro })}
                maxLength={80}
                required
              />
              <Campo
                id="editar-imovel-valor"
                rotulo={
                  imovel.negocio === "aluguel" ? "Aluguel por mês (R$)" : "Valor de venda (R$)"
                }
                valor={imovel.valor}
                aoMudar={(valor) => setImovel({ ...imovel, valor })}
                type="number"
                inputMode="numeric"
                min="1"
                step="1"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Campo
                id="editar-imovel-quartos"
                rotulo="Quartos"
                valor={imovel.quartos}
                aoMudar={(quartos) => setImovel({ ...imovel, quartos })}
                type="number"
                inputMode="numeric"
                min="0"
                max="20"
                step="1"
              />
              <Campo
                id="editar-imovel-area"
                rotulo="Área (m²)"
                valor={imovel.area}
                aoMudar={(area) => setImovel({ ...imovel, area })}
                type="number"
                inputMode="decimal"
                min="1"
                step="0.01"
              />
            </div>
            <Campo
              id="editar-imovel-descricao"
              rotulo="Descrição"
              valor={imovel.descricao}
              aoMudar={(descricao) => setImovel({ ...imovel, descricao })}
              area
              nota="Suítes, vagas, condomínio, IPTU e disponibilidade continuam como estão."
            />
            <div className="flex justify-end gap-2">
              <Botao type="button" tom="texto" disabled={ocupado} onClick={aoFechar}>
                Fechar
              </Botao>
              <Botao type="submit" data-acao="salvar-edicao" disabled={gestao.fase !== "livre"}>
                {salvando ? "Salvando…" : "Salvar alterações"}
              </Botao>
            </div>
          </form>
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
