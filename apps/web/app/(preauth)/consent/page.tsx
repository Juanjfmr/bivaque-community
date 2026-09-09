import { CONSENT_VERSION } from "@bivaque/domain"
import type { Route } from "next"
import Link from "next/link"
import { OnboardingShell } from "../onboarding/components/onboarding-shell"
import styles from "../onboarding/onboarding.module.css"
import { ConsentForm } from "./consent-form"
export default function ConsentPage() {
  return (
    <OnboardingShell
      stage="rules"
      titleId="consent-heading"
      eyebrow="Um acordo de convivência"
      title="Antes de entrar, conheça as regras."
      description="O Bivaque usa verificação de elegibilidade e dados pessoais para manter uma comunidade fechada. Leia os documentos antes de continuar."
      asideEyebrow="O que sustenta a comunidade"
      asideTitle="Confiança não é um detalhe."
      asideDescription="As regras valem para todos. O aceite fica registrado com a versão apresentada nesta tela."
    >
      <div className={styles["stack"]}>
        <section aria-labelledby="documents-heading" className="space-y-3">
          <h2 id="documents-heading" className="text-base font-semibold">
            Documentos do Alpha
          </h2>
          <p className="text-sm text-muted">
            Consulte a versão completa da política e do código antes de marcar o aceite.
          </p>
          <div className="flex flex-col gap-2 text-sm">
            <Link
              href={"/privacidade" as Route}
              target="_blank"
              rel="noreferrer"
              className="min-h-11 rounded-md border border-border px-3 py-2 underline underline-offset-4 transition-colors duration-[var(--semantic-motion-duration-fast)] hover:bg-[var(--semantic-selected)]"
            >
              Ler a Política de privacidade completa
            </Link>
            <Link
              href={"/codigo-de-conduta" as Route}
              target="_blank"
              rel="noreferrer"
              className="min-h-11 rounded-md border border-border px-3 py-2 underline underline-offset-4 transition-colors duration-[var(--semantic-motion-duration-fast)] hover:bg-[var(--semantic-selected)]"
            >
              Ler o Código de conduta completo
            </Link>
          </div>
        </section>

        <ConsentForm consentVersion={CONSENT_VERSION} />
      </div>
    </OnboardingShell>
  )
}
