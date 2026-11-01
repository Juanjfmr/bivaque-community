import { useState } from "react"
import { Icone } from "@/components/bivaque/icone"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import type { NomeDeIcone } from "@/lib/icones"
import type { PropsDaEtapa } from "./etapas-conta"
import { contagemPublica, type Flags, MINIMO_PARA_EXIBIR, type Momento } from "./fluxo"
import { Moldura } from "./moldura"
import { cidadePorNome, INTERESSES, perguntasDoMomento, sugerirGrupos } from "./servidor-simulado"

const base = import.meta.env.BASE_URL

const maiuscula = (texto: string): string => texto.charAt(0).toUpperCase() + texto.slice(1)

// ── Espera e resultado da verificação ───────────────────────────────────────
export function Verificacao({ progresso, concluir }: PropsDaEtapa) {
  const [esperando, setEsperando] = useState(false)
  const v = progresso.verificacao
  if (v === "nao-encontrada" || v === "portal-fora") {
    const fora = v === "portal-fora"
    return (
      <Moldura
        titulo={fora ? "O Portal está fora do ar" : "Não achamos seu vínculo no Portal"}
        apoio={
          fora
            ? "Não é com você. Envie um documento agora ou espere: tentamos de novo e avisamos."
            : "Acontece com quem entrou há pouco, pensionistas recentes e alguns veteranos."
        }
        aoEnviar={() => concluir()}
        acao={{ rotulo: "Enviar documento" }}
        secundaria={
          fora && !esperando
            ? { rotulo: "Esperar o Portal", aoTocar: () => setEsperando(true) }
            : undefined
        }
      >
        {esperando ? (
          <p className="f01-confirmacao" role="status">
            <Icone nome="check_circle" preenchido />
            Tentamos de novo a cada 15 minutos e avisamos por e-mail. Pode fechar o app.
          </p>
        ) : null}
        <ul className="f01-lista">
          <li>Vale identidade militar, contracheque ou documento de pensão.</li>
          <li>Uma pessoa da equipe confere em até 2 dias úteis.</li>
        </ul>
      </Moldura>
    )
  }
  return (
    <Moldura
      titulo="Confirmando seu vínculo"
      apoio="Leva menos de um minuto. Pode fechar o app: avisamos por e-mail."
    >
      <div className="f01-espera" role="status" aria-live="polite">
        <span className="f01-espera-anel" aria-hidden="true" />
        <ol className="f01-linha-do-tempo">
          <li data-estado="feito">CPF recebido</li>
          <li data-estado="atual">Conferindo no Portal da Transparência</li>
          <li data-estado="futuro">Vínculo confirmado</li>
        </ol>
      </div>
    </Moldura>
  )
}

// ── Documento, quando o Portal não confirma ─────────────────────────────────
const TIPOS = new Set(["application/pdf", "image/jpeg", "image/png"])
const LIMITE = 10 * 1024 * 1024

