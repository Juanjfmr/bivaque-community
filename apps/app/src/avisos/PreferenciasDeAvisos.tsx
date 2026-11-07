"use client"

import { useEffect, useState } from "react"

import { useAvisos as useToast } from "@/components/bivaque/avisos"
import { Botao } from "@/components/bivaque/botao"
import { EsqueletoDeLista } from "@/components/bivaque/esqueleto"
import { EstadoDeErro } from "@/components/bivaque/estado-vazio"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { FalhaDaApi } from "@/lib/api/cliente"
import {
  type CanalDoAviso,
  comTipo,
  lerPreferenciasDeAviso,
  type PreferenciasDeAviso,
  salvarPreferenciasDeAviso,
  type TipoDoAviso,
} from "@/lib/dados/avisos"
import {
  comPushEmTodos,
  desinscreverPush,
  estadoDoInterruptorDePush,
  inscreverPush,
} from "@/lib/dados/push"

/**
 * Preferências de aviso por tipo e por canal (F09), na área Você.
 *
 * A escolha é a mesma matriz que a web antiga usa: quatro tipos × três canais.
 * O push do aparelho tem um interruptor próprio: é ele que pede a permissão do
 * navegador e grava a inscrição do aparelho. O canal push por tipo continua na
 * matriz, mas só entrega quando o interruptor está ligado e a pessoa escolheu o
 * tipo (ADR-20261107).
 */

type TipoVisivel = Exclude<TipoDoAviso, "product_news">

const TIPOS: ReadonlyArray<readonly [TipoVisivel, string, string]> = [
  ["comments", "Respostas", "Quando alguém comenta ou responde algo seu."],
  ["events", "Encontros", "Confirmações, mudanças e lembretes dos encontros que você acompanha."],
  [
    "indications",
    "Pedidos de indicação",
    "Respostas ao seu pedido e o resumo de pedidos da cidade.",
  ],
]

const CANAIS: ReadonlyArray<readonly [CanalDoAviso, string]> = [
  ["in_app", "No app"],
  ["email", "E-mail"],
  ["push", "Push"],
]

const ROTULO_DO_PUSH = "Avisos no aparelho"

function canalDe(
  preferencias: PreferenciasDeAviso,
  tipo: TipoDoAviso,
  canal: CanalDoAviso,
): boolean {
  return (
    preferencias.channels.find((item) => item.notificationType === tipo && item.channel === canal)
      ?.enabled === true
  )
}

function comCanal(
  preferencias: PreferenciasDeAviso,
  tipo: TipoDoAviso,
  canal: CanalDoAviso,
  ativo: boolean,
): PreferenciasDeAviso {
  const outros = preferencias.channels.filter(
    (item) => !(item.notificationType === tipo && item.channel === canal),
  )
  return {
    ...preferencias,
    channels: [...outros, { notificationType: tipo, channel: canal, enabled: ativo }],
  }
}

