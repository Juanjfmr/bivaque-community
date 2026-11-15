"use client"

import { useEffect, useState } from "react"

import { Botao } from "@/components/bivaque/botao"
import { Campo, Selecao } from "@/components/bivaque/campos"
import { Secao } from "@/components/bivaque/secao"
import type { CidadeDoCatalogo, PerfilDaPessoa } from "@/lib/dados/voce"
import {
  carregarEstados,
  carregarMunicipios,
  DIAS_MAXIMOS_DE_SAIDA,
  dataLegivel,
  hojeIso,
  type Municipio,
  prazoMaximo,
  prazoPadrao,
} from "@/lib/voce/cidade"

/** O que o formulário entrega para a confirmação: id de cidade, prazo e o nome. */
export type PedidoDeMudanca = Readonly<{ destino: string; prazo: string; nome: string }>

/**
 * O `Select` da base não aceita item de valor vazio, e o campo precisa de um
 * estado "nada escolhido" de verdade (a pessoa chega sem UF). A sentinela nunca
 * sai daqui: o pedido só é montado com id de cidade do catálogo.
 */
const SEM_ESCOLHA = "escolher"

/**
 * "Sua cidade" (F10 / RUN-170): a cidade atual, o estado de saída e o formulário
 * de mudança.
 *
 * A mudança é a transferência que o banco já tem (`declare_locality_transfer`,
 * ADR-20260816): a cidade de hoje vira "de saída" até a data escolhida e a nova
 * passa a valer. Enquanto existe saída, NÃO há formulário — o banco só aceita
 * uma por vez e a tela diz isso em vez de deixar a pessoa preencher para receber
 * uma recusa. Não existe desfazer: `reverse_locality_transfer` é hatch de
 * suporte, não produto (ADR-20261116).
 *
 * O formulário não conhece HTTP: quem grava é a tela "Você", depois da
 * confirmação.
 */
export function Cidade({
  perfil,
  destinoInicial,
  pendente,
  mensagem,
  aoPedirMudanca,
}: {
  readonly perfil: PerfilDaPessoa
  /** Destino que o endereço trouxe (`?mudar=<id>`), já resolvido. */
  readonly destinoInicial: CidadeDoCatalogo | null
  readonly pendente: boolean
  readonly mensagem: string | null
  readonly aoPedirMudanca: (pedido: PedidoDeMudanca) => void
}) {
  const [uf, setUf] = useState(destinoInicial?.uf ?? SEM_ESCOLHA)
  const [estados, setEstados] = useState<readonly string[] | null>(null)
  const [municipios, setMunicipios] = useState<readonly Municipio[] | null>(null)
  const [destino, setDestino] = useState(destinoInicial?.id ?? SEM_ESCOLHA)
  const [prazo, setPrazo] = useState(() => prazoPadrao(new Date()))
  const [falhaDoCatalogo, setFalhaDoCatalogo] = useState(false)
  const [tentativa, setTentativa] = useState(0)
  const saida = perfil.outbound

  // biome-ignore lint/correctness/useExhaustiveDependencies: tentativa é o "Tentar de novo"
  useEffect(() => {
    let cancelado = false
    setFalhaDoCatalogo(false)
    carregarEstados()
      .then((lidos) => {
        if (!cancelado) setEstados(lidos)
      })
      .catch(() => {
        if (!cancelado) setFalhaDoCatalogo(true)
      })
    return () => {
      cancelado = true
    }
  }, [tentativa])

  useEffect(() => {
    if (uf === SEM_ESCOLHA) {
      setMunicipios(null)
      return
    }
    let cancelado = false
    setMunicipios(null)
    carregarMunicipios(uf)
      .then((lidos) => {
        if (!cancelado) setMunicipios(lidos)
      })
      .catch(() => {
        if (!cancelado) setFalhaDoCatalogo(true)
      })
    return () => {
      cancelado = true
    }
  }, [uf])

  const escolhido = municipios?.find((cidade) => cidade.id === destino) ?? null

  return (
    <Secao titulo="Sua cidade">
      <p className="text-sm text-(--on-surface-variant)">
        Sua cidade é <b className="text-(--on-surface)">{perfil.cidade.nome}</b>.
      </p>

      {saida === null ? null : (
        <p
          data-aviso="saindo"
          className="rounded-2xl bg-(--surface-lowest) px-4 py-3 text-sm ring-1 ring-(--outline-variant)"
        >
          {saida.readOnly
            ? `Você não participa mais de ${saida.nome}. A sua cidade agora é ${perfil.cidade.nome}.`
            : `Você está saindo de ${saida.nome}${saida.uf === "" ? "" : `, ${saida.uf}`}${
                saida.endsAt === "" ? "" : ` — participa de lá até ${dataLegivel(saida.endsAt)}`
              }. Uma nova mudança fica disponível depois desse prazo.`}
        </p>
      )}

      {saida !== null ? null : (
        <form
          className="grid gap-3"
          onSubmit={(evento) => {
            evento.preventDefault()
            if (escolhido === null) return
            aoPedirMudanca({ destino: escolhido.id, prazo, nome: escolhido.nome })
          }}
        >
          <p className="text-sm text-(--on-surface-variant)">
            Mudar de cidade avisa até quando você ainda participa de {perfil.cidade.nome}. Até essa
            data você ainda lê e publica aqui; depois disso, fica só leitura.
          </p>
          {falhaDoCatalogo ? (
            <div className="flex items-center justify-between gap-2">
              <p role="alert" className="text-sm text-(--destructive)">
                Não foi possível carregar a lista de cidades.
              </p>
              <Botao tom="texto" type="button" onClick={() => setTentativa((n) => n + 1)}>
                Tentar de novo
              </Botao>
            </div>
          ) : null}
          <Selecao
            id="mudar-uf"
            rotulo="Estado"
            valor={uf}
            aoMudar={(novo) => {
              setUf(novo)
              setDestino(SEM_ESCOLHA)
            }}
            opcoes={[
              { valor: SEM_ESCOLHA, titulo: "Escolha o estado" },
              ...(estados ?? []).map((sigla) => ({ valor: sigla, titulo: sigla })),
            ]}
          />
          <Selecao
            id="mudar-cidade"
            rotulo="Cidade"
            valor={destino}
            aoMudar={setDestino}
            opcoes={[
              {
                valor: SEM_ESCOLHA,
                titulo:
                  uf === SEM_ESCOLHA
                    ? "Escolha o estado primeiro"
                    : municipios === null
                      ? "Carregando cidades…"
                      : "Escolha a cidade",
              },
              ...(municipios ?? []).map((cidade) => ({ valor: cidade.id, titulo: cidade.nome })),
            ]}
          />
          <Campo
            id="mudar-prazo"
            rotulo={`Até quando você participa de ${perfil.cidade.nome}?`}
            valor={prazo}
            aoMudar={setPrazo}
            type="date"
            min={hojeIso(new Date())}
            max={prazoMaximo(new Date())}
            nota={`O prazo máximo é de ${DIAS_MAXIMOS_DE_SAIDA} dias a partir de hoje. Só a cidade: o Bivaque não pede nem guarda o seu endereço.`}
          />
          {mensagem === null ? null : (
            <p role="alert" className="text-sm text-(--destructive)">
              {mensagem}
            </p>
          )}
          <div className="flex justify-end">
            <Botao type="submit" disabled={pendente || escolhido === null}>
              {pendente ? "Mudando…" : "Mudar de cidade"}
            </Botao>
          </div>
        </form>
      )}
    </Secao>
  )
}
