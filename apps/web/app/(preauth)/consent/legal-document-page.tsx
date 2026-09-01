import { promises as fs } from "node:fs"
import path from "node:path"
import { OnboardingShell } from "../onboarding/components/onboarding-shell"
import styles from "../onboarding/onboarding.module.css"
import { renderLegalDocument } from "./document-render"

type LegalDocumentPageProps = Readonly<{
  description: string
  fileName: string
  title: string
}>

async function readLegalDocument(fileName: string): Promise<string> {
  const filePath = path.join(process.cwd(), "..", "..", "docs", "legal", fileName)
  return fs.readFile(filePath, "utf8")
}

export async function LegalDocumentPage({ description, fileName, title }: LegalDocumentPageProps) {
  const document = await readLegalDocument(fileName)

  return (
    <OnboardingShell
      stage="rules"
      titleId="legal-document-heading"
      eyebrow="Acordo de convivência"
      title={title}
      description={description}
      asideEyebrow="Uma comunidade de confiança"
      asideTitle="Regras que protegem a convivência."
      asideDescription="Leia o documento completo antes de marcar seu aceite na entrada."
    >
      <article aria-labelledby="legal-document-heading" className={styles["documentPanel"]}>
        {renderLegalDocument(document)}
      </article>
    </OnboardingShell>
  )
}
