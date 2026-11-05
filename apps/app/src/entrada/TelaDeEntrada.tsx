import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useNavegacao } from "@/lib/navegacao/react"
import { Nota } from "@/src/pecas/pecas"
import {
  concluir as concluirEtapa,
  etapaAnterior,
  fracaoDoProgresso,
  type Progresso,
  progressoInicial,
  receberVerificacao,
  voltar as voltarEtapa,
} from "@/src/previa-f01/fluxo"
import { MolduraContexto } from "@/src/previa-f01/moldura"
import { TELAS_DA_ENTRADA } from "@/src/previa-f01/telas"
import "@/src/previa-f01/previa-f01.css"
import { ProvedorDoServidorDaEntrada, type ServidorDaEntrada } from "./contexto"
import { paraServidor, progressoDoServidor, verificacaoDoStatus } from "./estado"
import {
  aceitarConvite,
  aceitarTermos,
  carregarCidades,
  carregarEstados,
  carregarGrupos,
  consultarCpf,
  enviarCodigo,
  enviarDocumento,
  iniciarGoogle,
  lerProgresso,
  lerVerificacao,
  provisionar,
  registrarCombinado,
  salvarAvisos,
  salvarInteresses,
  salvarProgresso,
  verificarCodigo,
} from "./servidor"

/**
 * A entrada de produção em `/app/entrar` (LAN-F01, lote B).
 *
 * A máquina de estados e as telas são as da prévia aprovada
 * (`src/previa-f01`); o que muda é a fonte de dados: rascunho no servidor,
 * código no e-mail pelas rotas `/api/app/entry`, CPF pelo servidor, catálogo de
 * cidades do banco e gravação canônica das etapas do fim. Nada de dado pessoal
 * na memória além do necessário: o e-mail em trânsito vive só neste componente
 * e nunca vai para o rascunho.
 */

// Igual a CODE_OF_CONDUCT_VERSION de packages/domain; um teste de escopo cobra a
// igualdade para o combinado não registrar outra versão sem ninguém notar.
const VERSAO_DO_CODIGO_DE_CONDUTA = 2

const MOMENTO_DO_PROVISIONAMENTO = {
  chegando: "arriving",
  morando: "resident",
  saindo: "leaving",
} as const

