import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "supabase/database.generated"
import { type EtapaDoFluxo, VERSAO_DO_FLUXO } from "./entry-progresso"

/**
 * Avança o marcador do rascunho depois de uma etapa do fim da entrada.
 *
 * Depois do provisionamento o app não escreve mais o rascunho (o PUT responde
 * 409 a quem tem vínculo). As etapas que só existem no servidor — interesses e
 * combinado — avançam o marcador por aqui, com o id da SESSÃO, para a retomada
 * cair na etapa certa em vez de repetir as anteriores.
 */
export async function avancarMarcador(
  cliente: SupabaseClient<Database>,
  userId: string,
  etapa: Extract<EtapaDoFluxo, "interesses" | "combinado" | "avisos">,
): Promise<boolean> {
  const { error } = await cliente.from("entry_progress").upsert(
    {
      user_id: userId,
      versao: VERSAO_DO_FLUXO,
      etapa,
      estado: {},
    },
    { onConflict: "user_id" },
  )
  return !error
}
