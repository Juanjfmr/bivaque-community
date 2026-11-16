import type { NextRequest, NextResponse } from "next/server"
import {
  clienteDeServicoOuNulo,
  conferirEscrita,
  exigirSessao,
  lerCorpoJson,
  opcoesDoApp,
  responder,
} from "../../../../../../lib/app-api/rota-do-app"
import { fichaDoDono, fotosDaFicha, moverLinha } from "../../../../../../lib/providers/app-negocio"
import { ehUuid } from "../../../eventos/_comum"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
type Contexto = { params: Promise<{ id: string }> }

// F07 (RUN-177) — uma foto do portfólio do próprio membro: legenda, ordem e
// remoção. A linha é do cliente da sessão (RLS owner-only); o OBJETO no bucket
// foi gravado com `service_role` (dono nulo), então a remoção reconfere a
// autorização e o prefixo da pasta antes de apagar — o mesmo cuidado da ação do
// painel do prestador. Falha no Storage não trava a linha: caminho órfão não
// pode prender a ficha.

export async function PATCH(request: NextRequest, { params }: Contexto): Promise<NextResponse> {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  const porta = conferirEscrita(request, auth.sessao.via)
  if (porta !== "ok") return responder(request, { erro: porta }, 403)
  const { id } = await params
  if (!ehUuid(id)) return responder(request, { erro: "foto-nao-encontrada" }, 404)
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return responder(request, { erro: "dados-invalidos" }, 400)
  }
  const lido = await lerCorpoJson(request)
  if (!lido.ok) return responder(request, { erro: "dados-invalidos" }, 400)
  const corpo = lido.corpo
  const direcao = corpo["direcao"]

  const client = auth.sessao.cliente
  try {
    const ficha = await fichaDoDono(client, auth.sessao.usuario.id)
    if (ficha === null) return responder(request, { erro: "negocio-nao-encontrado" }, 404)

    if (direcao !== undefined) {
      if (direcao !== "cima" && direcao !== "baixo")
        return responder(request, { erro: "dados-invalidos" }, 400)
      const moveu = await moverLinha(client, "provider_portfolio_photos", ficha.id, id, direcao)
      if (!moveu) return responder(request, { erro: "foto-nao-encontrada" }, 404)
      return responder(request, { fotos: await fotosDaFicha(client, ficha.id) }, 200)
    }

    const bruto = corpo["legenda"]
    if (bruto !== null && typeof bruto !== "string")
      return responder(request, { erro: "dados-invalidos" }, 400)
    const legenda = typeof bruto === "string" ? bruto.trim() || null : null
    if (legenda !== null && legenda.length > 120)
      return responder(
        request,
        { erro: "dados-invalidos", mensagem: "A legenda passa de 120 caracteres." },
        400,
      )
    const { data, error } = await client
      .from("provider_portfolio_photos")
      .update({ caption: legenda })
      .eq("id", id)
      .eq("provider_id", ficha.id)
      .select("id")
      .maybeSingle()
    if (error) throw error
    if (data === null) return responder(request, { erro: "foto-nao-encontrada" }, 404)
    return responder(request, { fotos: await fotosDaFicha(client, ficha.id) }, 200)
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
  if (!ehUuid(id)) return responder(request, { erro: "foto-nao-encontrada" }, 404)

  const client = auth.sessao.cliente
  try {
    const ficha = await fichaDoDono(client, auth.sessao.usuario.id)
    if (ficha === null) return responder(request, { erro: "negocio-nao-encontrado" }, 404)
    const { data: linha, error: erroDaLeitura } = await client
      .from("provider_portfolio_photos")
      .select("photo_path")
      .eq("id", id)
      .eq("provider_id", ficha.id)
      .maybeSingle()
    if (erroDaLeitura) throw erroDaLeitura
    if (linha === null) return responder(request, { erro: "foto-nao-encontrada" }, 404)

    const caminho = (linha as { photo_path: string }).photo_path
    const { data: podeGerenciar, error: erroDaChecagem } = await client.rpc(
      "can_manage_provider_profile",
      { p_provider_id: ficha.id },
    )
    if (erroDaChecagem) throw erroDaChecagem
    if (podeGerenciar !== true) return responder(request, { erro: "recusado" }, 403)
    if (caminho.startsWith(`${ficha.id}/portfolio/`)) {
      const servico = clienteDeServicoOuNulo()
      if (servico !== null) await servico.storage.from("provider-photos").remove([caminho])
    }

    const { error } = await client
      .from("provider_portfolio_photos")
      .delete()
      .eq("id", id)
      .eq("provider_id", ficha.id)
    if (error) throw error
    return responder(request, { fotos: await fotosDaFicha(client, ficha.id) }, 200)
  } catch {
    return responder(request, { erro: "escrita-indisponivel" }, 503)
  }
}

export function OPTIONS(request: NextRequest): NextResponse {
  return opcoesDoApp(request)
}
