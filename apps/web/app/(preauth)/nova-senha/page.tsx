import { cookies } from "next/headers"
import { hasRecoveryIntent, RECOVERY_INTENT_COOKIE } from "../../../lib/auth/recovery-intent"
import NovaSenhaClient from "./nova-senha-client"

export default async function NovaSenhaPage() {
  const cookieStore = await cookies()
  const recoveryReady = hasRecoveryIntent(cookieStore.get(RECOVERY_INTENT_COOKIE)?.value)

  return <NovaSenhaClient recoveryReady={recoveryReady} />
}
