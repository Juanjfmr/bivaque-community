import { Suspense } from "react"
import { shouldShowEntryResume } from "../../../lib/auth/entry-progress"
import { readEntrySession } from "../../../lib/auth/entry-session"
import { BivaqueSignIn } from "../login/components/bivaque-sign-in"
import { EntryResume } from "../login/components/entry-resume"

// Criar conta, ou "Você já começou": `renderEntry` em account.js mostra a
// retomada tanto em `conta` quanto em `convite`, para ninguém perder a conta que
// já existe sem querer. Aqui a mesma decisão vale para `/signup`, pelo mesmo
// motivo e com a mesma fonte (servidor).
export const dynamic = "force-dynamic"

export default async function SignupPage() {
  const session = await readEntrySession()

  return (
    <Suspense fallback={null}>
      {shouldShowEntryResume(session) ? (
        <EntryResume email={session.email} name={session.name} />
      ) : (
        <BivaqueSignIn mode="signup" />
      )}
    </Suspense>
  )
}
