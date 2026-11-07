import { log } from "../logger"
import type { createServerClient } from "../supabase/server"

export async function removeReviewedDocuments(
  client: ReturnType<typeof createServerClient>,
  operatorId: string | null,
): Promise<boolean> {
  try {
    const { data, error } =
      operatorId === null
        ? await client.rpc("prepare_verification_document_removals")
        : await client.rpc("prepare_operator_document_removals", { p_operator_user_id: operatorId })
    if (error) throw error
    let complete = true
    for (const row of data ?? []) {
      const { error: removalError } = await client.storage
        .from("verification-documents")
        .remove([row.storage_object_path])
      if (removalError) {
        complete = false
        continue
      }
      const { error: completionError } = await client.rpc(
        "complete_verification_document_removal",
        {
          p_storage_object_path: row.storage_object_path,
        },
      )
      if (completionError) complete = false
    }
    return complete && (data?.length ?? 0) < 100
  } catch {
    log.error("operator document cleanup failed", { operator_id: operatorId })
    return false
  }
}