export function TelaDeEntrada() {
  const navegacao = useNavegacao()
  const [progresso, setProgresso] = useState<Progresso | null>(null)
  const [autenticado, setAutenticado] = useState(false)
  const [falha, setFalha] = useState<string | null>(null)
  const [tentar, setTentar] = useState<(() => void) | null>(null)
  const emailEmTransito = useRef<string | null>(null)
  const codigoDoConvite = useRef<string | null>(null)
  const provisionando = useRef(false)
  const provisionado = useRef(false)
  const progressoRef = useRef<Progresso | null>(null)
  progressoRef.current = progresso

  // O link do convite chega como `/app/entrar?convite=CODIGO`. O código é
  // credencial: fica só na memória do fluxo e some da barra de endereço; o
  // rascunho guarda apenas o fato de a pessoa estar nesse caminho.
  const conviteDaUrl = useMemo(() => {
    const bruto = new URLSearchParams(window.location.search).get("convite") ?? ""
    const codigo = bruto
      .normalize("NFKC")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
    return /^[A-Z0-9]{8}$/.test(codigo) ? codigo : null
  }, [])

  useEffect(() => {
    if (conviteDaUrl === null) return
    codigoDoConvite.current = conviteDaUrl
    window.history.replaceState(null, "", window.location.pathname)
  }, [conviteDaUrl])

  const servidor = useMemo<ServidorDaEntrada>(
    () => ({
      emailEmTransito,
      codigoDoConvite,
      registrarConvite: (codigo) => {
        codigoDoConvite.current = codigo
      },
      enviarCodigo,
      verificarCodigo: async (codigo) => {
        const resultado = await verificarCodigo(emailEmTransito.current ?? "", codigo)
        // A sessão nasce nesta chamada: a tela passa a gravar o rascunho e a
        // provisionar a partir daqui.
        if (resultado.estado === "autenticado") setAutenticado(true)
        return resultado
      },
      consultarCpf,
      carregarEstados,
      carregarCidades,
      carregarGrupos,
      salvarInteresses,
      registrarCombinado,
      salvarAvisos,
      enviarDocumento,
      iniciarGoogle,
      aceitarConvite,
    }),
    [],
  )

  // ── abertura: sessão, rascunho e verificação ──────────────────────────────
  useEffect(() => {
    let ativo = true
    lerProgresso()
      .then(async (resposta) => {
        if (!ativo) return
        const doServidor = progressoDoServidor(resposta)
        if (!resposta.autenticado) {
          // Quem chegou pelo link do convite começa a porta já no contexto do
          // convite; o código já está na memória, não no rascunho.
          setProgresso(
            conviteDaUrl === null
              ? doServidor
              : { ...doServidor, convite: true, via: "email", etapa: "porta" },
          )
          return
        }
        setAutenticado(true)
        try {
          const verificacao = await lerVerificacao()
          if (!ativo) return
          if (verificacao.membroDaCidade) {
            setProgresso({ ...doServidor, etapa: "inicio" })
            return
          }
          setProgresso(receberVerificacao(doServidor, verificacaoDoStatus(verificacao.status)))
        } catch {
          if (ativo) setProgresso(doServidor)
        }
      })
      .catch(() => {
        if (!ativo) return
        setFalha("Não foi possível abrir a entrada agora. Verifique a conexão.")
        setProgresso(progressoInicial())
        setTentar(() => () => window.location.reload())
      })
    return () => {
      ativo = false
    }
  }, [conviteDaUrl])

  // ── salva o rascunho a cada mudança de etapa (com atraso curto) ───────────
  useEffect(() => {
    if (progresso === null || !autenticado) return
    if (progresso.etapa === "porta" || progresso.etapa === "email") return
    const salvar = window.setTimeout(() => {
      void salvarProgresso(paraServidor(progresso)).catch(() => {
        setFalha(
          "Não conseguimos salvar seu progresso agora. Vamos tentar de novo no próximo passo.",
        )
        setTentar(null)
      })
    }, 500)
    return () => window.clearTimeout(salvar)
  }, [progresso, autenticado])

  // ── consulta do vínculo enquanto a pessoa espera ──────────────────────────
  useEffect(() => {
    if (progresso === null || progresso.verificacao !== "consultando") return
    let ativo = true
    const consultar = async () => {
      try {
        const verificacao = await lerVerificacao()
        if (!ativo) return
        if (verificacao.membroDaCidade) {
          setProgresso((atual) => (atual === null ? atual : { ...atual, etapa: "inicio" }))
          return
        }
        setProgresso((atual) =>
          atual === null
            ? atual
            : receberVerificacao(atual, verificacaoDoStatus(verificacao.status)),
        )
      } catch {
        // Falha passageira: a próxima volta tenta de novo; a tela continua na espera.
      }
    }
    void consultar()
    const intervalo = window.setInterval(() => {
      void consultar()
    }, 3000)
    return () => {
      ativo = false
      window.clearInterval(intervalo)
    }
  }, [progresso?.etapa, progresso?.verificacao, progresso])

  // ── provisiona assim que o vínculo confirma, uma vez ──────────────────────
  const provisionarDoRascunho = useCallback(async (atual: Progresso) => {
    if (provisionando.current) return
    if (atual.nome === null || atual.cidadeIbge === null || atual.momento === null) {
      setFalha("Faltou algum dado do cadastro. Volte e confira nome, cidade e momento.")
      return
    }
    provisionando.current = true
    try {
      await provisionar({
        ibgeCode: atual.cidadeIbge,
        displayName: `${atual.nome.nome} ${atual.nome.sobrenome}`.trim(),
        moment: MOMENTO_DO_PROVISIONAMENTO[atual.momento],
        ...(atual.momento === "chegando" && atual.dataChegada !== null
          ? { arrivalDate: atual.dataChegada }
          : {}),
        ...(atual.momento === "saindo" && atual.dataSaida !== null
          ? { departureDate: atual.dataSaida }
          : {}),
        ...(atual.momento === "saindo" && atual.destinoIbge !== null
          ? { destinationIbgeCode: atual.destinoIbge }
          : {}),
      })
      provisionado.current = true
      setFalha(null)
      setTentar(null)
      setProgresso((anterior) =>
        anterior === null ? anterior : receberVerificacao(anterior, "confirmada"),
      )
    } catch {
      setFalha("Não foi possível concluir seu cadastro agora. Tente de novo.")
      setTentar(() => () => {
        void provisionarDoRascunho(progressoRef.current ?? atual)
      })
    } finally {
      provisionando.current = false
    }
  }, [])

  useEffect(() => {
    if (progresso === null || !autenticado) return
    if (provisionado.current) return
    if (progresso.verificacao !== "confirmada" || progresso.etapa === "inicio") return
    // Retomar depois da prévia significa que o cadastro já foi feito numa sessão
    // anterior; tentar de novo duplicaria o provisionamento. Antes disso (porta,
    // e-mail, aceite, CPF, nome, cidade) ainda não há o que provisionar.
    if (progresso.etapa !== "verificacao" && progresso.etapa !== "previa-cidade") {
      if (
        progresso.etapa === "interesses" ||
        progresso.etapa === "combinado" ||
        progresso.etapa === "avisos"
      ) {
        provisionado.current = true
      }
      return
    }
    void provisionarDoRascunho(progresso)
  }, [progresso, autenticado, provisionarDoRascunho])

  // ── fim do fluxo: entra no app ────────────────────────────────────────────
  useEffect(() => {
    if (progresso?.etapa === "inicio") {
      void navegacao.irPara("inicio")
    }
  }, [progresso?.etapa, navegacao])

  const concluir = useCallback(async (mudancas?: Partial<Progresso>) => {
    const atual = progressoRef.current
    if (atual === null) return
    if (mudancas?.via === "google" || mudancas?.via === "apple") {
      setFalha(
        "Entrar com Google ou Apple ainda não está ligado nesta versão. Use o código no e-mail.",
      )
      return
    }
    // Documento enviado não avança: a pessoa fica na linha do tempo da análise
    // ("Documento em análise") em vez de cair na prévia da cidade como se já
    // estivesse aprovada.
    if (atual.etapa === "documento" && mudancas?.verificacao === "documento-em-analise") {
      setFalha(null)
      setTentar(null)
      setProgresso({ ...atual, verificacao: "documento-em-analise" })
      return
    }
    // Convite de familiar: no fim do nome, o aceite provisiona o vínculo com a
    // cidade de quem convidou. Sem código na memória, não há como aceitar.
    if (atual.etapa === "nome" && atual.convite) {
      const codigo = codigoDoConvite.current
      const nome = mudancas?.nome ?? atual.nome
      if (codigo === null || nome === null) {
        setFalha("O convite se perdeu nesta sessão. Volte e entre de novo com o código.")
        return
      }
      try {
        await aceitarConvite({ codigo, nome: `${nome.nome} ${nome.sobrenome}`.trim() })
        codigoDoConvite.current = null
      } catch {
        setFalha("Não foi possível aceitar o convite agora. Tente de novo.")
        setTentar(() => () => {
          void concluir(mudancas)
        })
        return
      }
    }
    try {
      if (atual.etapa === "aceite") await aceitarTermos()
      if (atual.etapa === "combinado") await registrarCombinado(VERSAO_DO_CODIGO_DE_CONDUTA)
      if (atual.etapa === "interesses") await salvarInteresses(mudancas?.grupos ?? atual.grupos)
      if (atual.etapa === "avisos") {
        await salvarAvisos(mudancas?.avisos ?? "agora-nao")
      }
    } catch {
      setFalha("Não conseguimos gravar esta etapa agora. Tente de novo.")
      setTentar(() => () => {
        void concluir(mudancas)
      })
      return
    }
    setFalha(null)
    setTentar(null)
    setProgresso(concluirEtapa(atual, mudancas))
  }, [])

  const voltar = useCallback(() => {
    setProgresso((atual) => (atual === null ? atual : voltarEtapa(atual)))
  }, [])

  const anterior = progresso === null ? null : etapaAnterior(progresso)
  const contexto = useMemo(
    () =>
      progresso === null
        ? null
        : {
            etapa: progresso.etapa,
            concluidas: progresso.concluidas,
            fracao: fracaoDoProgresso(progresso),
            aoVoltar: anterior === null ? null : voltar,
            verificacao: progresso.verificacao,
          },
    [progresso, anterior, voltar],
  )

  if (progresso === null || contexto === null) {
    return (
      <main className="pc f01" data-etapa="abertura">
        <p className="pc-apoio" role="status">
          Abrindo a entrada…
        </p>
      </main>
    )
  }

  const conteudo =
    progresso.etapa === "inicio"
      ? null
      : (() => {
          const Tela = TELAS_DA_ENTRADA[progresso.etapa]
          return (
            <Tela
              progresso={progresso}
              concluir={(mudancas) => {
                void concluir(mudancas)
              }}
              voltar={voltar}
              erro={() => {
                // O funil anônimo da prévia não existe no caminho de produção.
              }}
            />
          )
        })()

  return (
    <ProvedorDoServidorDaEntrada servidor={servidor}>
      <MolduraContexto.Provider value={contexto}>
        <div className="pc f01" data-etapa={progresso.etapa}>
          {falha === null ? null : (
            <div className="f01-falha" role="alert">
              <Nota icone="error">{falha}</Nota>
              {tentar === null ? null : (
                <button type="button" className="pc-link" onClick={() => tentar()}>
                  Tentar de novo
                </button>
              )}
            </div>
          )}
          <div key={progresso.etapa} className="pc-entra">
            {conteudo}
          </div>
        </div>
      </MolduraContexto.Provider>
    </ProvedorDoServidorDaEntrada>
  )
}
