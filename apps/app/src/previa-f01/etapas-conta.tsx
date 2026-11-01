import { useEffect, useId, useState } from "react"
import { Icone } from "@/components/bivaque/icone"
import { IconeGoogle } from "@/components/bivaque/icone-google"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
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

/** Mensagem de erro de campo, ligada ao campo por `aria-describedby`. */
function ErroDoCampo({ id, texto }: { id: string; texto: string | null }) {
  return (
    <p id={id} className="f01-erro" aria-live="polite">
      {texto ? (
        <>
          <Icone nome="error" className="f01-erro-icone" />
          {texto}
        </>
      ) : null}
    </p>
  )
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
  const idErro = useId()

  // Google e Apple: na prévia, a conta "volta" em menos de um segundo.
  const entrarCom = (via: Exclude<Via, "email">) => {
    setConectando(via)
    window.setTimeout(() => concluir({ via, nome: NOME_DA_CONTA[via] }), 900)
  }

  const usarConvite = () => {
    const limpo = codigo.trim().toUpperCase()
    if (!/^[A-Z0-9]{4}-?[A-Z0-9]{4}$/.test(limpo)) {
      setErroDoConvite("Confira o código: são 8 letras e números, como BVQ7-K2MA.")
      erro("codigo-invalido")
      return
    }
    concluir({ via: "email", convite: true, verificacao: "confirmada" })
  }

  return (
    <div className="f01-porta">
      <picture className="f01-porta-foto">
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
        <p className="f01-texto">
          Para militares das Forças federais, veteranos, pensionistas e famílias. Todo membro é
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
            <Icone nome="send" />
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
            <label htmlFor="f01-convite" className="f01-rotulo">
              Código do convite
            </label>
            <div className="f01-convite-linha">
              <Input
                id="f01-convite"
                className="f01-campo"
                autoComplete="off"
                autoCapitalize="characters"
                placeholder="BVQ7-K2MA"
                value={codigo}
                aria-invalid={erroDoConvite ? "true" : undefined}
                aria-describedby={idErro}
                onChange={(evento) => {
                  setCodigo(evento.target.value)
                  setErroDoConvite(null)
                }}
                autoFocus
              />
              <Button type="submit" variant="secondary" className="f01-botao">
                Usar
              </Button>
            </div>
            <ErroDoCampo id={idErro} texto={erroDoConvite} />
          </form>
        ) : (
          <Button
            type="button"
            variant="link"
            className="f01-link"
            onClick={() => setConvite(true)}
          >
            Tem um código de convite?
          </Button>
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
  const idErro = useId()

  const enviar = () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
      setProblema("Confira o e-mail: falta algo, como o @ ou o domínio.")
      erro("email-invalido")
      return
    }
    setEnviando(true)
    window.setTimeout(() => concluir({ emailMascarado: mascararEmail(email) }), 700)
  }

  return (
    <Moldura
      titulo={progresso.convite ? "Seu convite está pronto" : "Qual é o seu e-mail?"}
      texto={
        progresso.convite
          ? "Convite de Marcos S. para a família. Vamos mandar um código para este e-mail."
          : "Vamos mandar um código de 6 números. Serve para entrar ou para criar sua conta."
      }
      aoEnviar={enviar}
      acao={{ rotulo: enviando ? "Enviando…" : "Enviar código", carregando: enviando }}
    >
      <label htmlFor="f01-email" className="f01-rotulo">
        E-mail
      </label>
      <div className="f01-campo-com-icone">
        <Input
          id="f01-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          className="f01-campo"
          value={email}
          readOnly={progresso.convite}
          aria-invalid={problema ? "true" : undefined}
          aria-describedby={idErro}
          onChange={(evento) => {
            setEmail(evento.target.value)
            setProblema(null)
          }}
        />
        {progresso.convite ? <Icone nome="lock" className="f01-campo-icone" /> : null}
      </div>
      <ErroDoCampo id={idErro} texto={problema} />
    </Moldura>
  )
}

