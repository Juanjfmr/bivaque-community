"use client"

import { useEffect, useState } from "react"

import { Botao } from "@/components/bivaque/botao"
import { Campo, Formulario } from "@/components/bivaque/campos"
import { EsqueletoDeLista } from "@/components/bivaque/esqueleto"
import { EstadoDeErro, EstadoVazio } from "@/components/bivaque/estado-vazio"
import { Etiqueta } from "@/components/bivaque/etiqueta"
import { Icone } from "@/components/bivaque/icone"
import {
  type CorrecaoDoGuia,
  lerMinhasCorrecoes,
  lerVerbete,
  marcarNoGuia,
  sugerirAtualizacao,
  type VerbeteDoGuia,
} from "@/lib/dados/guia"
import { EstadoDeSessaoVencida, EstadoNegado } from "@/src/eventos/EstadosDeAcesso"
import {
  acessoNegado,
  mensagemDaFalha,
  naoEncontrado,
  sessaoVencida,
  validarSugestao,
} from "@/src/guia/comum"

/**
 * O verbete do Guia (F08), na tela própria `/app/guia/<id>`.
 *
 * Lê a referência pela rota do app — a tela nunca recebe o caminho cru do
 * banco. Salvar e sugerir mostram o que ficou gravado: o marcador só muda
 * depois da resposta, e a sugestão só limpa o texto depois do 201. Falha
 * devolve o estado anterior com a frase do motivo.
 *
 * "Minhas sugestões" é o acompanhamento do que a pessoa enviou: a curadoria
 * decide fora do app, e aqui ela vê em que pé ficou. A lista recarrega depois do
 * envio — o que a fila mostra é o que o banco gravou.
 */
export function Verbete({ id }: { readonly id: string }) {
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

  const [correcoes, setCorrecoes] = useState<readonly CorrecaoDoGuia[] | null>(null)
  const [erroDasCorrecoes, setErroDasCorrecoes] = useState(false)
  const [rodadaDasCorrecoes, setRodadaDasCorrecoes] = useState(0)

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

  const podeSugerir = verbete?.podeSugerir === true

  // O acompanhamento só existe onde a sugestão tem onde pousar: sem artigo
  // publicado não há fila para esta referência.
  // biome-ignore lint/correctness/useExhaustiveDependencies: rodada é o pedido de carregar de novo
  useEffect(() => {
    if (!podeSugerir) return
    const controle = new AbortController()
    setCorrecoes(null)
    setErroDasCorrecoes(false)
    void lerMinhasCorrecoes(id, { signal: controle.signal })
      .then((lidas) => {
        if (!controle.signal.aborted) setCorrecoes(lidas)
      })
      .catch(() => {
        if (!controle.signal.aborted) setErroDasCorrecoes(true)
      })
    return () => controle.abort()
  }, [id, podeSugerir, rodadaDasCorrecoes])

  async function alternarSalvo() {
    if (verbete === null || ocupado) return
    setOcupado(true)
    setAviso(null)
    const alvo = !verbete.entrada.salvo
    try {
      const salvo = await marcarNoGuia(id, alvo)
      setVerbete({ ...verbete, entrada: { ...verbete.entrada, salvo } })
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
      setRodadaDasCorrecoes((atual) => atual + 1)
    } catch (falha: unknown) {
      setErroDaSugestao(
        mensagemDaFalha(falha, "Não foi possível enviar a sugestão. Seu texto foi mantido."),
      )
    } finally {
      setEnviando(false)
    }
  }

  // Um `h1` só, em todo estado: o nome da referência quando ela chegou e o
  // título da rota enquanto carrega ou quando a leitura falhou. É o mesmo
  // cabeçalho que a web mostrava no lugar de "Referência" repetido.
  return (
    <div data-verbete="guia" className="grid gap-4">
      <h1 id="titulo-da-tela" data-titulo-da-tela tabIndex={-1} className="text-[22px] leading-7">
        {verbete?.entrada.nome ?? "Referência"}
      </h1>
      {erro === "sessao" ? (
        <EstadoDeSessaoVencida />
      ) : erro === "negado" ? (
        <EstadoNegado texto="O guia é de quem mora na cidade." />
      ) : erro === "ausente" ? (
        <EstadoVazio
          titulo="Referência não encontrada"
          texto="Ela saiu do guia ou o endereço está errado."
        />
      ) : erro === "falhou" ? (
        <EstadoDeErro aoTentar={() => setRodada((atual) => atual + 1)} />
      ) : verbete === null ? (
        <EsqueletoDeLista linhas={3} />
      ) : (
        <>
          {verbete.entrada.descricao === "" ? null : (
            <p className="text-sm text-(--on-surface-variant)">{verbete.entrada.descricao}</p>
          )}

          {verbete.entrada.telefone === null ? null : (
            <a
              href={`tel:${verbete.entrada.telefone.replace(/[^\d+]/g, "")}`}
              className="inline-flex min-h-11 items-center gap-2 text-sm text-(--primary)"
            >
              <Icone nome="support" className="size-5" />
              {verbete.entrada.telefone}
            </a>
          )}
          {verbete.entrada.site === null ? null : (
            <a
              href={verbete.entrada.site}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center gap-2 text-sm text-(--primary)"
            >
              <Icone nome="open_in_new" className="size-5" />
              Visitar o site
            </a>
          )}

          <div className="flex flex-wrap items-center gap-2">
            {verbete.podeSalvar ? (
              <Botao
                tom="tonal"
                icone={verbete.entrada.salvo ? "bookmark" : "bookmark_border"}
                disabled={ocupado}
                onClick={() => void alternarSalvo()}
              >
                {verbete.entrada.salvo ? "Salvo no seu guia" : "Salvar no seu guia"}
              </Botao>
            ) : (
              <p className="text-sm text-(--on-surface-variant)">
                Esta referência é de outra cidade. Salvar e sugerir ficam no guia da cidade em que
                você mora.
              </p>
            )}
            {aviso === null ? null : (
              <p role="status" className="text-sm text-(--on-surface-variant)">
                {aviso}
              </p>
            )}
          </div>

          {verbete.podeSalvar ? (
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

          {podeSugerir ? (
            <section data-correcoes="minhas" className="grid gap-2">
              <h3 className="text-[17px]">Minhas sugestões</h3>
              {erroDasCorrecoes ? (
                <EstadoDeErro
                  titulo="Não foi possível carregar suas sugestões"
                  aoTentar={() => setRodadaDasCorrecoes((atual) => atual + 1)}
                />
              ) : correcoes === null ? (
                <EsqueletoDeLista linhas={2} />
              ) : correcoes.length === 0 ? (
                <p className="text-sm text-(--on-surface-variant)">
                  Você ainda não sugeriu nenhuma atualização para esta referência.
                </p>
              ) : (
                <ul className="grid gap-2">
                  {correcoes.map((sugestao) => (
                    <li
                      key={sugestao.id}
                      data-correcao="minha"
                      className="grid justify-items-start gap-1 rounded-xl bg-(--surface-lowest) p-3 ring-1 ring-(--outline-variant)"
                    >
                      <Etiqueta tom="neutro">{sugestao.status}</Etiqueta>
                      <p className="whitespace-pre-wrap break-words text-sm">
                        {sugestao.descricao}
                      </p>
                      {sugestao.decisao === null ? null : (
                        <p className="text-sm text-(--on-surface-variant)">{sugestao.decisao}</p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : null}
        </>
      )}
    </div>
  )
}
