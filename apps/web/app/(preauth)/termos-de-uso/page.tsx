import { promises as fs } from "node:fs"
import path from "node:path"
import type { Metadata } from "next"
import { EntryShell } from "../../components/entry/entry-shell"
import { LegalDocument } from "../privacidade/legal-document"
import "../privacidade/legal.css"

// O Termo de Uso é o terceiro documento do aceite da entrada. Texto de
// docs/legal/TERMOS_DE_USO.md.
export const metadata: Metadata = {
  title: "Termo de Uso · Bivaque",
}

async function readTermsOfUse(): Promise<string> {
  const filePath = path.join(process.cwd(), "..", "..", "docs", "legal", "TERMOS_DE_USO.md")
  return fs.readFile(filePath, "utf8")
}

export default async function TermsOfUsePage() {
  const termsOfUse = await readTermsOfUse()

  return (
    <EntryShell backHref="/login">
      <main>
        <article className="en en-form">
          <h1 className="en-h1">Termo de Uso</h1>
          <LegalDocument markdown={termsOfUse} />
        </article>
      </main>
    </EntryShell>
  )
}
