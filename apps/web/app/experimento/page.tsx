import type { Metadata } from "next"
import { Fraunces } from "next/font/google"
import { Experimento } from "./experimento"

// Self-hosted editorial display serif. The variable is consumed by
// experimento.module.css via var(--font-fraunces). If the Google Fonts fetch
// fails at build time, Next surfaces a build error and we fall back to
// Public Sans (set up in the root layout) inside the CSS.
const fraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-fraunces",
  axes: ["SOFT", "opsz"],
})

export const metadata: Metadata = {
  title: "Bivaque — experimento editorial",
  description:
    "Experimento de página de apresentação do Bivaque: comunidade de pertencimento para militares federais, veteranos, pensionistas e dependentes.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
    },
  },
}

export default function ExperimentoPage() {
  return (
    <div className={fraunces.variable}>
      <Experimento />
    </div>
  )
}
