import type { NextRequest, NextResponse } from "next/server"
import {
  clienteDeServicoOuNulo,
  conferirEscrita,
  exigirSessao,
  lerCorpoJson,
  responder,
  type SessaoAutenticada,
} from "../../../../lib/app-api/rota-do-app"
import { lerEscolha, localizarAnuncio } from "../../../../lib/geo/anuncio"
import { lerNovoDesapego } from "../../../../lib/listings/create"
import {
  anuncioDoRascunho,
  detalhesDoRascunho,
  enderecoDoRascunho,
  lerRascunhoDoImovel,
} from "../../../../lib/listings/property"
import { MAX_PHOTO_BYTES } from "../../../../lib/listings/types"
import { validatePropertyDraft } from "../../../../lib/listings/validation"
import { enviarFotoDoAnuncio, FalhaDaFoto } from "../../../../lib/storage/listing-photo"
import {
  cepDoCorpo,
  cidadeDaSessao,
  ehUuid,
  interpretarErroDoBanco,
  lerFotoDoCorpo,
  respostaDaLocalizacao,
} from "./_comum"

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
  // `kind` ausente é desapego: o app do desapego já chamava esta rota sem ele.
  const tipo = corpo["kind"] ?? "item"
  if (tipo === "property") return criarImovel(request, auth.sessao, corpo)
  if (tipo !== "item") return responder(request, { erro: "dados-invalidos" }, 400)
  const id = corpo["chave"]
  if (typeof id !== "string" || !ehUuid(id)) {
    return responder(request, { erro: "dados-invalidos" }, 400)
  }
  const lida = lerFotoDoCorpo(corpo["foto"])
  if ("invalida" in lida) return responder(request, { erro: "foto-invalida" }, 400)
  const foto = lida.foto
  try {
    const client = auth.sessao.cliente
    const userId = auth.sessao.usuario.id
    const cidade = await cidadeDaSessao(client, userId)
    if (!cidade) return responder(request, { erro: "sem-cidade" }, 403)
    const dados = lerNovoDesapego(corpo, cidade.id)
    if (!dados) return responder(request, { erro: "dados-invalidos" }, 400)

    // Desapego com CEP (ADR-20261022 §2): opcional, e a coordenada é SEMPRE
    // aproximada — não há oferta de local exato do item.
    const cepDoDesapego = cepDoCorpo(corpo["cep"])
    let localizacao: Readonly<{
      cep: string
      latitude: number | null
      longitude: number | null
      localizacaoPublica: string
      bairroDerivado: string | null
    }> | null = null
    if (cepDoDesapego !== null) {
      const servico = clienteDeServicoOuNulo()
      if (servico === null) {
        return responder(request, { erro: "localizacao-indisponivel" }, 503)
      }
      const localizado = await localizarAnuncio({
        cliente: servico,
        pessoa: userId,
        cepBruto: cepDoDesapego,
        escolha: "aproximada",
        forcarAproximada: true,
        cidadeId: cidade.id,
      })
      if (!localizado.ok) return respostaDaLocalizacao(request, localizado)
      localizacao = localizado.localizacao
    }

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
      neighborhood: dados.neighborhood || localizacao?.bairroDerivado || null,
      price_cents: dados.priceCents,
      category: dados.category,
      condition: dados.condition,
      ...(localizacao === null
        ? {}
        : {
            cep: localizacao.cep,
            latitude: localizacao.latitude,
            longitude: localizacao.longitude,
            localizacao_publica: localizacao.localizacaoPublica,
          }),
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

/**
 * Imóvel (kind property): a RPC transacional `create_property_listing` cria
 * `listings` e `property_details` juntos, com o dono vindo de `auth.uid()` — o
 * mesmo ciclo da antiga action da web. Nasce publicado, como o desapego.
 *
 * shortcut: sem chave idempotente, porque a RPC é quem gera o id; repetir
 * depois de uma resposta perdida cria outro imóvel (a action da web tinha a
 * mesma limitação). Quando isso doer, a chave vira uma coluna própria.
 */
async function criarImovel(
  request: NextRequest,
  sessao: SessaoAutenticada,
  corpo: Record<string, unknown>,
): Promise<NextResponse> {
  // A foto do imóvel tem fluxo próprio na web (uma por chamada); aqui ela não
  // entra calada num corpo que ninguém lê.
  if (corpo["foto"] !== undefined && corpo["foto"] !== null) {
    return responder(request, { erro: "foto-invalida" }, 400)
  }
  const client = sessao.cliente
  const userId = sessao.usuario.id
  try {
    const cidade = await cidadeDaSessao(client, userId)
    if (cidade === null) return responder(request, { erro: "sem-cidade" }, 403)
    const rascunho = lerRascunhoDoImovel(corpo)
    const validacao = validatePropertyDraft(rascunho)
    if (!validacao.ok) {
      return responder(
        request,
        { erro: "dados-invalidos", campo: validacao.field, mensagem: validacao.message },
        400,
      )
    }

    // Imóvel NOVO sempre tem CEP (ADR-20261116 §1). O avô sem CEP é o que já
    // estava publicado; a primeira edição dele é que passa a exigir.
    const cep = cepDoCorpo(corpo["cep"])
    if (cep === null) {
      return responder(
        request,
        { erro: "dados-invalidos", campo: "cep", mensagem: "Informe o CEP do imóvel." },
        400,
      )
    }
    const escolha = lerEscolha(corpo["localizacaoPublica"])
    if (escolha === null) {
      return responder(
        request,
        {
          erro: "dados-invalidos",
          campo: "localizacaoPublica",
          mensagem: "Escolha o local exato ou aproximado.",
        },
        400,
      )
    }
    // Local exato é o endereço publicado: sem endereço, a escolha não se
    // sustenta na tela.
    if (escolha === "exata" && (rascunho.address ?? "").trim() === "") {
      return responder(
        request,
        {
          erro: "dados-invalidos",
          campo: "address",
          mensagem: "Para publicar o local exato, informe o endereço.",
        },
        400,
      )
    }

    const servico = clienteDeServicoOuNulo()
    if (servico === null) {
      return responder(request, { erro: "localizacao-indisponivel" }, 503)
    }
    const localizado = await localizarAnuncio({
      cliente: servico,
      pessoa: userId,
      cepBruto: cep,
      escolha,
      forcarAproximada: false,
      cidadeId: cidade.id,
    })
    if (!localizado.ok) return respostaDaLocalizacao(request, localizado)
    const localizacao = localizado.localizacao

    const criado = await client.rpc("create_property_listing", {
      p_listing: {
        ...anuncioDoRascunho(rascunho, { status: "active", localityId: cidade.id }),
        // Aproximada não publica endereço: guardá-lo seria vazar o que a pessoa
        // escolheu esconder.
        address:
          localizacao.localizacaoPublica === "exata" ? enderecoDoRascunho(rascunho.address) : null,
        neighborhood: rascunho.neighborhood.trim() || localizacao.bairroDerivado,
        cep: localizacao.cep,
        latitude: localizacao.latitude,
        longitude: localizacao.longitude,
        localizacao_publica: localizacao.localizacaoPublica,
      },
      p_details: detalhesDoRascunho(rascunho),
    })
    if (criado.error) {
      const falha = interpretarErroDoBanco(criado.error.code, {
        recusado: "Sua conta não pode anunciar nesta cidade.",
        dados: "Revise os dados do anúncio.",
      })
      return responder(request, falha.corpo, falha.status)
    }
    if (typeof criado.data !== "string" || criado.data === "") {
      throw new Error("create without id")
    }
    return responder(request, { anuncio: { id: criado.data } }, 201)
  } catch {
    return responder(request, { erro: "escrita-indisponivel" }, 503)
  }
}
