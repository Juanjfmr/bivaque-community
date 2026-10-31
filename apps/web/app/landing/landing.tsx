"use client"

import { PROVIDER_CATEGORY_LABELS, type ProviderCategory } from "@bivaque/domain"
import { Button } from "@heroui/react"
import {
  ArrowDown,
  ArrowRight,
  ChevronDown,
  HeartHandshake,
  MapPin,
  MessageCircle,
  MoveUpRight,
  ShieldCheck,
  Tent,
} from "lucide-react"
import {
  AnimatePresence,
  domAnimation,
  LazyMotion,
  m,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react"
import Image from "next/image"
import Link from "next/link"
import { useRef, useState } from "react"
import { MemberAvatar } from "../components/bivaque/avatar"
import { cityDestination } from "../components/bivaque/feed-post-audience"
import { PostPreview } from "../components/bivaque/feed-post-preview"
import styles from "./landing.module.css"

// ---------------------------------------------------------------------------
// Conteúdo. Tudo aqui respeita os limites de verdade do brief: nenhum número,
// depoimento ou serviço oficial inventado; a demonstração é sempre rotulada;
// normas e prazos ficam como "consulte a norma vigente" no canal oficial.
// ---------------------------------------------------------------------------

const TOPICS = [
  {
    label: "A mudança",
    city: "Recife, PE",
    name: "Recife",
    question: "Estou de mudança para Recife. Alguém tem dicas para organizar a chegada?",
    reply:
      "Fiz esse caminho também. Comece pelo bairro e pelo trajeto da rotina. Posso compartilhar o que me ajudou.",
    takeaway: "Uma mudança fica mais leve com a experiência de quem já fez o caminho.",
  },
  {
    label: "A escola",
    city: "Brasília, DF",
    name: "Brasília",
    question: "Chegamos a Brasília com as crianças. Por onde começar a procurar uma escola?",
    reply:
      "Também cheguei com essa dúvida. Vale visitar as escolas do bairro e perguntar sobre a transferência. Vamos trocar referências?",
    takeaway: "Uma pergunta encontra alguém que entende o que está em jogo.",
  },
  {
    label: "O dia a dia",
    city: "Manaus, AM",
    name: "Manaus",
    question: "Sou nova em Manaus e quero conhecer gente. Como encontro as comunidades por aqui?",
    reply:
      "Bem-vinda! Explore as comunidades da cidade e os grupos que combinam com seus interesses. A conversa pode começar por aí.",
    takeaway: "Um lugar começa a ser seu quando você encontra com quem dividir a rotina.",
  },
] as const

const PHASES = [
  {
    index: "01",
    title: "Antes de viajar",
    linkLabel: "O que fazer antes de viajar — no Guia",
    href: "/guide",
    questions: [
      "Quanto tempo tenho de trânsito e de instalação?",
      "O que a União cobre no transporte da mudança?",
      "Como funciona a ajuda de custo?",
      "Quanta bagagem posso levar — e como se calcula a cubagem?",
      "E se a transferência for ex officio?",
      "Como transfiro meu filho de escola no meio do ano?",
      "Meu filho pequeno tem creche ou pré-escola?",
    ],
  },
  {
    index: "02",
    title: "Na chegada",
    linkLabel: "Como se apresentar e se instalar — no Guia",
    href: "/guide",
    questions: [
      "Onde e quando eu me apresento na nova OM?",
      "Como fica o atendimento de saúde na nova guarnição?",
      "Onde vou morar: vila, aluguel, casa?",
      "Quais documentos levar na mão?",
    ],
  },
  {
    index: "03",
    title: "Depois de chegar",
    linkLabel: "Com quem dividir a chegada — nas Comunidades",
    href: "/communities",
    questions: [
      "Como conheço outras famílias?",
      "Meu cônjuge vai conseguir trabalhar?",
      "Como preparar as crianças para a mudança?",
      "Quanto tempo vou ficar? Qual o tempo de sede — e quando vem a próxima?",
    ],
  },
] as const

const CITIES = [
  {
    name: "Recife",
    uf: "PE",
    flavor: "Perguntas de chegada respondidas por quem vive a cidade.",
  },
  {
    name: "Brasília",
    uf: "DF",
    flavor: "A mudança para a capital, contada por quem já foi transferido.",
  },
  {
    name: "Manaus",
    uf: "AM",
    flavor: "A cidade-piloto do Bivaque, com a rede viva.",
  },
] as const

const STEPS = [
  {
    number: "01",
    title: "Escolha a cidade",
    copy: "Veja o que a cidade tem: bairros, escolas, serviços, rotina.",
    linkLabel: "Abrir o Guia",
    href: "/guide",
  },
  {
    number: "02",
    title: "Encontre a sua turma",
    copy: "Comunidades por cidade e por interesse; grupos que já passaram pela mesma mudança.",
    linkLabel: "Ver Comunidades",
    href: "/communities",
  },
  {
    number: "03",
    title: "Devolva o que você aprendeu",
    copy: "A dica que teria feito diferença para você ajuda quem chega depois.",
    linkLabel: "Publicar uma pergunta",
    href: "/publicacoes/nova",
  },
] as const

const QUESTIONS = [
  {
    title: "O Bivaque é oficial?",
    text: "Não. O Bivaque é uma iniciativa comunitária independente, sem vínculo oficial com as Forças Armadas. Organiza a pergunta, junta quem já passou por isso e aponta o caminho oficial — não substitui o órgão nem garante vaga, benefício ou moradia.",
  },
  {
    title: "Quem pode entrar?",
    text: "Militares das Forças Armadas, veteranos, pensionistas e dependentes elegíveis. A elegibilidade é verificada antes da participação — cada vínculo segue o caminho de entrada correspondente.",
  },
  {
    title: "Como funciona a entrada de familiares?",
    text: "Por convite. Quem já participa convida, e o familiar cria a própria conta, com a própria história e a própria autonomia.",
  },
  {
    title: "Posso conhecer outra cidade antes de me mudar?",
    text: "Sim. Você pode explorar outras localidades e buscar referências para a chegada: o guia, as comunidades, os serviços indicados. Participar de uma comunidade depende das regras de entrada daquela comunidade.",
  },
  {
    title: "O que acontece com os meus dados?",
    text: "Dados de família, cidade, escola e saúde são sensíveis — e o Bivaque os trata com essa seriedade. A política de privacidade explica o que é coletado, como é usado e como você exerce os seus direitos.",
    link: { label: "Ler a política de privacidade", href: "/privacidade" },
  },
  {
    title: "Preciso pagar?",
    text: "Não. Participar do Bivaque hoje é gratuito — não existe cobrança nem plano pago.",
  },
] as const

const PROVIDER_LABELS = Object.entries(PROVIDER_CATEGORY_LABELS) as [ProviderCategory, string][]

function Wordmark() {
  return (
    <span className={styles["wordmark"]}>
      <Tent aria-hidden="true" strokeWidth={1.7} />
      Bivaque<span className={styles["brandDot"]}>.</span>
    </span>
  )
}

function JoinLink({ children = "Encontre a sua rede" }: { children?: string }) {
  return (
    <Link href={{ pathname: "/signup" }} className={styles["primaryAction"]}>
      {children}
      <ArrowRight size={18} aria-hidden="true" />
    </Link>
  )
}

/** Mapa esquemático da rede — ilustração, nunca dado. */
function NetworkMap() {
  return (
    <div
      className={styles["mapStage"]}
      role="img"
      aria-label="Mapa esquemático da rede do Bivaque: arcos ligando Recife, Brasília e Manaus, com um ponto vazio para a sua próxima cidade. Ilustração, sem dados reais."
    >
      <svg
        className={styles["mapArcs"]}
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path className={styles["arcSolid"]} d="M76 26 Q 88 50 46 72" />
        <path className={styles["arcSolid"]} d="M46 72 Q 12 52 16 22" />
        <path className={styles["arcSolid"]} d="M16 22 Q 46 0 76 26" />
        <path className={styles["arcGhost"]} d="M80 70 Q 72 86 46 72" />
      </svg>
      <span className={`${styles["mapNode"]} ${styles["mapNodeManaus"]}`}>
        <i aria-hidden="true" />
        Manaus
      </span>
      <span className={`${styles["mapNode"]} ${styles["mapNodeRecife"]}`}>
        <i aria-hidden="true" />
        Recife
      </span>
      <span className={`${styles["mapNode"]} ${styles["mapNodeBrasilia"]}`}>
        <i aria-hidden="true" />
        Brasília
      </span>
      <span className={`${styles["mapNode"]} ${styles["mapNodeNext"]}`}>
        <i aria-hidden="true" />A sua próxima
      </span>
    </div>
  )
}

function LandingExperience() {
  const heroRef = useRef<HTMLElement>(null)
  const reducedMotion = useReducedMotion()
  const [topicIndex, setTopicIndex] = useState(0)
  const topic = TOPICS[topicIndex] ?? TOPICS[0]
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] })
  const photoY = useTransform(scrollYProgress, [0, 1], [0, 45])
  const threadLength = useTransform(scrollYProgress, [0, 0.7], [0.42, 1])

  return (
    <div className={styles["root"]}>
      <a href="#conteudo" className={styles["skipLink"]}>
        Pular para o conteúdo
      </a>

      <header className={styles["header"]}>
        <Link href="/" aria-label="Bivaque, início" className={styles["brandLink"]}>
          <Wordmark />
        </Link>
        <nav className={styles["nav"]} aria-label="Navegação principal">
          <a href="#como-funciona">Como funciona</a>
          <a href="#por-perto">A rede</a>
          <a href="#perguntas">Dúvidas</a>
        </nav>
        <Link href="/login" className={styles["login"]}>
          Já faço parte <ArrowRight size={17} aria-hidden="true" />
        </Link>
      </header>

      <main id="conteudo">
        <section ref={heroRef} className={styles["hero"]} aria-labelledby="hero-title">
          <div className={styles["heroCopy"]}>
            <p className={styles["eyebrow"]}>Militares · Veteranos · Pensionistas · Famílias</p>
            <h1 id="hero-title" className={styles["display"]}>
              <span className={styles["srOnly"]}>Bivaque. </span>
              Muda a cidade.
              <br />
              <em>Fica a sua rede.</em>
            </h1>
          </div>
          <div className={styles["heroText"]}>
            <p className={styles["heroLead"]} data-reading-measure>
              A remoção chega, o endereço muda — e o que sustenta a sua vida não precisa começar do
              zero. O Bivaque reúne o guia da nova cidade, as comunidades locais e gente que já fez
              esse caminho.
            </p>
            <div className={styles["heroActions"]}>
              <JoinLink />
              <a href="#como-funciona" className={styles["textAction"]}>
                Ver como funciona <ArrowDown size={16} aria-hidden="true" />
              </a>
            </div>
            <p className={styles["forWhom"]}>
              Para militares, veteranos, pensionistas e suas famílias. Cada história tem lugar aqui.
            </p>
          </div>

          <div className={styles["heroScene"]}>
            <div className={styles["photoFrame"]}>
              <m.div className={styles["photoMotion"]} style={{ y: reducedMotion ? 0 : photoY }}>
                <Image
                  src="/landing/chegada-editorial.webp"
                  alt="Uma mulher chega com uma planta à casa nova e é recebida por uma vizinha em uma rua brasileira ensolarada. Cena ilustrativa."
                  fill
                  priority
                  sizes="(max-width: 700px) 92vw, (max-width: 1100px) 49vw, 620px"
                  className={styles["heroPhoto"]}
                />
              </m.div>
              <span className={styles["photoCaption"]}>
                Cena ilustrativa — chegada a uma casa nova
              </span>
            </div>
            <svg
              className={styles["heroThread"]}
              viewBox="0 0 640 640"
              fill="none"
              aria-hidden="true"
            >
              <m.path
                d="M630 45C420 -30 215 20 252 130C285 221 569 111 574 268C578 394 156 287 101 422C57 530 281 579 372 512C456 450 594 526 609 640"
                style={{ pathLength: reducedMotion ? 1 : threadLength }}
              />
            </svg>
            <a href="#a-remocao" className={styles["helloNote"]}>
              <span className={styles["noteIcon"]}>
                <MessageCircle size={20} aria-hidden="true" />
              </span>
              <span>
                <small>O próximo capítulo começa com uma pergunta</small>
                <strong>“A remoção saiu. E agora?”</strong>
              </span>
              <MoveUpRight size={20} aria-hidden="true" />
            </a>
            <span className={styles["sceneIndex"]} aria-hidden="true">
              01 / CHEGAR
            </span>
          </div>
        </section>

        <div className={styles["journeyStrip"]}>
          <span>
            <MapPin size={16} aria-hidden="true" /> De onde você vem
          </span>
          <span className={styles["stripLine"]} aria-hidden="true">
            <i />
          </span>
          <span className={styles["stripCenter"]}>
            <Tent size={21} aria-hidden="true" /> A rede vai junto
          </span>
          <span className={styles["stripLine"]} aria-hidden="true">
            <i />
          </span>
          <span>
            Para onde a vida leva <ArrowRight size={16} aria-hidden="true" />
          </span>
        </div>

        <section id="a-remocao" className={styles["chapter"]} aria-labelledby="chapter-001-title">
          <div className={styles["chapterInner"]}>
            <div className={styles["chapterIntro"]}>
              <p className={styles["chapterNumber"]} aria-hidden="true">
                001
              </p>
              <p className={`${styles["kicker"]} ${styles["onStrong"]}`}>
                001 · O que resolver quando a remoção sai
              </p>
              <h2 id="chapter-001-title" className={`${styles["display"]} ${styles["onStrong"]}`}>
                A lista que ninguém entrega junto com o boletim.
              </h2>
              <p
                className={`${styles["chapterLead"]} ${styles["onStrongMuted"]}`}
                data-reading-measure
              >
                Reunimos as perguntas que toda família faz quando a remoção sai — e onde procurar
                cada resposta.
              </p>
              <div className={styles["honestyNote"]}>
                <ShieldCheck size={22} aria-hidden="true" />
                <p>
                  O Bivaque organiza a pergunta, junta quem já passou por isso e aponta o caminho
                  oficial. Não substitui o órgão nem garante vaga, benefício ou moradia.
                </p>
              </div>
              <div className={styles["collage"]}>
                <div
                  className={styles["collagePhoto"]}
                  role="img"
                  aria-label="Pessoas de diferentes gerações conversando em torno de uma mesa de café ao ar livre. Cena ilustrativa."
                />
                <span className={styles["collageCaption"]}>
                  Cena ilustrativa — a mesa onde a rede se encontra
                </span>
              </div>
            </div>

            <ol className={styles["phases"]}>
              {PHASES.map((phase) => (
                <li key={phase.title} className={styles["phase"]}>
                  <div className={styles["phaseHead"]}>
                    <span className={styles["phaseIndex"]}>{phase.index}</span>
                    <h3 className={styles["onStrong"]}>{phase.title}</h3>
                  </div>
                  <ul className={styles["phaseQuestions"]}>
                    {phase.questions.map((question) => (
                      <li key={question} className={styles["onStrongMuted"]}>
                        {question}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={phase.href}
                    className={`${styles["phaseLink"]} ${styles["onStrong"]}`}
                  >
                    {phase.linkLabel} <ArrowRight size={15} aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="por-perto" className={styles["mapChapter"]} aria-labelledby="map-title">
          <div className={styles["mapIntro"]}>
            <p className={styles["kicker"]}>002 · De cidade em cidade</p>
            <h2 id="map-title" className={styles["display"]}>
              Cada cidade tem um jeito de chegar. <em>Alguém aqui já sabe qual é.</em>
            </h2>
            <p className={styles["sectionLead"]} data-reading-measure>
              Do guia local às comunidades e aos serviços indicados, a rede chega antes de você — e
              fica depois que você chega.
            </p>
          </div>

          <div className={styles["mapBlock"]}>
            <NetworkMap />
            <ul className={styles["mapLegend"]} aria-label="O que existe em cada cidade">
              <li>
                <span className={styles["legendDot"]} aria-hidden="true" /> Guia da cidade
              </li>
              <li>
                <span className={styles["legendRing"]} aria-hidden="true" /> Comunidades
              </li>
              <li>
                <span className={styles["legendSquare"]} aria-hidden="true" /> Serviços indicados
              </li>
            </ul>
            <p className={styles["mapFootnote"]}>
              Ilustração esquemática — a rede em desenho, sem números.
            </p>
          </div>

          <div className={styles["cityRows"]}>
            <p className={styles["demoTag"]}>Demonstração — exemplos ilustrativos</p>
            {CITIES.map((city) => (
              <article key={city.name} className={styles["cityRow"]}>
                <div className={styles["cityName"]}>
                  <span className={styles["cityPin"]} aria-hidden="true">
                    <MapPin size={16} />
                  </span>
                  <h3>
                    {city.name} <span>{city.uf}</span>
                  </h3>
                  <p>{city.flavor}</p>
                </div>
                <ul className={styles["cityChips"]}>
                  <li>Guia da cidade</li>
                  <li>Comunidades</li>
                  <li>Serviços indicados</li>
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section id="como-funciona" className={styles["steps"]} aria-labelledby="steps-title">
          <p className={styles["kicker"]}>003 · Como funciona</p>
          <h2 id="steps-title" className={styles["display"]}>
            Você escolhe a cidade. <em>A rede faz o caminho com você.</em>
          </h2>
          <ol className={styles["stepsList"]}>
            {STEPS.map((step) => (
              <li key={step.number} className={styles["step"]}>
                <span className={styles["stepNumber"]} aria-hidden="true">
                  {step.number}
                </span>
                <div className={styles["stepCopy"]}>
                  <h3>{step.title}</h3>
                  <p>{step.copy}</p>
                </div>
                <Link href={step.href} className={styles["stepLink"]}>
                  {step.linkLabel} <ArrowRight size={15} aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ol>
        </section>

        <section
          className={`${styles["chapter"]} ${styles["demoChapter"]}`}
          aria-labelledby="demo-title"
        >
          <div className={styles["chapterInner"]}>
            <div className={styles["demoIntro"]}>
              <p className={`${styles["kicker"]} ${styles["onStrong"]}`}>
                A conversa, em tamanho real
              </p>
              <h2 id="demo-title" className={`${styles["display"]} ${styles["onStrong"]}`}>
                Uma dúvida real. Uma resposta de quem já passou.
              </h2>
              <p
                className={`${styles["chapterLead"]} ${styles["onStrongMuted"]}`}
                data-reading-measure
              >
                Escolha um exemplo e veja como uma pergunta encontra quem entende o que está em
                jogo.
              </p>
              <p className={`${styles["demoLabel"]} ${styles["onStrongMuted"]}`}>
                Demonstração · pessoas e conversas ilustrativas
              </p>
            </div>

            <div className={styles["demoStage"]}>
              <fieldset className={styles["topics"]}>
                <legend className={styles["srOnly"]}>Escolha um exemplo de conversa</legend>
                {TOPICS.map((item, index) => (
                  <Button
                    key={item.label}
                    variant="tertiary"
                    aria-pressed={index === topicIndex}
                    aria-controls="conversation-example"
                    onPress={() => setTopicIndex(index)}
                    className={styles["topic"] ?? ""}
                  >
                    {item.label}
                  </Button>
                ))}
              </fieldset>
              <div
                id="conversation-example"
                className={styles["conversation"]}
                aria-live="polite"
                aria-atomic="true"
              >
                <div className={styles["exampleHeader"]}>
                  <Wordmark />
                  <span>
                    <MapPin size={14} aria-hidden="true" />
                    {topic.city}
                  </span>
                </div>
                <AnimatePresence initial={false} mode="wait">
                  <m.div
                    key={topic.label}
                    initial={{ opacity: 0, y: reducedMotion ? 0 : 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: reducedMotion ? 1 : 0 }}
                    transition={{ duration: reducedMotion ? 0 : 0.25 }}
                  >
                    <PostPreview
                      destination={cityDestination(topic.name)}
                      destinationLoading={false}
                      authorName="Mariana"
                      authorLoading={false}
                      content={topic.question}
                      placeName={topic.name}
                    />
                    <div className={styles["reply"]}>
                      <MemberAvatar name="Ana" size="sm" />
                      <div>
                        <strong>
                          Ana <span>compartilha uma experiência</span>
                        </strong>
                        <p>{topic.reply}</p>
                      </div>
                    </div>
                  </m.div>
                </AnimatePresence>
                <div className={styles["takeaway"]}>
                  <HeartHandshake size={20} aria-hidden="true" />
                  <p>{topic.takeaway}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className={styles["services"]} aria-labelledby="services-title">
          <div className={styles["servicesIntro"]}>
            <p className={styles["kicker"]}>Serviços indicados</p>
            <h2 id="services-title" className={styles["display"]}>
              Quem faz acontecer <em>na sua nova cidade.</em>
            </h2>
            <p className={styles["sectionLead"]} data-reading-measure>
              Serviços indicados pela comunidade e organizados nas doze categorias do Bivaque — da
              mudança e transporte à educação e aulas.
            </p>
            <Link href="/explorar/servicos" className={styles["servicesLink"]}>
              Explorar serviços <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>
          <ol className={styles["categoryWall"]}>
            {PROVIDER_LABELS.map(([category, label], index) => (
              <li key={category}>
                <span className={styles["categoryIndex"]}>
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className={styles["categoryName"]}>{label}</span>
              </li>
            ))}
          </ol>
        </section>

        <section id="perguntas" className={styles["questions"]} aria-labelledby="questions-title">
          <div>
            <p className={styles["kicker"]}>
              <ShieldCheck size={16} aria-hidden="true" /> Pertencer começa com confiança
            </p>
            <h2 id="questions-title" className={styles["display"]}>
              Antes do <em>primeiro olá.</em>
            </h2>
            <p className={styles["sectionLead"]} data-reading-measure>
              As respostas diretas, antes de você criar a sua conta.
            </p>
          </div>
          <div className={styles["accordion"]}>
            {QUESTIONS.map((item) => (
              <details key={item.title}>
                <summary>
                  {item.title}
                  <ChevronDown size={20} aria-hidden="true" />
                </summary>
                <p data-reading-measure>
                  {item.text}
                  {"link" in item && item.link ? (
                    <>
                      {" "}
                      <Link href={item.link.href}>{item.link.label}</Link>
                    </>
                  ) : null}
                </p>
              </details>
            ))}
          </div>
        </section>

        <section className={styles["reciprocity"]} aria-labelledby="reciprocity-title">
          <div className={styles["reciprocityInner"]}>
            <p className={`${styles["kicker"]} ${styles["onStrong"]}`}>004 · Acolher</p>
            <h2 id="reciprocity-title" className={`${styles["display"]} ${styles["onStrong"]}`}>
              Um dia, você chega.
              <br />
              No outro, <em>você acolhe.</em>
            </h2>
            <p className={styles["reciprocityLine"]}>
              A escola que você descobriu. O serviço que deu certo. O bairro que ninguém te contou.
            </p>
            <p className={`${styles["reciprocitySub"]} ${styles["onStrongMuted"]}`}>
              O que hoje ajuda você, amanhã facilita a chegada de alguém. É assim que uma rede
              continua.
            </p>
          </div>
        </section>

        <section className={styles["closing"]} aria-labelledby="closing-title">
          <span className={styles["closingMark"]} aria-hidden="true">
            <Tent strokeWidth={1} />
          </span>
          <p className={styles["eyebrow"]}>De cidade em cidade. De pessoa em pessoa.</p>
          <h2 id="closing-title" className={styles["display"]}>
            Sua próxima história
            <br />
            <em>já pode ter companhia.</em>
          </h2>
          <JoinLink>Quero fazer parte</JoinLink>
          <p className={styles["closingLogin"]}>
            Já tem uma conta?{" "}
            <Link href="/login">
              Entre no Bivaque <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </p>
        </section>
      </main>

      <footer className={styles["footer"]}>
        <div className={styles["footerBrand"]}>
          <Wordmark />
          <p>A rede que acompanha a vida militar.</p>
        </div>
        <nav aria-label="Informações legais">
          <Link href="/privacidade">Privacidade</Link>
          <Link href="/codigo-de-conduta">Código de conduta</Link>
        </nav>
        <p className={styles["independent"]}>
          <strong>Iniciativa comunitária independente.</strong>
          <span>Sem vínculo oficial com as Forças Armadas.</span>
        </p>
      </footer>
    </div>
  )
}

export function LandingPage() {
  return (
    <LazyMotion features={domAnimation} strict>
      <LandingExperience />
    </LazyMotion>
  )
}
