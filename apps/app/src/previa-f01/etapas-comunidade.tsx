import { useId, useState } from "react"
import { Icone } from "@/components/bivaque/icone"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import type { NomeDeIcone } from "@/lib/icones"
import type { PropsDaEtapa } from "./etapas-conta"
import { contagemPublica, type Flags, type Momento } from "./fluxo"
import { Moldura } from "./moldura"
import { cidadePorNome, INTERESSES, sugerirGrupos } from "./servidor-simulado"

const base = import.meta.env.BASE_URL

// ── Espera e resultado da verificação ───────────────────────────────────────
export function Verificacao({ progresso, concluir }: PropsDaEtapa) {
  const [esperando, setEsperando] = useState(false)
  const v = progresso.verificacao
  if (v === "nao-encontrada" || v === "portal-fora") {
    const fora = v === "portal-fora"
    return (
      <Moldura
        titulo={fora ? "O Portal está fora do ar agora" : "Não encontramos seu vínculo"}
        texto={
          fora
            ? "Não é com você: o Portal da Transparência não respondeu. Você pode enviar um documento agora ou esperar; tentamos de novo sozinhos e avisamos por e-mail."
            : "Isso acontece com quem entrou há pouco tempo, com pensionistas recentes e com alguns veteranos. Envie um documento e uma pessoa da equipe confere."
        }
        aoEnviar={() => concluir()}
        acao={{ rotulo: "Enviar documento" }}
        secundaria={
          fora && !esperando
            ? { rotulo: "Esperar e ser avisado", aoTocar: () => setEsperando(true) }
            : undefined
        }
      >
        {esperando ? (
          <p className="f01-confirmacao" role="status">
            <Icone nome="check_circle" preenchido /> Combinado. Tentamos de novo a cada 15 minutos e
            avisamos por e-mail quando der certo. Pode fechar o app.
          </p>
        ) : null}
        <ul className="f01-lista-simples">
          <li>Vale identidade militar, contracheque ou documento de pensão.</li>
          <li>PDF ou foto, até 10 MB. Só a equipe de verificação vê.</li>
          <li>A análise leva até 2 dias úteis.</li>
        </ul>
      </Moldura>
    )
  }
  return (
    <Moldura
      titulo="Confirmando seu vínculo"
      texto="Estamos consultando o Portal da Transparência. Leva menos de um minuto. Pode fechar o app: avisamos por e-mail quando terminar."
    >
      <div className="f01-espera" role="status" aria-live="polite">
        <span className="f01-espera-anel" aria-hidden="true" />
        <ol className="f01-linha-do-tempo">
          <li data-estado="feito">CPF recebido</li>
          <li data-estado="atual">Consultando o Portal</li>
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
  const idErro = useId()

  if (progresso.verificacao === "documento-em-analise") {
    return (
      <Moldura
        titulo="Documento em análise"
        texto="Uma pessoa da equipe vai conferir. Quando terminar, você continua daqui, de onde parou."
      >
        <ol className="f01-linha-do-tempo f01-linha-do-tempo-vertical">
          <li data-estado="feito">Documento enviado</li>
          <li data-estado="atual">Em análise · até 2 dias úteis</li>
          <li data-estado="futuro">Resposta por e-mail e no app</li>
          <li data-estado="futuro">Você entra na comunidade</li>
        </ol>
        <label htmlFor="f01-avisar" className="f01-cartao-opcao">
          <Checkbox
            id="f01-avisar"
            checked={avisar}
            onCheckedChange={(valor) => setAvisar(valor === true)}
          />
          <span>
            <strong>Me avise quando liberar</strong>
            <small>Por e-mail e no celular.</small>
          </span>
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

  return (
    <Moldura
      titulo="Envie um documento"
      texto="Identidade militar, contracheque ou documento de pensão. Só a equipe de verificação vê, e o arquivo é apagado depois da análise."
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
      <label htmlFor="f01-arquivo" className="f01-arquivo">
        <Icone nome="upload" className="f01-arquivo-icone" />
        <span>
          <strong>{arquivo ? "Arquivo escolhido" : "Escolher arquivo"}</strong>
          <small>
            {arquivo
              ? `${arquivo.type === "application/pdf" ? "PDF" : "Imagem"} · ${Math.max(1, Math.round(arquivo.size / 1024))} KB`
              : "PDF, JPG ou PNG, até 10 MB"}
          </small>
        </span>
      </label>
      <input
        id="f01-arquivo"
        type="file"
        accept="application/pdf,image/jpeg,image/png"
        className="sr-only"
        aria-describedby={idErro}
        onChange={(evento) => escolher(evento.target.files?.[0])}
      />
      <p id={idErro} className="f01-erro" aria-live="polite">
        {problema}
      </p>
    </Moldura>
  )
}

// ── Prévia da cidade: o momento de valor ────────────────────────────────────
export function PreviaDaCidade({ progresso, concluir }: PropsDaEtapa) {
  const cidade = cidadePorNome(progresso.cidade)
  const nome = cidade?.nome ?? "sua cidade"
  const membros = cidade ? contagemPublica(cidade.membros) : null
  const numeros: readonly { icone: NomeDeIcone; valor: string | null; rotulo: string }[] = cidade
    ? [
        { icone: "groups", valor: membros, rotulo: "membros verificados" },
        {
          icone: "forum",
          valor: contagemPublica(cidade.perguntasRespondidas),
          rotulo: "perguntas respondidas",
        },
        { icone: "sell", valor: contagemPublica(cidade.desapegos), rotulo: "desapegos à venda" },
        { icone: "group", valor: contagemPublica(cidade.grupos), rotulo: "grupos" },
      ]
    : []
  const visiveis = numeros.filter((item) => item.valor !== null)

  return (
    <Moldura
      larga
      titulo={
        <>
          <span className="f01-selo">
            <Icone nome="verified_user" preenchido /> Vínculo confirmado
          </span>
          Veja um pouco de {nome}
        </>
      }
      texto={
        membros
          ? "É isto que já está acontecendo por lá."
          : `Você está entre os primeiros de ${nome}. Quanto mais gente do meio chegar, mais a cidade ganha vida; dá para começar convidando quem você conhece.`
      }
      aoEnviar={() => concluir()}
      acao={{ rotulo: "Continuar" }}
    >
      {visiveis.length > 0 ? (
        <ul className="f01-numeros">
          {visiveis.map((item) => (
            <li key={item.rotulo}>
              <Icone nome={item.icone} className="f01-numeros-icone" />
              <strong>{item.valor}</strong>
              <span>{item.rotulo}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {cidade?.destaque ? (
        <article className="f01-amostra">
          <p className="f01-amostra-tipo">
            <Icone nome="forum" /> Pergunta da semana
          </p>
          <p className="f01-amostra-titulo">{cidade.destaque.pergunta}</p>
          <p className="f01-amostra-meta">{cidade.destaque.respostas} respostas de membros</p>
        </article>
      ) : null}
      {cidade?.encontro ? (
        <article className="f01-amostra">
          <p className="f01-amostra-tipo">
            <Icone nome="event" /> Próximo encontro
          </p>
          <p className="f01-amostra-titulo">{cidade.encontro.titulo}</p>
          <p className="f01-amostra-meta">{cidade.encontro.quando}</p>
        </article>
      ) : null}
      <p className="f01-nota">
        Números arredondados e mostrados só a partir de 10, para ninguém ser identificado pela
        contagem.
      </p>
    </Moldura>
  )
}

// ── Interesses e grupos, na mesma tela ──────────────────────────────────────
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
      larga
      titulo="O que interessa a você?"
      texto="Marque os assuntos. Os grupos abaixo mudam conforme o que você marca."
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
                {marcado ? <Icone nome="check" className="f01-chip-icone" /> : null}
                {interesse}
              </button>
            </li>
          )
        })}
      </ul>
      <h2 className="f01-subtitulo">Grupos sugeridos</h2>
      <ul className="f01-grupos" aria-live="polite">
        {sugestoes.map(({ grupo, motivo }) => {
          const entrou = grupos.includes(grupo.id)
          return (
            <li key={grupo.id} className="f01-grupo">
              <img src={`${base}${grupo.foto}`} alt="" loading="lazy" />
              <div className="f01-grupo-texto">
                <strong>{grupo.nome}</strong>
                <small>
                  {contagemPublica(grupo.membros) ?? "Grupo novo"} membros · {motivo}
                </small>
              </div>
              <Button
                type="button"
                size="lg"
                variant={entrou ? "secondary" : "default"}
                className="f01-grupo-botao"
                aria-pressed={entrou}
                aria-label={`${entrou ? "Sair de" : "Entrar em"} ${grupo.nome}`}
                onClick={() => setGrupos((atual) => alternar(atual, grupo.id))}
              >
                {entrou ? (
                  <>
                    <Icone nome="check" /> Entrou
                  </>
                ) : (
                  "Entrar"
                )}
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
const REGRAS: readonly { icone: NomeDeIcone; titulo: string; texto: string }[] = [
  {
    icone: "volunteer_activism",
    titulo: "Ajude como gostaria de ser ajudado",
    texto: "Responda com o que você sabe de verdade. Indique quem você usou.",
  },
  {
    icone: "forum",
    titulo: "Discorde sem ofender",
    texto: "Educação sempre. Ofender, ameaçar ou perseguir não é aceito.",
  },
  {
    icone: "shield_person",
    titulo: "Proteja quem está aqui",
    texto:
      "Nada de endereço, telefone, documento ou foto de outra pessoa sem permissão, inclusive de crianças.",
  },
  {
    icone: "groups",
    titulo: "Todos são bem-vindos",
    texto: "Preconceito de origem, cor, religião, gênero, orientação ou família não tem vez.",
  },
]

export function Combinado({ concluir }: PropsDaEtapa) {
  return (
    <Moldura
      titulo="O combinado"
      texto="Quatro coisas que fazem o Bivaque funcionar:"
      aoEnviar={() => concluir()}
      acao={{ rotulo: "Entendi" }}
    >
      <ol className="f01-regras">
        {REGRAS.map((regra) => (
          <li key={regra.titulo}>
            <Icone nome={regra.icone} className="f01-regra-icone" />
            <span>
              <strong>{regra.titulo}</strong>
              <small>{regra.texto}</small>
            </span>
          </li>
        ))}
      </ol>
      <p className="f01-nota">
        Viu algo fora do combinado? Use Denunciar no menu do conteúdo.{" "}
        <a href={`${base}conduta`} target="_blank" rel="noopener noreferrer">
          Código de Conduta completo
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
      titulo="Não perca quando responderem"
      texto="Os avisos chegam assim. Você escolhe quais, e muda depois em Você."
      aoEnviar={() => void ativar()}
      acao={{ rotulo: "Ativar avisos", carregando: pedindo }}
      secundaria={{ rotulo: "Agora não", aoTocar: () => concluir({ avisos: "agora-nao" }) }}
    >
      <div className="f01-notificacoes" aria-hidden="true">
        <div className="f01-notificacao">
          <span className="f01-notificacao-marca">B</span>
          <span>
            <strong>Nova resposta à sua pergunta</strong>
            <small>Carla R.: "A Dra. Lúcia atende pelo FUSEx, terça e quinta."</small>
          </span>
        </div>
        <div className="f01-notificacao">
          <span className="f01-notificacao-marca">B</span>
          <span>
            <strong>Chegadas 2026 · amanhã</strong>
            <small>Café de boas-vindas, 9h. 12 pessoas vão.</small>
          </span>
        </div>
      </div>
      <fieldset className="f01-grupo-de-campos">
        <legend className="f01-rotulo">Quero receber</legend>
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
            <span>{tipo.titulo}</span>
          </label>
        ))}
      </fieldset>
    </Moldura>
  )
}

// ── Boas-vindas ─────────────────────────────────────────────────────────────
const FOTO_DO_MOMENTO: Record<Momento, string> = {
  chegando: "demo/landing-hero.webp",
  morando: "demo/moro-aqui.webp",
  saindo: "demo/saindo.webp",
}

const FRASE_DO_MOMENTO: Record<Momento, string> = {
  chegando: "Quem já chegou guardou as dicas para você: escola, médico, bairro, mudança.",
  morando: "Tem gente chegando que precisa do que você já sabe. E sempre tem algo acontecendo.",
  saindo: "Dá para vender o que não vai, pedir indicação no destino e se despedir direito.",
}

export function BoasVindas({ progresso, concluir }: PropsDaEtapa) {
  const momento = progresso.momento ?? "morando"
  const primeiro = progresso.nome?.nome ?? ""
  return (
    <Moldura
      semCabecalho
      titulo={`Bem-vindo, ${primeiro}.`}
      texto={FRASE_DO_MOMENTO[momento]}
      aoEnviar={() => concluir()}
      acao={{ rotulo: "Ir para o Início" }}
    >
      <figure className="f01-boas-vindas-foto" data-momento={momento}>
        <img src={`${base}${FOTO_DO_MOMENTO[momento]}`} alt="" />
      </figure>
      <ul className="f01-lista-simples">
        <li>
          {progresso.grupos.length > 0
            ? `Você já está em ${progresso.grupos.length} ${progresso.grupos.length === 1 ? "grupo" : "grupos"}.`
            : "Os grupos da sua cidade estão em Comunidade."}
        </li>
        <li>No Início, os primeiros passos mostram por onde começar.</li>
      </ul>
    </Moldura>
  )
}

// ── Início com os primeiros passos ──────────────────────────────────────────
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
      titulo: "Fazer sua primeira pergunta",
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
            titulo: "Tem um negócio? Divulgue aqui",
            feito: feitos.has("negocio"),
          },
        ]
      : []),
  ]
  const concluidos = passos.filter((passo) => passo.feito).length
  const cidade = cidadePorNome(progresso.cidade)

  return (
    <main className="f01-inicio">
      <header className="f01-inicio-topo">
        <span className="f01-inicio-cidade">
          <Icone nome="location_on" /> {cidade?.nome ?? "Sua cidade"}
        </span>
        <span className="f01-inicio-acoes" aria-hidden="true">
          <Icone nome="notifications" />
          <Icone nome="forum" />
        </span>
      </header>
      <h1 className="f01-inicio-titulo" tabIndex={-1}>
        Olá, {progresso.nome?.nome ?? ""}
      </h1>
      <section className="f01-passos" aria-labelledby="f01-passos-titulo">
        <div className="f01-passos-cabeca">
          <h2 id="f01-passos-titulo">Primeiros passos</h2>
          <span>
            {concluidos} de {passos.length}
          </span>
        </div>
        <div
          className="f01-progresso f01-progresso-passos"
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
                <span>{passo.titulo}</span>
                {passo.feito ? (
                  <span className="sr-only">(feito)</span>
                ) : (
                  <Icone nome="chevron_right" />
                )}
              </button>
            </li>
          ))}
        </ul>
      </section>
      <section className="f01-inicio-amostra" aria-label="Acontecendo na cidade">
        <h2>Acontecendo em {cidade?.nome ?? "sua cidade"}</h2>
        {cidade?.destaque ? (
          <article className="f01-amostra">
            <p className="f01-amostra-tipo">
              <Icone nome="forum" /> Pergunta sem resposta
            </p>
            <p className="f01-amostra-titulo">{cidade.destaque.pergunta}</p>
          </article>
        ) : (
          <p className="f01-nota">Ainda calmo por aqui. Que tal fazer a primeira pergunta?</p>
        )}
      </section>
      <Button type="button" variant="ghost" className="f01-recomecar" onClick={aoRecomecar}>
        <Icone nome="refresh" /> Recomeçar a prévia
      </Button>
    </main>
  )
}
