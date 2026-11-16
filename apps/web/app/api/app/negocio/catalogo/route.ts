import type { NextRequest, NextResponse } from "next/server"
import {
  conferirEscrita,
  exigirSessao,
  lerCorpoJson,
  opcoesDoApp,
  responder,
} from "../../../../../lib/app-api/rota-do-app"
import { fichaDoDono, servicosDaFicha } from "../../../../../lib/providers/app-negocio"
import {
  firstFailure,
  validateDescription,
  validateTitle,
} from "../../../../../lib/providers/showcase"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// F07 (RUN-177) — a coleção de serviços da ficha do próprio membro. Espelha a
// `saveCatalogItemAction` do painel do prestador (mesmos limites de
// lib/providers/showcase), sem tocar o painel civil: aqui a ficha é a da
// sessão e a RLS owner-only continua sendo quem autoriza a gravação.
//
// Toda resposta de escrita devolve a lista ORDENADA inteira: a tela não precisa
// reconciliar item a item depois de criar, editar, mover ou remover.

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  const porta = conferirEscrita(request, auth.sessao.via)
  if (porta !== "ok") return responder(request, { erro: porta }, 403)
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return responder(request, { erro: "dados-invalidos" }, 400)
  }
  const lido = await lerCorpoJson(request)
  const corpo = lido.ok ? lido.corpo : null
  const titulo = typeof corpo?.["titulo"] === "string" ? corpo["titulo"].trim() : ""
  const bruto = corpo?.["descricao"] ?? null
  const descricao = typeof bruto === "string" ? bruto.trim() || null : bruto
  if (descricao !== null && typeof descricao !== "string")
    return responder(request, { erro: "dados-invalidos" }, 400)
  const falha = firstFailure(validateTitle(titulo), validateDescription(descricao))
  if (!falha.ok)
    return responder(request, { erro: "dados-invalidos", mensagem: falha.message }, 400)

  const client = auth.sessao.cliente
  try {
    const ficha = await fichaDoDono(client, auth.sessao.usuario.id)
    if (ficha === null) return responder(request, { erro: "negocio-nao-encontrado" }, 404)
    const { count, error: erroDaContagem } = await client
      .from("provider_catalog_items")
      .select("*", { count: "exact", head: true })
      .eq("provider_id", ficha.id)
    if (erroDaContagem) throw erroDaContagem
    const { error } = await client.from("provider_catalog_items").insert({
      provider_id: ficha.id,
      title: titulo,
      description: descricao,
      position: count ?? 0,
    })
    if (error) throw error
    return responder(request, { servicos: await servicosDaFicha(client, ficha.id) }, 201)
  } catch {
    return responder(request, { erro: "escrita-indisponivel" }, 503)
  }
}

export function OPTIONS(request: NextRequest): NextResponse {
  return opcoesDoApp(request)
}
