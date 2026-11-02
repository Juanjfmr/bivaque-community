import { promises as fs } from "node:fs"
import path from "node:path"
import type { Metadata } from "next"
import { EntryShell } from "../../components/entry/entry-shell"
import { LegalDocument } from "./legal-document"
import "./legal.css"

// PORT-006 (lote 4 da entrada): a Política de privacidade na casca e na pele da
// entrada, como `renderLegal` no protótipo. O texto é o de
// docs/legal/PRIVACIDADE.md — o mesmo que o aceite cobre —, não uma paráfrase
// de tela.
//
// A rota é pública (apps/web/proxy.ts): quem está criando conta precisa ler o
// documento antes de aceitar, e quem ainda não tem conta é exatamente quem
// chega por aqui vindo do formulário.
export const metadata: Metadata = {
  title: "Política de privacidade · Bivaque",
}

async function readPrivacyPolicy(): Promise<string> {
  const filePath = path.join(process.cwd(), "..", "..", "docs", "legal", "PRIVACIDADE.md")
  return fs.readFile(filePath, "utf8")
}

export default async function PrivacyPage() {
  const privacy = await readPrivacyPolicy()

  return (
    <EntryShell backHref="/login">
      <main>
        <article className="en en-form">
          <h1 className="en-h1">Política de privacidade</h1>
          <LegalDocument markdown={privacy} />
        </article>
      </main>
    </EntryShell>
  )
}
