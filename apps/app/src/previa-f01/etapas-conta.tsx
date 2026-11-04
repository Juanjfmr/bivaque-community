import { useEffect, useState } from "react"
import { Icone } from "@/components/bivaque/icone"
import { IconeGoogle } from "@/components/bivaque/icone-google"
import type { NomeDeIcone } from "@/lib/icones"
import { CidadeEMomentoCanonica } from "@/src/entrada/cidade-canonica"
import { useServidorDaEntrada } from "@/src/entrada/contexto"
import {
  Botao,
  Campo,
  CampoDeCodigo,
  CampoDeEscolha,
  EscolhaIlustrada,
  Ilustracao,
  Nota,
  type OpcaoIlustrada,
} from "@/src/pecas/pecas"
import {
  cpfValido,
  type Momento,
  mascararCpf,
  mascararEmail,
  type Progresso,
  type Via,
} from "./fluxo"
import { Moldura } from "./moldura"
import { CIDADES, type EventoDoFunil } from "./servidor-simulado"

export type PropsDaEtapa = {
  progresso: Progresso
  concluir: (mudancas?: Partial<Progresso>) => void
  voltar: () => void
  erro: (motivo: NonNullable<EventoDoFunil["motivo"]>) => void
}

const base = import.meta.env.BASE_URL
const EMAIL_DO_CONVITE = "familia.souza@exemplo.com"
const NOME_DA_CONTA: Record<Exclude<Via, "email">, { nome: string; sobrenome: string }> = {
  google: { nome: "Ana", sobrenome: "Souza" },
  apple: { nome: "Ana", sobrenome: "Souza" },
}

// ── Porta: uma entrada só ───────────────────────────────────────────────────
function IconeApple() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5" fill="currentColor">
      <path d="M16.37 1.43c0 1.14-.47 2.23-1.23 3.03-.81.86-2.13 1.53-3.21 1.44-.14-1.1.41-2.25 1.17-3.03.84-.86 2.27-1.5 3.27-1.44zM20.5 17.3c-.56 1.3-.83 1.88-1.55 3.03-1 1.6-2.42 3.6-4.18 3.61-1.56.02-1.96-1.02-4.08-1-2.12.01-2.56 1.02-4.12 1-1.76-.02-3.1-1.82-4.1-3.42-2.79-4.46-3.09-9.72-1.27-12.49 1.3-1.97 3.34-3.12 5.26-3.12 1.96 0 3.19 1.07 4.81 1.07 1.57 0 2.53-1.07 4.79-1.07 1.71 0 3.52.93 4.81 2.54-4.23 2.32-3.54 8.36.63 9.85z" />
    </svg>
  )
}

