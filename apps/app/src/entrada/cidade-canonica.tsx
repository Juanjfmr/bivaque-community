import { useCallback, useEffect, useRef, useState } from "react"
import {
  Botao,
  Campo,
  CampoDeEscolha,
  EscolhaIlustrada,
  Nota,
  type OpcaoIlustrada,
} from "@/src/pecas/pecas"
import type { Momento, Progresso } from "@/src/previa-f01/fluxo"
import { Moldura } from "@/src/previa-f01/moldura"
import { type CampoDaCidade, montarEscolhaDaCidade } from "./cidade-canonica-regras"
import { type ServidorDaEntrada, useServidorDaEntrada } from "./contexto"
import type { CidadeDoCatalogo } from "./servidor"

export { montarEscolhaDaCidade } from "./cidade-canonica-regras"

/**
 * "Onde você está?" de produção (lote B do F01).
 *
 * A etapa aprovada na prévia pedia cidade e momento como texto. Esta versão
 * fala com o catálogo canônico pelo servidor real: a UF e a cidade vêm das
 * rotas públicas de localidades, e o que segue para o rascunho é o código IBGE,
 * o momento do fluxo e a data de calendário em `YYYY-MM-DD`. Quem está de saída
 * ainda escolhe o destino no mesmo catálogo.
 *
 * Sem servidor real não há etapa: a tela avisa em vez de fingir uma lista.
 */

export type Props = {
  progresso: Progresso
  concluir: (mudancas?: Partial<Progresso>) => void
}

const MOMENTOS: readonly OpcaoIlustrada<Momento>[] = [
  { valor: "chegando", rotulo: "Chegando", selo: "chegadas" },
  { valor: "morando", rotulo: "Moro aqui", selo: "morando" },
  { valor: "saindo", rotulo: "Saindo", selo: "saindo" },
]

type SituacaoDaLista = "ociosa" | "carregando" | "pronta" | "vazia" | "erro"

/**
 * Os estados do servidor, uma vez por montagem; `tentarDeNovo` refaz a chamada.
 * O número do pedido descarta resposta antiga que chegue fora de ordem.
 */
function useEstados(servidor: ServidorDaEntrada | null) {
  const [situacao, setSituacao] = useState<SituacaoDaLista>("ociosa")
  const [ufs, setUfs] = useState<readonly string[]>([])
  const pedido = useRef(0)

  const carregar = useCallback(async () => {
    if (servidor === null) return
    const atual = pedido.current + 1
    pedido.current = atual
    setSituacao("carregando")
    try {
      const lista = await servidor.carregarEstados()
      if (atual !== pedido.current) return
      setUfs(lista)
      setSituacao(lista.length === 0 ? "vazia" : "pronta")
    } catch {
      if (atual === pedido.current) setSituacao("erro")
    }
  }, [servidor])

  useEffect(() => {
    void carregar()
  }, [carregar])

  return { situacao, ufs, tentarDeNovo: carregar }
}

/**
 * As cidades de uma UF. A lista anterior some ao trocar de UF, para nenhuma
 * opção de outro estado aparecer como se fosse desta.
 */
function useCidades(servidor: ServidorDaEntrada | null, uf: string) {
  const [situacao, setSituacao] = useState<SituacaoDaLista>("ociosa")
  const [cidades, setCidades] = useState<readonly CidadeDoCatalogo[]>([])
  const pedido = useRef(0)

  const carregar = useCallback(async () => {
    if (servidor === null) return
    const atual = pedido.current + 1
    pedido.current = atual
    if (uf === "") {
      setCidades([])
      setSituacao("ociosa")
      return
    }
    setCidades([])
    setSituacao("carregando")
    try {
      const lista = await servidor.carregarCidades(uf)
      if (atual !== pedido.current) return
      setCidades(lista)
      setSituacao(lista.length === 0 ? "vazia" : "pronta")
    } catch {
      if (atual === pedido.current) setSituacao("erro")
    }
  }, [servidor, uf])

  useEffect(() => {
    void carregar()
  }, [carregar])

  return { situacao, cidades, tentarDeNovo: carregar }
}

