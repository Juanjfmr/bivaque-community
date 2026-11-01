import { useEffect, useState } from "react"
import { Icone } from "@/components/bivaque/icone"
import { IconeGoogle } from "@/components/bivaque/icone-google"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import type { NomeDeIcone } from "@/lib/icones"
import {
  cpfValido,
  type Momento,
  mascararCpf,
  mascararEmail,
  type Progresso,
  type Via,
} from "./fluxo"
import { Campo, Moldura } from "./moldura"
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
      <picture className="f01-porta-foto">
        <source media="(min-width: 900px)" srcSet={`${base}demo/landing-hero.webp`} />
        <img src={`${base}demo/landing-hero-retrato.webp`} alt="" />
      </picture>
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
        <h1 className="f01-porta-titulo" tabIndex={-1}>
          Gente do seu meio, na sua cidade.
        </h1>
        <p className="f01-porta-apoio">
          Militares das Forças federais, veteranos, pensionistas e famílias. Todo membro é
          verificado.
        </p>
        <div className="f01-porta-botoes">
          <Button
            type="button"
            className="f01-botao f01-botao-apple"
            aria-busy={conectando === "apple" ? "true" : undefined}
            disabled={conectando !== null}
            onClick={() => entrarCom("apple")}
          >
            <IconeApple />
            {conectando === "apple" ? "Conectando…" : "Continuar com Apple"}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="f01-botao"
            aria-busy={conectando === "google" ? "true" : undefined}
            disabled={conectando !== null}
            onClick={() => entrarCom("google")}
          >
            <IconeGoogle />
            {conectando === "google" ? "Conectando…" : "Continuar com Google"}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="f01-botao"
            disabled={conectando !== null}
            onClick={() => concluir({ via: "email" })}
          >
            Continuar com e-mail
          </Button>
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
                <Button type="submit" size="sm" className="f01-convite-usar">
                  Usar
                </Button>
              }
            />
          </form>
        ) : (
          <button type="button" className="f01-link" onClick={() => setConvite(true)}>
            Tenho um código de convite
          </button>
        )}
        <p className="f01-porta-rodape">
          Entrar ou criar conta é o mesmo caminho. <a href={`${base}ajuda`}>Ajuda</a>
        </p>
      </div>
    </div>
  )
}

