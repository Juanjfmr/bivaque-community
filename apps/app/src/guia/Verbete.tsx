"use client"

import { useEffect, useState } from "react"

import { Botao } from "@/components/bivaque/botao"
import { Campo, Formulario } from "@/components/bivaque/campos"
import { EsqueletoDeLista } from "@/components/bivaque/esqueleto"
import { EstadoDeErro, EstadoVazio } from "@/components/bivaque/estado-vazio"
import { Icone } from "@/components/bivaque/icone"
import { lerVerbete, marcarNoGuia, sugerirAtualizacao, type VerbeteDoGuia } from "@/lib/dados/guia"
import { EstadoDeSessaoVencida, EstadoNegado } from "@/src/eventos/EstadosDeAcesso"
import {
  acessoNegado,
  mensagemDaFalha,
  naoEncontrado,
  sessaoVencida,
  validarSugestao,
} from "@/src/guia/comum"

/**
 * O verbete do Guia (F08), aberto numa folha sobre a lista.
 *
 * Lê a referência pela rota do app — a tela nunca recebe o caminho cru do
 * banco. Salvar e sugerir mostram o que ficou gravado: o marcador só muda
 * depois da resposta, e a sugestão só limpa o texto depois do 201. Falha
 * devolve o estado anterior com a frase do motivo.
 */
export function Verbete({
  id,
  aoMudarSalvo,
}: {
  readonly id: string
  readonly aoMudarSalvo: (id: string, salvo: boolean) => void
}) {
  const [verbete, setVerbete] = useState<VerbeteDoGuia | null>(null)
  const [erro, setErro] = useState<"falhou" | "sessao" | "negado" | "ausente" | null>(null)
  const [rodada, setRodada] = useState(0)
  const [ocupado, setOcupado] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)

  const [descricao, setDescricao] = useState("")
  const [referencia, setReferencia] = useState("")
  const [enviando, setEnviando] = useState(false)
  const [sugestaoEnviada, setSugestaoEnviada] = useState(false)
  const [erroDaSugestao, setErroDaSugestao] = useState<string | null>(null)

  // biome-ignore lint/correctness/useExhaustiveDependencies: rodada é o pedido de "tentar de novo"
  useEffect(() => {
    const controle = new AbortController()
    setVerbete(null)
    setErro(null)
    void lerVerbete(id, { signal: controle.signal })
      .then((lido) => {
        if (!controle.signal.aborted) setVerbete(lido)
      })
      .catch((falha: unknown) => {
        if (controle.signal.aborted) return
        setErro(
          sessaoVencida(falha)
            ? "sessao"
            : acessoNegado(falha)
              ? "negado"
              : naoEncontrado(falha)
                ? "ausente"
                : "falhou",
        )
      })
    return () => controle.abort()
  }, [id, rodada])

  async function alternarSalvo() {
    if (verbete === null || ocupado) return
    setOcupado(true)
    setAviso(null)
    const alvo = !verbete.entrada.salvo
    try {
      const salvo = await marcarNoGuia(id, alvo)
      setVerbete({ ...verbete, entrada: { ...verbete.entrada, salvo } })
      aoMudarSalvo(id, salvo)
      setAviso(salvo ? "Guardado em Salvos." : "Removido dos salvos.")
    } catch (falha: unknown) {
      setAviso(mensagemDaFalha(falha, "Não foi possível mudar o marcador. Tente de novo."))
    } finally {
      setOcupado(false)
    }
  }

  async function enviarSugestao() {
    if (enviando) return
    const problema = validarSugestao(descricao, referencia)
    if (problema !== null) {
      setErroDaSugestao(problema)
      return
    }
    setEnviando(true)
    setErroDaSugestao(null)
    setSugestaoEnviada(false)
    try {
      await sugerirAtualizacao(id, { descricao, referencia })
      setDescricao("")
      setReferencia("")
      setSugestaoEnviada(true)
    } catch (falha: unknown) {
      setErroDaSugestao(
        mensagemDaFalha(falha, "Não foi possível enviar a sugestão. Seu texto foi mantido."),
      )
    } finally {
      setEnviando(false)
    }
  }

  if (erro === "sessao") return <EstadoDeSessaoVencida />
  if (erro === "negado") return <EstadoNegado texto="O guia é de quem mora na cidade." />
  if (erro === "ausente") {
    return (
      <EstadoVazio
        titulo="Referência não encontrada"
        texto="Ela saiu do guia ou o endereço está errado."
      />
    )
  }
  if (erro === "falhou") return <EstadoDeErro aoTentar={() => setRodada((atual) => atual + 1)} />
  if (verbete === null) return <EsqueletoDeLista linhas={3} />

  const { entrada, podeSalvar, podeSugerir } = verbete
  return (
    <div data-verbete="guia" className="grid gap-4">
      {entrada.descricao === "" ? null : (
        <p className="text-sm text-(--on-surface-variant)">{entrada.descricao}</p>
      )}

      {entrada.telefone === null ? null : (
        <a
          href={`tel:${entrada.telefone.replace(/[^\d+]/g, "")}`}
          className="inline-flex min-h-11 items-center gap-2 text-sm text-(--primary)"
        >
          <Icone nome="support" className="size-5" />
          {entrada.telefone}
        </a>
      )}
      {entrada.site === null ? null : (
        <a
          href={entrada.site}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-11 items-center gap-2 text-sm text-(--primary)"
        >
          <Icone nome="open_in_new" className="size-5" />
          Visitar o site
        </a>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {podeSalvar ? (
          <Botao
            tom="tonal"
            icone={entrada.salvo ? "bookmark" : "bookmark_border"}
            disabled={ocupado}
            onClick={() => void alternarSalvo()}
          >
            {entrada.salvo ? "Salvo no seu guia" : "Salvar no seu guia"}
          </Botao>
        ) : (
          <p className="text-sm text-(--on-surface-variant)">
            Esta referência é de outra cidade. Salvar e sugerir ficam no guia da cidade em que você
            mora.
          </p>
        )}
        {aviso === null ? null : (
          <p role="status" className="text-sm text-(--on-surface-variant)">
            {aviso}
          </p>
        )}
      </div>

      {podeSalvar ? (
        <section className="grid gap-2 border-t border-(--outline-variant) pt-4">
          <h3 className="text-[17px]">Sugerir atualização</h3>
          {podeSugerir ? (
            <Formulario>
              <Campo
                id="sugestao-descricao"
                rotulo="O que precisa mudar?"
                valor={descricao}
                aoMudar={setDescricao}
                area
                nota="A curadoria revisa antes de mudar o Guia."
              />
              <Campo
                id="sugestao-referencia"
                rotulo="Onde confirmar (opcional)"
                valor={referencia}
                aoMudar={setReferencia}
              />
              {erroDaSugestao === null ? null : (
                <p role="alert" className="text-sm text-(--destructive)">
                  {erroDaSugestao}
                </p>
              )}
              {sugestaoEnviada ? (
                <p role="status" className="text-sm text-(--on-surface-variant)">
                  Sugestão enviada. Ela entra na fila da curadoria.
                </p>
              ) : null}
              <Botao disabled={enviando} onClick={() => void enviarSugestao()}>
                {enviando ? "Enviando…" : "Enviar sugestão"}
              </Botao>
            </Formulario>
          ) : (
            <p className="text-sm text-(--on-surface-variant)">
              Esta referência ainda não tem ficha publicada para atualizar.
            </p>
          )}
        </section>
      ) : null}
    </div>
  )
}
