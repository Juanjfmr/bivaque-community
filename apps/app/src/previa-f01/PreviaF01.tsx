import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react"
import { Icone } from "@/components/bivaque/icone"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Avisos,
  BoasVindas,
  Combinado,
  Documento,
  InicioComPrimeirosPassos,
  InteressesEGrupos,
  PreviaDaCidade,
  Verificacao,
} from "./etapas-comunidade"
import {
  Aceite,
  CidadeEMomento,
  Codigo,
  Cpf,
  Email,
  Nome,
  Porta,
  type PropsDaEtapa,
} from "./etapas-conta"
import {
  concluir as concluirEtapa,
  etapaAnterior,
  FLAGS_PADRAO,
  type Flags,
  fracaoDoProgresso,
  type IdDaEtapa,
  progressoInicial,
  receberVerificacao,
  voltar as voltarEtapa,
} from "./fluxo"
import { MolduraContexto } from "./moldura"
import {
  apagarProgresso,
  CENARIOS,
  type Cenario,
  consultarVinculo,
  eventosDoFunil,
  lerProgresso,
  ouvirFunil,
  registrarEvento,
  salvarProgresso,
} from "./servidor-simulado"
import "./previa-f01.css"

type TelaDaEtapa = (props: PropsDaEtapa) => React.ReactNode

const TELAS: Record<Exclude<IdDaEtapa, "inicio">, TelaDaEtapa> = {
  porta: Porta,
  email: Email,
  codigo: Codigo,
  aceite: Aceite,
  cpf: Cpf,
  nome: Nome,
  cidade: CidadeEMomento,
  verificacao: Verificacao,
  documento: Documento,
  "previa-cidade": PreviaDaCidade,
  interesses: InteressesEGrupos,
  combinado: Combinado,
  avisos: Avisos,
  "boas-vindas": BoasVindas,
}

/**
 * A prévia clicável do F01 novo, com dados simulados. Só existe no servidor de
 * desenvolvimento (`main.tsx`); nada aqui fala com o banco.
 */
export function PreviaF01() {
  const [progresso, setProgresso] = useState(lerProgresso)
  const [cenario, setCenario] = useState<Cenario>("confirma-rapido")
  const [flags, setFlags] = useState<Flags>(FLAGS_PADRAO)
  const [painel, setPainel] = useState(false)
  const vistaEm = useRef(Date.now())
  // O último progresso, para os eventos do funil saírem fora dos atualizadores.
  const progressoRef = useRef(progresso)
  progressoRef.current = progresso

  useEffect(() => salvarProgresso(progresso), [progresso])

  // Funil: cada etapa vista, uma vez por entrada.
  useEffect(() => {
    vistaEm.current = Date.now()
    registrarEvento({ acao: "vista", etapa: progresso.etapa, via: progressoRef.current.via })
  }, [progresso.etapa])

  // A consulta do vínculo roda em segundo plano enquanto a pessoa segue.
  useEffect(() => {
    if (progresso.verificacao !== "consultando") return
    return consultarVinculo(cenario, (resultado) =>
      setProgresso((atual) => receberVerificacao(atual, resultado)),
    )
  }, [progresso.verificacao, cenario])

  const concluir = useCallback((mudancas?: Partial<typeof progresso>) => {
    const atual = progressoRef.current
    registrarEvento({
      acao: "concluida",
      etapa: atual.etapa,
      via: mudancas?.via ?? atual.via,
      ms: Date.now() - vistaEm.current,
    })
    setProgresso((anterior) => concluirEtapa(anterior, mudancas))
  }, [])

  const voltar = useCallback(() => {
    const atual = progressoRef.current
    registrarEvento({ acao: "voltou", etapa: atual.etapa, via: atual.via })
    setProgresso(voltarEtapa)
  }, [])

  const erro = useCallback(
    (motivo: Parameters<PropsDaEtapa["erro"]>[0]) =>
      registrarEvento({ acao: "erro", etapa: progresso.etapa, via: progresso.via, motivo }),
    [progresso.etapa, progresso.via],
  )

  const recomecar = () => {
    apagarProgresso()
    setProgresso(progressoInicial())
    setPainel(false)
  }

  const contexto = {
    etapa: progresso.etapa,
    fracao: fracaoDoProgresso(progresso),
    aoVoltar: etapaAnterior(progresso) === null ? null : voltar,
    verificacao: progresso.verificacao,
  }

  const conteudo =
    progresso.etapa === "inicio" ? (
      <InicioComPrimeirosPassos progresso={progresso} flags={flags} aoRecomecar={recomecar} />
    ) : (
      (() => {
        const Tela = TELAS[progresso.etapa]
        return <Tela progresso={progresso} concluir={concluir} voltar={voltar} erro={erro} />
      })()
    )

  return (
    <MolduraContexto.Provider value={contexto}>
      <div className="f01" data-etapa={progresso.etapa}>
        <div key={progresso.etapa} className="f01-transicao">
          {conteudo}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="f01-gatilho-do-painel"
          onClick={() => setPainel(true)}
        >
          <Icone nome="tune" /> Prévia
        </Button>
        <PainelDaPrevia
          aberto={painel}
          aoMudar={setPainel}
          cenario={cenario}
          aoCenario={setCenario}
          flags={flags}
          aoFlags={setFlags}
          emAnalise={progresso.verificacao === "documento-em-analise"}
          aoAprovar={() => {
            setProgresso((atual) => receberVerificacao(atual, "confirmada"))
            setPainel(false)
          }}
          aoRecomecar={recomecar}
        />
      </div>
    </MolduraContexto.Provider>
  )
}

