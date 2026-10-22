import { brandTokens } from "@bivaque/tokens"
import type { Metadata, Viewport } from "next"
import { LandingPage } from "./landing/landing"

// PORT-001 (R73): os metadados da landing v8. O título e a descrição saem do
// próprio texto aprovado ("Juntos somos mais fortes." e a linha de apoio).
const TITLE = `${brandTokens.productName} — Juntos somos mais fortes`
const DESCRIPTION =
  "A família militar se ajuda, em qualquer cidade: pergunte a quem já mora perto, ache serviços e imóveis, passe adiante o que não usa mais. Gratuito para militares, veteranos, pensionistas e suas famílias."

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "família militar",
    "comunidade militar",
    "veteranos",
    "pensionistas",
    "mudança de cidade",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: "website",
    locale: "pt_BR",
    siteName: brandTokens.productName,
  },
}

// O themeColor continua vindo do adapter de tokens, como o contrato de escopo
// exige (tests/scope/design-system-contract.test.mjs). O par claro/escuro pedido
// para a landing NÃO entra aqui: aquele teste exige a expressão literal
// `themeColor: brandTokens.color.accent` e não aceita a forma de lista com
// media. O par está descrito em docs/agents/PORT_001.md para entrar junto com a
// atualização daquele teste, que não está nos allowed_paths desta tarefa.
export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: brandTokens.color.accent,
}

export default function HomePage() {
  return <LandingPage />
}
