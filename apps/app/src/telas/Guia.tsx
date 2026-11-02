"use client"

import { useEffect, useState } from "react"

import { Botao } from "@/components/bivaque/botao"
import { CabecaDePagina } from "@/components/bivaque/cabeca-de-pagina"
import { ChipsDeFiltro, type ItemDeFiltro } from "@/components/bivaque/chips-de-filtro"
import { Secao } from "@/components/bivaque/secao"
import { useNavegacao, useRolagemEFoco } from "@/lib/navegacao/react"
import { CARGA_CONCLUIDA } from "@/lib/navegacao/restauracao"
import { useCasca } from "@/src/contexto/casca"
import { BAIRROS_MANAUS, OMS_MANAUS } from "@/src/telas/dados-da-guarnicao"

const FILTROS: readonly ItemDeFiltro[] = [
  { id: "todas", rotulo: "Todas" },
  { id: "FAB", rotulo: "Aeronáutica" },
  { id: "EB", rotulo: "Exército" },
  { id: "MB", rotulo: "Marinha" },
]
const TAREFAS = [
  "Confirmar a OM de destino e contatos administrativos",
  "Comparar bairros, trajetos e condições dos imóveis",
  "Consultar instituições de ensino e disponibilidade de vagas",
  "Solicitar orçamentos de mudança com o mesmo inventário",
  "Identificar serviços de saúde e necessidades da família",
] as const

