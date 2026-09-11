import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "supabase/database.generated"
import { log } from "../logger"

export type DocumentSituation = "none" | "in_review" | "needs_replacement" | "approved"

export interface DocumentStatus {
  situation: DocumentSituation
  uploadedAt: string | null
}

interface DocumentRow {
  review_status: string
  uploaded_at: string
}

export function mapDocumentSituation(row: DocumentRow | null): DocumentSituation {
  if (row === null) return "none"
  if (row.review_status === "approved") return "approved"
  if (row.review_status === "rejected") return "needs_replacement"
  return "in_review"
}

export function isMissingFunctionError(code: string | undefined, message: string): boolean {
  return (
    code === "PGRST202" ||
    code === "42883" ||
    message.includes("Could not find the function") ||
    message.includes("does not exist")
  )
}

export async function readDocumentStatus(
  client: SupabaseClient<Database>,
  userId: string,
): Promise<DocumentStatus> {
  const { data, error } = await client.rpc("my_verification_document", { p_user_id: userId })

  if (error) {
    if (isMissingFunctionError(error.code, error.message)) {
      log.warn("verification document status reader unavailable", { user_id: userId })
      return { situation: "none", uploadedAt: null }
    }
    throw new Error(`Failed to read verification document status: ${error.message}`)
  }

  const row = (data as DocumentRow[] | null)?.[0] ?? null
  return { situation: mapDocumentSituation(row), uploadedAt: row?.uploaded_at ?? null }
}

export async function readDocumentPaths(
  client: SupabaseClient<Database>,
  userId: string,
): Promise<string[] | null> {
  const { data, error } = await client.rpc("my_verification_document_paths", { p_user_id: userId })

  if (error) {
    if (isMissingFunctionError(error.code, error.message)) {
      return null
    }
    throw new Error(`Failed to read verification document paths: ${error.message}`)
  }

  return (data ?? []).map((row) => row.storage_object_path)
}
