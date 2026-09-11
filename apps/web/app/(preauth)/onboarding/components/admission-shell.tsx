import Link from "next/link"
import type { ReactNode } from "react"
import styles from "../onboarding.module.css"

// Casca das pranchas 38 e 69: rail esquerdo com o cartão "Seu progresso" e a
// área de conteúdo à direita. É separada do `onboarding-shell` de propósito —
// aquele serve à escolha de localidade (prancha 39, RECON-020) e tem outro
// desenho. Reproduzir a prancha 38 não deve descaracterizar o passo seguinte.
export type AdmissionStage = "email" | "access" | "city" | "complete"

const STEPS = [
  { id: "email", label: "E-mail" },
  { id: "access", label: "Seu acesso" },
  { id: "city", label: "Cidade" },
] as const satisfies ReadonlyArray<{ id: AdmissionStage; label: string }>

function activeIndex(stage: AdmissionStage): number {
  if (stage === "complete") return STEPS.length
  const index = STEPS.findIndex((step) => step.id === stage)
  return index === -1 ? STEPS.length : index
}

function caption(index: number, active: number): string {
  if (index < active) return "Concluído"
  if (index === active) return "Em andamento"
  return "Próximo passo"
}

interface AdmissionShellProps {
  stage: AdmissionStage
  titleId: string
  title: string
  children: ReactNode
  description?: string
  eyebrow?: string
}

export function AdmissionShell({
  stage,
  titleId,
  title,
  children,
  description,
  eyebrow,
}: AdmissionShellProps) {
  const active = activeIndex(stage)

  return (
    <main className={styles["admissionRoot"]}>
      <aside className={styles["admissionRail"]}>
        <Link href="/" className={styles["admissionBrand"]} aria-label="Bivaque, voltar ao início">
          BIVAQUE
        </Link>

        <nav className={styles["progressCard"]} aria-labelledby="admission-progress-heading">
          <h2 id="admission-progress-heading" className={styles["progressTitle"]}>
            Seu progresso
          </h2>
          <ol className={styles["progressList"]}>
            {STEPS.map((step, index) => {
              const state = index < active ? "complete" : index === active ? "current" : "next"
              return (
                <li key={step.id} className={styles["progressStep"]} data-state={state}>
                  <span className={styles["progressMarker"]} aria-hidden="true">
                    {state === "complete" ? "✓" : index + 1}
                  </span>
                  <span className={styles["progressText"]}>
                    <strong>{step.label}</strong>
                    <small>{caption(index, active)}</small>
                  </span>
                </li>
              )
            })}
          </ol>
        </nav>
      </aside>

      <section className={styles["admissionWork"]} aria-labelledby={titleId}>
        <header className={styles["heading"]}>
          {eyebrow ? <p className={styles["eyebrow"]}>{eyebrow}</p> : null}
          <h1 id={titleId}>{title}</h1>
          {description ? <p>{description}</p> : null}
        </header>

        <div className={styles["body"]}>{children}</div>
      </section>
    </main>
  )
}
