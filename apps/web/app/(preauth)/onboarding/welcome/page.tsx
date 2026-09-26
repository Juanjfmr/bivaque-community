import { ArrowRight } from "lucide-react"
import Link from "next/link"
import { ContextSteps } from "../components/context-steps"
import styles from "../onboarding.module.css"

export default function OnboardingWelcomePage() {
  return (
    <ContextSteps
      current="concluir"
      titleId="welcome-heading"
      title="Você chegou ao Bivaque."
      description="Tudo pronto. Escolha por onde quer começar."
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
    </ContextSteps>
  )
}