function lerMarcadas(cidade: string): string[] {
  try {
    const item = window.localStorage.getItem("bivaque-guia-chegada-" + cidade)
    if (!item) return []
    const valor: unknown = JSON.parse(item)
    return Array.isArray(valor)
      ? valor.filter(
          (v) => typeof v === "string" && TAREFAS.includes(v as (typeof TAREFAS)[number]),
        )
      : []
  } catch {
    return []
  }
}
export function Guia() {
  const { cidade } = useCasca()
  const navegacao = useNavegacao()
  const [forca, setForca] = useState("todas")
  const [marcadas, setMarcadas] = useState<ReadonlySet<string>>(() => new Set(lerMarcadas(cidade)))
  const manaus = cidade.toLocaleLowerCase("pt-BR") === "manaus"
  useRolagemEFoco(CARGA_CONCLUIDA)

  useEffect(() => {
    setMarcadas(new Set(lerMarcadas(cidade)))
  }, [cidade])

  const alternar = (titulo: string) => {
    const proximo = new Set(marcadas)
    if (proximo.has(titulo)) proximo.delete(titulo)
    else proximo.add(titulo)
    setMarcadas(proximo)
    try {
      window.localStorage.setItem("bivaque-guia-chegada-" + cidade, JSON.stringify([...proximo]))
    } catch {
      // Falha de armazenamento não impede o checklist nesta sessão.
    }
  }

  return (
    <section data-tela="guia" className="grid min-w-0 gap-2">
      <CabecaDePagina
        titulo={"Guia de " + cidade}
        subtitulo="Moradia, serviços e organizações militares para organizar sua chegada."
      />

      {manaus ? (
        <>
          <Secao
            titulo="Escolha uma região para morar"
            acoes={
              <Botao tom="texto" onClick={() => void navegacao.irPara("imoveis")}>
                Ver imóveis
              </Botao>
            }
          >
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {BAIRROS_MANAUS.map((bairro) => (
                <article
                  key={bairro.nome}
                  className="min-w-0 rounded-2xl bg-(--surface-lowest) p-4 ring-1 ring-(--outline-variant)"
                >
                  <h3 className="font-semibold">{bairro.nome}</h3>
                  <p className="mt-1 text-sm text-(--on-surface-variant)">{bairro.apoio}</p>
                </article>
              ))}
            </div>
            <p className="text-xs text-(--on-surface-variant)">
              Valores de aluguel devem vir dos anúncios ativos; não há média de bairro homologada
              nesta versão.
            </p>
          </Secao>

          <Secao titulo="Organizações militares da cidade">
            <p className="text-sm text-(--on-surface-variant)">
              Recorte documental do catálogo nacional em auditoria. Endereço textual não significa
              acesso ou coordenada homologados.
            </p>
            <ChipsDeFiltro
              itens={FILTROS}
              valor={forca}
              aoEscolher={setForca}
              rotulo="Filtrar organizações militares por Força"
            />
            <div className="grid gap-2 md:grid-cols-2">
              {OMS_MANAUS.filter((om) => forca === "todas" || om.forca === forca).map((om) => (
                <article
                  key={om.id}
                  className="grid gap-2 rounded-2xl bg-(--surface-lowest) p-4 ring-1 ring-(--outline-variant)"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-semibold leading-5">{om.sigla}</h3>
                    <span className="shrink-0 rounded-lg bg-(--secondary-container) px-2 py-1 text-xs text-(--on-secondary-container)">
                      {om.forca}
                    </span>
                  </div>
                  <p className="text-sm">{om.nome}</p>
                  {om.bairro ? (
                    <p className="text-sm text-(--on-surface-variant)">
                      Região documental: {om.bairro}
                    </p>
                  ) : null}
                  <p className="text-xs text-(--on-surface-variant)">{om.status}</p>
                  <a
                    href={om.fonte}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-h-11 self-start py-2 text-sm font-semibold underline underline-offset-4"
                  >
                    Consultar fonte institucional
                  </a>
                </article>
              ))}
            </div>
          </Secao>
        </>
      ) : (
        <Secao titulo="Informações da cidade">
          <p className="text-sm text-(--on-surface-variant)">
            O conteúdo documental desta cidade ainda não foi verificado. Consulte a moradia e as
            indicações disponíveis.
          </p>
          <Botao tom="texto" onClick={() => void navegacao.irPara("imoveis")}>
            Ver imóveis
          </Botao>
        </Secao>
      )}

      <Secao titulo="Escolas, saúde e serviços">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl bg-(--surface-lowest) p-4 ring-1 ring-(--outline-variant)">
            <h3 className="font-semibold">Educação e saúde</h3>
            <p className="mt-1 text-sm text-(--on-surface-variant)">
              Consulte a comunidade sobre escolas, pediatras e atendimento. Confirme vagas e
              cobertura diretamente com cada instituição.
            </p>
            <Botao tom="texto" onClick={() => void navegacao.irPara("comunidade")}>
              Pedir indicação
            </Botao>
          </div>
          <div className="rounded-2xl bg-(--surface-lowest) p-4 ring-1 ring-(--outline-variant)">
            <h3 className="font-semibold">Profissionais da cidade</h3>
            <p className="mt-1 text-sm text-(--on-surface-variant)">
              Compare prestadores indicados, leia relatos e peça propostas pelo Bivaque.
            </p>
            <Botao tom="texto" onClick={() => void navegacao.irPara("negocios")}>
              Encontrar serviços
            </Botao>
          </div>
        </div>
      </Secao>

      <Secao titulo="Checklist de chegada">
        <p className="text-sm text-(--on-surface-variant)">
          {marcadas.size} de {TAREFAS.length} etapas marcadas neste navegador.
        </p>
        <div className="grid gap-1 rounded-2xl bg-(--surface-lowest) p-3 ring-1 ring-(--outline-variant)">
          {TAREFAS.map((tarefa) => (
            <label
              key={tarefa}
              className="flex min-h-12 items-center gap-3 border-b border-(--outline-variant) py-2 last:border-b-0"
            >
              <input
                type="checkbox"
                checked={marcadas.has(tarefa)}
                onChange={() => alternar(tarefa)}
                className="size-5 shrink-0 accent-(--on-surface)"
              />
              <span className="text-sm">{tarefa}</span>
            </label>
          ))}
        </div>
      </Secao>
    </section>
  )
}
