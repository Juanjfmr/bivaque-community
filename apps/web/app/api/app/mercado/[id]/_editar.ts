import type { NextRequest, NextResponse } from "next/server"
import {
  conferirEscrita,
  exigirSessao,
  lerCorpoJson,
  responder,
} from "../../../../../lib/app-api/rota-do-app"
import { validateListingEdit } from "../../../../../lib/listings/lifecycle"
import { MAX_PHOTO_BYTES } from "../../../../../lib/listings/types"
import { enviarFotoDoAnuncio, FalhaDaFoto } from "../../../../../lib/storage/listing-photo"
import { isDefiniteSqlRejection } from "../../../../../lib/storage/rpc-outcome"
import { createServerClient as criarClienteServico } from "../../../../../lib/supabase/server"
import { ehUuid, interpretarErroDoBanco, lerFotoDoCorpo } from "../_comum"

type Context = { params: Promise<{ id: string }> }

// Editar o próprio anúncio (LAN-F06): texto, preço e foto, validados no mesmo
// módulo da web (`validateListingEdit`). A situação não passa por aqui — a
// guarda `listings_guard_status_transition` só aceita a RPC `transition_listing`,
// e a rota própria dela é `/situacao`. O dono vem da sessão, nunca do corpo.

const CAMPOS_OBRIGATORIOS = ["titulo", "bairro", "preco", "descricao", "categoria", "condicao"]

export async function PATCH(request: NextRequest, { params }: Context): Promise<NextResponse> {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  const porta = conferirEscrita(request, auth.sessao.via)
  if (porta !== "ok") return responder(request, { erro: porta }, 403)
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return responder(request, { erro: "corpo-invalido" }, 400)
  }
  const lido = await lerCorpoJson(request, Math.ceil((MAX_PHOTO_BYTES * 4) / 3) + 32768)
  if (!lido.ok) return responder(request, { erro: "corpo-invalido" }, lido.status)
  const { id } = await params
  if (!ehUuid(id)) return responder(request, { erro: "anuncio-nao-encontrado" }, 404)
  const corpo = lido.corpo
  const lida = lerFotoDoCorpo(corpo["foto"])
  if ("invalida" in lida) return responder(request, { erro: "foto-invalida" }, 400)

  // Endereço ausente no corpo preserva o que está gravado; presente, vale o
  // que a pessoa escreveu (vazio apaga) — a mesma regra do formulário da web.
  const enderecoBruto = corpo["endereco"]
  if (enderecoBruto !== undefined && enderecoBruto !== null && typeof enderecoBruto !== "string") {
    return responder(request, { erro: "dados-invalidos" }, 400)
  }
  if (CAMPOS_OBRIGATORIOS.some((campo) => typeof corpo[campo] !== "string")) {
    return responder(request, { erro: "dados-invalidos" }, 400)
  }

  const userId = auth.sessao.usuario.id
  try {
    const client = auth.sessao.cliente
    const existente = await client
      .from("listings")
      .select("id,kind,owner_user_id,address,status")
      .eq("id", id)
      .eq("owner_user_id", userId)
      .maybeSingle()
    if (existente.error) throw existente.error
    if (existente.data === null) return responder(request, { erro: "anuncio-nao-encontrado" }, 404)
    if (existente.data.kind !== "item") {
      return responder(
        request,
        {
          erro: "dados-invalidos",
          mensagem: "A edição pelo app é para desapego. Este anúncio é um imóvel.",
        },
        400,
      )
    }

    const validacao = validateListingEdit({
      title: String(corpo["titulo"]),
      category: String(corpo["categoria"]),
      priceInput: String(corpo["preco"]),
      condition: String(corpo["condicao"]),
      description: String(corpo["descricao"]),
      neighborhood: String(corpo["bairro"]),
      address: typeof enderecoBruto === "string" ? enderecoBruto : (existente.data.address ?? ""),
    })
    if (!validacao.ok) {
      return responder(request, { erro: "dados-invalidos", campos: validacao.errors }, 400)
    }

    const valor = validacao.value
    const escrita = await client
      .from("listings")
      .update({
        title: valor.title,
        description: valor.description,
        price_cents: valor.priceCents,
        category: valor.category,
        condition: valor.condition,
        neighborhood: valor.neighborhood,
        address: valor.address,
      })
      .eq("id", id)
      .eq("owner_user_id", userId)
      .select("id")
      .single()
    if (escrita.error) {
      // 0 rows under owner filter: the listing left (deleted by another tab).
      if (escrita.error.code === "PGRST116") {
        return responder(request, { erro: "anuncio-nao-encontrado" }, 404)
      }
      const falha = interpretarErroDoBanco(escrita.error.code, {
        recusado: "Sua conta não pode editar este anúncio.",
        dados: "Revise os dados do anúncio.",
      })
      return responder(request, falha.corpo, falha.status)
    }

    // A foto troca a capa (posição 0) na pasta do próprio anúncio; sem foto no
    // corpo, as fotos atuais continuam como estão. O ciclo é o da web
    // (`replaceListingPhotoAction`): a RPC devolve os caminhos antigos que a
    // troca substituiu, e eles saem do bucket pelo serviço — a posse deste
    // anúncio foi conferida pela sessão acima. Recusa SQL definitiva (a
    // transação não commitou) apaga o objeto novo; falha inconclusiva não
    // apaga nada, porque o commit pode ter acontecido com a resposta perdida.
    if (lida.foto !== null) {
      const path = await enviarFotoDoAnuncio(client, userId, id, 0, lida.foto)
      const servico = criarClienteServico()
      let antigos: string[] = []
      let recusa: { message: string; code?: string } | null = null
      // Rejeição de transporte (sem resposta) pula para o catch de fora: nenhum
      // objeto é apagado, não há prova de que a transação não commitou.
      const registro = await client.rpc("replace_listing_photo", {
        p_listing_id: id,
        p_path: path,
        p_position: 0,
      })
      if (registro.error) recusa = registro.error
      else if (Array.isArray(registro.data)) antigos = registro.data as string[]
      if (recusa !== null) {
        if (isDefiniteSqlRejection(recusa)) {
          const limpeza = await servico.storage.from("listing-photos").remove([path])
          if (limpeza.error)
            console.error("[mercado] falha ao remover objeto sem linha:", limpeza.error.message)
        }
        throw recusa
      }
      const aApagar = antigos.filter((p) => p !== path && p.startsWith(`${id}/`))
      if (aApagar.length > 0) {
        const limpeza = await servico.storage.from("listing-photos").remove(aApagar)
        if (limpeza.error)
          console.error("[mercado] falha ao remover fotos anteriores:", limpeza.error.message)
      }
    }
    return responder(request, { anuncio: { id } }, 200)
  } catch (erro) {
    if (erro instanceof FalhaDaFoto) {
      return responder(request, { erro: "falha-na-foto", mensagem: erro.message }, erro.status)
    }
    return responder(request, { erro: "escrita-indisponivel" }, 503)
  }
}
