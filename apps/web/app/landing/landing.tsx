"use client"

import { gsap } from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import {
  Archive,
  ArrowRight,
  Check,
  ChevronDown,
  Compass,
  LockKeyhole,
  MapPin,
  MessageCircleQuestion,
  Route,
  Search,
  ShieldCheck,
  Tent,
  UsersRound,
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useLayoutEffect, useRef } from "react"
import { BrandMark } from "../components/bivaque/brand-mark"
import styles from "./landing.module.css"

gsap.registerPlugin(ScrollTrigger)

const NAV_LINKS = [
  { href: "#por-dentro", label: "Por dentro" },
  { href: "#pertencimento", label: "Pertencimento" },
  { href: "#confianca", label: "Confiança" },
]

const STORY_STEPS = [
  {
    icon: MessageCircleQuestion,
    label: "Pergunte",
    title: "Pergunte a quem conhece o lugar.",
    copy: "Escola, serviço, mudança ou rotina. A dúvida chega a pessoas que conhecem aquela realidade.",
  },
  {
    icon: UsersRound,
    label: "Resolva",
    title: "Receba respostas de quem já viveu isso.",
    copy: "Quem passou pela mesma situação compartilha referências, cuidados e o caminho que funcionou.",
  },
  {
    icon: Archive,
    label: "Preserve",
    title: "Guarde o que pode ajudar outras pessoas.",
    copy: "O pedido resolvido vira referência e continua disponível para a próxima pessoa que precisar.",
  },
]

const BELONGING = [
  { icon: MapPin, name: "Localidade", copy: "A cidade onde você está ou para onde vai." },
  {
    icon: Tent,
    name: "Comunidade",
    copy: "Pessoas que compartilham uma fase, um lugar ou uma história.",
  },
  { icon: Compass, name: "Grupo", copy: "Conversas sobre um assunto específico." },
]

const TRUST = [
  {
    icon: ShieldCheck,
    title: "Entre pelo caminho que faz sentido para você",
    copy: "A entrada considera o papel de cada pessoa na comunidade.",
  },
  {
    icon: LockKeyhole,
    title: "Seus dados ficam protegidos",
    copy: "A verificação confirma seu acesso, mas seus documentos e dados pessoais não aparecem no perfil.",
  },
  {
    icon: Search,
    title: "Encontre conversas que combinam com você",
    copy: "Descubra pessoas, interesses e comunidades em comum para trocar experiências úteis.",
  },
]

function Wordmark({ inverse = false }: { inverse?: boolean }) {
  return (
    <BrandMark
      alt="Bivaque"
      asset="horizontal"
      className={styles["wordmark"] ?? ""}
      priority={inverse}
      tone={inverse ? "white" : "graphite"}
    />
  )
}