// ── Código ──────────────────────────────────────────────────────────────────
const ESPERA_DO_REENVIO = 60

export function Codigo({ progresso, concluir, voltar, erro }: PropsDaEtapa) {
  const [codigo, setCodigo] = useState("")
  const [problema, setProblema] = useState<string | null>(null)
  const [restante, setRestante] = useState(ESPERA_DO_REENVIO)
  const [aviso, setAviso] = useState<string | null>(null)
  const [conferindo, setConferindo] = useState(false)
  const idErro = useId()

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
        setProblema("Código inválido ou vencido. Confira ou peça outro.")
        setCodigo("")
        erro("codigo-invalido")
        return
      }
      concluir()
    }, 600)
  }

  const minutos = `${Math.floor(restante / 60)}:${String(restante % 60).padStart(2, "0")}`

  return (
    <Moldura
      titulo="Digite o código"
      texto={
        <>
          Mandamos 6 números para <strong>{progresso.emailMascarado ?? "o seu e-mail"}</strong>.
          Pode demorar um minuto; confira também o spam.
        </>
      }
      aoEnviar={() => conferir(codigo)}
      acao={{ rotulo: conferindo ? "Conferindo…" : "Continuar", carregando: conferindo }}
      secundaria={{ rotulo: "Usar outro e-mail", aoTocar: voltar }}
    >
      <label htmlFor="f01-codigo" className="f01-rotulo">
        Código
      </label>
      <Input
        id="f01-codigo"
        className="f01-campo f01-campo-codigo"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]*"
        maxLength={6}
        value={codigo}
        aria-invalid={problema ? "true" : undefined}
        aria-describedby={idErro}
        onChange={(evento) => {
          const so = evento.target.value.replace(/\D/g, "").slice(0, 6)
          setCodigo(so)
          setProblema(null)
          if (so.length === 6) conferir(so)
        }}
      />
      <ErroDoCampo id={idErro} texto={problema} />
      <div className="f01-reenvio">
        {restante > 0 ? (
          <span>Reenviar em {minutos}</span>
        ) : (
          <Button
            type="button"
            variant="link"
            className="f01-link"
            onClick={() => {
              setRestante(ESPERA_DO_REENVIO)
              setAviso("Mandamos um código novo. O anterior deixou de valer.")
            }}
          >
            Reenviar código
          </Button>
        )}
        <span className="sr-only" aria-live="polite">
          {aviso}
        </span>
        {aviso ? <p className="f01-nota">{aviso}</p> : null}
      </div>
    </Moldura>
  )
}

// ── Aceite: antes do CPF ────────────────────────────────────────────────────
const PROMESSAS: readonly { icone: "lock" | "visibility_off" | "delete"; texto: string }[] = [
  {
    icone: "lock",
    texto: "Seu CPF é consultado uma vez no Portal da Transparência e não fica guardado.",
  },
  {
    icone: "visibility_off",
    texto: "Ninguém vê sua Força, unidade ou posto. Você decide o que mostra.",
  },
  { icone: "delete", texto: "Você pode apagar sua conta e seus dados quando quiser." },
]

export function Aceite({ concluir }: PropsDaEtapa) {
  return (
    <Moldura
      titulo="Antes de começar"
      texto="O Bivaque só funciona com confiança. Isto é o que prometemos sobre os seus dados:"
      aoEnviar={() => concluir()}
      acao={{ rotulo: "Aceito e continuo" }}
    >
      <ul className="f01-promessas">
        {PROMESSAS.map((promessa) => (
          <li key={promessa.icone}>
            <Icone nome={promessa.icone} className="f01-promessa-icone" />
            <span>{promessa.texto}</span>
          </li>
        ))}
      </ul>
      <p className="f01-nota">
        Ao continuar, você aceita a{" "}
        <a href={`${base}privacidade`} target="_blank" rel="noopener noreferrer">
          Política de Privacidade
        </a>
        , os{" "}
        <a href={`${base}ajuda`} target="_blank" rel="noopener noreferrer">
          Termos de Uso
        </a>{" "}
        e o{" "}
        <a href={`${base}conduta`} target="_blank" rel="noopener noreferrer">
          Código de Conduta
        </a>
        . Versão de 01/11/2026; o aceite fica registrado com data e hora.
      </p>
    </Moldura>
  )
}

