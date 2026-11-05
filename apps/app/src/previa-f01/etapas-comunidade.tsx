import { useEffect, useState } from "react"
import { Icone } from "@/components/bivaque/icone"
import { Checkbox } from "@/components/ui/checkbox"
import type { NomeDeIcone } from "@/lib/icones"
import { useServidorDaEntrada } from "@/src/entrada/contexto"
import { FalhaDaEntrada, type GrupoDaEntrada } from "@/src/entrada/servidor"
import {
  Botao,
  CampoDeArquivo,
  Chip,
  Estado,
  Ilustracao,
  type NomeDaIlustracao,
  Nota,
  Progresso,
  Selo,
} from "@/src/pecas/pecas"
import { type DadosDaPrevia, INTERESSES } from "./entrada-dados"
import type { PropsDaEtapa } from "./etapas-conta"
import { contagemPublica, type Flags, type Momento } from "./fluxo"
import { Moldura } from "./moldura"

const base = import.meta.env.BASE_URL

const maiuscula = (texto: string): string => texto.charAt(0).toUpperCase() + texto.slice(1)

/** Item de lista com ícone: título forte e uma linha de apoio. */
function Item({ icone, titulo, texto }: { icone: NomeDeIcone; titulo: string; texto: string }) {
  return (
    <li>
      <Icone nome={icone} />
      <span>
        <strong>{titulo}</strong>
        {texto}
      </span>
    </li>
  )
}

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
        ilustracao="vinculo"
        aoEnviar={() => concluir()}
        acao={{ rotulo: "Enviar documento" }}
        secundaria={
          fora && !esperando
            ? { rotulo: "Esperar o Portal", aoTocar: () => setEsperando(true) }
            : undefined
        }
      >
        {esperando ? (
          <Nota icone="check_circle" role="status">
            Tentamos de novo a cada 15 minutos e avisamos por e-mail. Pode fechar o app.
          </Nota>
        ) : null}
        <ul className="f01-marcadores">
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
      ilustracao="vinculo"
    >
      <div className="f01-espera" role="status" aria-live="polite">
        <ol className="f01-linha-do-tempo">
          <li data-estado="feito">CPF recebido</li>
          <li data-estado="atual">
            <span className="pc-girando" aria-hidden="true" />
            Conferindo no Portal da Transparência
          </li>
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
  const servidor = useServidorDaEntrada()
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [problema, setProblema] = useState<string | null>(null)
  const [avisar, setAvisar] = useState(true)
  const [enviando, setEnviando] = useState(false)

  if (progresso.verificacao === "documento-em-analise") {
    return (
      <Moldura
        titulo="Documento em análise"
        apoio="Quando a equipe terminar, você continua daqui, de onde parou."
        ilustracao="vinculo"
      >
        <ol className="f01-linha-do-tempo">
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

  const enviar = async () => {
    if (arquivo === null) {
      setProblema("Escolha o arquivo antes de enviar.")
      return
    }
    // Sem servidor (prévia) o envio continua simulado.
    if (servidor === null) {
      concluir({ verificacao: "documento-em-analise" })
      return
    }
    setEnviando(true)
    try {
      await servidor.enviarDocumento(arquivo)
      setArquivo(null)
      concluir({ verificacao: "documento-em-analise" })
    } catch (falha) {
      const recusado = falha instanceof FalhaDaEntrada && falha.codigo === "documento-recusado"
      setProblema(
        recusado
          ? "O arquivo não foi aceito. Confira o formato e o tamanho."
          : "Não foi possível enviar o arquivo agora. Tente de novo.",
      )
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Moldura
      titulo="Envie um documento"
      apoio="Só a equipe de verificação vê. O arquivo é apagado depois da análise."
      aoEnviar={() => {
        void enviar()
      }}
      acao={{ rotulo: enviando ? "Enviando…" : "Enviar para análise", carregando: enviando }}
      secundaria={{ rotulo: "Voltar", aoTocar: voltar }}
    >
      <CampoDeArquivo
        rotulo="Escolher arquivo"
        dica="PDF, JPG ou PNG, até 10 MB"
        escolhido={
          arquivo ? `${arquivo.type === "application/pdf" ? "PDF" : "Imagem"}, ${tamanho}` : null
        }
        aceitar="application/pdf,image/jpeg,image/png"
        erro={problema}
        aoEscolher={escolher}
      />
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

export function PreviaDaCidade({ progresso, concluir, previa }: PropsDaEtapa) {
  const cidade = previa?.cidade ?? null
  const nome = cidade?.nome ?? progresso.cidade ?? "sua cidade"
  const momento = progresso.momento ?? "morando"
  const comGente = cidade?.comGente === true
  const perguntas = comGente ? cidade.perguntas.slice(0, 3) : []
  const textos = PREVIA_DO_MOMENTO[momento]

  return (
    <Moldura
      titulo={comGente ? textos.titulo(nome) : `Você já está em ${nome}.`}
      apoio={
        comGente
          ? null
          : "A comunidade está aqui. Faça a primeira pergunta e quem chegar depois encontra a resposta."
      }
      ilustracao="encontro"
      aoEnviar={() => concluir()}
      acao={{ rotulo: "Continuar" }}
    >
      <p className="f01-selo">
        <Estado icone="verified_user">Vínculo confirmado</Estado>
      </p>
      {perguntas.length > 0 ? (
        <section aria-labelledby="f01-perguntas" className="f01-bloco">
          <h2 id="f01-perguntas" className="pc-secao">
            {textos.secao}
          </h2>
          <ul className="f01-itens f01-itens-lista">
            {perguntas.map((pergunta) => (
              <Item
                key={pergunta.texto}
                icone="forum"
                titulo={pergunta.texto}
                texto={`${pergunta.respostas} respostas`}
              />
            ))}
          </ul>
        </section>
      ) : null}
      {comGente && cidade?.encontro ? (
        <section aria-labelledby="f01-encontro" className="f01-bloco">
          <h2 id="f01-encontro" className="pc-secao">
            Para conhecer gente
          </h2>
          <ul className="f01-itens f01-itens-lista">
            <Item icone="event" titulo={cidade.encontro.titulo} texto={cidade.encontro.quando} />
          </ul>
        </section>
      ) : null}
    </Moldura>
  )
}

// ── Interesses e grupos, na mesma tela ──────────────────────────────────────
const membrosDoGrupo = (total: number): string => {
  const faixa = contagemPublica(total)
  return faixa ? `${maiuscula(faixa)} membros` : "Grupo novo"
}

export function InteressesEGrupos({ progresso, concluir, previa }: PropsDaEtapa) {
  const servidor = useServidorDaEntrada()
  const [interesses, setInteresses] = useState<readonly string[]>(progresso.interesses)
  const [grupos, setGrupos] = useState<readonly string[]>(progresso.grupos)
  const [gruposReais, setGruposReais] = useState<readonly GrupoDaEntrada[] | null>(null)
  const [falhaDosGrupos, setFalhaDosGrupos] = useState(false)
  const [semVinculo, setSemVinculo] = useState(false)
  const sugestoes = previa?.sugestoes ?? []

  const carregarGrupos = () => {
    if (servidor === null) return
    setFalhaDosGrupos(false)
    setSemVinculo(false)
    setGruposReais(null)
    servidor.carregarGrupos().then(
      (lista) => setGruposReais(lista),
      (falha: unknown) => {
        // 409: o provisionamento ainda não terminou. Não é falha de rede e não
        // melhora com "Tentar de novo" em laço — a pessoa volta uma etapa.
        if (falha instanceof FalhaDaEntrada && falha.status === 409) {
          setSemVinculo(true)
          return
        }
        setFalhaDosGrupos(true)
      },
    )
  }

  useEffect(carregarGrupos, [servidor])

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
      <ul className="pc-chips" aria-label="Assuntos">
        {INTERESSES.map((interesse) => (
          <li key={interesse}>
            <Chip
              selecionado={interesses.includes(interesse)}
              onClick={() => setInteresses((atual) => alternar(atual, interesse))}
            >
              {interesse}
            </Chip>
          </li>
        ))}
      </ul>
      <section aria-labelledby="f01-grupos-titulo" className="f01-bloco">
        <h2 id="f01-grupos-titulo" className="pc-secao">
          Grupos para você
        </h2>
        {servidor === null ? (
          <ul className="pc-lista f01-grupos" aria-live="polite">
            {sugestoes.map(({ id, nome, membros, selo, motivo }) => {
              const entrou = grupos.includes(id)
              return (
                <li key={id} className="f01-grupo">
                  <Selo nome={selo} />
                  <span className="pc-linha-texto">
                    <span className="pc-linha-titulo">{nome}</span>
                    <span className="pc-apoio">{membrosDoGrupo(membros)}</span>
                    <span className="pc-miudo">{motivo}</span>
                  </span>
                  <Botao
                    compacto
                    aria-pressed={entrou}
                    aria-label={`${entrou ? "Sair de" : "Entrar em"} ${nome}`}
                    onClick={() => setGrupos((atual) => alternar(atual, id))}
                  >
                    {entrou ? <Icone nome="check" /> : null}
                    {entrou ? "Entrou" : "Entrar"}
                  </Botao>
                </li>
              )
            })}
          </ul>
        ) : semVinculo ? (
          <p className="pc-apoio" role="status">
            Seu cadastro ainda não foi confirmado. Volte e confirme a cidade para ver os grupos.
          </p>
        ) : falhaDosGrupos ? (
          <p className="pc-apoio" aria-live="polite">
            Não foi possível carregar os grupos agora.{" "}
            <button type="button" className="pc-link" onClick={carregarGrupos}>
              Tentar de novo
            </button>
          </p>
        ) : gruposReais === null ? (
          <p className="pc-apoio" aria-live="polite">
            Carregando os grupos da sua cidade…
          </p>
        ) : gruposReais.length === 0 ? (
          <p className="pc-apoio">
            Ainda não há grupos públicos na sua cidade. Você pode continuar sem grupos.
          </p>
        ) : (
          <ul className="pc-lista f01-grupos" aria-live="polite">
            {gruposReais.map((grupo) => {
              const entrou = grupos.includes(grupo.id)
              return (
                <li key={grupo.id} className="f01-grupo">
                  <span className="pc-linha-texto">
                    <span className="pc-linha-titulo">{grupo.nome}</span>
                    {grupo.descricao === null ? null : (
                      <span className="pc-apoio">{grupo.descricao}</span>
                    )}
                  </span>
                  <Botao
                    compacto
                    aria-pressed={entrou}
                    aria-label={`${entrou ? "Sair de" : "Entrar em"} ${grupo.nome}`}
                    onClick={() => setGrupos((atual) => alternar(atual, grupo.id))}
                  >
                    {entrou ? <Icone nome="check" /> : null}
                    {entrou ? "Entrou" : "Entrar"}
                  </Botao>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </Moldura>
  )
}

// ── O combinado: regras de convivência ──────────────────────────────────────
// Do Código de Conduta (`src/telas/Conduta.tsx`), em quatro frases.
const REGRAS: readonly { icone: NomeDeIcone; titulo: string; texto: string }[] = [
  {
    icone: "volunteer_activism",
    titulo: "Ajude como gostaria de ser ajudado",
    texto: "Responda com o que você sabe de verdade. Indique quem você já usou.",
  },
  {
    icone: "forum",
    titulo: "Discorde sem ofender",
    texto: "Educação sempre. Ofender, ameaçar ou perseguir tira a pessoa da comunidade.",
  },
  {
    icone: "shield_person",
    titulo: "Proteja quem está aqui",
    texto:
      "Nada de endereço, telefone, documento ou foto de outra pessoa sem permissão. Crianças também.",
  },
  {
    icone: "groups",
    titulo: "Todos são bem-vindos",
    texto: "Preconceito de origem, cor, religião, gênero, orientação ou família não tem vez.",
  },
]

export function Combinado({ concluir }: PropsDaEtapa) {
  return (
    <Moldura titulo="O combinado" aoEnviar={() => concluir()} acao={{ rotulo: "Entendi" }}>
      <ul className="f01-itens">
        {REGRAS.map((regra) => (
          <Item key={regra.titulo} icone={regra.icone} titulo={regra.titulo} texto={regra.texto} />
        ))}
      </ul>
      <p className="pc-apoio">
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
            Quem respondeu aparece aqui, com o texto e o grupo.
          </span>
        </div>
        <div className="f01-notificacao">
          <span className="f01-notificacao-marca">B</span>
          <span>
            <strong>Encontro perto de você</strong>
            Quando houver um encontro na sua cidade, a data e o lugar chegam assim.
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
const CENA_DO_MOMENTO: Record<Momento, NomeDaIlustracao> = {
  chegando: "chegando",
  morando: "morando",
  saindo: "saindo",
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
  previa,
}: {
  progresso: PropsDaEtapa["progresso"]
  flags: Flags
  aoRecomecar: () => void
  previa?: DadosDaPrevia
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
  const cidade = previa?.cidade ?? null
  const primeiraPergunta = cidade?.perguntas[0]

  return (
    <main className="f01-inicio">
      <header className="f01-boas-vindas">
        <Ilustracao
          nome={CENA_DO_MOMENTO[momento]}
          proporcao="2 / 1"
          className="f01-boas-vindas-cena"
          prioridade
        />
        <div className="f01-boas-vindas-texto">
          <p className="pc-miudo f01-boas-vindas-cidade">
            <Icone nome="location_on" /> {cidade?.nome ?? "Sua cidade"}
          </p>
          <h1 className="pc-destaque" tabIndex={-1}>
            Boas-vindas, {progresso.nome?.nome ?? ""}.
          </h1>
          <p className="f01-apoio">{FRASE_DO_MOMENTO[momento]}</p>
        </div>
      </header>
      <section className="pc-cartao f01-passos" aria-labelledby="f01-passos-titulo">
        <div className="f01-passos-cabeca">
          <h2 id="f01-passos-titulo" className="pc-subtitulo">
            Primeiros passos
          </h2>
          <span className="pc-apoio">
            {concluidos} de {passos.length}
          </span>
        </div>
        <Progresso
          fracao={concluidos / passos.length}
          rotulo="Primeiros passos concluídos"
          maximo={passos.length}
          valor={concluidos}
        />
        <ul className="pc-lista f01-passos-lista">
          {passos.map((passo) => (
            <li key={passo.id} data-feito={passo.feito ? "sim" : "nao"}>
              <button
                type="button"
                className="pc-linha"
                disabled={passo.feito}
                onClick={() => setFeitos((atual) => new Set(atual).add(passo.id))}
              >
                <Icone nome={passo.feito ? "check_circle" : passo.icone} preenchido={passo.feito} />
                <span className="pc-linha-titulo">{passo.titulo}</span>
                {passo.feito ? (
                  <span className="sr-only">, feito</span>
                ) : (
                  <span className="pc-linha-acessorio">
                    <Icone nome="chevron_right" />
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </section>
      {cidade?.encontro || primeiraPergunta ? (
        <section aria-labelledby="f01-acontecendo" className="f01-bloco">
          <h2 id="f01-acontecendo" className="pc-secao">
            Acontecendo em {cidade?.nome}
          </h2>
          <ul className="f01-itens f01-itens-lista">
            {cidade?.encontro ? (
              <Item icone="event" titulo={cidade.encontro.titulo} texto={cidade.encontro.quando} />
            ) : null}
            {primeiraPergunta ? (
              <Item
                icone="forum"
                titulo={primeiraPergunta.texto}
                texto={`${primeiraPergunta.respostas} respostas`}
              />
            ) : null}
          </ul>
        </section>
      ) : null}
      <Botao tom="texto" icone="refresh" className="f01-recomecar" onClick={aoRecomecar}>
        Recomeçar a prévia
      </Botao>
    </main>
  )
}
