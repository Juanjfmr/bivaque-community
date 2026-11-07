import { NextResponse } from "next/server"
import { requireOperatorId, UUID_RE } from "../../../../../lib/admin/operator"
import { log } from "../../../../../lib/logger"
import { createServerClient as createServiceClient } from "../../../../../lib/supabase/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ documentId: string }> },
) {
  const { documentId } = await params
  if (!UUID_RE.test(documentId)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 })
  }

  const serviceClient = createServiceClient()
  const operatorId = await requireOperatorId(serviceClient)
  if (!operatorId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  // O RPC já restringe a documento pendente e não expirado; sem linha, não há
  // objeto a abrir. O caminho cru nunca chega ao navegador: daqui só sai um
  // redirect para URL assinada de vida curta.
  const { data, error } = await serviceClient.rpc("read_operator_verification_document", {
    p_operator_user_id: operatorId,
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