export function Porta({ concluir, erro }: PropsDaEtapa) {
  const [conectando, setConectando] = useState<Via | null>(null)
  const [convite, setConvite] = useState(false)
  const [codigo, setCodigo] = useState("")
  const [erroDoConvite, setErroDoConvite] = useState<string | null>(null)

  // Google e Apple: na prévia, a conta "volta" em menos de um segundo.
  const entrarCom = (via: Exclude<Via, "email">) => {
    setConectando(via)
    window.setTimeout(() => concluir({ via, nome: NOME_DA_CONTA[via] }), 900)
  }

  const usarConvite = () => {
    const limpo = codigo.trim().toUpperCase()
    if (!/^[A-Z0-9]{4}-?[A-Z0-9]{4}$/.test(limpo)) {
      setErroDoConvite("São 8 letras e números, como BVQ7-K2MA.")
      erro("codigo-invalido")
      return
    }
    concluir({ via: "email", convite: true, verificacao: "confirmada" })
  }

  return (
    <div className="f01-porta">
      <div className="f01-porta-arte">
        <Ilustracao nome="porta" proporcao="16 / 10" className="f01-porta-cena" prioridade />
      </div>
      <div className="f01-porta-conteudo">
        <picture>
          <source
            srcSet={`${base}brand/bivaque-logo-horizontal-white.svg`}
            media="(prefers-color-scheme: dark)"
          />
          <img
            className="f01-logo"
            src={`${base}brand/bivaque-logo-horizontal.svg`}
            alt="Bivaque"
          />
        </picture>
        <h1 className="pc-destaque f01-porta-titulo" tabIndex={-1}>
          A comunidade militar da sua cidade.
        </h1>
        <p className="f01-apoio">
          Para militares das Forças federais, veteranos, pensionistas e famílias. Todo membro é
          verificado.
        </p>
        <div className="f01-porta-botoes">
          <Botao
            cheio
            className="f01-apple"
            carregando={conectando === "apple"}
            disabled={conectando !== null}
            onClick={() => entrarCom("apple")}
          >
            {conectando === "apple" ? null : <IconeApple />}
            {conectando === "apple" ? "Conectando…" : "Continuar com Apple"}
          </Botao>
          <Botao
            cheio
            tom="contorno"
            carregando={conectando === "google"}
            disabled={conectando !== null}
            onClick={() => entrarCom("google")}
          >
            {conectando === "google" ? null : <IconeGoogle />}
            {conectando === "google" ? "Conectando…" : "Continuar com Google"}
          </Botao>
          <Botao
            cheio
            tom="contorno"
            disabled={conectando !== null}
            onClick={() => concluir({ via: "email" })}
          >
            Continuar com e-mail
          </Botao>
        </div>
        {convite ? (
          <form
            className="f01-convite"
            noValidate
            onSubmit={(evento) => {
              evento.preventDefault()
              usarConvite()
            }}
          >
            <Campo
              rotulo="Código do convite"
              autoComplete="off"
              autoCapitalize="characters"
              value={codigo}
              erro={erroDoConvite}
              onChange={(evento) => {
                setCodigo(evento.target.value)
                setErroDoConvite(null)
              }}
              acessorio={
                <Botao type="submit" compacto>
                  Usar
                </Botao>
              }
            />
          </form>
        ) : (
          <button type="button" className="pc-link f01-link" onClick={() => setConvite(true)}>
            Tenho um código de convite
          </button>
        )}
        <p className="pc-miudo">
          Já tem conta? Use o mesmo botão de antes. <a href={`${base}ajuda`}>Ajuda</a>
        </p>
      </div>
    </div>
  )
}

// ── E-mail ──────────────────────────────────────────────────────────────────
export function Email({ progresso, concluir, erro }: PropsDaEtapa) {
  const servidor = useServidorDaEntrada()
  const [email, setEmail] = useState(progresso.convite ? EMAIL_DO_CONVITE : "")
  const [problema, setProblema] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  const enviar = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
      setProblema("Falta algo no e-mail, como o @ ou o domínio.")
      erro("email-invalido")
      return
    }
    setEnviando(true)
    // Sem servidor (prévia de desenvolvimento) o comportamento continua simulado.
    if (servidor === null) {
      window.setTimeout(() => concluir({ emailMascarado: mascararEmail(email) }), 700)
      return
    }
    const resultado = await servidor.enviarCodigo(email.trim())
    setEnviando(false)
    if (resultado.estado === "enviado") {
      servidor.emailEmTransito.current = email.trim()
      concluir({ emailMascarado: mascararEmail(email) })
      return
    }
    if (resultado.estado === "limite") {
      setProblema(`Aguarde ${resultado.reenviarEm} s para pedir outro código.`)
      return
    }
    setProblema("Não foi possível enviar o código agora. Verifique a conexão e tente de novo.")
  }

  return (
    <Moldura
      titulo={progresso.convite ? "Convite de Marcos S." : "Qual é o seu e-mail?"}
      apoio={progresso.convite ? "Para a família. O código vai para o e-mail do convite." : null}
      aoEnviar={() => {
        void enviar()
      }}
      acao={{ rotulo: enviando ? "Enviando…" : "Enviar código", carregando: enviando }}
    >
      <Campo
        rotulo="E-mail"
        type="email"
        inputMode="email"
        autoComplete="email"
        value={email}
        readOnly={progresso.convite}
        erro={problema}
        ajuda="Vamos mandar um código de 6 números para você entrar."
        acessorio={progresso.convite ? <Icone nome="lock" /> : null}
        onChange={(evento) => {
          setEmail(evento.target.value)
          setProblema(null)
        }}
      />
    </Moldura>
  )
}

// ── Código ──────────────────────────────────────────────────────────────────
const ESPERA_DO_REENVIO = 60

