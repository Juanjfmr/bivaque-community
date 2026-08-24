import { promises as fs } from "node:fs"
import path from "node:path"
import { CONSENT_VERSION } from "@bivaque/domain"
import { OnboardingShell } from "../onboarding/components/onboarding-shell"
import styles from "../onboarding/onboarding.module.css"
import { ConsentForm } from "./consent-form"
import { renderLegalDocument } from "./document-render"

// D2 Task 3: the legal text is rendered from the versioned files in
// docs/legal/ — never copied into JSX, so a change to the document can never
// diverge from the screen. The version numbers come from @bivaque/domain (the
// single source); the acceptance row records the versions that were shown.

async function readLegalDocument(relativePath: string): Promise<string> {
  // process.cwd() for `next dev`/`next build` is apps/web (where next.config.ts
  // lives), but docs/legal/ is monorepo-root-level, shared reference text — two
  // levels up. A plain `process.cwd()` join only worked for whichever cwd a dev
  // server happened to run from; a real `next build` (apps/web as cwd, always)
  // never found the file, crashing static generation of /consent — found
  // running the onda T/F closing E2E batch, unrelated to either wave's code.
  const filePath = path.join(process.cwd(), "..", "..", "docs", "legal", relativePath)
  return fs.readFile(filePath, "utf8")
}

export default async function ConsentPage() {
  const [codeOfConduct, privacy] = await Promise.all([
    readLegalDocument("CODIGO_DE_CONDUTA.md"),
    readLegalDocument("PRIVACIDADE.md"),
  ])

  return (
    <OnboardingShell
      stage="rules"
      titleId="consent-heading"
      eyebrow="Um acordo de convivência"
      title="Antes de entrar, conheça as regras."
      description="O Bivaque existe para tornar a experiência de cada chegada útil para a próxima. Isso começa com respeito, responsabilidade e cuidado com dados pessoais."
      asideEyebrow="O que sustenta a comunidade"
      asideTitle="Confiança não é um detalhe."
      asideDescription="As regras valem para todos e deixam claro o tipo de convivência que o Bivaque quer preservar."
    >
      <div className={styles["stack"]}>
        <div className={styles["legalGrid"]}>
          <section aria-labelledby="conduct-heading" className={styles["legalSection"]}>
            <h2 id="conduct-heading" className="text-base font-semibold">
              Código de conduta
            </h2>
            <section
              className={styles["legalDocument"]}
              aria-label="Código de conduta"
              // biome-ignore lint/a11y/noNoninteractiveTabindex: the scrollable consent box must be reachable by keyboard (D2 Task 3 Step 4)
              tabIndex={0}
            >
              {renderLegalDocument(codeOfConduct)}
            </section>
          </section>

          <section aria-labelledby="privacy-heading" className={styles["legalSection"]}>
            <h2 id="privacy-heading" className="text-base font-semibold">
              Política de privacidade
            </h2>
            <section
              className={styles["legalDocument"]}
              aria-label="Política de privacidade"
              // biome-ignore lint/a11y/noNoninteractiveTabindex: the scrollable privacy box must be reachable by keyboard (D2 Task 3 Step 4)
              tabIndex={0}
            >
              {renderLegalDocument(privacy)}
            </section>
          </section>
        </div>

        <ConsentForm consentVersion={CONSENT_VERSION} />
      </div>
    </OnboardingShell>
  )
}
