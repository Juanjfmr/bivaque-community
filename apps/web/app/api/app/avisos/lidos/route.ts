import type { NextRequest, NextResponse } from "next/server"
import type { Database } from "supabase/database.generated"
import {
  conferirEscrita,
  exigirSessao,
  lerCorpoJson,
  opcoesDoApp,
  responder,
} from "../../../../../lib/app-api/rota-do-app"
import { ehUuid } from "../../eventos/_comum"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * Marca aviso como lido (F09): um (`{ id }`), o grupo inteiro (`{ grupo }`, a
 * chave opaca que a lista devolve) ou todos (`{ todos: true }`).
 *
 * O destinatário é sempre o da sessão. Um id de outra pessoa não é recusado
 * com a existência dele na resposta: a atualização simplesmente não alcança
 * linha nenhuma, e o corpo diz `atualizados: 0`. Marcar o que já estava lido
 * também é 0 — a operação é idempotente, como o botão da tela espera.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  const porta = conferirEscrita(request, auth.sessao.via)
  if (porta !== "ok") return responder(request, { erro: porta }, 403)
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return responder(request, { erro: "corpo-invalido" }, 400)
  }

  const lido = await lerCorpoJson(request)
  if (!lido.ok) return responder(request, { erro: "corpo-invalido" }, lido.status)

  const corpo = lido.corpo
  const todos = corpo["todos"] === true
  const id = corpo["id"]
  const avisoUnico = ehUuid(typeof id === "string" ? id : undefined)
  const grupo = lerChaveDeGrupo(corpo["grupo"])
  const formas = Number(todos) + Number(avisoUnico) + Number(grupo !== null)
  if (formas !== 1) {
    // exatamente uma forma: um id, um grupo ou todos. Nada além disso marca.
    return responder(request, { erro: "dados-invalidos" }, 400)
  }

  const userId = auth.sessao.usuario.id
  try {
    let atualizacao = auth.sessao.cliente
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("recipient_user_id", userId)
      .is("read_at", null)
    if (grupo !== null) {
      atualizacao = atualizacao
        .eq("type", grupo[0] as Database["public"]["Enums"]["notification_type"])
        .eq("action", grupo[1])
        .eq("target_type", grupo[2])
        .eq("target_id", grupo[3])
    } else if (avisoUnico) {
      atualizacao = atualizacao.eq("id", id as string)
    }

    const { data, error } = await atualizacao.select("id")
    if (error) throw error
    return responder(request, { atualizados: (data ?? []).length }, 200)
  } catch {
    return responder(request, { erro: "escrita-indisponivel" }, 503)
  }
}

/**
 * A chave do grupo é `tipo|ação|alvoTipo|alvoId`, montada pelo servidor a partir
 * de colunas NOT NULL do banco (`action`/`target_type` têm check 1..50, `target_id`
 * é uuid). Validar as quatro partes antes de filtrar evita que uma chave
 * truncada vire "marca todos".
 */
function lerChaveDeGrupo(bruto: unknown): readonly [string, string, string, string] | null {
  if (typeof bruto !== "string") return null
  const partes = bruto.split("|")
  if (partes.length !== 4) return null
  const [tipo, acao, alvoTipo, alvoId] = partes
  const forma = /^[a-z0-9_-]{1,50}$/
  if (
    tipo === undefined ||
    acao === undefined ||
    alvoTipo === undefined ||
    alvoId === undefined ||
    !forma.test(tipo) ||
    !forma.test(acao) ||
    !forma.test(alvoTipo) ||
    !ehUuid(alvoId)
  ) {
    return null
  }
  return [tipo, acao, alvoTipo, alvoId]
}

export function OPTIONS(request: NextRequest): NextResponse {
  return opcoesDoApp(request)
}