/** Falha de catálogo é recuperável: a pessoa tenta de novo em vez de ver lista vazia. */
function ErroDaLista({ texto, aoTentarDeNovo }: { texto: string; aoTentarDeNovo: () => void }) {
  return (
    <>
      <Nota icone="error" role="alert">
        {texto}
      </Nota>
      <Botao tom="contorno" onClick={aoTentarDeNovo}>
        Tentar de novo
      </Botao>
    </>
  )
}

/** O select de cidades de uma UF, com carregando, vazio e erro distinguidos. */
function EscolhaDeCidade({
  rotulo,
  uf,
  situacao,
  cidades,
  cidadeIbge,
  erro,
  aoEscolher,
  aoTentarDeNovo,
}: {
  rotulo: string
  uf: string
  situacao: SituacaoDaLista
  cidades: readonly CidadeDoCatalogo[]
  cidadeIbge: string
  erro: string | null
  aoEscolher: (codigoIbge: string) => void
  aoTentarDeNovo: () => void
}) {
  if (situacao === "erro") {
    return (
      <ErroDaLista
        texto={
          uf === ""
            ? "Não foi possível carregar as cidades. Verifique a conexão."
            : `Não foi possível carregar as cidades de ${uf}. Verifique a conexão.`
        }
        aoTentarDeNovo={aoTentarDeNovo}
      />
    )
  }
  if (situacao === "vazia") {
    return (
      <ErroDaLista
        texto={
          uf === ""
            ? "O catálogo não devolveu nenhuma cidade."
            : `O catálogo não devolveu nenhuma cidade de ${uf}.`
        }
        aoTentarDeNovo={aoTentarDeNovo}
      />
    )
  }
  return (
    <>
      {situacao === "carregando" ? (
        <p className="pc-apoio" role="status">
          Carregando cidades…
        </p>
      ) : null}
      <CampoDeEscolha
        rotulo={rotulo}
        value={cidadeIbge}
        disabled={situacao !== "pronta"}
        erro={erro}
        opcoes={cidades.map((cidade) => ({ valor: cidade.ibgeCode, rotulo: cidade.cityName }))}
        onChange={(evento) => aoEscolher(evento.target.value)}
      />
    </>
  )
}

