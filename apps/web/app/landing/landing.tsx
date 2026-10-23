/* biome-ignore-all lint/performance/noImgElement: fotos finais em WebP com art direction, carregadas antes da captura da comparação (PORT-001) */
import Link from "next/link"
import { MaterialFilledButton } from "../components/material/filled-button"
import { MaterialIcon } from "../components/material/material-icon"
import { materialSymbols, notoSans, notoSerif } from "../fonts/landing-fonts"
import "../brand-tokens.css"
import { BrandMark } from "./brand-mark"
import { LandingBehavior } from "./landing-behavior"
import "./landing.css"

// PORT-001 (R73): a landing v8 do protótipo (R71 e R72), palavra por palavra.
// Este arquivo é servidor: nenhum texto da página vira estado de cliente. A
// interatividade mora em <LandingBehavior />, e os CTAs no adaptador cliente do
// Material Web, que recebe o texto como children daqui.
//
// As fotos são <img> e não <Image /> de propósito: o topo usa <picture> para a
// versão retrato (art direction que o next/image não faz sem getImageProps) e
// todas as imagens precisam carregar antes da captura de comparação, sem
// lazy-load. Os arquivos já são WebP no tamanho final.
//
// O que saiu do protótipo, e por quê: nada de conteúdo. "Ajuda" e "Fale com a
// gente" voltaram na PORT-006, quando /ajuda passou a ser pública
// (ADR-20261022-entrada-do-prototipo, item 7): antes os dois abriam uma rota
// autenticada e por isso tinham ficado de fora da landing.
const FORCES = "Marinha, Exército e Aeronáutica"
const TITLE = "Juntos somos mais fortes."
const LEAD =
  "A família militar se ajuda, em qualquer cidade: pergunte a quem já mora perto, ache serviços e imóveis, passe adiante o que não usa mais. Gratuito para militares, veteranos, pensionistas e suas famílias."

const NAV = [
  { id: "exemplo", label: "Como funciona", icon: "forum" },
  { id: "recursos", label: "O que tem", icon: "sell" },
  { id: "mudanca", label: "Mudança de cidade", icon: "map" },
  { id: "perguntas", label: "Perguntas", icon: "help" },
] as const

const FEATURES = [
  ["forum", "Indicações", "Pergunte e escolha com base no que funcionou para quem mora perto."],
  [
    "sell",
    "Serviços e negócios",
    "Profissionais e comércios que outras famílias já contrataram e recomendam.",
  ],
  [
    "apartment",
    "Imóveis e desapegos",
    "Aluguel, venda e o que sobrou da mudança, entre famílias militares.",
  ],
  [
    "groups",
    "Grupos e eventos",
    "Quem corre, quem tem filhos da mesma idade, quem quer só um café.",
  ],
] as const

const CHECKS = [
  "Moradia: bairros e imóveis indicados",
  "Escola das crianças",
  "Saúde e plano",
  "A mudança, na ordem",
] as const

const STEPS = [
  ["Crie sua conta", "Com e-mail e senha ou com o Google."],
  [
    "Confirme seu vínculo",
    "Informe seu CPF. Quem chegou por convite de um familiar militar não precisa.",
  ],
  ["Escolha sua cidade", "Onde você mora ou para onde vai. Qualquer cidade do Brasil."],
] as const

const FAQ = [
  [
    "Quem pode participar?",
    "Militares da Marinha, do Exército e da Aeronáutica, da ativa ou veteranos, pensionistas e as famílias de todos eles.",
  ],
  [
    "É gratuito?",
    "Sim. Tudo no Bivaque é gratuito: entrar, perguntar, responder e usar o plano de mudança.",
  ],
  [
    "Como familiares participam?",
    "Quem é militar cria o convite no próprio app e envia. Quem recebe faz o mesmo cadastro, sem a etapa do CPF.",
  ],
  [
    "Como funciona a confirmação pelo CPF?",
    "Você informa o CPF e o Bivaque confere seu vínculo militar, que é um dado público. O número serve só para isso e não fica salvo. Se a confirmação não sair na hora, o cadastro mostra o que fazer em seguida.",
  ],
  [
    "O Bivaque é ligado às Forças Armadas?",
    "É uma comunidade independente, feita pela família militar.",
  ],
  [
    "Posso escolher qualquer cidade?",
    "Sim. Escolha onde você mora ou para onde vai. O que você perguntar e indicar fica lá para quem chegar depois, e você pode chamar quem já conhece.",
  ],
] as const

// A pergunta do CPF abre: é a dúvida que trava o cadastro.
const FAQ_OPEN = 3

function Cta({ id }: Readonly<{ id?: string }>) {
  return (
    <MaterialFilledButton href="/signup" id={id}>
      Criar conta
    </MaterialFilledButton>
  )
}

