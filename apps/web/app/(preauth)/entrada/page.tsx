import { ArrowRight, LockKeyhole, UsersRound } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { BrandMark } from "../../components/bivaque/brand-mark"
import styles from "./entry.module.css"

export const metadata = {
  title: "Entrar no Bivaque",
  description: "Escolha entre entrar em uma conta existente ou começar um novo acesso ao Bivaque.",
}

export default function EntryPage() {
  return (
    <main className={styles["root"]}>
      <section className={styles["contentPanel"]} aria-labelledby="entry-title">
        <header className={styles["header"]}>
          <Link href="/" className={styles["brandLink"]} aria-label="Bivaque, voltar ao início">
            <BrandMark asset="horizontal" tone="graphite" priority />
          </Link>
        </header>

        <div className={styles["content"]}>
          <p className={styles["eyebrow"]}>Bem-vindo ao Bivaque</p>
          <h1 id="entry-title">Um lugar para chegar, perguntar e participar.</h1>
          <p className={styles["lead"]}>
            Entre com uma conta existente ou crie seu primeiro acesso. A admissão e a escolha da sua
            localidade acontecem depois, no contexto certo.
          </p>

          <nav className={styles["actions"]} aria-label="Escolha como continuar">
            <Link href="/login" className={`${styles["action"]} ${styles["primaryAction"]}`}>
              <span>
                <strong>Entrar</strong>
                <small>Já tenho uma conta</small>
              </span>
              <ArrowRight aria-hidden="true" />
            </Link>
            <Link href="/signup" className={`${styles["action"]} ${styles["secondaryAction"]}`}>
              <span>
                <strong>Criar conta</strong>
                <small>É meu primeiro acesso</small>
              </span>
              <ArrowRight aria-hidden="true" />
            </Link>
          </nav>

          <div className={styles["trustNote"]}>
            <LockKeyhole aria-hidden="true" />
            <p>
              O acesso é controlado. Documentos e dados usados na admissão não viram informação
              pública de perfil.
            </p>
          </div>
        </div>
      </section>

      <section className={styles["visualPanel"]} aria-label="Pessoas chegando à comunidade Bivaque">
        <Image
          src="/landing/hero-bivaque-arrival.webp"
          alt="Pessoa chegando a um encontro comunitário enquanto outra pessoa oferece uma cadeira"
          fill
          priority
          unoptimized
          sizes="(max-width: 959px) 100vw, 48vw"
        />
        <div className={styles["scrim"]} aria-hidden="true" />
        <div className={styles["visualCopy"]}>
          <UsersRound aria-hidden="true" />
          <p>A comunidade vai com você.</p>
          <h2>Chegue sabendo a quem perguntar.</h2>
          <span>Referências de quem conhece o lugar, sem transformar a experiência em ruído.</span>
        </div>
      </section>
    </main>
  )
}
