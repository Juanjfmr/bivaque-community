import type { SupabaseClient } from "@supabase/supabase-js"
import type { NextRequest, NextResponse } from "next/server"
import type { Database } from "supabase/database.generated"
import {
  clienteDeServicoOuNulo,
  conferirEscrita,
  exigirSessao,
  lerCorpoJson,
  responder,
} from "../../../../../lib/app-api/rota-do-app"
import { lerEscolha, localizarAnuncio } from "../../../../../lib/geo/anuncio"
import { validateListingEdit } from "../../../../../lib/listings/lifecycle"
import {
  detalhesDoRascunho,
  enderecoDoRascunho,
  type ImovelGravado,
  juntarRascunho,
  rascunhoDoBanco,
} from "../../../../../lib/listings/property"
import { MAX_PHOTO_BYTES } from "../../../../../lib/listings/types"
import { validatePropertyDraft } from "../../../../../lib/listings/validation"
import { enviarFotoDoAnuncio, FalhaDaFoto } from "../../../../../lib/storage/listing-photo"
import { isDefiniteSqlRejection } from "../../../../../lib/storage/rpc-outcome"
import { createServerClient as criarClienteServico } from "../../../../../lib/supabase/server"
import {
  cepDoCorpo,
  ehUuid,
  interpretarErroDoBanco,
  lerFotoDoCorpo,
  MENSAGEM_DO_AVO,
  respostaDaLocalizacao,
} from "../_comum"

type Context = { params: Promise<{ id: string }> }
type Cliente = SupabaseClient<Database>

// Editar o próprio anúncio (LAN-F06): desapego edita texto, preço e foto pelo
// `validateListingEdit`; imóvel edita as mesmas colunas que a antiga
// `updatePropertyAction` (listings + property_details) pelo
// `validatePropertyDraft`. A situação não passa por aqui — a guarda
// `listings_guard_status_transition` só aceita a RPC `transition_listing`, e a
// rota própria dela é `/situacao`. O dono vem da sessão, nunca do corpo.

const CAMPOS_OBRIGATORIOS = ["titulo", "bairro", "preco", "descricao", "categoria", "condicao"]

/** O que a edição relê: o endereço do desapego e o satélite inteiro do imóvel. */
const SELECT_EDITAVEL =
  "id, kind, owner_user_id, locality_id, address, status, title, description, neighborhood, " +
  "property_details(deal, property_type, rent_cents, condo_fee_cents, iptu_cents, " +
  "sale_price_cents, bedrooms, suites, parking_spots, area_m2, available_from)"

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

  const userId = auth.sessao.usuario.id
  try {
    const client = auth.sessao.cliente
    const existente = await client
      .from("listings")
      .select(SELECT_EDITAVEL)
      .eq("id", id)
      .eq("owner_user_id", userId)
      .maybeSingle()
    if (existente.error) throw existente.error
    if (existente.data === null) return responder(request, { erro: "anuncio-nao-encontrado" }, 404)
    const linha = existente.data as unknown as ImovelGravado & { kind: string }
    // O tipo vem do banco, nunca do corpo: um corpo de desapego num imóvel (ou o
    // contrário) é recusado pela validação do próprio tipo.
    if (linha.kind === "property") {
      return await editarImovel(request, client, userId, id, linha, corpo, lida.foto)
    }
    if (linha.kind !== "item") return responder(request, { erro: "anuncio-nao-encontrado" }, 404)
    return await editarDesapego(request, client, userId, id, linha, corpo, lida.foto)
  } catch (erro) {
    if (erro instanceof FalhaDaFoto) {
      return responder(request, { erro: "falha-na-foto", mensagem: erro.message }, erro.status)
    }
    return responder(request, { erro: "escrita-indisponivel" }, 503)
  }
}

