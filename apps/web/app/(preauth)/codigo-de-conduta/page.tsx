import { promises as fs } from "node:fs"
import path from "node:path"
import type { Metadata } from "next"
import { EntryShell } from "../../components/entry/entry-shell"
import { LegalDocument } from "../privacidade/legal-document"
import "../privacidade/legal.css"

// PORT-006 (lote 4 da entrada): o Código de conduta na mesma casca e pele da
// Política de privacidade — são as duas metades do mesmo aceite e precisam
// parecer a mesma página. Texto de docs/legal/CODIGO_DE_CONDUTA.md.
export const metadata: Metadata = {
  title: "Código de conduta · Bivaque",
}

async function readCodeOfConduct(): Promise<string> {
  const filePath = path.join(process.cwd(), "..", "..", "docs", "legal", "CODIGO_DE_CONDUTA.md")
  return fs.readFile(filePath, "utf8")
}

export default async function CodeOfConductPage() {
  const codeOfConduct = await readCodeOfConduct()

  return (
    <EntryShell backHref="/login">
      <main>
        <article className="en en-form">
          <h1 className="en-h1">Código de conduta</h1>
          <LegalDocument markdown={codeOfConduct} />
        </article>
      </main>
    </EntryShell>
  )
}
