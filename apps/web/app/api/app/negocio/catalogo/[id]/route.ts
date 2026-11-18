import type { NextRequest, NextResponse } from "next/server"
import {
  conferirEscrita,
  exigirSessao,
  lerCorpoJson,
  opcoesDoApp,
  responder,
} from "../../../../../../lib/app-api/rota-do-app"
import {
  fichaDoDono,
  moverLinha,
  servicosDaFicha,
} from "../../../../../../lib/providers/app-negocio"
import {
  firstFailure,
  validateDescription,
  validateTitle,
} from "../../../../../../lib/providers/showcase"
import { ehUuid } from "../../../eventos/_comum"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
type Contexto = { params: Promise<{ id: string }> }

// F07 (RUN-177) — um item de serviço da ficha do próprio membro.
//
// PATCH edita os campos ou move uma posição (`direcao`), como as ações de
// catálogo do painel do prestador. DELETE remove. A RLS owner-only decide: o
// item de outra ficha simplesmente não volta do banco, e isso vira 404 — nunca
// 200 em cima de uma linha que não existe.

async function devolverServicos(
  request: NextRequest,
  client: Parameters<typeof servicosDaFicha>[0],
  providerId: string,
): Promise<NextResponse> {
  return responder(request, { servicos: await servicosDaFicha(client, providerId) }, 200)
}

export async function PATCH(request: NextRequest, { params }: Contexto): Promise<NextResponse> {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  const porta = conferirEscrita(request, auth.sessao.via)
  if (porta !== "ok") return responder(request, { erro: porta }, 403)
  const { id } = await params
  if (!ehUuid(id)) return responder(request, { erro: "servico-nao-encontrado" }, 404)
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return responder(request, { erro: "dados-invalidos" }, 400)
  }
  const lido = await lerCorpoJson(request)
  if (!lido.ok) return responder(request, { erro: "dados-invalidos" }, 400)
  const corpo = lido.corpo
  const direcao = corpo["direcao"]
  const temCampos = corpo["titulo"] !== undefined || corpo["descricao"] !== undefined

  const client = auth.sessao.cliente
  try {
    const ficha = await fichaDoDono(client, auth.sessao.usuario.id)
    if (ficha === null) return responder(request, { erro: "negocio-nao-encontrado" }, 404)

    if (direcao !== undefined) {
      if (direcao !== "cima" && direcao !== "baixo")
        return responder(request, { erro: "dados-invalidos" }, 400)
      const moveu = await moverLinha(client, "provider_catalog_items", ficha.id, id, direcao)
      return moveu
        ? devolverServicos(request, client, ficha.id)
        : responder(request, { erro: "servico-nao-encontrado" }, 404)
    }
    if (!temCampos) return responder(request, { erro: "dados-invalidos" }, 400)

    const titulo = corpo["titulo"] === undefined ? null : String(corpo["titulo"]).trim()
    const bruto = corpo["descricao"]
    let descricao: string | null | undefined
    if (bruto === undefined) descricao = undefined
    else if (bruto === null) descricao = null
    else if (typeof bruto === "string") descricao = bruto.trim() || null
    else return responder(request, { erro: "dados-invalidos" }, 400)
    const falha = firstFailure(
      titulo === null ? { ok: true } : validateTitle(titulo),
      descricao === undefined ? { ok: true } : validateDescription(descricao),
    )
    if (!falha.ok)
      return responder(request, { erro: "dados-invalidos", mensagem: falha.message }, 400)

    const { data, error } = await client
      .from("provider_catalog_items")
      .update({
        ...(titulo === null ? {} : { title: titulo }),
        ...(descricao === undefined ? {} : { description: descricao }),
      })
      .eq("id", id)
      .eq("provider_id", ficha.id)
      .select("id")
      .maybeSingle()
    if (error) throw error
    if (data === null) return responder(request, { erro: "servico-nao-encontrado" }, 404)
    return devolverServicos(request, client, ficha.id)
  } catch {
    return responder(request, { erro: "escrita-indisponivel" }, 503)
  }
}

export async function DELETE(request: NextRequest, { params }: Contexto): Promise<NextResponse> {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  const porta = conferirEscrita(request, auth.sessao.via)
  if (porta !== "ok") return responder(request, { erro: porta }, 403)
  const { id } = await params
  if (!ehUuid(id)) return responder(request, { erro: "servico-nao-encontrado" }, 404)

  const client = auth.sessao.cliente
  try {
    const ficha = await fichaDoDono(client, auth.sessao.usuario.id)
    if (ficha === null) return responder(request, { erro: "negocio-nao-encontrado" }, 404)
    const { data, error } = await client
      .from("provider_catalog_items")
      .delete()
      .eq("id", id)
      .eq("provider_id", ficha.id)
      .select("id")
      .maybeSingle()
    if (error) throw error
    if (data === null) return responder(request, { erro: "servico-nao-encontrado" }, 404)
    return devolverServicos(request, client, ficha.id)
  } catch {
    return responder(request, { erro: "escrita-indisponivel" }, 503)
  }
}

export function OPTIONS(request: NextRequest): NextResponse {
  return opcoesDoApp(request)
}
