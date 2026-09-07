import { CODE_OF_CONDUCT_VERSION, CONSENT_VERSION } from "@bivaque/domain"
import { NextResponse } from "next/server"
import { log } from "../../../lib/logger"
import { createServerClient } from "../../../lib/supabase/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * Registro do aceite, para o aplicativo nativo.
 *
 * Existe porque Server Action não serve o app: o mobile precisa de contrato
 * HTTP explícito (processo de construção §5). A web continua usando
 * `recordConsentAction`, que chama o mesmo RPC.
 *
 * O autor do aceite vem do token, NUNCA do corpo. `record_consent_acceptance`
 * recebe `p_user_id` e roda com service_role; aceitar esse id do cliente
 * deixaria qualquer pessoa registrar aceite em nome de outra — e aceite é
 * exatamente o registro que precisa ser verdadeiro para ter valor.
 *
 * Sem corpo: as versões são as do contrato compartilhado, não escolha de quem
 * chama. Um cliente que pudesse informar a versão poderia registrar aceite de
 * uma versão que nunca viu.
 */
export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const supabase = createServerClient()
  const token = authHeader.slice(7)

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token)

  if (authError || !user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const { error } = await supabase.rpc("record_consent_acceptance", {
    p_user_id: user.id,
    p_consent_version: CONSENT_VERSION,
    p_code_of_conduct_version: CODE_OF_CONDUCT_VERSION,
  })

  if (error) {
    log.error("consent record failed", { error: error.message })
    return NextResponse.json({ error: "could not record consent" }, { status: 500 })
  }

  return NextResponse.json({
    consent_version: CONSENT_VERSION,
    code_of_conduct_version: CODE_OF_CONDUCT_VERSION,
  })
}