// ── CPF ─────────────────────────────────────────────────────────────────────
export function Cpf({ concluir, erro }: PropsDaEtapa) {
  const [cpf, setCpf] = useState("")
  const [problema, setProblema] = useState<string | null>(null)
  const [porque, setPorque] = useState(false)
  const idErro = useId()

  const enviar = () => {
    if (!cpfValido(cpf)) {
      setProblema("Confira o CPF: os números não batem.")
      erro("cpf-invalido")
      return
    }
    // O CPF vai para o servidor e não volta: daqui em diante só existe o estado.
    setCpf("")
    concluir({ verificacao: "consultando" })
  }

  return (
    <Moldura
      titulo="Confirme seu vínculo"
      texto="Com o CPF, confirmamos no Portal da Transparência que você é militar, veterano ou pensionista. A consulta leva menos de um minuto, e você segue preenchendo enquanto isso."
      aoEnviar={enviar}
      acao={{ rotulo: "Confirmar vínculo" }}
    >
      <label htmlFor="f01-cpf" className="f01-rotulo">
        CPF
      </label>
      <Input
        id="f01-cpf"
        className="f01-campo"
        inputMode="numeric"
        autoComplete="off"
        placeholder="000.000.000-00"
        value={cpf}
        aria-invalid={problema ? "true" : undefined}
        aria-describedby={idErro}
        onChange={(evento) => {
          setCpf(mascararCpf(evento.target.value))
          setProblema(null)
        }}
      />
      <ErroDoCampo id={idErro} texto={problema} />
      <Button
        type="button"
        variant="link"
        className="f01-link"
        aria-expanded={porque}
        aria-controls="f01-porque-cpf"
        onClick={() => setPorque((aberto) => !aberto)}
      >
        Por que o CPF?
      </Button>
      <div id="f01-porque-cpf" hidden={!porque} className="f01-explicacao">
        É o jeito mais rápido de saber que só entra quem é do meio. O Portal diz se há vínculo e a
        categoria; patente, unidade e salário não chegam até nós. Se a consulta não der certo, você
        pode enviar um documento.
      </div>
      <p className="f01-nota">
        É cônjuge ou dependente? Peça o convite a quem é militar e use "Tem um código de convite?"
        na primeira tela.
      </p>
    </Moldura>
  )
}

// ── Nome (depois do CPF, por decisão de 01/11) ──────────────────────────────
export function Nome({ progresso, concluir }: PropsDaEtapa) {
  const [nome, setNome] = useState(progresso.nome?.nome ?? "")
  const [sobrenome, setSobrenome] = useState(progresso.nome?.sobrenome ?? "")
  const [problema, setProblema] = useState<string | null>(null)
  const idErro = useId()
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
      texto={
        veioDaConta
          ? `Veio da sua conta ${progresso.via === "google" ? "Google" : "Apple"}. Confira: é assim que os outros membros vão te ver.`
          : "É assim que os outros membros vão te ver."
      }
      aoEnviar={enviar}
      acao={{ rotulo: "Continuar" }}
    >
      <div className="f01-dupla">
        <div>
          <label htmlFor="f01-nome" className="f01-rotulo">
            Nome
          </label>
          <Input
            id="f01-nome"
            className="f01-campo"
            autoComplete="given-name"
            value={nome}
            aria-invalid={problema ? "true" : undefined}
            aria-describedby={idErro}
            onChange={(evento) => {
              setNome(evento.target.value)
              setProblema(null)
            }}
          />
        </div>
        <div>
          <label htmlFor="f01-sobrenome" className="f01-rotulo">
            Sobrenome
          </label>
          <Input
            id="f01-sobrenome"
            className="f01-campo"
            autoComplete="family-name"
            value={sobrenome}
            onChange={(evento) => setSobrenome(evento.target.value)}
          />
        </div>
      </div>
      <ErroDoCampo id={idErro} texto={problema} />
    </Moldura>
  )
}

