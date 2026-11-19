"use client"

import { useEffect, useRef, useState } from "react"

import { useAvisos as useToast } from "@/components/bivaque/avisos"
import { Botao, BotaoDeIcone } from "@/components/bivaque/botao"
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
  lerPreferenciasDeAviso,
  type PreferenciasDeAviso,
  salvarPreferenciasDeAviso,
  type TipoDoAviso,
} from "@/lib/dados/avisos"
import { useEntradaDaTela, useNavegacao } from "@/lib/navegacao/react"

/**
 * Preferências de aviso por tipo e por canal (F09), na área Você.
 *
 * A escolha é a mesma matriz que a web antiga usa: cinco tipos × três canais.
 * O push nasce desligado porque ainda não há envio no celular (LAN-PUSH); a
 * escolha fica guardada para quando chegar — o canal se chama "No celular",
 * como a pessoa conhece, e não "Push".
 *
 * A régua de 18/11 (rodada 1): um controle por decisão — o interruptor é do
 * canal, sem chave-mestra duplicando a mesma escolha (D15); rótulo e
 * interruptor na mesma linha, dentro da largura de leitura (D16); a seção abre
 * com voltar e um título só (D17); apoio de uma linha; e o "Gravar" numa barra
 * fixa no rodapé da área, sempre visível.
 */

const TIPOS: ReadonlyArray<readonly [TipoDoAviso, string, string]> = [
  ["comments", "Respostas", "Quando alguém comenta ou responde algo seu."],
  ["events", "Encontros", "Mudanças e lembretes dos seus encontros."],
  ["indications", "Pedidos de indicação", "Respostas ao seu pedido e o resumo da cidade."],
  ["messages", "Mensagens", "Quando alguém mandar uma mensagem direta."],
  ["product_news", "Novidades do Bivaque", "Novidades do produto. Começa desligado."],
]

const CANAIS: ReadonlyArray<readonly [CanalDoAviso, string]> = [
  ["in_app", "No app"],
  ["email", "E-mail"],
  ["push", "No celular"],
]

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
  const navegacao = useNavegacao()
  const entrada = useEntradaDaTela()
  const [preferencias, setPreferencias] = useState<PreferenciasDeAviso | null>(null)
  const [erro, setErro] = useState(false)
  const [rodada, setRodada] = useState(0)
  const [sujo, setSujo] = useState(false)
  const [salvando, setSalvando] = useState(false)
  // Guarda síncrona: um clique duplicado no mesmo quadro não dispara outro PATCH.
  const envioEmCurso = useRef(false)

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
    return () => controle.abort()
  }, [rodada])

  function alterarCanal(tipo: TipoDoAviso, canal: CanalDoAviso, ativo: boolean) {
    if (envioEmCurso.current) return
    setPreferencias((atual) => (atual === null ? atual : comCanal(atual, tipo, canal, ativo)))
    setSujo(true)
  }

  function salvar() {
    if (preferencias === null || !sujo || envioEmCurso.current) return
    envioEmCurso.current = true
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
      .finally(() => {
        envioEmCurso.current = false
        setSalvando(false)
      })
  }

  if (erro) return <EstadoDeErro aoTentar={() => setRodada((atual) => atual + 1)} />
  if (preferencias === null) return <EsqueletoDeLista linhas={2} />

  return (
    <div data-preferencias-de-aviso="sim" aria-busy={salvando} className="grid gap-3">
      {/* D17: um título só, com voltar — o mesmo molde da lista de avisos. O
          título da seção de cima sai (styles.css); aqui é a única hierarquia. */}
      <div className="flex items-center gap-2">
        <BotaoDeIcone
          rotulo="Voltar"
          nome="arrow_back"
          data-acao="voltar"
          onClick={() =>
            void (entrada.pai === null ? navegacao.irPara("inicio") : navegacao.voltar())
          }
        />
        <h2 className="text-[21px] font-bold leading-7">Avisos</h2>
      </div>
      <p className="text-sm text-(--on-surface-variant)">
        Escolha o que você quer receber e por onde.
      </p>

      <ul className="grid gap-2">
        {TIPOS.map(([tipo, titulo, texto]) => (
          <li
            key={tipo}
            data-preferencia={tipo}
            className="grid gap-2 rounded-2xl border border-(--outline-variant) bg-(--surface-lowest) p-3"
          >
            <span className="grid min-w-0 gap-0.5">
              <b className="text-[15px] font-semibold">{titulo}</b>
              <small className="text-[13px] text-(--on-surface-variant)">{texto}</small>
            </span>
            {/* D15: um controle por decisão — o interruptor é do canal, na
                mesma linha do rótulo (D16). */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pl-1">
              {CANAIS.map(([canal, rotulo]) => (
                <span key={canal} className="flex min-h-11 items-center gap-2.5 text-sm">
                  <Checkbox
                    role="switch"
                    checked={canalDe(preferencias, tipo, canal)}
                    disabled={salvando}
                    onCheckedChange={(valor) => alterarCanal(tipo, canal, valor === true)}
                    aria-label={`Avisos de ${titulo.toLowerCase()} por ${rotulo.toLowerCase()}`}
                    className="bv-interruptor"
                  />
                  {rotulo}
                </span>
              ))}
            </div>
          </li>
        ))}
      </ul>

      <div className="grid gap-2 rounded-2xl border border-(--outline-variant) bg-(--surface-lowest) p-3">
        <span id="rotulo-resumo-cidade" className="text-[15px] font-semibold">
          Resumo da cidade por e-mail
        </span>
        <p className="text-[13px] text-(--on-surface-variant)">
          Perguntas novas e encontros da semana.
        </p>
        <Select
          value={preferencias.resumoCidade}
          disabled={salvando}
          onValueChange={(valor) => {
            if (envioEmCurso.current) return
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
      <div data-barra="gravar-preferencias">
        <Botao
          tom="tonal"
          onClick={salvar}
          disabled={!sujo || salvando}
          aria-label="Gravar preferências de avisos"
        >
          {salvando ? "Salvando…" : "Gravar preferências"}
        </Botao>
      </div>
    </div>
  )
}