export function Documento({ progresso, concluir, voltar, erro }: PropsDaEtapa) {
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [problema, setProblema] = useState<string | null>(null)
  const [avisar, setAvisar] = useState(true)

  if (progresso.verificacao === "documento-em-analise") {
    return (
      <Moldura
        titulo="Documento em análise"
        apoio="Quando a equipe terminar, você continua daqui, de onde parou."
      >
        <ol className="f01-linha-do-tempo f01-linha-do-tempo-solta">
          <li data-estado="feito">Documento enviado</li>
          <li data-estado="atual">Em análise, até 2 dias úteis</li>
          <li data-estado="futuro">Você entra na comunidade</li>
        </ol>
        <label htmlFor="f01-avisar" className="f01-linha-opcao">
          <Checkbox
            id="f01-avisar"
            checked={avisar}
            onCheckedChange={(valor) => setAvisar(valor === true)}
          />
          Me avise por e-mail e no celular
        </label>
      </Moldura>
    )
  }

  const escolher = (escolhido: File | undefined) => {
    if (escolhido === undefined) return
    if (!TIPOS.has(escolhido.type) || escolhido.size === 0 || escolhido.size > LIMITE) {
      setArquivo(null)
      setProblema("Use um PDF, JPG ou PNG de até 10 MB.")
      erro("documento-invalido")
      return
    }
    setProblema(null)
    setArquivo(escolhido)
  }

  const tamanho = arquivo ? `${Math.max(1, Math.round(arquivo.size / 1024))} KB` : ""

  return (
    <Moldura
      titulo="Envie um documento"
      apoio="Só a equipe de verificação vê. O arquivo é apagado depois da análise."
      aoEnviar={() => {
        if (arquivo === null) {
          setProblema("Escolha o arquivo antes de enviar.")
          return
        }
        concluir({ verificacao: "documento-em-analise" })
      }}
      acao={{ rotulo: "Enviar para análise" }}
      secundaria={{ rotulo: "Voltar", aoTocar: voltar }}
    >
      <label htmlFor="f01-arquivo" className="f01-arquivo" data-escolhido={arquivo ? "sim" : "nao"}>
        <Icone nome={arquivo ? "check_circle" : "upload"} preenchido={arquivo !== null} />
        <span>
          <strong>{arquivo ? "Arquivo pronto" : "Escolher arquivo"}</strong>
          {arquivo
            ? `${arquivo.type === "application/pdf" ? "PDF" : "Imagem"}, ${tamanho}`
            : "PDF, JPG ou PNG, até 10 MB"}
        </span>
      </label>
      <input
        id="f01-arquivo"
        type="file"
        accept="application/pdf,image/jpeg,image/png"
        className="sr-only"
        aria-describedby="f01-arquivo-erro"
        onChange={(evento) => escolher(evento.target.files?.[0])}
      />
      <p id="f01-arquivo-erro" className="f01-erro" aria-live="polite">
        {problema}
      </p>
    </Moldura>
  )
}

// ── Prévia da cidade: o momento de valor ────────────────────────────────────
// Fala com o momento da pessoa e mostra o que ela vai encontrar, não métricas.
// Abaixo do mínimo de membros (`MINIMO_PARA_EXIBIR`), a cidade ainda não tem o
// que mostrar e a tela convida a começar.
const PREVIA_DO_MOMENTO: Record<Momento, { titulo: (cidade: string) => string; secao: string }> = {
  chegando: {
    titulo: (cidade) => `Em ${cidade}, você já chega com ajuda.`,
    secao: "Quem chegou antes perguntou",
  },
  morando: {
    titulo: (cidade) => `Em ${cidade}, sempre tem alguém precisando do que você sabe.`,
    secao: "Perguntas da semana",
  },
  saindo: {
    titulo: (cidade) => `Sair de ${cidade} fica mais fácil com quem já passou por isso.`,
    secao: "Quem está de mudança perguntou",
  },
}