export function Codigo({ progresso, concluir, voltar, erro }: PropsDaEtapa) {
  const servidor = useServidorDaEntrada()
  const [codigo, setCodigo] = useState("")
  const [problema, setProblema] = useState<string | null>(null)
  const [restante, setRestante] = useState(ESPERA_DO_REENVIO)
  const [aviso, setAviso] = useState<string | null>(null)
  const [conferindo, setConferindo] = useState(false)

  useEffect(() => {
    if (restante <= 0) return
    const passo = window.setTimeout(() => setRestante((r) => r - 1), 1000)
    return () => window.clearTimeout(passo)
  }, [restante])

  const reenviar = async () => {
    if (servidor === null) {
      setRestante(ESPERA_DO_REENVIO)
      setAviso("Código novo enviado.")
      return
    }
    const email = servidor.emailEmTransito.current
    if (email === null) {
      setProblema("Volte e informe o e-mail de novo.")
      return
    }
    const resultado = await servidor.enviarCodigo(email)
    if (resultado.estado === "enviado") {
      setRestante(ESPERA_DO_REENVIO)
      setAviso("Código novo enviado.")
      return
    }
    if (resultado.estado === "limite") {
      setProblema(`Aguarde ${resultado.reenviarEm} s para pedir outro código.`)
      return
    }
    setProblema("Não foi possível enviar outro código agora. Tente de novo.")
  }

  const conferir = async (valor: string) => {
    if (valor.length !== 6) {
      setProblema("O código tem 6 números.")
      return
    }
    setConferindo(true)
    // Sem servidor (prévia): qualquer código de 6 números vale, menos 000000.
    if (servidor === null) {
      window.setTimeout(() => {
        setConferindo(false)
        if (valor === "000000") {
          setProblema("Código errado ou vencido. Confira ou peça outro.")
          setCodigo("")
          erro("codigo-invalido")
          return
        }
        concluir()
      }, 600)
      return
    }
    const resultado = await servidor.verificarCodigo(valor)
    setConferindo(false)
    if (resultado.estado === "autenticado") {
      setCodigo("")
      concluir()
      return
    }
    if (resultado.estado === "limite") {
      setProblema(`Muitas tentativas. Aguarde ${resultado.reenviarEm} s e peça outro código.`)
      return
    }
    if (resultado.estado === "codigo-invalido") {
      setProblema("Código errado ou vencido. Confira ou peça outro.")
      setCodigo("")
      erro("codigo-invalido")
      return
    }
    setProblema("Não foi possível conferir o código agora. Tente de novo.")
  }

  return (
    <Moldura
      titulo="Digite o código"
      apoio={
        <>
          Enviado para <strong>{progresso.emailMascarado ?? "o seu e-mail"}</strong>.{" "}
          <button type="button" className="pc-link" onClick={voltar}>
            Trocar
          </button>
        </>
      }
      aoEnviar={() => {
        void conferir(codigo)
      }}
      acao={{ rotulo: conferindo ? "Conferindo…" : "Continuar", carregando: conferindo }}
    >
      <CampoDeCodigo
        rotulo="Código de 6 números"
        valor={codigo}
        erro={problema}
        aoMudar={(digitos) => {
          setCodigo(digitos)
          setProblema(null)
          if (digitos.length === 6) void conferir(digitos)
        }}
      />
      <p className="pc-apoio" aria-live="polite">
        {aviso ? `${aviso} ` : ""}
        {restante > 0 ? (
          `Reenviar em ${restante} s. Confira também o spam.`
        ) : (
          <button
            type="button"
            className="pc-link"
            onClick={() => {
              void reenviar()
            }}
          >
            Reenviar código
          </button>
        )}
      </p>
    </Moldura>
  )
}

// ── Aceite: antes do CPF ────────────────────────────────────────────────────
const PROMESSAS: readonly { icone: NomeDeIcone; titulo: string; texto: string }[] = [
  {
    icone: "lock",
    titulo: "Seu CPF não fica guardado",
    texto: "Usamos uma vez para confirmar seu vínculo e não guardamos.",
  },
  {
    icone: "visibility_off",
    titulo: "Força, unidade e posto não aparecem",
    texto: "Os outros membros veem só o que você escolher mostrar.",
  },
  {
    icone: "delete",
    titulo: "Você sai quando quiser",
    texto: "Apagar a conta apaga seus dados.",
  },
]

