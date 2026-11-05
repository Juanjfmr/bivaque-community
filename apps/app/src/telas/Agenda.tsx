"use client"

import { useEffect, useMemo, useState } from "react"

import { Botao } from "@/components/bivaque/botao"
import { CabecaDePagina } from "@/components/bivaque/cabeca-de-pagina"
import { EsqueletoDeLista } from "@/components/bivaque/esqueleto"
import { EstadoDeErro, EstadoVazio } from "@/components/bivaque/estado-vazio"
import { LinhaDeLista, Lista } from "@/components/bivaque/lista"
import { type AgendaDaCidade, lerAgenda } from "@/lib/dados/eventos"
import { useNavegacao, useRolagemEFoco } from "@/lib/navegacao/react"
import { CARGA_CONCLUIDA } from "@/lib/navegacao/restauracao"
import { useCasca } from "@/src/contexto/casca"
import { EstadoDeSessaoVencida, EstadoNegado } from "@/src/eventos/EstadosDeAcesso"
import { FormularioDeEncontro } from "@/src/eventos/FormularioDeEncontro"
import { acessoNegado, mensagemDaFalha, sessaoVencida } from "@/src/eventos/formulario"

/**
 * A agenda da cidade, do banco (F05 / ADR-20261105).
 *
 * O desenho não mudou: encontros futuros agrupados por dia. Mudou de onde vem o
 * dado — `lib/dados/eventos`, que fala com `/api/app/eventos` — e por isso a
 * tela distingue carregando, vazio de verdade, falha recuperável, sessão
 * vencida e acesso negado. Banco fora não vira "nenhum encontro".
 *
 * A paginação é por cursor: quando o servidor devolve `proximo`, a lista mostra
 * "Ver mais encontros" em vez de cortar o resto em silêncio.
 */
export function Agenda() {
  const casca = useCasca()
  const navegacao = useNavegacao()
  const [dados, setDados] = useState<AgendaDaCidade | null>(null)
  const [erro, setErro] = useState<"falhou" | "sessao" | "negado" | null>(null)
  const [rodada, setRodada] = useState(0)
  const [criando, setCriando] = useState(false)
  const [carregandoMais, setCarregandoMais] = useState(false)
  const [erroAoCarregarMais, setErroAoCarregarMais] = useState<string | null>(null)

  useRolagemEFoco(CARGA_CONCLUIDA)

  // biome-ignore lint/correctness/useExhaustiveDependencies: rodada é o pedido de "tentar de novo"
  useEffect(() => {
    const controle = new AbortController()
    setDados(null)
    setErro(null)
    void lerAgenda({ signal: controle.signal })
      .then((lidos) => {
        if (!controle.signal.aborted) setDados(lidos)
      })
      .catch((falha: unknown) => {
        if (controle.signal.aborted) return
        setErro(sessaoVencida(falha) ? "sessao" : acessoNegado(falha) ? "negado" : "falhou")
      })
    return () => controle.abort()
  }, [rodada])

  const dias = useMemo(() => (dados === null ? [] : agruparPorDia(dados.encontros)), [dados])

  async function carregarMais() {
    if (dados === null || dados.proximo === null || carregandoMais) return
    setCarregandoMais(true)
    setErroAoCarregarMais(null)
    try {
      const proxima = await lerAgenda({ depois: dados.proximo })
      setDados({
        encontros: [...dados.encontros, ...proxima.encontros],
        proximo: proxima.proximo,
      })
    } catch (falha: unknown) {
      setErroAoCarregarMais(mensagemDaFalha(falha, "agenda"))
    } finally {
      setCarregandoMais(false)
    }
  }

  const carregando = dados === null && erro === null

  return (
    <section data-tela="agenda" className="grid gap-2">
      <CabecaDePagina
        titulo="Agenda da cidade"
        subtitulo={`Encontros da comunidade de ${casca.cidade}.`}
        acao={
          carregando ? undefined : (
            <Botao tom="tonal" icone="add" onClick={() => setCriando(true)}>
              Criar encontro
            </Botao>
          )
        }
      />

      {erro === "sessao" ? (
        <EstadoDeSessaoVencida />
      ) : erro === "negado" ? (
        <EstadoNegado texto="Sua conta não tem acesso à agenda desta cidade." />
      ) : erro === "falhou" ? (
        <EstadoDeErro aoTentar={() => setRodada((atual) => atual + 1)} />
      ) : carregando ? (
        <EsqueletoDeLista linhas={4} />
      ) : dias.length === 0 ? (
        <EstadoVazio
          titulo="Nenhum encontro agendado"
          texto="Os próximos encontros aparecerão aqui."
          icone="event"
          acao={{ rotulo: "Criar o primeiro", aoAcionar: () => setCriando(true) }}
        />
      ) : (
        <>
          {dias.map((dia) => (
            <section key={dia.chave} className="grid gap-2">
              <h2 className="px-1 text-[15px] font-semibold">{rotuloDoDia(dia.chave)}</h2>
              <Lista>
                {dia.itens.map((evento) => (
                  <LinhaDeLista
                    key={evento.id}
                    icone="event"
                    titulo={evento.titulo}
                    subtitulo={subtituloDoEncontro(evento.comecaEm, evento.local)}
                    onClick={() =>
                      void navegacao.irPara("evento", { parametros: { id: evento.id } })
                    }
                  />
                ))}
              </Lista>
            </section>
          ))}
          {dados !== null && dados.proximo === null ? null : (
            <div className="grid justify-items-center gap-2 pt-2">
              {erroAoCarregarMais === null ? null : (
                <p role="alert" className="text-sm text-(--destructive)">
                  {erroAoCarregarMais}
                </p>
              )}
              <Botao tom="contornado" disabled={carregandoMais} onClick={() => void carregarMais()}>
                {carregandoMais ? "Carregando…" : "Ver mais encontros"}
              </Botao>
            </div>
          )}
        </>
      )}

      {criando ? (
        <FormularioDeEncontro
          aoFechar={() => setCriando(false)}
          aoSalvar={(id) => {
            setCriando(false)
            void navegacao.irPara("evento", { parametros: { id } })
          }}
        />
      ) : null}
    </section>
  )
}

