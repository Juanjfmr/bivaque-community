"use client"

import { gsap } from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import {
  ArrowRight,
  ArrowUpRight,
  Compass,
  Lock,
  MapPin,
  MessageCircleQuestion,
  Route,
  ShieldCheck,
  Sparkle,
  Tent,
  UsersRound,
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { Fragment, useLayoutEffect, useRef } from "react"
import styles from "./experimento.module.css"

gsap.registerPlugin(ScrollTrigger)

const NAV_LINKS = [
  { href: "#como-funciona", label: "Como funciona" },
  { href: "#escalas", label: "As três escalas" },
  { href: "#confianca", label: "Confiança" },
  { href: "#voz", label: "Voz da comunidade" },
]

const HOW_STEPS = [
  {
    numeral: "01",
    icon: MessageCircleQuestion,
    title: "Pergunte",
    body: "A dúvida chega a pessoas que conhecem aquela realidade — escola, mudança, serviço, rotina. Você publica em minutos.",
  },
  {
    numeral: "02",
    icon: UsersRound,
    title: "Receba",
    body: "Quem passou pela mesma situação compartilha o caminho que funcionou, com nomes, documentos e o que evitar.",
  },
  {
    numeral: "03",
    icon: Sparkle,
    title: "Acumule",
    body: "O pedido resolvido vira referência e fica disponível para a próxima pessoa que chegar — não se perde no feed.",
  },
]

const SCALES = [
  {
    numeral: "I",
    icon: MapPin,
    name: "Localidade",
    body: "A cidade onde você está ou para onde vai. Conversas que dependem de um lugar — uma referência de bairro, um serviço que entende a rotina, um caminho que só quem mora conhece.",
  },
  {
    numeral: "II",
    icon: UsersRound,
    name: "Comunidade",
    body: "As pessoas com quem você divide uma fase, uma trajetória, uma história em comum. A conversa que precisa de contexto para fazer sentido.",
  },
  {
    numeral: "III",
    icon: Compass,
    name: "Grupo",
    body: "Um assunto específico. A reunião de moradores de uma rua, os pais de uma escola, quem está chegando à mesma cidade neste mês.",
  },
]

const QUOTE_TEXT =
  "Cheguei a uma cidade onde não conhecia ninguém e, em duas semanas, já sabia qual era o colégio que aceita transferência no meio do ano, qual era a contadora que entendia a vida militar e onde encontrar gente que passou pelo que eu estava passando."

const QUOTE_WORDS = QUOTE_TEXT.split(" ").map((word, position) => ({
  word,
  key: `pullquote-${position}-${word.replace(/\W+/g, "").toLowerCase()}`,
}))

const TRUST_PILLARS = [
  {
    icon: ShieldCheck,
    label: "Verificação por CPF",
    body: "A elegibilidade é confirmada pelo CPF e revisada antes de a primeira publicação aparecer.",
  },
  {
    icon: Lock,
    label: "Nada público no perfil",
    body: "Patente, organização militar, endereço e documentos nunca aparecem no perfil — ficam onde o Estado guarda, não na timeline.",
  },
  {
    icon: Route,
    label: "Você decide o que mostra",
    body: "Você escolhe se declara Força Armada, OM e outros dados. Cada item tem visibilidade individual — ninguém vê nada por padrão.",
  },
]

function Wordmark({ tone = "ink" }: { tone?: "ink" | "paper" }) {
  const color = tone === "paper" ? "var(--semantic-text-on-strong)" : "var(--semantic-text-primary)"
  return (
    <span className={styles["wordmark"]} style={{ color }}>
      <Tent aria-hidden="true" strokeWidth={1.6} />
      <span>Bivaque</span>
    </span>
  )
}

export function Experimento() {
  const rootRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root) return

    const magnetCleanups: Array<() => void> = []
    const media = gsap.matchMedia()
    const context = gsap.context(() => {
      const counters = gsap.utils.toArray<HTMLElement>("[data-counter]")
      for (const counter of counters) {
        const target = Number(counter.getAttribute("data-counter") ?? "0")
        counter.textContent = target.toString()
      }

      media.add("(prefers-reduced-motion: no-preference)", () => {
        // Sticky nav turns solid on scroll.
        const nav = root.querySelector<HTMLElement>(`.${styles["nav"]}`)
        if (nav) {
          ScrollTrigger.create({
            start: 40,
            end: 99999,
            onEnter: () => nav.setAttribute("data-solid", ""),
            onLeaveBack: () => nav.removeAttribute("data-solid"),
          })
        }

        // Hero entrance — nav slides down first, then the editorial stack.
        const heroTimeline = gsap.timeline({ defaults: { ease: "expo.out" } })
        if (nav) {
          heroTimeline.from(nav, { yPercent: -110, duration: 0.8, ease: "power3.out" }, 0)
        }
        heroTimeline
          .from(`.${styles["heroEyebrow"]}`, { y: 24, opacity: 0, duration: 0.7 }, 0.15)
          .from(
            `.${styles["heroLine"]}`,
            { yPercent: 110, duration: 0.95, stagger: 0.09 },
            "-=0.45",
          )
          .from(`.${styles["heroLead"]}`, { y: 18, opacity: 0, duration: 0.7 }, "-=0.55")
          .from(
            `.${styles["heroActions"]} > *`,
            { y: 12, opacity: 0, duration: 0.6, stagger: 0.06 },
            "-=0.5",
          )
          .from(`.${styles["heroMeta"]}`, { opacity: 0, duration: 0.7 }, "-=0.5")

        // Hero photo slow drift.
        gsap.to(`.${styles["heroImage"]} img`, {
          scale: 1.08,
          ease: "none",
          scrollTrigger: {
            trigger: `.${styles["hero"]}`,
            start: "top top",
            end: "bottom top",
            scrub: 0.6,
          },
        })

        // Hero signature number — rotates in and floats.
        gsap.from(`.${styles["heroSignature"]}`, {
          opacity: 0,
          rotate: -8,
          y: 60,
          duration: 1.4,
          ease: "expo.out",
          delay: 0.5,
        })

        // Generic reveal on data-reveal.
        const reveals = gsap.utils.toArray<HTMLElement>("[data-reveal]")
        for (const element of reveals) {
          gsap.from(element, {
            y: 32,
            opacity: 0,
            duration: 0.9,
            ease: "power3.out",
            scrollTrigger: { trigger: element, start: "top 88%", once: true },
          })
        }

        // Three-scales staggered photo reveal.
        const scalePhotos = gsap.utils.toArray<HTMLElement>("[data-scale-photo]")
        for (const [index, photo] of scalePhotos.entries()) {
          gsap.from(photo, {
            y: 48,
            opacity: 0,
            duration: 1,
            ease: "expo.out",
            delay: index * 0.05,
            scrollTrigger: { trigger: photo, start: "top 90%", once: true },
          })
        }

        // Pullquote signature — words stagger in.
        const words = gsap.utils.toArray<HTMLElement>(`[data-pullquote-word]`)
        const [firstWord] = words
        if (firstWord) {
          gsap.from(words, {
            opacity: 0,
            y: 28,
            rotate: 2,
            duration: 0.7,
            stagger: 0.05,
            ease: "power3.out",
            scrollTrigger: {
              trigger: firstWord,
              start: "top 88%",
              once: true,
            },
          })
        }

        // Counter for the stats — number ticks once when in view.
        const counters = gsap.utils.toArray<HTMLElement>("[data-counter]")
        for (const counter of counters) {
          const target = Number(counter.getAttribute("data-counter") ?? "0")
          const obj = { value: 0 }
          gsap.to(obj, {
            value: target,
            duration: 1.8,
            ease: "expo.out",
            scrollTrigger: { trigger: counter, start: "top 86%", once: true },
            onUpdate: () => {
              counter.textContent = Math.round(obj.value).toString()
            },
          })
        }

        // Grouped transitions — a section's items enter as one staggered wave.
        const groups = gsap.utils.toArray<HTMLElement>("[data-reveal-group]")
        for (const group of groups) {
          const items = group.querySelectorAll<HTMLElement>("[data-reveal-item]")
          gsap.from(items, {
            y: 36,
            opacity: 0,
            duration: 0.85,
            ease: "power3.out",
            stagger: 0.12,
            scrollTrigger: { trigger: group, start: "top 85%", once: true },
          })
        }

        // Editorial rules draw themselves left to right as they enter.
        const rules = gsap.utils.toArray<HTMLElement>("[data-rule]")
        for (const rule of rules) {
          gsap.from(rule, {
            scaleX: 0,
            transformOrigin: "left center",
            duration: 1.1,
            ease: "expo.out",
            delay: 0.2,
            scrollTrigger: { trigger: rule, start: "top 92%", once: true },
          })
        }

        // Closing headline rides a scrubbed parallax against its container.
        gsap.fromTo(
          `.${styles["closingInner"]} h2`,
          { y: 36 },
          {
            y: -12,
            ease: "none",
            scrollTrigger: {
              trigger: `.${styles["closing"]}`,
              start: "top bottom",
              end: "bottom bottom",
              scrub: 0.8,
            },
          },
        )

        // Magnetic pull on the primary CTAs — fine pointers only.
        if (window.matchMedia("(pointer: fine)").matches) {
          const magnets = gsap.utils.toArray<HTMLElement>(
            `.${styles["heroPrimary"]}, .${styles["closingPrimary"]}, .${styles["navPrimary"]}`,
          )
          for (const element of magnets) {
            const xTo = gsap.quickTo(element, "x", { duration: 0.4, ease: "power3.out" })
            const yTo = gsap.quickTo(element, "y", { duration: 0.4, ease: "power3.out" })
            const onMove = (event: MouseEvent) => {
              const box = element.getBoundingClientRect()
              xTo((event.clientX - box.left - box.width / 2) * 0.16)
              yTo((event.clientY - box.top - box.height / 2) * 0.16)
            }
            const onLeave = () => {
              xTo(0)
              yTo(0)
            }
            element.addEventListener("mousemove", onMove)
            element.addEventListener("mouseleave", onLeave)
            magnetCleanups.push(() => {
              element.removeEventListener("mousemove", onMove)
              element.removeEventListener("mouseleave", onLeave)
            })
          }
        }

        const refresh = () => ScrollTrigger.refresh()
        window.addEventListener("load", refresh, { once: true })
      })
    }, root)

    return () => {
      for (const cleanup of magnetCleanups) cleanup()
      media.revert()
      context.revert()
    }
  }, [])

  return (
    <div ref={rootRef} className={styles["root"]}>
      <a className={styles["skip"]} href="#main">
        Pular para o conteúdo
      </a>

      <header className={styles["nav"]}>
        <Link href="/" className={styles["brandLink"]} aria-label="Bivaque, início">
          <Wordmark />
        </Link>
        <nav className={styles["navLinks"]} aria-label="Navegação do experimento">
          {NAV_LINKS.map((item) => (
            <a key={item.href} href={item.href}>
              {item.label}
            </a>
          ))}
        </nav>
        <div className={styles["navActions"]}>
          <Link href="/login" className={styles["navGhost"]}>
            Entrar
          </Link>
          <Link href="/signup" className={styles["navPrimary"]}>
            Quero fazer parte <ArrowRight aria-hidden="true" />
          </Link>
        </div>
      </header>

      <main id="main">
        <section className={styles["hero"]} aria-labelledby="hero-title">
          <div className={styles["heroImage"]}>
            <Image
              src="/landing/hero-bivaque-community.webp"
              alt="Pessoas sentadas em círculo durante um encontro informal ao fim de tarde, trocando histórias"
              fill
              priority
              unoptimized
              sizes="100vw"
            />
          </div>
          <div className={styles["heroShade"]} aria-hidden="true" />
          <div className={styles["heroGrain"]} aria-hidden="true" />

          <div className={styles["heroContent"]}>
            <p className={styles["heroEyebrow"]}>
              <span aria-hidden="true" />
              Para quem carrega uma trajetória em comum
            </p>
            <h1 id="hero-title" className={styles["heroTitle"]}>
              <span className={styles["heroLineWrap"]}>
                <span className={styles["heroLine"]}>A comunidade</span>
              </span>
              <span className={styles["heroLineWrap"]}>
                <span className={styles["heroLine"]}>que viaja</span>
              </span>
              <span className={styles["heroLineWrap"]}>
                <span className={styles["heroLine"]}>
                  <em>com você.</em>
                </span>
              </span>
            </h1>
            <p className={styles["heroLead"]}>
              O Bivaque reúne militares federais, veteranos, pensionistas e dependentes numa
              comunidade de pertencimento — verificada por CPF, sem patentes ou endereços expostos.
              Você chega com uma pergunta e sai com a referência que faltava.
            </p>
            <div className={styles["heroActions"]}>
              <Link href="/signup" className={styles["heroPrimary"]}>
                Entrar para o Bivaque <ArrowRight aria-hidden="true" />
              </Link>
              <a href="#como-funciona" className={styles["heroSecondary"]}>
                Ver como funciona
              </a>
            </div>
            <div className={styles["heroMeta"]}>
              <span>Verificação por CPF</span>
              <span aria-hidden="true" className={styles["heroMetaDot"]} />
              <span>Aberto a militares, veteranos, pensionistas e dependentes</span>
            </div>
          </div>

          <div className={styles["heroSignature"]} aria-hidden="true">
            <span className={styles["heroSignatureNum"]}>01</span>
            <span className={styles["heroSignatureLabel"]}>Bivaque · 2026</span>
          </div>
        </section>

        <section className={styles["stats"]} aria-label="Números da comunidade">
          <div className={styles["statsInner"]} data-reveal-group>
            <div className={styles["statCell"]} data-reveal-item>
              <span className={styles["statEyebrow"]}>Três escalas</span>
              <span className={styles["statNumber"]}>
                <span data-counter="3">0</span>
              </span>
              <span className={styles["statCaption"]}>
                Conversas aninhadas — da cidade ao grupo específico.
              </span>
            </div>
            <div className={styles["statCell"]} data-reveal-item>
              <span className={styles["statEyebrow"]}>Nada público</span>
              <span className={styles["statNumber"]}>
                <span data-counter="0">0</span>
              </span>
              <span className={styles["statCaption"]}>
                Patente, OM, CPF, endereço ou documento exposto por padrão.
              </span>
            </div>
            <div className={styles["statCell"]} data-reveal-item>
              <span className={styles["statEyebrow"]}>Verificada</span>
              <span className={styles["statNumber"]}>
                <span data-counter="1">0</span>
              </span>
              <span className={styles["statCaption"]}>
                Elegibilidade confirmada por CPF, com revisão humana na primeira publicação.
              </span>
            </div>
          </div>
        </section>

        <section id="como-funciona" className={styles["how"]} aria-labelledby="how-title">
          <div className={styles["howHeading"]} data-reveal>
            <p className={styles["kicker"]}>Como funciona</p>
            <h2 id="how-title">
              Uma dúvida resolvida hoje vira referência para a próxima pessoa que chegar.
            </h2>
            <p className={styles["howLead"]}>
              O Bivaque não é um feed. É uma comunidade que escuta, responde e arquiva o que importa
              — para que o esforço de quem chegou antes sirva a quem chega agora.
            </p>
          </div>
          <div className={styles["howGrid"]} data-reveal-group>
            {HOW_STEPS.map((step) => {
              const Icon = step.icon
              return (
                <article className={styles["howCard"]} key={step.numeral} data-reveal-item>
                  <div className={styles["howCardTop"]}>
                    <Icon aria-hidden="true" />
                    <span className={styles["howCardNumeral"]}>{step.numeral}</span>
                  </div>
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                </article>
              )
            })}
          </div>
        </section>

        <section id="escalas" className={styles["scales"]} aria-labelledby="scales-title">
          <div className={styles["scalesIntro"]} data-reveal>
            <p className={styles["kicker"]}>Onde você participa</p>
            <h2 id="scales-title">
              Sua cidade, suas comunidades e os grupos que fazem parte da sua vida.
            </h2>
            <p className={styles["scalesLead"]}>
              As conversas chegam às pessoas certas porque existem três escalas — e cada uma delas
              serve a um tipo diferente de pergunta.
            </p>
          </div>

          <div className={styles["scalesLayout"]}>
            <div className={styles["scalesPhotos"]}>
              <figure className={styles["scalePhotoA"]} data-scale-photo>
                <Image
                  src="/landing/transfer-sunset.jpg"
                  alt="Grupo caminhando ao entardecer em direção a um prédio iluminado"
                  fill
                  unoptimized
                  sizes="(min-width: 1024px) 56vw, 100vw"
                />
              </figure>
              <figure className={styles["scalePhotoB"]} data-scale-photo>
                <Image
                  src="/landing/hero-bivaque-arrival.webp"
                  alt="Pessoa chegando a um encontro comunitário, vista de costas"
                  fill
                  unoptimized
                  sizes="(min-width: 1024px) 28vw, 100vw"
                />
              </figure>
              <figure className={styles["scalePhotoC"]} data-scale-photo>
                <Image
                  src="/landing/friends-gathering.jpg"
                  alt="Pessoas reunidas em volta de uma mesa durante um encontro"
                  fill
                  unoptimized
                  sizes="(min-width: 1024px) 28vw, 100vw"
                />
              </figure>
            </div>

            <ol className={styles["scalesList"]} data-reveal-group>
              {SCALES.map((scale) => {
                const Icon = scale.icon
                return (
                  <li className={styles["scaleRow"]} key={scale.numeral} data-reveal-item>
                    <span className={styles["scaleNumeral"]}>{scale.numeral}</span>
                    <Icon aria-hidden="true" className={styles["scaleIcon"]} />
                    <div className={styles["scaleCopy"]}>
                      <h3>{scale.name}</h3>
                      <p>{scale.body}</p>
                    </div>
                  </li>
                )
              })}
            </ol>
          </div>
        </section>

        <section id="confianca" className={styles["trust"]} aria-labelledby="trust-title">
          <div className={styles["trustGrain"]} aria-hidden="true" />
          <div className={styles["trustInner"]}>
            <div className={styles["trustHeading"]} data-reveal>
              <p className={styles["kicker"]}>Confiança</p>
              <h2 id="trust-title">Construído para conversas que pedem contexto, não exposição.</h2>
            </div>
            <div className={styles["trustList"]} data-reveal-group>
              {TRUST_PILLARS.map((pillar) => {
                const Icon = pillar.icon
                return (
                  <article className={styles["trustItem"]} key={pillar.label} data-reveal-item>
                    <Icon aria-hidden="true" />
                    <h3>{pillar.label}</h3>
                    <p>{pillar.body}</p>
                  </article>
                )
              })}
            </div>
            <p className={styles["trustFoot"]} data-reveal>
              <span aria-hidden="true" className={styles["trustRule"]} data-rule />
              Nada de patentes exibidas, nada de medalhas, nada de insígnias — o que você traz é a
              sua história, não a sua hierarquia.
            </p>
          </div>
        </section>

        <section id="voz" className={styles["quote"]} aria-labelledby="quote-title">
          <div className={styles["quoteInner"]} data-reveal>
            <p className={styles["kicker"]}>Voz da comunidade</p>
            <blockquote className={styles["quoteBlock"]}>
              <h2 id="quote-title" className={styles["quoteText"]}>
                {QUOTE_WORDS.map(({ word, key }, position) => (
                  <Fragment key={key}>
                    <span data-pullquote-word>{word}</span>
                    {position === QUOTE_WORDS.length - 1 ? null : " "}
                  </Fragment>
                ))}
              </h2>
              <footer className={styles["quoteFooter"]}>
                <span aria-hidden="true" className={styles["quoteRule"]} data-rule />
                <cite>
                  <span className={styles["quoteWho"]}>R. S.</span>
                  <span className={styles["quoteRole"]}>
                    militar federal, chegou em Manaus em 2025
                  </span>
                </cite>
              </footer>
            </blockquote>
          </div>
        </section>

        <section className={styles["closing"]}>
          <div className={styles["closingInner"]} data-reveal>
            <Wordmark tone="paper" />
            <h2>Você chega com uma pergunta. Em pouco tempo, tem algo para compartilhar.</h2>
            <p>
              Entre para conhecer o lugar, resolver dúvidas e deixar a sua experiência disponível
              para quem chegar depois. A comunidade espera por você.
            </p>
            <div className={styles["closingActions"]}>
              <Link href="/signup" className={styles["closingPrimary"]}>
                Quero fazer parte <ArrowRight aria-hidden="true" />
              </Link>
              <Link href="/login" className={styles["closingGhost"]}>
                Já tenho cadastro
              </Link>
            </div>
          </div>
        </section>

        <footer className={styles["footer"]}>
          <div className={styles["footerInner"]}>
            <div className={styles["footerBrand"]}>
              <Wordmark tone="paper" />
              <p>
                Comunidade privada de pertencimento para militares federais, veteranos, pensionistas
                e dependentes. Verificada por CPF, sem patentes expostas.
              </p>
            </div>
            <nav className={styles["footerCols"]} aria-label="Rodapé">
              <div>
                <h4>Comunidade</h4>
                <ul>
                  <li>
                    <a href="#como-funciona">Como funciona</a>
                  </li>
                  <li>
                    <a href="#escalas">As três escalas</a>
                  </li>
                  <li>
                    <a href="#confianca">Confiança</a>
                  </li>
                </ul>
              </div>
              <div>
                <h4>Produto</h4>
                <ul>
                  <li>
                    <Link href="/signup">Entrar</Link>
                  </li>
                  <li>
                    <Link href="/login">Já tenho cadastro</Link>
                  </li>
                  <li>
                    <a href="#confianca">Verificação</a>
                  </li>
                </ul>
              </div>
              <div>
                <h4>Documentos</h4>
                <ul>
                  <li>
                    <Link href="/privacidade">Privacidade</Link>
                  </li>
                  <li>
                    <Link href="/codigo-de-conduta">Código de conduta</Link>
                  </li>
                  <li>
                    <a href="#confianca">Controle de visibilidade</a>
                  </li>
                </ul>
              </div>
            </nav>
          </div>
          <div className={styles["footerRule"]} />
          <div className={styles["footerBottom"]}>
            <span>Bivaque · 2026 — iniciativa comunitária independente.</span>
            <span>
              Sem vínculo oficial com as Forças Armadas.
              <ArrowUpRight aria-hidden="true" className={styles["footerArrow"]} />
            </span>
          </div>
        </footer>
      </main>
    </div>
  )
}
