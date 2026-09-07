import { promises as fs } from "node:fs"
import path from "node:path"
import { renderLegalDocument } from "../consent/document-render"
import { OnboardingShell } from "../onboarding/components/onboarding-shell"
import styles from "../onboarding/onboarding.module.css"

async function readPrivacyPolicy(): Promise<string> {
  const filePath = path.join(process.cwd(), "..", "..", "docs", "legal", "PRIVACIDADE.md")
  return fs.readFile(filePath, "utf8")
}

export default async function PrivacyPage() {
  const privacy = await readPrivacyPolicy()

  return (
    <OnboardingShell
      stage="rules"
      titleId="privacy-heading"
      eyebrow="Documento completo"
      title="Política de privacidade"
      description="Versão 2 · 31 de agosto de 2026 · Alpha fechado"
      asideEyebrow="Bivaque"
      asideTitle="Dados tratados com finalidade clara."
      asideDescription="Esta é a versão completa apresentada no fluxo de entrada."
    >
      <section
        aria-labelledby="privacy-heading"
        className={`${styles["legalDocument"]} max-h-none overflow-visible`}
      >
        {renderLegalDocument(privacy)}
      </section>
    </OnboardingShell>
  )
}
