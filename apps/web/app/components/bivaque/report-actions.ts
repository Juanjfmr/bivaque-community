"use server"

import { scrubReportReason } from "@bivaque/domain"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import type { Database } from "supabase/database.generated"
import { log } from "../../../lib/logger"
import {
  composeReportReason,
  EXPLANATION_MAX,
  isReportReasonValue,
  reportReasonLabel,
} from "./report-reasons"

const REPORT_TARGET_TYPES = [
  "post",
  "comment",
  "group",
  "message",
  "recommendation_request",
  "recommendation_reply",
  "listing",
] as const

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export interface SubmitReportResult {
  ok: boolean
  error?:
    | "unauthenticated"
    | "invalid-reason"
    | "invalid-target"
    | "too-long"
    | "duplicate"
    | "own-content"
    | "failed"
}

// A lista fechada é validada AQUI, no servidor, antes de qualquer escrita: o
// valor precisa ser uma categoria canônica de REPORT_REASONS, e a explicação
// opcional tem o teto da prancha 56. O motivo gravado é sempre
// `Rótulo: explicação` — o mesmo formato que a fila da operação lê de volta.
// Quem reporta é resolvido do cookie de sessão; service_role não existe neste
// caminho e a RLS continua sendo a palavra final sobre alvo e autoria.
export async function submitReportAction(formData: FormData): Promise<SubmitReportResult> {
  const category = String(formData.get("categoria") ?? "")
  if (!isReportReasonValue(category)) {
    return { ok: false, error: "invalid-reason" }
  }
  const targetType = String(formData.get("targetType") ?? "")
  const targetId = String(formData.get("targetId") ?? "")
  if (!(REPORT_TARGET_TYPES as readonly string[]).includes(targetType) || !UUID_RE.test(targetId)) {
    return { ok: false, error: "invalid-target" }
  }
  const explanation = String(formData.get("explicacao") ?? "")
    .trim()
    .slice(0, EXPLANATION_MAX)
  if (String(formData.get("explicacao") ?? "").trim().length > EXPLANATION_MAX) {
    return { ok: false, error: "too-long" }
  }

  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"]
  const anonKey = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
  if (!url || !anonKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required")
  }
  const cookieStore = await cookies()
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll() {
        // A sessão é lida aqui; nenhuma escrita de cookie parte desta action.
      },
    },
  })
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { ok: false, error: "unauthenticated" }
  }

  const label = reportReasonLabel(category)
  if (label === null) {
    return { ok: false, error: "invalid-reason" }
  }
  const reason = scrubReportReason(composeReportReason(label, explanation))

  const { error } = await supabase.from("reports").insert({
    target_type: targetType as Database["public"]["Enums"]["report_target_type"],
    target_id: targetId,
    reason,
  } as Database["public"]["Tables"]["reports"]["Insert"])

  if (error) {
    if (error.code === "23505" || error.message.includes("duplicate")) {
      return { ok: false, error: "duplicate" }
    }
    if (error.message.includes("own content")) {
      return { ok: false, error: "own-content" }
    }
    log.error("report submit failed", { target_type: targetType, error: error.message })
    return { ok: false, error: "failed" }
  }

  return { ok: true }
}