export function PreferenciasDeAvisos() {
  const { avisar } = useToast()
  const [preferencias, setPreferencias] = useState<PreferenciasDeAviso | null>(null)
  const [erro, setErro] = useState(false)
  const [rodada, setRodada] = useState(0)
  const [sujo, setSujo] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [push, setPush] = useState<{ disponivel: boolean; ligado: boolean }>({
    disponivel: false,
    ligado: false,
  })
  const [alternandoPush, setAlternandoPush] = useState(false)

  // biome-ignore lint/correctness/useExhaustiveDependencies: rodada é o pedido de "tentar de novo"
  useEffect(() => {
    const controle = new AbortController()
    setPreferencias(null)
    setErro(false)
    setSujo(false)
    void lerPreferenciasDeAviso({ signal: controle.signal })
      .then((lidas) => {
        if (!controle.signal.aborted) setPreferencias(lidas)
      })
      .catch(() => {
        if (!controle.signal.aborted) setErro(true)
      })
    void estadoDoInterruptorDePush()
      .then((estado) => {
        if (!controle.signal.aborted) setPush(estado)
      })
      .catch(() => {
        if (!controle.signal.aborted) setPush({ disponivel: false, ligado: false })
      })
    return () => controle.abort()
  }, [rodada])

  function alterarTipo(tipo: TipoDoAviso, ativo: boolean) {
    setPreferencias((atual) => (atual === null ? atual : comTipo(atual, tipo, ativo)))
    setSujo(true)
  }

  function alterarCanal(tipo: TipoDoAviso, canal: CanalDoAviso, ativo: boolean) {
    setPreferencias((atual) => (atual === null ? atual : comCanal(atual, tipo, canal, ativo)))
    setSujo(true)
  }

  /**
   * Liga o push só na ação da pessoa: é aqui que o navegador pede permissão.
   * Negado mantém desligado e diz o motivo; sem as chaves do servidor o
   * interruptor nem aparece.
   */
  async function alterarPush(ativo: boolean) {
    if (alternandoPush || preferencias === null) return
    setAlternandoPush(true)
    try {
      if (ativo) {
        const resultado = await inscreverPush()
        if (resultado.estado === "negado") {
          avisar({
            texto:
              "O navegador não autorizou as notificações. Para ligar, permita os avisos deste site nas configurações do navegador.",
            tipo: "erro",
          })
          setPush((atual) => ({ ...atual, ligado: false }))
          return
        }
        if (resultado.estado !== "inscrito") {
          avisar({ texto: "Não foi possível ligar os avisos neste aparelho agora.", tipo: "erro" })
          setPush((atual) => ({ ...atual, ligado: false }))
          return
        }
        setPush((atual) => ({ ...atual, ligado: true }))
      } else {
        // Desligar vale mesmo sem gravar: o aparelho não deve continuar inscrito.
        await desinscreverPush().catch(() => undefined)
        setPush((atual) => ({ ...atual, ligado: false }))
      }

      // O interruptor grava o canal push na hora: ligar e sair da tela sem
      // gravar deixaria a inscrição sem entrega, a tela que mente.
      const atualizadas = comPushEmTodos(preferencias, ativo)
      setPreferencias(atualizadas)
      setSalvando(true)
      try {
        const gravadas = await salvarPreferenciasDeAviso(atualizadas)
        setPreferencias(gravadas)
        setSujo(false)
      } catch {
        setSujo(true)
        avisar({ texto: "Não foi possível gravar a escolha de push agora.", tipo: "erro" })
      } finally {
        setSalvando(false)
      }
    } finally {
      setAlternandoPush(false)
    }
  }

  function salvar() {
    if (preferencias === null || salvando) return
    setSalvando(true)
    void salvarPreferenciasDeAviso(preferencias)
      .then((gravadas) => {
        setPreferencias(gravadas)
        setSujo(false)
        avisar({ texto: "Preferências de aviso salvas.", tipo: "sucesso" })
      })
      .catch((falha: unknown) => {
        avisar({
          texto:
            falha instanceof FalhaDaApi && falha.mensagem !== null
              ? falha.mensagem
              : "Não foi possível salvar suas preferências. Tente de novo.",
          tipo: "erro",
        })
      })
      .finally(() => setSalvando(false))
  }

  if (erro) return <EstadoDeErro aoTentar={() => setRodada((atual) => atual + 1)} />
  if (preferencias === null) return <EsqueletoDeLista linhas={2} />

  return (
    <div data-preferencias-de-aviso="sim" className="grid gap-3">
      <p className="text-sm text-(--on-surface-variant)">
        Escolha o que você quer receber e por onde. Os avisos no aparelho só chegam depois que você
        ligar o push abaixo.
      </p>

      {push.disponivel ? (
        <div
          data-preferencia="push-aparelho"
          className="flex min-h-11 items-start justify-between gap-3 rounded-2xl border border-(--outline-variant) bg-(--surface-lowest) p-3"
        >
          <span className="grid min-w-0 gap-0.5">
            <b className="text-[15px] font-semibold">Avisos no aparelho</b>
            <small className="text-[13px] text-(--on-surface-variant)">
              Chegam mesmo com o Bivaque fechado. O navegador pede permissão quando você liga.
            </small>
          </span>
          <Checkbox
            checked={push.ligado}
            disabled={alternandoPush}
            onCheckedChange={(valor) => void alterarPush(valor === true)}
            aria-label={ROTULO_DO_PUSH}
            className="mt-1"
          />
        </div>
      ) : null}

      <ul className="grid gap-2">
        {TIPOS.map(([tipo, titulo, texto]) => {
          const ligado = preferencias[tipo]
          return (
            <li
              key={tipo}
              data-preferencia={tipo}
              className="grid gap-2 rounded-2xl border border-(--outline-variant) bg-(--surface-lowest) p-3"
            >
              <div className="flex min-h-11 items-start justify-between gap-3">
                <span className="grid min-w-0 gap-0.5">
                  <b className="text-[15px] font-semibold">{titulo}</b>
                  <small className="text-[13px] text-(--on-surface-variant)">{texto}</small>
                </span>
                <Checkbox
                  checked={ligado}
                  onCheckedChange={(valor) => alterarTipo(tipo, valor === true)}
                  aria-label={`Avisos de ${titulo.toLowerCase()}`}
                  className="mt-1"
                />
              </div>
              <div
                className={
                  ligado
                    ? "flex flex-wrap items-center gap-4 pl-1"
                    : "flex flex-wrap items-center gap-4 pl-1 opacity-40"
                }
              >
                {CANAIS.filter(([canal]) => canal !== "push" || push.disponivel).map(
                  ([canal, rotulo]) => (
                    <span key={canal} className="flex min-h-11 items-center gap-2 text-sm">
                      <Checkbox
                        checked={ligado && canalDe(preferencias, tipo, canal)}
                        disabled={!ligado || (canal === "push" && !push.ligado)}
                        onCheckedChange={(valor) => alterarCanal(tipo, canal, valor === true)}
                        aria-label={`${titulo} por ${rotulo.toLowerCase()}`}
                      />
                      {rotulo}
                    </span>
                  ),
                )}
              </div>
            </li>
          )
        })}
      </ul>

      <div
        data-preferencia="product_news"
        className="flex min-h-11 items-start justify-between gap-3 rounded-2xl border border-(--outline-variant) bg-(--surface-lowest) p-3"
      >
        <span className="grid min-w-0 gap-0.5">
          <b className="text-[15px] font-semibold">Novidades do Bivaque</b>
          <small className="text-[13px] text-(--on-surface-variant)">
            Comunicações sobre o produto. Começa desligado.
          </small>
        </span>
        <Checkbox
          checked={preferencias.productNews}
          onCheckedChange={(valor) => alterarTipo("product_news", valor === true)}
          aria-label="Novidades do Bivaque"
          className="mt-1"
        />
      </div>

      <div className="grid gap-2 rounded-2xl border border-(--outline-variant) bg-(--surface-lowest) p-3">
        <span id="rotulo-resumo-cidade" className="text-[15px] font-semibold">
          Resumo da cidade por e-mail
        </span>
        <p className="text-[13px] text-(--on-surface-variant)">
          Perguntas novas, encontros da semana e respostas às suas perguntas. Só chega quando há
          novidades.
        </p>
        <Select
          value={preferencias.resumoCidade}
          disabled={salvando}
          onValueChange={(valor) => {
            if (valor !== "off" && valor !== "daily" && valor !== "weekly") return
            setPreferencias({ ...preferencias, resumoCidade: valor })
            setSujo(true)
          }}
        >
          <SelectTrigger aria-labelledby="rotulo-resumo-cidade">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="off">Desligado</SelectItem>
            <SelectItem value="daily">Diário</SelectItem>
            <SelectItem value="weekly">Semanal</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* "Gravar", não "Salvar": o Salvar do perfil casa com qualquer nome que
          contenha "Salvar" no seletor por papel, e esta seção vive na mesma tela. */}
      <Botao
        tom="tonal"
        onClick={salvar}
        disabled={!sujo || salvando}
        aria-label="Gravar preferências de avisos"
        className="justify-self-end"
      >
        {salvando ? "Salvando…" : "Gravar preferências"}
      </Botao>
    </div>
  )
}