type EncontroNaAgenda = AgendaDaCidade["encontros"][number]

/** Futuros primeiro, agrupados pelo dia local de quem está usando o app. */
function agruparPorDia(
  encontros: AgendaDaCidade["encontros"],
): readonly { chave: string; itens: readonly EncontroNaAgenda[] }[] {
  const inicioDeHoje = new Date()
  inicioDeHoje.setHours(0, 0, 0, 0)
  const futuros = encontros
    .map((evento) => ({ evento, quando: new Date(evento.comecaEm).getTime() }))
    .filter(({ quando }) => Number.isFinite(quando) && quando >= inicioDeHoje.getTime())
    .sort((a, b) => a.quando - b.quando)

  const agrupados: { chave: string; itens: EncontroNaAgenda[] }[] = []
  for (const { evento, quando } of futuros) {
    const chave = chaveLocal(new Date(quando))
    const ultimo = agrupados[agrupados.length - 1]
    if (ultimo?.chave === chave) ultimo.itens.push(evento)
    else agrupados.push({ chave, itens: [evento] })
  }
  return agrupados
}

function chaveLocal(data: Date): string {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-${String(data.getDate()).padStart(2, "0")}`
}

function rotuloDoDia(chave: string): string {
  const hoje = new Date()
  const amanha = new Date(hoje.getTime() + 86_400_000)
  if (chave === chaveLocal(hoje)) return "Hoje"
  if (chave === chaveLocal(amanha)) return "Amanhã"
  const data = new Date(`${chave}T12:00:00`)
  const extenso = data.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })
  return extenso.charAt(0).toUpperCase() + extenso.slice(1)
}

function subtituloDoEncontro(comecaEm: string, local: string | null): string {
  const data = new Date(comecaEm)
  if (Number.isNaN(data.getTime())) return local ?? ""
  const hora = data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
  return local === null ? hora : `${hora} · ${local}`
}
