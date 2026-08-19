import { promises as fs } from "node:fs"
import path from "node:path"
import { CONSENT_VERSION } from "@bivaque/domain"
import { ConsentForm } from "./consent-form"
import { renderLegalDocument } from "./document-render"

// D2 Task 3: the legal text is rendered from the versioned files in
// docs/legal/ — never copied into JSX, so a change to the document can never
// diverge from the screen. The version numbers come from @bivaque/domain (the
// single source); the acceptance row records the versions that were shown.

async function readLegalDocument(relativePath: string): Promise<string> {
  const filePath = path.join(process.cwd(), "docs", "legal", relativePath)
  return fs.readFile(filePath, "utf8")
}

export default async function ConsentPage() {
  const [codeOfConduct, privacy] = await Promise.all([
    readLegalDocument("CODIGO_DE_CONDUTA.md"),
    readLegalDocument("PRIVACIDADE.md"),
  ])

  return (
    <div className="grid flex-1 place-items-center px-6 py-12">
      <section className="flex w-full max-w-md flex-col gap-6" aria-labelledby="consent-heading">
        <h1 id="consent-heading" className="text-2xl font-semibold tracking-tight">
          Termos de uso
        </h1>

        <section aria-labelledby="conduct-heading" className="flex flex-col gap-1">
          <h2 id="conduct-heading" className="text-base font-semibold">
            Código de conduta
          </h2>
          <section
            className="prose prose-sm max-h-48 overflow-y-auto rounded-lg border border-border p-4 text-sm text-muted"
            aria-label="Código de conduta"
            // biome-ignore lint/a11y/noNoninteractiveTabindex: the scrollable consent box must be reachable by keyboard (D2 Task 3 Step 4)
            tabIndex={0}
          >
            {renderLegalDocument(codeOfConduct)}
          </section>
        </section>

        <section aria-labelledby="privacy-heading" className="flex flex-col gap-1">
          <h2 id="privacy-heading" className="text-base font-semibold">
            Política de privacidade
          </h2>
          <section
            className="prose prose-sm max-h-48 overflow-y-auto rounded-lg border border-border p-4 text-sm text-muted"
            aria-label="Política de privacidade"
            // biome-ignore lint/a11y/noNoninteractiveTabindex: the scrollable privacy box must be reachable by keyboard (D2 Task 3 Step 4)
            tabIndex={0}
          >
            {renderLegalDocument(privacy)}
          </section>
        </section>

        <ConsentForm consentVersion={CONSENT_VERSION} />

        <p className="text-center text-xs text-muted">
          Ao continuar, você confirma que leu e concorda com o código de conduta e com a política de
          privacidade nas versões exibidas.
        </p>
      </section>
    </div>
  )
}
