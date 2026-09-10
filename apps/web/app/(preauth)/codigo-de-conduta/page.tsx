import { promises as fs } from "node:fs"
import path from "node:path"
import { renderLegalDocument } from "../consent/document-render"
import { OnboardingShell } from "../onboarding/components/onboarding-shell"
import styles from "../onboarding/onboarding.module.css"

async function readCodeOfConduct(): Promise<string> {
  const filePath = path.join(process.cwd(), "..", "..", "docs", "legal", "CODIGO_DE_CONDUTA.md")
  return fs.readFile(filePath, "utf8")
}

export default async function CodeOfConductPage() {
  const codeOfConduct = await readCodeOfConduct()

  return (
    <OnboardingShell
      stage="rules"
      titleId="conduct-heading"
      eyebrow="Documento completo"
      title="Código de conduta"
      description="Versão 2 · 31 de agosto de 2026 · Alpha fechado"
      asideEyebrow="Bivaque"
      asideTitle="Regras simples para uma comunidade confiável."
      asideDescription="Esta é a versão completa apresentada no fluxo de entrada."
    >
      <section
        aria-labelledby="conduct-heading"
        className={`${styles["legalDocument"]} max-h-none overflow-visible`}
      >
        {renderLegalDocument(codeOfConduct)}
      </section>
    </OnboardingShell>
  )
}