function Thread() {
  return (
    <figure className="ld-thread" id="ld-thread">
      <div className="ld-thread-top">
        <span className="ld-chip">Casa</span>Manaus · Adrianópolis
        <span className="ld-illus">Conversa ilustrativa</span>
      </div>
      <div className="ld-msg q">
        <span className="ld-av q" aria-hidden="true">
          MA
        </span>
        <div>
          <span className="ld-who">
            <b>Marina A.</b>
          </span>
          <p>Alguém indica um eletricista de confiança aqui no bairro?</p>
        </div>
      </div>
      <div className="ld-msg b">
        <span className="ld-av b" aria-hidden="true">
          PS
        </span>
        <div>
          <span className="ld-who">
            <b>Paulo S.</b>
          </span>
          <p>O Sérgio, que refez a fiação aqui de casa. Pontual e cobra o combinado.</p>
          <span className="ld-useful">
            <MaterialIcon name="thumb_up" />
            Marcada como útil
          </span>
        </div>
      </div>
      <div className="ld-msg c">
        <span className="ld-av c" aria-hidden="true">
          RT
        </span>
        <div>
          <span className="ld-who">
            <b>Renata T.</b>
          </span>
          <p>Peça o orçamento por escrito. Comigo foi tranquilo.</p>
        </div>
      </div>
      <div className="ld-done">
        <MaterialIcon name="check" />
        Resolvida · Marina marcou a indicação que funcionou
      </div>
      <figcaption className="sr">
        Conversa ilustrativa mostrando uma pergunta resolvida pela comunidade.
      </figcaption>
    </figure>
  )
}

