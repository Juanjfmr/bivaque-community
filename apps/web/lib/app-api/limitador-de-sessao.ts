import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "supabase/database.generated"
import { chaveDeLimite } from "./entrada-limite"

type Escopo = "token" | "renovar"
export async function consumirSessaoNativa(
  servico: SupabaseClient<Database> | null,
  escopo: Escopo,
  ip: string | null,
): Promise<"liberado" | "estourou" | "indisponivel"> {
  if (!servico) return "indisponivel"
  try {
    // LOJA-002 autoriza service_role somente para consumir este RPC do limitador.
    const { data, error } = await servico.rpc("sessao_nativa_attempt", {
      p_scope: escopo,
      p_key_hash: chaveDeLimite("ip", ip ?? "sem-ip"),
      p_max: escopo === "token" ? 20 : 120,
      p_window_seconds: 600,
    })
    if (error || typeof data !== "boolean") return "indisponivel"
    return data ? "liberado" : "estourou"
  } catch {
    return "indisponivel"
  }
}