export function PreviaDaCidade({ progresso, concluir }: PropsDaEtapa) {
  const cidade = cidadePorNome(progresso.cidade)
  const nome = cidade?.nome ?? "sua cidade"
  const momento = progresso.momento ?? "morando"
  const comGente = cidade !== null && cidade.membros >= MINIMO_PARA_EXIBIR
  const perguntas = cidade && comGente ? perguntasDoMomento(cidade, momento) : []
  const textos = PREVIA_DO_MOMENTO[momento]

  return (
    <Moldura
      titulo={comGente ? textos.titulo(nome) : `Você está entre os primeiros em ${nome}.`}
      apoio={
        comGente ? null : "Faça a primeira pergunta. Quem chegar depois já encontra a resposta."
      }
      aoEnviar={() => concluir()}
      acao={{ rotulo: "Continuar" }}
    >
      <p className="f01-selo">
        <Icone nome="verified_user" preenchido /> Vínculo confirmado
      </p>
      {perguntas.length > 0 ? (
        <section aria-labelledby="f01-perguntas">
          <h2 id="f01-perguntas" className="f01-secao">
            {textos.secao}
          </h2>
          <ul className="f01-linhas">
            {perguntas.map((pergunta) => (
              <li key={pergunta.texto}>
                <Icone nome="forum" />
                <span>
                  <strong>{pergunta.texto}</strong>
                  {pergunta.respostas} respostas
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {comGente && cidade?.encontro ? (
        <section aria-labelledby="f01-encontro">
          <h2 id="f01-encontro" className="f01-secao">
            Para conhecer gente
          </h2>
          <ul className="f01-linhas">
            <li>
              <Icone nome="event" />
              <span>
                <strong>{cidade.encontro.titulo}</strong>
                {cidade.encontro.quando}
              </span>
            </li>
          </ul>
        </section>
      ) : null}
    </Moldura>
  )
}

// ── Interesses e grupos, na mesma tela ──────────────────────────────────────
const iniciais = (nome: string): string =>
  nome
    .split(" ")
    .filter((parte) => parte.length > 2)
    .slice(0, 2)
    .map((parte) => parte.charAt(0))
    .join("")
    .toUpperCase()

const membrosDoGrupo = (total: number): string => {
  const faixa = contagemPublica(total)
  return faixa ? `${maiuscula(faixa)} membros` : "Grupo novo"
}

export function InteressesEGrupos({ progresso, concluir }: PropsDaEtapa) {
  const [interesses, setInteresses] = useState<readonly string[]>(progresso.interesses)
  const [grupos, setGrupos] = useState<readonly string[]>(progresso.grupos)
  const sugestoes = sugerirGrupos(interesses, progresso.momento)

  const alternar = (lista: readonly string[], item: string) =>
    lista.includes(item) ? lista.filter((x) => x !== item) : [...lista, item]

  const rotulo =
    grupos.length === 0
      ? "Continuar sem grupos"
      : `Continuar com ${grupos.length} ${grupos.length === 1 ? "grupo" : "grupos"}`

  return (
    <Moldura
      titulo="O que interessa a você?"
      apoio="Marque o que importa para você agora."
      aoEnviar={() => concluir({ interesses, grupos })}
      acao={{ rotulo }}
    >
      <ul className="f01-chips" aria-label="Assuntos">
        {INTERESSES.map((interesse) => {
          const marcado = interesses.includes(interesse)
          return (
            <li key={interesse}>
              <button
                type="button"
                className="f01-chip"
                aria-pressed={marcado}
                onClick={() => setInteresses((atual) => alternar(atual, interesse))}
              >
                {marcado ? <Icone nome="check" /> : null}
                {interesse}
              </button>
            </li>
          )
        })}
      </ul>
      <h2 className="f01-secao">Grupos para você</h2>
      <ul className="f01-grupos" aria-live="polite">
        {sugestoes.map(({ grupo, motivo }, posicao) => {
          const entrou = grupos.includes(grupo.id)
          return (
            <li key={grupo.id} className="f01-grupo">
              <span className="f01-grupo-marca" data-cor={posicao % 4} aria-hidden="true">
                {iniciais(grupo.nome)}
              </span>
              <span className="f01-grupo-texto">
                <strong>{grupo.nome}</strong>
                <span>{membrosDoGrupo(grupo.membros)}</span>
                <span className="f01-grupo-motivo">{motivo}</span>
              </span>
              <Button
                type="button"
                size="lg"
                variant={entrou ? "secondary" : "outline"}
                className="f01-grupo-botao"
                aria-pressed={entrou}
                aria-label={`${entrou ? "Sair de" : "Entrar em"} ${grupo.nome}`}
                onClick={() => setGrupos((atual) => alternar(atual, grupo.id))}
              >
                {entrou ? <Icone nome="check" /> : null}
                {entrou ? "Entrou" : "Entrar"}
              </Button>
            </li>
          )
        })}
      </ul>
    </Moldura>
  )
}

// ── O combinado: regras de convivência ──────────────────────────────────────
// Do Código de Conduta (`src/telas/Conduta.tsx`), em quatro frases.
const REGRAS: readonly { titulo: string; texto: string }[] = [
  {
    titulo: "Ajude como gostaria de ser ajudado",
    texto: "Responda com o que você sabe de verdade. Indique quem você já usou.",
  },
  {
    titulo: "Discorde sem ofender",
    texto: "Educação sempre. Ofender, ameaçar ou perseguir tira a pessoa da comunidade.",
  },
  {
    titulo: "Proteja quem está aqui",
    texto:
      "Nada de endereço, telefone, documento ou foto de outra pessoa sem permissão. Crianças também.",
  },
  {
    titulo: "Todos são bem-vindos",
    texto: "Preconceito de origem, cor, religião, gênero, orientação ou família não tem vez.",
  },
]

export function Combinado({ concluir }: PropsDaEtapa) {
  return (
    <Moldura titulo="O combinado" aoEnviar={() => concluir()} acao={{ rotulo: "Entendi" }}>
      <ul className="f01-regras">
        {REGRAS.map((regra) => (
          <li key={regra.titulo}>
            <strong>{regra.titulo}</strong>
            {regra.texto}
          </li>
        ))}
      </ul>
      <p className="f01-ajuda">
        Viu algo fora do combinado? Use Denunciar no menu do conteúdo.{" "}
        <a href={`${base}conduta`} target="_blank" rel="noopener noreferrer">
          Código de Conduta
        </a>
      </p>
    </Moldura>
  )
}

// ── Avisos ──────────────────────────────────────────────────────────────────
const TIPOS_DE_AVISO = [
  { id: "respostas", titulo: "Respostas às suas perguntas" },
  { id: "grupos", titulo: "Novidades dos seus grupos" },
  { id: "encontros", titulo: "Encontros perto de você" },
] as const

export function Avisos({ concluir }: PropsDaEtapa) {
  const [tipos, setTipos] = useState<ReadonlySet<string>>(
    () => new Set(TIPOS_DE_AVISO.map((tipo) => tipo.id)),
  )
  const [pedindo, setPedindo] = useState(false)

  const ativar = async () => {
    setPedindo(true)
    // O navegador só pede permissão em contexto seguro; na rede local (http) a
    // prévia registra a escolha sem o pedido do sistema.
    if ("Notification" in window && window.isSecureContext) {
      try {
        await window.Notification.requestPermission()
      } catch {
        // A recusa do sistema não trava o cadastro.
      }
    }
    concluir({ avisos: "ativados" })
  }

  return (
    <Moldura
      titulo="Saiba quando responderem"
      apoio="Os avisos chegam assim. Dá para mudar depois em Você."
      aoEnviar={() => void ativar()}
      acao={{ rotulo: "Ativar avisos", carregando: pedindo }}
      secundaria={{ rotulo: "Agora não", aoTocar: () => concluir({ avisos: "agora-nao" }) }}
    >
      <div className="f01-notificacoes" aria-hidden="true">
        <div className="f01-notificacao">
          <span className="f01-notificacao-marca">B</span>
          <span>
            <strong>Nova resposta à sua pergunta</strong>
            Carla R.: a Dra. Lúcia atende pelo FUSEx, terça e quinta.
          </span>
        </div>
        <div className="f01-notificacao">
          <span className="f01-notificacao-marca">B</span>
          <span>
            <strong>Chegadas 2026, amanhã às 9h</strong>
            Café de boas-vindas. 12 pessoas vão.
          </span>
        </div>
      </div>
      <fieldset className="f01-grupo-de-campos">
        <legend className="sr-only">Quero receber</legend>
        {TIPOS_DE_AVISO.map((tipo) => (
          <label key={tipo.id} htmlFor={`f01-aviso-${tipo.id}`} className="f01-linha-opcao">
            <Checkbox
              id={`f01-aviso-${tipo.id}`}
              checked={tipos.has(tipo.id)}
              onCheckedChange={(valor) =>
                setTipos((atual) => {
                  const nova = new Set(atual)
                  if (valor === true) nova.add(tipo.id)
                  else nova.delete(tipo.id)
                  return nova
                })
              }
            />
            {tipo.titulo}
          </label>
        ))}
      </fieldset>
    </Moldura>
  )
}

// ── Início: boas-vindas e primeiros passos ──────────────────────────────────
const FOTO_DO_MOMENTO: Record<Momento, string> = {
  chegando: "demo/chegada.webp",
  morando: "demo/moro-aqui.webp",
  saindo: "demo/saindo.webp",
}

const FRASE_DO_MOMENTO: Record<Momento, string> = {
  chegando: "Quem chegou antes deixou as dicas: escola, médico, bairro, mudança.",
  morando: "Tem gente chegando que precisa do que você já sabe.",
  saindo: "Venda o que não vai, peça indicações no destino e se despeça direito.",
}

export function InicioComPrimeirosPassos({
  progresso,
  flags,
  aoRecomecar,
}: {
  progresso: PropsDaEtapa["progresso"]
  flags: Flags
  aoRecomecar: () => void
}) {
  const [feitos, setFeitos] = useState<ReadonlySet<string>>(() => new Set())
  const momento = progresso.momento ?? "morando"
  const passos: readonly { id: string; icone: NomeDeIcone; titulo: string; feito: boolean }[] = [
    {
      id: "avisos",
      icone: "notifications",
      titulo: "Ativar avisos",
      feito: progresso.avisos === "ativados",
    },
    {
      id: "grupo",
      icone: "group_add",
      titulo: "Entrar em um grupo",
      feito: progresso.grupos.length > 0,
    },
    {
      id: "apresentar",
      icone: "chat_bubble",
      titulo: "Apresentar-se no grupo de chegada",
      feito: feitos.has("apresentar"),
    },
    {
      id: "perguntar",
      icone: "forum",
      titulo: "Fazer a primeira pergunta",
      feito: feitos.has("perguntar"),
    },
    {
      id: "encontro",
      icone: "event_available",
      titulo: "Confirmar presença num encontro",
      feito: feitos.has("encontro"),
    },
    ...(flags.negocioNosPrimeirosPassos
      ? [
          {
            id: "negocio",
            icone: "add_business" as const,
            titulo: "Divulgar o seu negócio",
            feito: feitos.has("negocio"),
          },
        ]
      : []),
  ]
  const concluidos = passos.filter((passo) => passo.feito).length
  const cidade = cidadePorNome(progresso.cidade)
  const primeiraPergunta = cidade ? perguntasDoMomento(cidade, momento)[0] : undefined

  return (
    <main className="f01-inicio">
      <header className="f01-boas-vindas" data-momento={momento}>
        <img src={`${base}${FOTO_DO_MOMENTO[momento]}`} alt="" />
        <div className="f01-boas-vindas-texto">
          <p className="f01-boas-vindas-cidade">
            <Icone nome="location_on" /> {cidade?.nome ?? "Sua cidade"}
          </p>
          <h1 className="f01-boas-vindas-titulo" tabIndex={-1}>
            Boas-vindas, {progresso.nome?.nome ?? ""}.
          </h1>
          <p>{FRASE_DO_MOMENTO[momento]}</p>
        </div>
      </header>
      <section className="f01-passos" aria-labelledby="f01-passos-titulo">
        <div className="f01-passos-cabeca">
          <h2 id="f01-passos-titulo">Primeiros passos</h2>
          <span>
            {concluidos} de {passos.length}
          </span>
        </div>
        <div
          className="f01-progresso"
          role="progressbar"
          aria-label="Primeiros passos concluídos"
          aria-valuemin={0}
          aria-valuemax={passos.length}
          aria-valuenow={concluidos}
        >
          <span style={{ transform: `scaleX(${concluidos / passos.length})` }} />
        </div>
        <ul className="f01-passos-lista">
          {passos.map((passo) => (
            <li key={passo.id} data-feito={passo.feito ? "sim" : "nao"}>
              <button
                type="button"
                disabled={passo.feito}
                onClick={() => setFeitos((atual) => new Set(atual).add(passo.id))}
              >
                <Icone nome={passo.feito ? "check_circle" : passo.icone} preenchido={passo.feito} />
                <span className="f01-passo-titulo">{passo.titulo}</span>
                {passo.feito ? (
                  <span className="sr-only">, feito</span>
                ) : (
                  <Icone nome="chevron_right" />
                )}
              </button>
            </li>
          ))}
        </ul>
      </section>
      {cidade?.encontro || primeiraPergunta ? (
        <section aria-labelledby="f01-acontecendo">
          <h2 id="f01-acontecendo" className="f01-secao">
            Acontecendo em {cidade?.nome}
          </h2>
          <ul className="f01-linhas">
            {cidade?.encontro ? (
              <li>
                <Icone nome="event" />
                <span>
                  <strong>{cidade.encontro.titulo}</strong>
                  {cidade.encontro.quando}
                </span>
              </li>
            ) : null}
            {primeiraPergunta ? (
              <li>
                <Icone nome="forum" />
                <span>
                  <strong>{primeiraPergunta.texto}</strong>
                  {primeiraPergunta.respostas} respostas
                </span>
              </li>
            ) : null}
          </ul>
        </section>
      ) : null}
      <Button type="button" variant="ghost" className="f01-recomecar" onClick={aoRecomecar}>
        <Icone nome="refresh" /> Recomeçar a prévia
      </Button>
    </main>
  )
}