// ── E-mail ──────────────────────────────────────────────────────────────────
export function Email({ progresso, concluir, erro }: PropsDaEtapa) {
  const [email, setEmail] = useState(progresso.convite ? EMAIL_DO_CONVITE : "")
  const [problema, setProblema] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  const enviar = () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
      setProblema("Falta algo no e-mail, como o @ ou o domínio.")
      erro("email-invalido")
      return
    }
    setEnviando(true)
    window.setTimeout(() => concluir({ emailMascarado: mascararEmail(email) }), 700)
  }

  return (
    <Moldura
      titulo={progresso.convite ? "Convite de Marcos S." : "Qual é o seu e-mail?"}
      apoio={progresso.convite ? "Para a família. O código vai para o e-mail do convite." : null}
      aoEnviar={enviar}
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
        ajuda="Mandamos um código de 6 números. Vale para entrar ou criar conta."
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
const CASAS = [0, 1, 2, 3, 4, 5] as const

export function Codigo({ progresso, concluir, voltar, erro }: PropsDaEtapa) {
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

  // Na prévia, qualquer código de 6 números vale, menos 000000 (mostra o erro).
  const conferir = (valor: string) => {
    if (valor.length !== 6) {
      setProblema("O código tem 6 números.")
      return
    }
    setConferindo(true)
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
  }

  return (
    <Moldura
      titulo="Digite o código"
      apoio={
        <>
          Enviado para <strong>{progresso.emailMascarado ?? "o seu e-mail"}</strong>.{" "}
          <button type="button" className="f01-link-texto" onClick={voltar}>
            Trocar
          </button>
        </>
      }
      aoEnviar={() => conferir(codigo)}
      acao={{ rotulo: conferindo ? "Conferindo…" : "Continuar", carregando: conferindo }}
    >
      <div className="f01-casas" data-erro={problema ? "sim" : "nao"}>
        {CASAS.map((indice) => (
          <span
            key={indice}
            className="f01-casa"
            data-atual={indice === codigo.length ? "sim" : "nao"}
            aria-hidden="true"
          >
            {codigo[indice] ?? ""}
          </span>
        ))}
        <input
          className="f01-casas-entrada"
          aria-label="Código de 6 números"
          aria-invalid={problema ? "true" : undefined}
          aria-describedby="f01-codigo-erro"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={6}
          value={codigo}
          onChange={(evento) => {
            const so = evento.target.value.replace(/\D/g, "").slice(0, 6)
            setCodigo(so)
            setProblema(null)
            if (so.length === 6) conferir(so)
          }}
        />
      </div>
      <p id="f01-codigo-erro" className="f01-erro" aria-live="polite">
        {problema ? (
          <>
            <Icone nome="error" />
            {problema}
          </>
        ) : null}
      </p>
      <p className="f01-ajuda" aria-live="polite">
        {aviso ? `${aviso} ` : ""}
        {restante > 0 ? (
          `Reenviar em ${restante} s. Confira também o spam.`
        ) : (
          <button
            type="button"
            className="f01-link-texto"
            onClick={() => {
              setRestante(ESPERA_DO_REENVIO)
              setAviso("Código novo enviado.")
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
    texto: "Consultamos uma vez no Portal da Transparência e descartamos.",
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
      <ul className="f01-promessas">
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
      <p className="f01-ajuda f01-legal">
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
  const [cpf, setCpf] = useState("")
  const [problema, setProblema] = useState<string | null>(null)
  const [porque, setPorque] = useState(false)

  const enviar = () => {
    if (!cpfValido(cpf)) {
      setProblema("Esse CPF não existe. Confira os números.")
      erro("cpf-invalido")
      return
    }
    // O CPF vai para o servidor e não volta: daqui em diante só existe o estado.
    setCpf("")
    concluir({ verificacao: "consultando" })
  }

  return (
    <Moldura
      titulo="Qual é o seu CPF?"
      apoio="É com ele que confirmamos que você é do meio."
      aoEnviar={enviar}
      acao={{ rotulo: "Confirmar vínculo" }}
    >
      <Campo
        rotulo="CPF"
        inputMode="numeric"
        autoComplete="off"
        value={cpf}
        erro={problema}
        ajuda="A consulta leva menos de um minuto, e você segue enquanto isso."
        onChange={(evento) => {
          setCpf(mascararCpf(evento.target.value))
          setProblema(null)
        }}
      />
      <div className="f01-detalhe">
        <button
          type="button"
          className="f01-detalhe-botao"
          aria-expanded={porque}
          aria-controls="f01-porque-cpf"
          onClick={() => setPorque((aberto) => !aberto)}
        >
          Por que o CPF?
          <Icone nome="expand_more" />
        </button>
        <div id="f01-porque-cpf" hidden={!porque} className="f01-detalhe-texto">
          O Portal da Transparência diz só se há vínculo e a categoria (ativo, veterano ou
          pensionista). Posto, unidade e salário não chegam até nós. Se a consulta não der certo,
          você envia um documento.
        </div>
      </div>
      <p className="f01-ajuda">Cônjuge ou dependente entra pelo convite de quem é militar.</p>
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
        <p className="f01-ajuda">
          Veio da sua conta {progresso.via === "google" ? "Google" : "Apple"}. Pode corrigir.
        </p>
      ) : null}
    </Moldura>
  )
}

// ── Cidade e momento ────────────────────────────────────────────────────────
const MOMENTOS: readonly { id: Momento; titulo: string; icone: NomeDeIcone }[] = [
  { id: "chegando", titulo: "Chegando", icone: "flight_land" },
  { id: "morando", titulo: "Moro aqui", icone: "home" },
  { id: "saindo", titulo: "Saindo", icone: "local_shipping" },
]

type ProblemaDaCidade = { campo: "cidade" | "momento"; texto: string } | null

export function CidadeEMomento({ progresso, concluir }: PropsDaEtapa) {
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

  const erroNaCidade = problema?.campo === "cidade"

  return (
    <Moldura titulo="Onde você está?" aoEnviar={enviar} acao={{ rotulo: "Continuar" }}>
      <div className="f01-campo-bloco">
        <div className="f01-campo f01-campo-select" data-erro={erroNaCidade ? "sim" : "nao"}>
          <select
            id="f01-cidade"
            value={cidade}
            data-vazio={cidade === "" ? "sim" : "nao"}
            aria-invalid={erroNaCidade ? "true" : undefined}
            aria-describedby="f01-cidade-erro"
            onChange={(evento) => {
              setCidade(evento.target.value)
              setProblema(null)
            }}
          >
            <option value="" disabled hidden />
            {CIDADES.map((item) => (
              <option key={item.nome} value={item.nome}>
                {item.nome}, {item.uf}
              </option>
            ))}
          </select>
          <label htmlFor="f01-cidade">Cidade</label>
          <span className="f01-campo-acessorio">
            <Icone nome="expand_more" />
          </span>
        </div>
        <p id="f01-cidade-erro" className="f01-erro" aria-live="polite">
          {erroNaCidade ? problema.texto : null}
        </p>
      </div>
      <fieldset className="f01-momento">
        <legend>Seu momento na cidade</legend>
        <RadioGroup
          value={momento}
          onValueChange={(valor) => {
            setMomento(valor as Momento)
            setProblema(null)
          }}
          className="f01-momentos"
          aria-describedby="f01-momento-erro"
        >
          {MOMENTOS.map((item) => (
            <label key={item.id} htmlFor={`f01-momento-${item.id}`} className="f01-momento-opcao">
              <RadioGroupItem id={`f01-momento-${item.id}`} value={item.id} className="sr-only" />
              <Icone nome={item.icone} />
              {item.titulo}
            </label>
          ))}
        </RadioGroup>
        <p id="f01-momento-erro" className="f01-erro" aria-live="polite">
          {problema?.campo === "momento" ? problema.texto : null}
        </p>
      </fieldset>
      {momento === "chegando" || momento === "saindo" ? (
        <Campo
          rotulo={momento === "chegando" ? "Mês da chegada (opcional)" : "Mês da saída (opcional)"}
          type="month"
          value={quando}
          onChange={(evento) => setQuando(evento.target.value)}
        />
      ) : null}
    </Moldura>
  )
}
