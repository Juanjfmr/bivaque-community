import { ArrowRight } from "lucide-react"
import Link from "next/link"
import { OnboardingShell } from "../components/onboarding-shell"
import styles from "../onboarding.module.css"

export default function OnboardingWelcomePage() {
  return (
    <OnboardingShell
      stage="complete"
      titleId="welcome-heading"
      eyebrow="Entrada concluída"
      title="Você chegou ao Bivaque."
      description="Sua conta, elegibilidade e localidade estão prontas. Agora escolha por onde quer começar."
      asideEyebrow="Agora você também faz parte do caminho"
      asideTitle="Chegue, participe e deixe referências."
      asideDescription="O que você aprende hoje pode facilitar a próxima chegada."
    >
      <div className={styles["stack"]}>
        <Link href="/community" className={styles["primaryLink"]}>
          Entrar na comunidade <ArrowRight aria-hidden="true" />
        </Link>

        <ul className={styles["actionList"]} aria-label="Primeiros passos">
          <li>
            <Link href="/localidade" className={styles["actionItem"]}>
              <div>
                <strong>Conhecer minha cidade</strong>
                <span>Veja referências e o que está acontecendo perto de você.</span>
              </div>
              <ArrowRight aria-hidden="true" />
            </Link>
          </li>

          <li>
            <Link href="/profile" className={styles["actionItem"]}>
              <div>
                <strong>Completar meu perfil</strong>
                <span>Escolha como outros membros encontram você.</span>
              </div>
              <ArrowRight aria-hidden="true" />
            </Link>
          </li>

          <li>
            <Link href="/groups" className={styles["actionItem"]}>
              <div>
                <strong>Encontrar um grupo</strong>
                <span>Aproxime-se por interesse e contexto.</span>
              </div>
              <ArrowRight aria-hidden="true" />
            </Link>
          </li>
        </ul>
      </div>
    </OnboardingShell>
  )
}