export function LandingPage() {
  return (
    <div
      className={`ld bv-skin ${notoSans.variable} ${notoSerif.variable} ${materialSymbols.variable}`}
      id="landing"
    >
      <a className="ld-skip" href="#ld-main" data-landing-anchor="ld-main">
        Pular para o conteúdo
      </a>

      <header className="ld-top" id="ld-top">
        <div className="ld-wrap ld-top-in">
          <a
            className="ld-home"
            href="#inicio"
            data-landing-anchor="inicio"
            aria-label="Bivaque, início"
          >
            <BrandMark />
            <b>Bivaque</b>
          </a>
          <nav className="ld-nav" aria-label="Seções">
            <span className="ld-pill" aria-hidden="true" />
            {NAV.map((item) => (
              <a key={item.id} href={`#${item.id}`} data-landing-anchor={item.id}>
                {item.label}
              </a>
            ))}
          </nav>
          <div className="ld-actions">
            <Link className="ld-text" href="/login">
              Entrar
            </Link>
            <span className="ld-cta">
              <Cta />
            </span>
            <button
              type="button"
              className="ld-menu-btn"
              data-ld-menu=""
              aria-label="Abrir menu"
              aria-expanded={false}
              aria-controls="ld-sheet"
            >
              <MaterialIcon name="menu" />
            </button>
          </div>
        </div>
      </header>

      <main id="ld-main" tabIndex={-1}>
        <section className="ld-hero" id="inicio" aria-labelledby="ld-h1">
          <picture className="ld-hero-media">
            <source media="(max-width:860px)" srcSet="/landing/v8/hero-retrato.webp" />
            <img
              src="/landing/v8/hero.webp"
              alt="Famílias reunidas num fim de tarde, conversando em volta de uma mesa ao ar livre"
              width={1536}
              height={864}
            />
          </picture>
          <div className="ld-wrap ld-hero-in">
            <div className="ld-hero-copy">
              <p className="ld-forces">{FORCES}</p>
              <h1 id="ld-h1">{TITLE}</h1>
              <p className="ld-lead">{LEAD}</p>
              <Cta id="ld-hero-cta" />
              <p className="ld-note">
                Familiar de militar? O convite leva ao mesmo cadastro, sem CPF.
              </p>
            </div>
          </div>
        </section>

        <section className="ld-sec ld-ex" id="exemplo">
          <div className="ld-wrap">
            <div>
              <p className="ld-kicker">Como funciona</p>
              <h2>Uma pergunta, várias famílias respondendo</h2>
              <p className="ld-sub">
                Quem já passou por isso indica. A indicação que funcionou fica guardada para quem
                chegar depois.
              </p>
            </div>
            <Thread />
          </div>
        </section>

        <section className="ld-sec ld-alt ld-feat" id="recursos">
          <div className="ld-wrap">
            <div>
              <p className="ld-kicker">O que tem</p>
              <h2>O que a gente resolve junto, na sua cidade</h2>
              <p className="ld-sub">
                Cada cidade tem a sua comunidade, feita de quem já passou por lá.
              </p>
              <ul className="ld-list">
                {FEATURES.map(([icon, title, text]) => (
                  <li key={title}>
                    <i>
                      <MaterialIcon name={icon} />
                    </i>
                    <div>
                      <b>{title}</b>
                      <span>{text}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <figure className="ld-shot">
              <img
                src="/landing/v8/app-comunidade.webp"
                alt="Tela Comunidade do Bivaque com perguntas resolvidas"
                width={780}
                height={1400}
              />
              <figcaption>Tela da Comunidade no app · dados de exemplo</figcaption>
            </figure>
          </div>
        </section>

        <section className="ld-sec ld-move" id="mudanca">
          <div className="ld-wrap">
            <figure className="ld-shot">
              <img
                src="/landing/v8/app-inicio.webp"
                alt="Tela Início do Bivaque com o plano de chegada"
                width={780}
                height={1688}
              />
              <figcaption>Plano de chegada no app · dados de exemplo</figcaption>
            </figure>
            <div>
              <p className="ld-kicker">Mudança de cidade</p>
              <h2>Transferido? Chegue sabendo.</h2>
              <p className="ld-sub">
                Um plano para quem vai chegar ou sair, montado com o que a comunidade da cidade já
                sabe.
              </p>
              <ul className="ld-checks">
                {CHECKS.map((text) => (
                  <li key={text}>
                    <MaterialIcon name="check" />
                    {text}
                  </li>
                ))}
              </ul>
              <p className="ld-move-foot">Funciona para onde você mora e para onde vai.</p>
            </div>
          </div>
        </section>

        <section className="ld-sec ld-alt" id="participar">
          <div className="ld-wrap">
            <p className="ld-kicker">Como participar</p>
            <h2>Três passos para entrar</h2>
            <ol className="ld-steps">
              {STEPS.map(([title, text]) => (
                <li key={title}>
                  <b>{title}</b>
                  <span>{text}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="ld-sec ld-faq" id="perguntas">
          <div className="ld-wrap">
            <div>
              <p className="ld-kicker">Perguntas</p>
              <h2>Perguntas frequentes</h2>
              <p className="ld-sub">
                Outra dúvida?{" "}
                <Link className="ld-inline" href="/ajuda#fale-com-a-gente">
                  Fale com a gente
                </Link>
              </p>
            </div>
            <div>
              {FAQ.map(([question, answer], index) => (
                <details key={question} open={index === FAQ_OPEN}>
                  <summary>
                    {question}
                    <MaterialIcon name="expand_more" />
                  </summary>
                  <p>{answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="ld-final" id="fim">
          <img src="/landing/v8/encontro.webp" alt="" width={1024} height={768} />
          <div className="ld-wrap">
            <h2>Entre na comunidade da sua cidade.</h2>
            <p>Juntos somos mais fortes.</p>
            <Cta />
          </div>
        </section>
      </main>

      <footer className="ld-footer">
        <div className="ld-wrap">
          <span className="ld-who">
            <BrandMark />
            Bivaque · Comunidade independente da família militar
          </span>
          <nav aria-label="Rodapé">
            <Link className="ld-link" href="/login">
              Entrar
            </Link>
            <Link className="ld-link" href="/ajuda">
              Ajuda
            </Link>
            <Link className="ld-link" href="/privacidade">
              Privacidade
            </Link>
            <Link className="ld-link" href="/codigo-de-conduta">
              Código de conduta
            </Link>
          </nav>
          <small>© 2026 Bivaque</small>
        </div>
      </footer>

      <div className="ld-bar" id="ld-bar">
        <Cta />
      </div>

      <div className="ld-sheet" id="ld-sheet" role="dialog" aria-modal="true" aria-label="Menu">
        <div className="ld-sheet-head">
          <a
            className="ld-home"
            href="#inicio"
            data-landing-anchor="inicio"
            aria-label="Bivaque, início"
          >
            <BrandMark />
            <b>Bivaque</b>
          </a>
          <button type="button" className="ld-menu-btn" data-ld-close="" aria-label="Fechar menu">
            <MaterialIcon name="close" />
          </button>
        </div>
        <nav aria-label="Seções">
          {NAV.map((item) => (
            <a key={item.id} href={`#${item.id}`} data-landing-anchor={item.id}>
              <MaterialIcon name={item.icon} />
              {item.label}
            </a>
          ))}
        </nav>
        <div className="ld-sheet-acts">
          <Cta />
          <Link className="ld-link" href="/login">
            Já tenho conta · Entrar
          </Link>
        </div>
        <div className="ld-sheet-legal">
          <Link className="ld-link" href="/ajuda">
            Ajuda
          </Link>
          <Link className="ld-link" href="/privacidade">
            Privacidade
          </Link>
          <Link className="ld-link" href="/codigo-de-conduta">
            Código de conduta
          </Link>
        </div>
      </div>

      <LandingBehavior />
    </div>
  )
}