export function Aceite({ concluir }: PropsDaEtapa) {
  return (
    <Moldura
      titulo="Antes de começar"
      aoEnviar={() => concluir()}
      acao={{ rotulo: "Aceito e continuo" }}
    >
      <ul className="f01-itens">
        {PROMESSAS.map((promessa) => (
          <li key={promessa.titulo}>
            <Icone nome={promessa.icone} />
            <span>
              <strong>{promessa.titulo}</strong>
              {promessa.texto}
            </span>
          </li>
        ))}
      </ul>
      <p className="pc-miudo f01-legal">
        Ao continuar, você aceita a{" "}
        <a href={`${base}privacidade`} target="_blank" rel="noopener noreferrer">
          Política de Privacidade
        </a>
        , os{" "}
        <a href={`${base}ajuda`} target="_blank" rel="noopener noreferrer">
          Termos
        </a>{" "}
        e o{" "}
        <a href={`${base}conduta`} target="_blank" rel="noopener noreferrer">
          Código de Conduta
        </a>{" "}
        de 01/11/2026.
      </p>
    </Moldura>
  )
}

// ── CPF ─────────────────────────────────────────────────────────────────────
export function Cpf({ concluir, erro }: PropsDaEtapa) {
  const servidor = useServidorDaEntrada()
  const [cpf, setCpf] = useState("")
  const [problema, setProblema] = useState<string | null>(null)
  const [porque, setPorque] = useState(false)
  const [conferindo, setConferindo] = useState(false)

  const enviar = async () => {
    if (!cpfValido(cpf)) {
      setProblema("Esse CPF não existe. Confira os números.")
      erro("cpf-invalido")
      return
    }
    // Sem servidor (prévia): só simula a consulta no Portal.
    if (servidor === null) {
      setCpf("")
      concluir({ verificacao: "consultando" })
      return
    }
    setConferindo(true)
    try {
      const resultado = await servidor.consultarCpf(cpf.replace(/\D/g, ""))
      setCpf("")
      if (resultado.status === "verified") {
        concluir({ verificacao: "confirmada" })
        return
      }
      if (resultado.status === "pending") {
        concluir({ verificacao: "consultando" })
        return
      }
      if (resultado.status === "rejected") {
        concluir({ verificacao: "nao-encontrada" })
        return
      }
      concluir({ verificacao: "portal-fora" })
    } catch {
      setProblema(
        "Não foi possível confirmar agora. Você pode tentar de novo ou enviar um documento.",
      )
    } finally {
      setConferindo(false)
    }
  }

  return (
    <Moldura
      titulo="Qual é o seu CPF?"
      apoio="Ele confirma que você é militar, veterano ou pensionista."
      aoEnviar={() => {
        void enviar()
      }}
      acao={{ rotulo: conferindo ? "Confirmando…" : "Confirmar vínculo", carregando: conferindo }}
    >
      <Campo
        rotulo="CPF"
        inputMode="numeric"
        autoComplete="off"
        value={cpf}
        erro={problema}
        ajuda="Leva menos de um minuto. Você continua preenchendo enquanto isso."
        onChange={(evento) => {
          setCpf(mascararCpf(evento.target.value))
          setProblema(null)
        }}
      />
      <div className="f01-detalhe">
        <button
          type="button"
          className="pc-link f01-detalhe-botao"
          aria-expanded={porque}
          aria-controls="f01-porque-cpf"
          onClick={() => setPorque((aberto) => !aberto)}
        >
          Por que o CPF?
          <Icone nome="expand_more" />
        </button>
        <div id="f01-porque-cpf" hidden={!porque}>
          <Nota icone="shield_person">
            O Portal da Transparência diz só se há vínculo e a categoria (ativo, veterano ou
            pensionista). Posto, unidade e salário não chegam até nós. Se não der certo pelo CPF,
            você envia um documento.
          </Nota>
        </div>
      </div>
      <p className="pc-apoio">Cônjuge ou dependente entra pelo convite de quem é militar.</p>
    </Moldura>
  )
}

// ── Nome (depois do CPF, por decisão de 01/11) ──────────────────────────────
export function Nome({ progresso, concluir }: PropsDaEtapa) {
  const [nome, setNome] = useState(progresso.nome?.nome ?? "")
  const [sobrenome, setSobrenome] = useState(progresso.nome?.sobrenome ?? "")
  const [problema, setProblema] = useState<string | null>(null)
  const veioDaConta = progresso.via === "google" || progresso.via === "apple"

  const enviar = () => {
    if (nome.trim().length < 2) {
      setProblema("Escreva seu nome.")
      return
    }
    concluir({ nome: { nome: nome.trim(), sobrenome: sobrenome.trim() } })
  }

  return (
    <Moldura
      titulo="Como você se chama?"
      apoio="É assim que os outros membros vão ver você."
      aoEnviar={enviar}
      acao={{ rotulo: "Continuar" }}
    >
      <div className="f01-dupla">
        <Campo
          rotulo="Nome"
          autoComplete="given-name"
          value={nome}
          erro={problema}
          onChange={(evento) => {
            setNome(evento.target.value)
            setProblema(null)
          }}
        />
        <Campo
          rotulo="Sobrenome"
          autoComplete="family-name"
          value={sobrenome}
          onChange={(evento) => setSobrenome(evento.target.value)}
        />
      </div>
      {veioDaConta ? (
        <p className="pc-apoio">
          Veio da sua conta {progresso.via === "google" ? "Google" : "Apple"}. Pode corrigir.
        </p>
      ) : null}
    </Moldura>
  )
}

