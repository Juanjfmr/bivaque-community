import { Check, Tent } from "lucide-react"
import Link from "next/link"
import type { ReactNode } from "react"
import styles from "../onboarding.module.css"

// Prancha 39: o passo de contexto e personalização tem o próprio esqueleto —
// wordmark e um stepper vertical de três passos (Cidade, Perfil, Concluir) à
// esquerda, conteúdo à direita. É diferente do shell da admissão (Regras /
// Elegibilidade / Localidade), que segue valendo para as telas de entrada.

export type ContextStep = "cidade" | "perfil" | "concluir"

const steps = [
  { id: "cidade", label: "Cidade" },
  { id: "perfil", label: "Perfil" },
  { id: "concluir", label: "Concluir" },
] as const

interface ContextStepsProps {
  children: ReactNode
  current: ContextStep
  description?: string
  title: string
  titleId: string
}

export function ContextSteps({
  children,
  current,
  description,
  title,
  titleId,
}: ContextStepsProps) {
  const activeIndex = steps.findIndex((step) => step.id === current)

  return (
    <main className={styles["contextRoot"]}>
      <div className={styles["contextLayout"]}>
        <aside className={styles["contextRail"]}>
          <Link href="/" className={styles["brandLink"]} aria-label="Bivaque, voltar ao início">
            <Tent aria-hidden="true" strokeWidth={1.8} />
            <span>Bivaque</span>
          </Link>

          <ol className={styles["contextSteps"]} aria-label="Etapas de contexto">
            {steps.map((step, index) => {
              const state =
                activeIndex > index ? "complete" : activeIndex === index ? "current" : "next"
              return (
                <li
                  aria-current={state === "current" ? "step" : undefined}
                  className={styles["contextStep"]}
                  data-state={state}
                  key={step.id}
                >
                  <span className={styles["contextStepMarker"]} aria-hidden="true">
                    {state === "complete" ? <Check strokeWidth={2.4} /> : <span>{index + 1}</span>}
                  </span>
                  <span className={styles["contextStepLabel"]}>{step.label}</span>
                </li>
              )
            })}
          </ol>
        </aside>

        <section className={styles["contextPanel"]} aria-labelledby={titleId}>
          <header className={styles["contextHeading"]}>
            <h1 id={titleId}>{title}</h1>
            {description ? <p>{description}</p> : null}
          </header>
          <div className={styles["body"]}>{children}</div>
        </section>
      </div>
    </main>
  )
}