async function editarDesapego(
  request: NextRequest,
  client: Cliente,
  userId: string,
  id: string,
  existente: ImovelGravado,
  corpo: Record<string, unknown>,
  foto: File | null,
): Promise<NextResponse> {
  // Endereço ausente no corpo preserva o que está gravado; presente, vale o
  // que a pessoa escreveu (vazio apaga) — a mesma regra do formulário da web.
  const enderecoBruto = corpo["endereco"]
  if (enderecoBruto !== undefined && enderecoBruto !== null && typeof enderecoBruto !== "string") {
    return responder(request, { erro: "dados-invalidos" }, 400)
  }
  if (CAMPOS_OBRIGATORIOS.some((campo) => typeof corpo[campo] !== "string")) {
    return responder(request, { erro: "dados-invalidos" }, 400)
  }

  const validacao = validateListingEdit({
    title: String(corpo["titulo"]),
    category: String(corpo["categoria"]),
    priceInput: String(corpo["preco"]),
    condition: String(corpo["condicao"]),
    description: String(corpo["descricao"]),
    neighborhood: String(corpo["bairro"]),
    address: typeof enderecoBruto === "string" ? enderecoBruto : (existente.address ?? ""),
  })
  if (!validacao.ok) {
    return responder(request, { erro: "dados-invalidos", campos: validacao.errors }, 400)
  }

  const valor = validacao.value

  // Desapego com CEP (ADR-20261022 §2): opcional, coordenada SEMPRE aproximada.
  // Sem CEP no corpo, o gravado continua — o item pode não ter localização.
  const cepDoItem = cepDoCorpo(corpo["cep"])
  let localizacao: Readonly<{
    cep: string
    latitude: number | null
    longitude: number | null
    localizacaoPublica: string
    bairroDerivado: string | null
  }> | null = null
  if (cepDoItem !== null) {
    const servico = clienteDeServicoOuNulo()
    if (servico === null) return responder(request, { erro: "localizacao-indisponivel" }, 503)
    const localizado = await localizarAnuncio({
      cliente: servico,
      pessoa: userId,
      cepBruto: cepDoItem,
      escolha: "aproximada",
      forcarAproximada: true,
      cidadeId: existente.locality_id,
    })
    if (!localizado.ok) return respostaDaLocalizacao(request, localizado)
    localizacao = localizado.localizacao
  }

  const escrita = await client
    .from("listings")
    .update({
      title: valor.title,
      description: valor.description,
      price_cents: valor.priceCents,
      category: valor.category,
      condition: valor.condition,
      neighborhood: valor.neighborhood || localizacao?.bairroDerivado || null,
      address: valor.address,
      ...(localizacao === null
        ? {}
        : {
            cep: localizacao.cep,
            latitude: localizacao.latitude,
            longitude: localizacao.longitude,
            localizacao_publica: localizacao.localizacaoPublica,
          }),
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
  if (foto !== null) {
    const path = await enviarFotoDoAnuncio(client, userId, id, 0, foto)
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
}

/**
 * Imóvel: mesma sequência da antiga `updatePropertyAction` — `listings` e
 * `property_details` em dois UPDATEs (não há RPC transacional para a edição; a
 * criação é que é atômica). Se o segundo falhar, a rota devolve o erro e não o
 * esconde: a ficha mostra o detalhe antigo, nunca um sucesso inventado.
 */
async function editarImovel(
  request: NextRequest,
  client: Cliente,
  userId: string,
  id: string,
  existente: ImovelGravado,
  corpo: Record<string, unknown>,
  foto: File | null,
): Promise<NextResponse> {
  if (foto !== null) {
    return responder(
      request,
      { erro: "dados-invalidos", mensagem: "A foto do imóvel não muda por esta rota." },
      400,
    )
  }
  // O dono do imóvel manda o vocabulário do imóvel: sem `title` no corpo, é o
  // formulário de desapego batendo na porta errada — recusa, nunca um "nada a
  // alterar" silencioso.
  if (typeof corpo["title"] !== "string") {
    return responder(request, { erro: "dados-invalidos" }, 400)
  }
  const rascunho = juntarRascunho(rascunhoDoBanco(existente), corpo)
  const validacao = validatePropertyDraft(rascunho)
  if (!validacao.ok) {
    return responder(
      request,
      { erro: "dados-invalidos", campo: validacao.field, mensagem: validacao.message },
      400,
    )
  }

  // O CEP do imóvel não é legível pela sessão (grant por coluna): quem diz o
  // gravado é a função do dono.
  const atual = await client.rpc("get_listing_location", { p_listing_id: id })
  if (atual.error) throw atual.error
  const gravada = atual.data?.[0]
  const cep = cepDoCorpo(corpo["cep"]) ?? gravada?.cep ?? null
  // Imóvel publicado antes do CEP (o "avô"): a PRIMEIRA edição passa a exigir o
  // CEP. Nada de backfill forjado — sem o CEP, a edição não passa.
  if (cep === null) {
    return responder(
      request,
      { erro: "dados-invalidos", campo: "cep", mensagem: MENSAGEM_DO_AVO },
      400,
    )
  }
  const escolha = lerEscolha(
    corpo["localizacaoPublica"] ?? gravada?.localizacao_publica ?? undefined,
  )
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
  if (servico === null) return responder(request, { erro: "localizacao-indisponivel" }, 503)
  const localizado = await localizarAnuncio({
    cliente: servico,
    pessoa: userId,
    cepBruto: cep,
    escolha,
    forcarAproximada: false,
    cidadeId: existente.locality_id,
  })
  if (!localizado.ok) return respostaDaLocalizacao(request, localizado)
  const localizacao = localizado.localizacao

  const escrita = await client
    .from("listings")
    .update({
      title: rascunho.title.trim(),
      description: rascunho.description.trim() || null,
      neighborhood: rascunho.neighborhood.trim() || localizacao.bairroDerivado,
      // Local aproximado não guarda o endereço: o que não se publica não se vaza.
      address:
        localizacao.localizacaoPublica === "exata" ? enderecoDoRascunho(rascunho.address) : null,
      cep: localizacao.cep,
      latitude: localizacao.latitude,
      longitude: localizacao.longitude,
      localizacao_publica: localizacao.localizacaoPublica,
    })
    .eq("id", id)
    .eq("owner_user_id", userId)
    .select("id")
    .single()
  if (escrita.error) {
    if (escrita.error.code === "PGRST116") {
      return responder(request, { erro: "anuncio-nao-encontrado" }, 404)
    }
    const falha = interpretarErroDoBanco(escrita.error.code, {
      recusado: "Sua conta não pode editar este anúncio.",
      dados: "Revise os dados do anúncio.",
    })
    return responder(request, falha.corpo, falha.status)
  }

  const detalhes = await client
    .from("property_details")
    .update(detalhesDoRascunho(rascunho))
    .eq("listing_id", id)
    .select("listing_id")
    .single()
  if (detalhes.error) {
    if (detalhes.error.code === "PGRST116") {
      return responder(request, { erro: "anuncio-nao-encontrado" }, 404)
    }
    const falha = interpretarErroDoBanco(detalhes.error.code, {
      recusado: "Sua conta não pode editar este anúncio.",
      dados: "Revise os dados do anúncio.",
    })
    return responder(request, falha.corpo, falha.status)
  }
  return responder(request, { anuncio: { id } }, 200)
}