export function LandingPage() {
  const rootRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root) return

    const media = gsap.matchMedia()
    const context = gsap.context(() => {
      media.add("(prefers-reduced-motion: no-preference)", () => {
        gsap
          .timeline({ defaults: { ease: "power3.out" } })
          .from(`.${styles["header"]}`, { y: -16, duration: 0.6 })
          .from(
            `.${styles["heroEyebrow"]}, .${styles["heroTitleLine"]}, .${styles["heroLead"]}, .${styles["heroActions"]}`,
            { y: 32, duration: 0.75, stagger: 0.08 },
            "-=0.25",
          )

        gsap.to(`.${styles["heroImage"]} img`, {
          scale: 1.06,
          ease: "none",
          scrollTrigger: {
            trigger: `.${styles["hero"]}`,
            start: "top top",
            end: "bottom top",
            scrub: 0.8,
          },
        })

        const revealElements = gsap.utils.toArray("[data-reveal]") as HTMLElement[]
        revealElements.forEach((element) => {
          gsap.from(element, {
            y: 36,
            duration: 0.85,
            ease: "power3.out",
            scrollTrigger: { trigger: element, start: "top 86%", once: true },
          })
        })
      })

      media.add("(min-width: 1024px) and (prefers-reduced-motion: no-preference)", () => {
        const steps = gsap.utils.toArray("[data-story-step]") as HTMLElement[]
        const panels = gsap.utils.toArray("[data-story-panel]") as HTMLElement[]
        const activate = (active: number) => {
          steps.forEach((step, index) => {
            step.toggleAttribute("data-active", index === active)
          })
          panels.forEach((panel, index) => {
            panel.toggleAttribute("data-active", index === active)
          })
        }

        steps.forEach((step, index) => {
          ScrollTrigger.create({
            trigger: step,
            start: "top 58%",
            end: "bottom 42%",
            onEnter: () => activate(index),
            onEnterBack: () => activate(index),
          })
        })
      })
    }, root)

    const refresh = () => ScrollTrigger.refresh()
    window.addEventListener("load", refresh, { once: true })

    return () => {
      window.removeEventListener("load", refresh)
      media.revert()
      context.revert()
    }
  }, [])

  return (
    <div ref={rootRef} className={styles["root"]}>
      <header className={styles["header"]}>
        <Link href="/" className={styles["brandLink"]} aria-label="Bivaque, início">
          <Wordmark inverse />
        </Link>
        <nav className={styles["nav"]} aria-label="Navegação principal">
          {NAV_LINKS.map((item, index) => (
            <a key={item.href} href={item.href} aria-current={index === 0 ? "page" : undefined}>
              {item.label}
            </a>
          ))}
        </nav>
        <Link href="/entrada" className={styles["headerAction"]}>
          Entrar <ArrowRight aria-hidden="true" />
        </Link>
      </header>

      <main>
        <section className={styles["hero"]} aria-labelledby="hero-title">
          <div className={styles["heroImage"]}>
            <Image
              src="/landing/hero-bivaque-arrival.webp"
              alt="Pessoa chegando a um encontro comunitário, vista de costas, enquanto um veterano oferece uma cadeira"
              fill
              priority
              unoptimized
              sizes="100vw"
            />
          </div>
          <div className={styles["heroShade"]} aria-hidden="true" />
          <div className={styles["heroContent"]}>
            <p className={styles["heroEyebrow"]}>
              Para militares federais, veteranos, pensionistas e suas famílias
            </p>
            <h1 id="hero-title" className={styles["heroTitle"]}>
              <span className={styles["heroTitleLine"]}>Bivaque.</span>
              <span className={styles["heroTitleLine"]}>A comunidade vai com você.</span>
            </h1>
            <p className={styles["heroLead"]}>
              Chegue a uma nova cidade encontrando pessoas, referências e respostas que fazem
              diferença. Compartilhe o que você aprendeu e ajude a próxima pessoa a chegar melhor.
            </p>
            <div className={styles["heroActions"]}>
              <Link href={{ pathname: "/signup" }} className={styles["primaryAction"]}>
                Quero fazer parte <ArrowRight aria-hidden="true" />
              </Link>
              <a href="#por-dentro" className={styles["secondaryAction"]}>
                Ver como funciona
              </a>
            </div>
          </div>
          <a className={styles["scrollCue"]} href="#manifesto" aria-label="Ir para o conteúdo">
            <ChevronDown aria-hidden="true" />
          </a>
        </section>

        <section id="manifesto" className={styles["manifesto"]}>
          <div className={styles["manifestoGrid"]} data-reveal>
            <p className={styles["kicker"]}>Para cada chegada</p>
            <h2>Quem chega tem perguntas. Quem já está conhece os caminhos.</h2>
            <p>
              Qual escola recebe matrícula no meio do ano? Que serviço conhece a rotina militar?
              Como funciona a cidade para quem acabou de chegar? No Bivaque, essas respostas vêm de
              pessoas que já passaram por isso.
            </p>
          </div>
        </section>

        <section id="por-dentro" className={styles["story"]} aria-labelledby="story-title">
          <div className={styles["storyInner"]}>
            <div className={styles["storyHeading"]} data-reveal>
              <p className={styles["kicker"]}>Por dentro do Bivaque</p>
              <h2 id="story-title">
                Uma dúvida resolvida hoje vira referência para a próxima chegada.
              </h2>
            </div>
            <div className={styles["storyLayout"]}>
              <div className={styles["storySteps"]}>
                {STORY_STEPS.map((step, index) => {
                  const Icon = step.icon
                  return (
                    <article
                      className={styles["storyStep"]}
                      key={step.label}
                      data-story-step
                      data-active={index === 0 ? "" : undefined}
                    >
                      <span className={styles["storyNumber"]}>0{index + 1}</span>
                      <Icon aria-hidden="true" />
                      <div>
                        <p>{step.label}</p>
                        <h3>{step.title}</h3>
                        <span>{step.copy}</span>
                      </div>
                    </article>
                  )
                })}
              </div>

              <div className={styles["productStage"]} aria-hidden="true">
                <div className={styles["productTopbar"]}>
                  <Wordmark />
                  <span>Vila do Conde</span>
                </div>
                <div className={styles["productBody"]}>
                  <div className={styles["productPanel"]} data-story-panel data-active>
                    <span className={styles["productLabel"]}>Nova pergunta</span>
                    <p>Alguém indica uma escola que aceite transferência no meio do ano?</p>
                    <div className={styles["productMeta"]}>
                      <span>Educação</span>
                      <span>Para a localidade</span>
                    </div>
                  </div>
                  <div className={styles["productPanel"]} data-story-panel>
                    <span className={styles["productLabel"]}>3 respostas úteis</span>
                    <p>
                      Passei por isso no último semestre. A escola aceita, e estes são os documentos
                      que pediram na matrícula.
                    </p>
                    <div className={styles["answerLine"]}>
                      <Check aria-hidden="true" /> Respondido por quem já viveu isso
                    </div>
                  </div>
                  <div className={styles["productPanel"]} data-story-panel>
                    <span className={styles["productLabel"]}>Pedido resolvido</span>
                    <p>
                      Transferência escolar no meio do ano: referências e documentos necessários.
                    </p>
                    <div className={styles["archiveLine"]}>
                      <Archive aria-hidden="true" /> Guardado no acervo da comunidade
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="pertencimento" className={styles["belonging"]}>
          <div className={styles["belongingIntro"]} data-reveal>
            <p className={styles["kicker"]}>Onde você participa</p>
            <h2>Sua cidade, suas comunidades e os grupos que fazem parte da sua vida.</h2>
            <p>
              Encontre seu lugar, acompanhe conversas próximas da sua rotina e participe do que
              importa para você.
            </p>
          </div>
          <div className={styles["belongingLayers"]} data-reveal>
            {BELONGING.map((item, index) => {
              const Icon = item.icon
              return (
                <div className={styles["belongingLayer"]} key={item.name}>
                  <span>0{index + 1}</span>
                  <Icon aria-hidden="true" />
                  <h3>{item.name}</h3>
                  <p>{item.copy}</p>
                </div>
              )
            })}
          </div>
        </section>

        <section className={styles["transfer"]}>
          <div className={styles["transferImage"]}>
            <Image
              src="/landing/transfer-sunset.jpg"
              alt="Silhuetas anônimas caminhando ao entardecer"
              fill
              unoptimized
              sizes="100vw"
            />
          </div>
          <div className={styles["transferShade"]} aria-hidden="true" />
          <div className={styles["transferCopy"]} data-reveal>
            <Route aria-hidden="true" />
            <p className={styles["kicker"]}>Na próxima mudança</p>
            <h2>Mude de cidade sem começar do zero.</h2>
            <p>
              Encontre referências, comunidades e respostas no novo lugar — e leve com você os
              vínculos que fazem parte da sua história.
            </p>
          </div>
        </section>

        <section id="confianca" className={styles["trust"]}>
          <div className={styles["trustHeading"]} data-reveal>
            <p className={styles["kicker"]}>Confiança</p>
            <h2>Um lugar para perguntar, encontrar e fazer parte.</h2>
          </div>
          <div className={styles["trustList"]}>
            {TRUST.map((item) => {
              const Icon = item.icon
              return (
                <article className={styles["trustItem"]} key={item.title} data-reveal>
                  <Icon aria-hidden="true" />
                  <h3>{item.title}</h3>
                  <p>{item.copy}</p>
                </article>
              )
            })}
          </div>
        </section>

        <section className={styles["closing"]}>
          <div className={styles["closingCopy"]} data-reveal>
            <Wordmark inverse />
            <h2>Chegue com uma pergunta. Encontre um lugar para participar.</h2>
            <p>
              O Bivaque aproxima você de quem já conhece o caminho — e guarda o que pode ajudar quem
              chegar depois.
            </p>
            <Link href={{ pathname: "/signup" }} className={styles["primaryAction"]}>
              Quero fazer parte <ArrowRight aria-hidden="true" />
            </Link>
          </div>
          <footer className={styles["footer"]}>
            <span>Bivaque é uma iniciativa comunitária independente.</span>
            <span>Sem vínculo oficial com as Forças Armadas.</span>
          </footer>
        </section>
      </main>
    </div>
  )
}