export function CidadeEMomentoCanonica({ progresso, concluir }: Props) {
  const servidor = useServidorDaEntrada()
  const estados = useEstados(servidor)
  const [uf, setUf] = useState("")
  const cidades = useCidades(servidor, uf)
  const [cidadeIbge, setCidadeIbge] = useState(progresso.cidadeIbge ?? "")
  const [momento, setMomento] = useState<Momento | "">(progresso.momento ?? "")
  const [dataChegada, setDataChegada] = useState(progresso.dataChegada ?? "")
  const [dataSaida, setDataSaida] = useState(progresso.dataSaida ?? "")
  const [ufDestino, setUfDestino] = useState("")
  const cidadesDeDestino = useCidades(servidor, momento === "saindo" ? ufDestino : "")
  const [destinoIbge, setDestinoIbge] = useState(progresso.destinoIbge ?? "")
  const [problema, setProblema] = useState<{ campo: CampoDaCidade; texto: string } | null>(null)

  if (servidor === null) {
    return (
      <Moldura titulo="Onde você está?">
        <Nota icone="info">
          Esta etapa carrega as cidades do catálogo do Bivaque. Sem a conexão com o servidor não é
          possível escolher a cidade. Recarregue a página para tentar de novo.
        </Nota>
      </Moldura>
    )
  }

  const erroDe = (campo: CampoDaCidade): string | null =>
    problema?.campo === campo ? problema.texto : null

  const mudarUf = (valor: string) => {
    setUf(valor)
    setCidadeIbge("")
    setProblema(null)
  }

  const mudarMomento = (valor: Momento) => {
    setMomento(valor)
    setProblema(null)
    if (valor !== "chegando") setDataChegada("")
    if (valor !== "saindo") {
      setDataSaida("")
      setUfDestino("")
      setDestinoIbge("")
    }
  }

  const enviar = () => {
    const cidade = cidades.cidades.find((item) => item.ibgeCode === cidadeIbge)
    const resultado = montarEscolhaDaCidade({
      uf,
      cidadeIbge,
      cidadeNome: cidade?.cityName ?? "",
      momento,
      dataChegada,
      dataSaida,
      destinoIbge,
    })
    if (!resultado.ok) {
      setProblema({ campo: resultado.campo, texto: resultado.texto })
      return
    }
    setProblema(null)
    concluir(resultado.mudancas)
  }

  const dataDeHoje = new Date().toISOString().slice(0, 10)

  return (
    <Moldura titulo="Onde você está?" aoEnviar={enviar} acao={{ rotulo: "Continuar" }}>
      {estados.situacao === "pronta" ? (
        <CampoDeEscolha
          rotulo="Estado (UF)"
          value={uf}
          erro={erroDe("uf")}
          opcoes={estados.ufs.map((sigla) => ({ valor: sigla, rotulo: sigla }))}
          onChange={(evento) => mudarUf(evento.target.value)}
        />
      ) : estados.situacao === "erro" ? (
        <ErroDaLista
          texto="Não foi possível carregar os estados. Verifique a conexão."
          aoTentarDeNovo={estados.tentarDeNovo}
        />
      ) : estados.situacao === "vazia" ? (
        <ErroDaLista
          texto="O catálogo não devolveu nenhum estado."
          aoTentarDeNovo={estados.tentarDeNovo}
        />
      ) : (
        <p className="pc-apoio" role="status">
          Carregando estados…
        </p>
      )}

      {estados.situacao === "pronta" ? (
        <EscolhaDeCidade
          rotulo="Cidade"
          uf={uf}
          situacao={cidades.situacao}
          cidades={cidades.cidades}
          cidadeIbge={cidadeIbge}
          erro={erroDe("cidade")}
          aoEscolher={(codigoIbge) => {
            setCidadeIbge(codigoIbge)
            setProblema(null)
          }}
          aoTentarDeNovo={cidades.tentarDeNovo}
        />
      ) : null}

      <EscolhaIlustrada
        legenda="Seu momento na cidade"
        nome="momento"
        opcoes={MOMENTOS}
        valor={momento}
        erro={erroDe("momento")}
        aoEscolher={mudarMomento}
      />

      {momento === "chegando" ? (
        <Campo
          rotulo="Data da chegada"
          type="date"
          required
          min={dataDeHoje}
          value={dataChegada}
          erro={erroDe("dataChegada")}
          onChange={(evento) => {
            setDataChegada(evento.target.value)
            setProblema(null)
          }}
        />
      ) : null}

      {momento === "saindo" ? (
        <>
          <Campo
            rotulo="Data da saída"
            type="date"
            required
            min={dataDeHoje}
            value={dataSaida}
            erro={erroDe("dataSaida")}
            onChange={(evento) => {
              setDataSaida(evento.target.value)
              setProblema(null)
            }}
          />
          <CampoDeEscolha
            rotulo="Estado de destino"
            value={ufDestino}
            disabled={estados.situacao !== "pronta"}
            opcoes={estados.ufs.map((sigla) => ({ valor: sigla, rotulo: sigla }))}
            onChange={(evento) => {
              setUfDestino(evento.target.value)
              setDestinoIbge("")
              setProblema(null)
            }}
          />
          <EscolhaDeCidade
            rotulo="Cidade de destino"
            uf={ufDestino}
            situacao={cidadesDeDestino.situacao}
            cidades={cidadesDeDestino.cidades}
            cidadeIbge={destinoIbge}
            erro={erroDe("destinoIbge")}
            aoEscolher={(codigoIbge) => {
              setDestinoIbge(codigoIbge)
              setProblema(null)
            }}
            aoTentarDeNovo={cidadesDeDestino.tentarDeNovo}
          />
        </>
      ) : null}
    </Moldura>
  )
}
