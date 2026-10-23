import { Suspense } from "react"
import { shouldShowEntryResume } from "../../../lib/auth/entry-progress"
import { readEntrySession } from "../../../lib/auth/entry-session"
import { BivaqueSignIn } from "./components/bivaque-sign-in"
import { EntryResume } from "./components/entry-resume"

// Entrar, ou "Você já começou" quando a sessão existe e a entrada não terminou
// (ADR-20261022-entrada-do-prototipo, item 5). A decisão é do servidor: a sessão
// vem dos cookies e o tipo da conta do banco, nunca de estado de cliente.
//
// `useSearchParams` na tela exige o boundary: sem ele o prerender falha no build.
// A página lê cookies, então é dinâmica — o `/login` deixa de ser estático, e é
// o preço de a tela saber quem está chegando antes de desenhar.
export const dynamic = "force-dynamic"

export default async function LoginPage() {
  const session = await readEntrySession()

  return (
    <Suspense fallback={null}>
      {shouldShowEntryResume(session) ? (
        <EntryResume email={session.email} name={session.name} />
      ) : (
        <BivaqueSignIn />
      )}
    </Suspense>
  )
}