/** A lista só cresce: a contagem é o retrato que muda a cada evento. */
function useFunil() {
  const contar = () => eventosDoFunil().length
  useSyncExternalStore(ouvirFunil, contar, contar)
  return eventosDoFunil()
}

/** Andaime da prévia: cenários, flag, CPF de teste e o funil ao vivo. */
function PainelDaPrevia({
  aberto,
  aoMudar,
  cenario,
  aoCenario,
  flags,
  aoFlags,
  emAnalise,
  aoAprovar,
  aoRecomecar,
}: {
  aberto: boolean
  aoMudar: (aberto: boolean) => void
  cenario: Cenario
  aoCenario: (cenario: Cenario) => void
  flags: Flags
  aoFlags: (flags: Flags) => void
  emAnalise: boolean
  aoAprovar: () => void
  aoRecomecar: () => void
}) {
  const eventos = useFunil()
  const recentes = eventos.slice(-24).reverse()
  return (
    <Sheet open={aberto} onOpenChange={aoMudar}>
      <SheetContent side="bottom" className="f01-painel">
        <SheetHeader>
          <SheetTitle>Prévia do F01</SheetTitle>
          <SheetDescription>
            Dados simulados; nada vai para o banco. CPF de teste: 529.982.247-25. Código do e-mail:
            qualquer um de 6 números (000000 mostra o erro). Convite: BVQ7-K2MA.
          </SheetDescription>
        </SheetHeader>
        <div className="f01-painel-corpo">
          <fieldset>
            <legend>Resultado da consulta do CPF</legend>
            {CENARIOS.map((item) => (
              <label key={item.id} className="f01-painel-opcao">
                <input
                  type="radio"
                  name="f01-cenario"
                  checked={cenario === item.id}
                  onChange={() => aoCenario(item.id)}
                />
                {item.rotulo}
              </label>
            ))}
          </fieldset>
          <label className="f01-painel-opcao">
            <input
              type="checkbox"
              checked={flags.negocioNosPrimeirosPassos}
              onChange={(evento) =>
                aoFlags({ ...flags, negocioNosPrimeirosPassos: evento.target.checked })
              }
            />
            Flag: Negócio nos primeiros passos
          </label>
          <div className="f01-painel-acoes">
            {emAnalise ? (
              <Button type="button" onClick={aoAprovar}>
                Simular aprovação do documento
              </Button>
            ) : null}
            <Button type="button" variant="outline" onClick={aoRecomecar}>
              Recomeçar do zero
            </Button>
          </div>
          <section aria-label="Eventos do funil">
            <h3 className="f01-painel-titulo">
              Funil · {eventos.length} {eventos.length === 1 ? "evento" : "eventos"} (sem dado
              pessoal)
            </h3>
            <ol className="f01-painel-funil">
              {recentes.map((evento) => (
                <li key={evento.seq}>
                  <code>
                    {evento.acao} · {evento.etapa}
                    {evento.via ? ` · ${evento.via}` : ""}
                    {evento.ms === undefined ? "" : ` · ${(evento.ms / 1000).toFixed(1)} s`}
                    {evento.motivo ? ` · ${evento.motivo}` : ""}
                  </code>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  )
}
