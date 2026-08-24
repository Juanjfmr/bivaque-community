import { Tent } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import type { ReactNode } from "react"
import styles from "../onboarding.module.css"

type OnboardingStage = "rules" | "eligibility" | "locality" | "complete"

const stages = [
  { id: "rules", label: "Regras" },
  { id: "eligibility", label: "Elegibilidade" },
  { id: "locality", label: "Localidade" },
] as const

interface OnboardingShellProps {
  asideDescription: string
  asideEyebrow: string
  asideTitle: string
  children: ReactNode
  description?: string
  eyebrow: string
  stage: OnboardingStage
  title: string
  titleId: string
}

function stageIndex(stage: OnboardingStage): number {
  if (stage === "complete") return stages.length
  return stages.findIndex((item) => item.id === stage)
}

export function OnboardingShell({
  asideDescription,
  asideEyebrow,
  asideTitle,
  children,
  description,
  eyebrow,
  stage,
  title,
  titleId,
}: OnboardingShellProps) {
  const activeIndex = stageIndex(stage)

  return (
    <main className={styles["root"]}>
      <section className={styles["workPanel"]} aria-labelledby={titleId}>
        <header className={styles["topbar"]}>
          <Link href="/" className={styles["brandLink"]} aria-label="Bivaque, voltar ao início">
            <Tent aria-hidden="true" strokeWidth={1.8} />
            <span>Bivaque</span>
          </Link>
          <span className={styles["journeyLabel"]}>Sua entrada</span>
        </header>

        <div className={styles["content"]}>
          <div
            className={styles["progress"]}
            role="progressbar"
            aria-label="Progresso da entrada"
            aria-valuemin={1}
            aria-valuemax={stages.length}
            aria-valuenow={Math.min(activeIndex + 1, stages.length)}
          >
            {stages.map((item, index) => {
              const state =
                activeIndex > index ? "complete" : activeIndex === index ? "current" : "next"
              return (
                <div className={styles["progressItem"]} data-state={state} key={item.id}>
                  <span aria-hidden="true" />
                  <small>{item.label}</small>
                </div>
              )
            })}
          </div>

          <header className={styles["heading"]}>
            <p className={styles["eyebrow"]}>{eyebrow}</p>
            <h1 id={titleId}>{title}</h1>
            {description && <p>{description}</p>}
          </header>

          <div className={styles["body"]}>{children}</div>
        </div>
      </section>

      <aside className={styles["visualPanel"]} aria-label="A jornada de entrada no Bivaque">
        <Image
          src="/landing/hero-bivaque-arrival.webp"
          alt="Encontro comunitário visto por uma pessoa que acaba de chegar"
          fill
          priority
          unoptimized
          sizes="45vw"
        />
        <div className={styles["visualShade"]} aria-hidden="true" />
        <div className={styles["visualCopy"]}>
          <p>{asideEyebrow}</p>
          <h2>{asideTitle}</h2>
          <span>{asideDescription}</span>
        </div>
      </aside>
    </main>
  )
}