// ── Cidade e momento ────────────────────────────────────────────────────────
const MOMENTOS: readonly OpcaoIlustrada<Momento>[] = [
  { valor: "chegando", rotulo: "Chegando", selo: "chegadas" },
  { valor: "morando", rotulo: "Moro aqui", selo: "morando" },
  { valor: "saindo", rotulo: "Saindo", selo: "saindo" },
]

const MESES_ANTES = 6
const MESES_DEPOIS = 18

/** Meses perto de hoje, para quem chega ou sai escolher sem calendário. */
function mesesProximos(hoje = new Date()): readonly { valor: string; rotulo: string }[] {
  const formato = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" })
  return Array.from({ length: MESES_ANTES + MESES_DEPOIS + 1 }, (_, indice) => {
    const data = new Date(hoje.getFullYear(), hoje.getMonth() - MESES_ANTES + indice, 1)
    const valor = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`
    return { valor, rotulo: formato.format(data) }
  })
}

type ProblemaDaCidade = { campo: "cidade" | "momento"; texto: string } | null

/**
 * A etapa aprovada tem duas implementações: a de produção, ligada ao catálogo
 * canônico (cidade por IBGE, data e destino), e a da prévia de design, com a
 * lista fixa e o mês simulado. Sem servidor no contexto, a prévia continua
 * clicável exatamente como foi aprovada.
 */
export function CidadeEMomento(props: PropsDaEtapa) {
  const servidor = useServidorDaEntrada()
  if (servidor !== null) {
    return (
      <CidadeEMomentoCanonica
        progresso={props.progresso}
        concluir={(mudancas) => props.concluir(mudancas)}
      />
    )
  }
  return <CidadeEMomentoDePrevia {...props} />
}

function CidadeEMomentoDePrevia({ progresso, concluir }: PropsDaEtapa) {
  const [cidade, setCidade] = useState(progresso.cidade ?? "")
  const [momento, setMomento] = useState<Momento | "">(progresso.momento ?? "")
  const [quando, setQuando] = useState("")
  const [problema, setProblema] = useState<ProblemaDaCidade>(null)

  const enviar = () => {
    if (cidade === "") {
      setProblema({ campo: "cidade", texto: "Escolha a cidade." })
      return
    }
    if (momento === "") {
      setProblema({ campo: "momento", texto: "Escolha um momento." })
      return
    }
    concluir({ cidade, momento })
  }

  return (
    <Moldura titulo="Onde você está?" aoEnviar={enviar} acao={{ rotulo: "Continuar" }}>
      <CampoDeEscolha
        rotulo="Cidade"
        value={cidade}
        erro={problema?.campo === "cidade" ? problema.texto : null}
        opcoes={CIDADES.map((item) => ({ valor: item.nome, rotulo: `${item.nome}, ${item.uf}` }))}
        onChange={(evento) => {
          setCidade(evento.target.value)
          setProblema(null)
        }}
      />
      <EscolhaIlustrada
        legenda="Seu momento na cidade"
        nome="momento"
        opcoes={MOMENTOS}
        valor={momento}
        erro={problema?.campo === "momento" ? problema.texto : null}
        aoEscolher={(valor) => {
          setMomento(valor)
          setQuando("")
          setProblema(null)
        }}
      />
      {momento === "chegando" || momento === "saindo" ? (
        <CampoDeEscolha
          rotulo={momento === "chegando" ? "Mês da chegada (opcional)" : "Mês da saída (opcional)"}
          value={quando}
          opcoes={mesesProximos()}
          onChange={(evento) => setQuando(evento.target.value)}
        />
      ) : null}
    </Moldura>
  )
}
