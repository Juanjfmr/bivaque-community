import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "supabase/database.generated"
import { log } from "../logger"
import { ALVOS_DE_DENUNCIA_ABERTOS, type AlvoDaDenuncia } from "./destino-do-app"

/** Campos da linha `reports` que o destino usa. */
export type DenunciaLida = Readonly<{ id: string; target_type: string; target_id: string }>

/**
 * Confere, pelo cliente da sessão (RLS de quem lê), quais alvos de denúncia a
 * tela que os abre ainda mostra. Cada tipo usa o mesmo filtro da leitura real:
 * - post: `posts.is_deleted = false` (grupos/publicacoes/[id]);
 * - group: `groups.is_deleted = false` (grupos/_comum.ts, grupoDaSessao);
 * - recommendation_request: `is_deleted = false` (a policy de SELECT já exige).
 *
 * Uma consulta por tipo presente. Alvo que não volta fica fora do mapa, e o
 * aviso cai na tela segura. Falha de uma consulta degrada só o seu tipo; a
 * função não lança e não devolve a mensagem do banco.
 */
export async function alvosVisiveisDasDenuncias(
  client: SupabaseClient<Database>,
  denuncias: readonly DenunciaLida[],
): Promise<Map<string, AlvoDaDenuncia>> {
  const visiveis = new Set<string>()
  await Promise.all(
    [...ALVOS_DE_DENUNCIA_ABERTOS].map(async (alvoTipo) => {
      const ids = [
        ...new Set(
          denuncias.filter((denuncia) => denuncia.target_type === alvoTipo).map((d) => d.target_id),
        ),
      ]
      if (ids.length === 0) return
      for (const id of await idsVisiveisDoTipo(client, alvoTipo, ids)) {
        visiveis.add(chaveDoAlvo(alvoTipo, id))
      }
    }),
  )

  const alvos = new Map<string, AlvoDaDenuncia>()
  for (const denuncia of denuncias) {
    if (visiveis.has(chaveDoAlvo(denuncia.target_type, denuncia.target_id))) {
      alvos.set(denuncia.id, { alvoTipo: denuncia.target_type, alvoId: denuncia.target_id })
    }
  }
  return alvos
}

function chaveDoAlvo(alvoTipo: string, alvoId: string): string {
  return `${alvoTipo}:${alvoId}`
}

async function idsVisiveisDoTipo(
  client: SupabaseClient<Database>,
  alvoTipo: string,
  ids: readonly string[],
): Promise<readonly string[]> {
  try {
    const { data, error } = await consultaDoTipo(client, alvoTipo, ids)
    if (error) throw error
    return (data ?? []).map((linha) => linha.id)
  } catch (erro) {
    log.error("app avisos: report target check failed", {
      alvoTipo,
      error: mensagemDeErro(erro),
    })
    return []
  }
}

function consultaDoTipo(
  client: SupabaseClient<Database>,
  alvoTipo: string,
  ids: readonly string[],
) {
  switch (alvoTipo) {
    case "post":
      return client
        .from("posts")
        .select("id")
        .in("id", [...ids])
        .eq("is_deleted", false)
    case "group":
      return client
        .from("groups")
        .select("id")
        .in("id", [...ids])
        .eq("is_deleted", false)
    case "recommendation_request":
      return client
        .from("recommendation_requests")
        .select("id")
        .in("id", [...ids])
        .eq("is_deleted", false)
    default:
      throw new Error(`alvo de denúncia sem conferência: ${alvoTipo}`)
  }
}

function mensagemDeErro(erro: unknown): string {
  if (erro instanceof Error) return erro.message
  const { message } = (erro ?? {}) as { message?: unknown }
  return typeof message === "string" ? message : "unknown"
}
