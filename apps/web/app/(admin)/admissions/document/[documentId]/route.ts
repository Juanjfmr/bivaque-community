import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { log } from "../../../../../lib/logger"
import { canOperateAdmissions } from "../../../../../lib/security/admissions-authz"
import { createServerClient as createServiceClient } from "../../../../../lib/supabase/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// O documento só é aberto por operador confirmado no contexto do servidor — o
// mesmo parâmetro de `requireOperatorId` em ../actions.ts: caller vem dos
// cookies (auth do servidor), nunca de FormData, query ou estado de cliente.
async function resolveOperatorId(): Promise<string | null> {
  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"]
  const anonKey = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
  if (!url || !anonKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required")
  }

  const cookieStore = await cookies()
  const authClient = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll() {
        // read-only — a leitura do documento não escreve sessão
      },
    },
  })
  const {
    data: { user },
  } = await authClient.auth.getUser()
  if (!user) return null

  const serviceClient = createServiceClient()
  const { data: isOperator, error } = await serviceClient.rpc("is_current_user_operator", {
    p_user_id: user.id,
  })
  if (error) {
    log.error("admissions document operator check failed", { error: error.message })
    return null
  }
  return canOperateAdmissions({ callerId: user.id, callerIsOperator: isOperator === true })
    ? user.id
    : null
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ documentId: string }> },
) {
  const { documentId } = await params
  if (!UUID_RE.test(documentId)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 })
  }

  const operatorId = await resolveOperatorId()
  if (!operatorId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const serviceClient = createServiceClient()
  // O RPC já restringe a documento pendente e não expirado; sem linha, não há
  // objeto a abrir. O caminho cru nunca chega ao navegador: daqui só sai um
  // redirect para URL assinada de vida curta.
  const { data, error } = await serviceClient.rpc("read_verification_document_path", {
    p_document_id: documentId,
  })
  if (error) {
    log.error("admissions document read failed", {
      document_id: documentId,
      operator_id: operatorId,
      error: error.message,
    })
    return NextResponse.json({ error: "internal" }, { status: 500 })
  }
  const row = data?.[0]
  if (!row) {
    return NextResponse.json({ error: "not_found" }, { status: 404 })
  }

  const { data: signed, error: signError } = await serviceClient.storage
    .from("verification-documents")
    .createSignedUrl(row.storage_object_path, 60)
  if (signError || !signed?.signedUrl) {
    log.error("admissions document signing failed", {
      document_id: documentId,
      operator_id: operatorId,
      error: signError?.message ?? "missing signed url",
    })
    return NextResponse.json({ error: "internal" }, { status: 500 })
  }

  // Abertura de documento é ato auditável do operador sobre dado privado.
  log.info("admissions document opened", {
    document_id: documentId,
    operator_id: operatorId,
  })

  return NextResponse.redirect(signed.signedUrl, {
    status: 302,
    headers: { "Cache-Control": "no-store" },
  })
}
