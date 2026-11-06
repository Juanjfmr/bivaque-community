import type { NextRequest, NextResponse } from "next/server"
import {
  conferirEscrita,
  exigirSessao,
  lerCorpoJson,
  responder,
} from "../../../../lib/app-api/rota-do-app"
import { lerNovoDesapego } from "../../../../lib/listings/create"
import { MAX_PHOTO_BYTES } from "../../../../lib/listings/types"
import { enviarFotoDoAnuncio, FalhaDaFoto } from "../../../../lib/storage/listing-photo"
import { cidadeDaSessao, ehUuid, interpretarErroDoBanco } from "./_comum"

/** Chave de envio estável no rascunho: repetir após falha não cria outro anúncio. */
export async function criarDesapego(request: NextRequest): Promise<NextResponse> {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  const porta = conferirEscrita(request, auth.sessao.via)
  if (porta !== "ok") return responder(request, { erro: porta }, 403)
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return responder(request, { erro: "corpo-invalido" }, 400)
  }
  const lido = await lerCorpoJson(request, Math.ceil((MAX_PHOTO_BYTES * 4) / 3) + 32768)
  if (!lido.ok) return responder(request, { erro: "corpo-invalido" }, 400)
  const corpo = lido.corpo
  const id = corpo["chave"]
  if (typeof id !== "string" || !ehUuid(id)) {
    return responder(request, { erro: "dados-invalidos" }, 400)
  }
  let foto: File | null = null
  if (corpo["foto"] !== null && corpo["foto"] !== undefined) {
    const bruto = corpo["foto"]
    if (typeof bruto !== "object" || Array.isArray(bruto)) {
      return responder(request, { erro: "foto-invalida" }, 400)
    }
    const valor = bruto as Record<string, unknown>
    const tipo = valor["tipo"]
    const conteudo = valor["conteudo"]
    if (
      typeof tipo !== "string" ||
      !["image/jpeg", "image/png", "image/webp"].includes(tipo) ||
      typeof conteudo !== "string" ||
      !/^[A-Za-z0-9+/]+={0,2}$/.test(conteudo) ||
      conteudo.length % 4 !== 0
    ) {
      return responder(request, { erro: "foto-invalida" }, 400)
    }
    const bytes = Buffer.from(conteudo, "base64")
    if (bytes.byteLength === 0 || bytes.byteLength > MAX_PHOTO_BYTES) {
      return responder(request, { erro: "foto-invalida" }, 400)
    }
    foto = new File([bytes], "foto", { type: tipo })
  }
  try {
    const client = auth.sessao.cliente
    const userId = auth.sessao.usuario.id
    const cidade = await cidadeDaSessao(client, userId)
    if (!cidade) return responder(request, { erro: "sem-cidade" }, 403)
    const dados = lerNovoDesapego(corpo, cidade.id)
    if (!dados) return responder(request, { erro: "dados-invalidos" }, 400)
    const existente = await client
      .from("listings")
      .select("id,status,locality_id,kind")
      .eq("id", id)
      .eq("owner_user_id", userId)
      .maybeSingle()
    if (existente.error) throw existente.error
    if (
      existente.data &&
      (existente.data.locality_id !== cidade.id || existente.data.kind !== "item")
    ) {
      return responder(request, { erro: "nao-encontrado" }, 404)
    }
    if (existente.data?.status === "active") {
      return responder(request, { anuncio: { id: existente.data.id } }, 200)
    }
    if (existente.data && existente.data.status !== "draft") {
      return responder(request, { erro: "estado-invalido" }, 409)
    }
    const payload = {
      title: dados.title,
      description: dados.description,
      neighborhood: dados.neighborhood,
      price_cents: dados.priceCents,
      category: dados.category,
      condition: dados.condition,
    }
    const escrita = existente.data
      ? await client
          .from("listings")
          .update(payload)
          .eq("id", id)
          .eq("owner_user_id", userId)
          .select("id")
          .single()
      : await client
          .from("listings")
          .insert({
            ...payload,
            id,
            kind: "item",
            status: "draft",
            owner_user_id: userId,
            locality_id: cidade.id,
          })
          .select("id")
          .single()
    if (escrita.error) {
      // Uma chave que já pertence a outra pessoa não pode ser usada para gravar.
      if (escrita.error.code === "23505") return responder(request, { erro: "nao-encontrado" }, 404)
      const falha = interpretarErroDoBanco(escrita.error.code, {
        recusado: "Sua conta não pode anunciar nesta cidade.",
        dados: "Revise os dados do anúncio.",
      })
      return responder(request, falha.corpo, falha.status)
    }
    if (!escrita.data) throw new Error("write without result")
    if (foto) {
      const path = await enviarFotoDoAnuncio(client, userId, id, 0, foto)
      const registro = await client.rpc("replace_listing_photo", {
        p_listing_id: id,
        p_path: path,
        p_position: 0,
      })
      if (registro.error) throw registro.error
    } else if (existente.data) {
      const removidas = await client.from("listing_photos").delete().eq("listing_id", id)
      if (removidas.error) throw removidas.error
    }
    // A guarda listings_guard_status_transition recusa UPDATE direto da situação
    // (42501): publicar é transição de servidor, pela única via autorizada.
    const publicado = await client.rpc("transition_listing", {
      p_listing_id: id,
      p_action: "publish",
    })
    if (publicado.error) throw publicado.error
    return responder(request, { anuncio: { id } }, 201)
  } catch (erro) {
    if (erro instanceof FalhaDaFoto) {
      return responder(request, { erro: "falha-na-foto", mensagem: erro.message }, erro.status)
    }
    return responder(request, { erro: "escrita-indisponivel" }, 503)
  }
}