// ── Cidade e momento ────────────────────────────────────────────────────────
const MOMENTOS: readonly { id: Momento; titulo: string; descricao: string }[] = [
  { id: "chegando", titulo: "Chegando", descricao: "Fui transferido e estou indo para lá." },
  { id: "morando", titulo: "Moro aqui", descricao: "Já estou na cidade." },
  { id: "saindo", titulo: "Saindo", descricao: "Vou ser transferido em breve." },
]

export function CidadeEMomento({ progresso, concluir }: PropsDaEtapa) {
  const [cidade, setCidade] = useState(progresso.cidade ?? "")
  const [momento, setMomento] = useState<Momento | "">(progresso.momento ?? "")
  const [quando, setQuando] = useState("")
  const [problema, setProblema] = useState<string | null>(null)
  const idErro = useId()

  const enviar = () => {
    if (cidade === "") {
      setProblema("Escolha a cidade.")
      return
    }
    if (momento === "") {
      setProblema("Escolha o seu momento.")
      return
    }
    concluir({ cidade, momento })
  }

  return (
    <Moldura
      titulo="Onde você está?"
      texto="A cidade organiza o que você vê. O momento ajuda a sugerir grupos e encontros certos."
      aoEnviar={enviar}
      acao={{ rotulo: "Continuar" }}
    >
      <label htmlFor="f01-cidade" className="f01-rotulo">
        Cidade
      </label>
      <select
        id="f01-cidade"
        className="f01-campo f01-select"
        value={cidade}
        aria-describedby={idErro}
        onChange={(evento) => {
          setCidade(evento.target.value)
          setProblema(null)
        }}
      >
        <option value="">Escolha a cidade</option>
        {CIDADES.map((item) => (
          <option key={item.nome} value={item.nome}>
            {item.nome} – {item.uf}
          </option>
        ))}
      </select>
      <fieldset className="f01-grupo-de-campos">
        <legend className="f01-rotulo">Seu momento</legend>
        <RadioGroup
          value={momento}
          onValueChange={(valor) => {
            setMomento(valor as Momento)
            setProblema(null)
          }}
          className="f01-momentos"
        >
          {MOMENTOS.map((item) => (
            <label key={item.id} htmlFor={`f01-momento-${item.id}`} className="f01-cartao-opcao">
              <RadioGroupItem
                id={`f01-momento-${item.id}`}
                value={item.id}
                aria-labelledby={`f01-momento-${item.id}-titulo`}
                aria-describedby={`f01-momento-${item.id}-descricao`}
              />
              <span>
                <strong id={`f01-momento-${item.id}-titulo`}>{item.titulo}</strong>
                <small id={`f01-momento-${item.id}-descricao`}>{item.descricao}</small>
              </span>
            </label>
          ))}
        </RadioGroup>
      </fieldset>
      {momento === "chegando" || momento === "saindo" ? (
        <div>
          <label htmlFor="f01-quando" className="f01-rotulo">
            {momento === "chegando" ? "Quando você chega?" : "Quando você sai?"}{" "}
            <span className="f01-opcional">opcional</span>
          </label>
          <Input
            id="f01-quando"
            type="month"
            className="f01-campo"
            value={quando}
            onChange={(evento) => setQuando(evento.target.value)}
          />
        </div>
      ) : null}
      <ErroDoCampo id={idErro} texto={problema} />
    </Moldura>
  )
}
