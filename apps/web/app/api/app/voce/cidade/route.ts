import type { NextRequest, NextResponse } from "next/server"
import {
  conferirEscrita,
  exigirSessao,
  lerCorpoJson,
  opcoesDoApp,
  responder,
} from "../../../../../lib/app-api/rota-do-app"
import { moveErrorMessage, validateMove } from "../../../../../lib/locality/move-city"
import { cidadeDaSessao } from "../../eventos/_comum"
import { perfilDaSessao } from "../_comum"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * Mudar a cidade pelo app (F10 / RUN-170, ADR-20261116): a transferência que a
 * tela web já tem, pela mesma função do banco.
 *
 * O corpo é `{ destino: uuid, prazo: "aaaa-mm-dd" }` e nada mais é lido. O
 * destino é SEMPRE id de cidade do catálogo — nome nunca vira id, e o banco
 * recusa id fora do catálogo. A cidade atual vem do vínculo `current` da sessão,
 * nunca do pedido.
 *
 * A validação é `lib/locality/move-city.ts`: destino diferente da atual, prazo
 * entre hoje e +180 dias, padrão de 30. Era o módulo que a action da tela web
 * chamava; desde o RUN-172 esta rota é a única porta, e a regra fica no módulo
 * para não virar duas versões do teto no dia em que a transferência crescer.
 *
 * A escrita é `declare_locality_transfer` pelo cliente da SESSÃO: a função é
 * SECURITY DEFINER e resolve o dono por `auth.uid()`, então quem muda é sempre
 * quem está logado. Um cliente de privilégio não entra aqui: sob ele a função
 * perderia a identidade e a fronteira de escrita do próprio perfil.
 *
 * `23505` é o índice de uma saída por vez: é a mensagem vigente de mudança em
 * andamento (`moveErrorMessage`), status 409. `23514` é regra da função
 * (destino fora do catálogo, igual à atual); `28000` é sessão sem identidade e
 * `42501` é recusa de conta — conta suspensa ou com exclusão pedida, veto do
 * SEC-014 (A2 da auditoria de 16/11), com a mesma frase segura da porta de
 * afiliação. Nenhuma mensagem do Postgres sai daqui: o código vira copy, e o
 * resto é 503 sem eco.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  const porta = conferirEscrita(request, auth.sessao.via)
  if (porta !== "ok") return responder(request, { erro: porta }, 403)

  const lido = await lerCorpoJson(request)
  if (!lido.ok) return responder(request, { erro: "corpo-invalido" }, 400)
  const destino = lido.corpo["destino"]
  const prazo = lido.corpo["prazo"]
  if (typeof destino !== "string" || typeof prazo !== "string")
    return responder(request, { erro: "corpo-invalido" }, 400)

  const client = auth.sessao.cliente
  const userId = auth.sessao.usuario.id
  try {
    const atual = await cidadeDaSessao(client, userId)
    if (atual === null) return responder(request, { erro: "sem-cidade" }, 409)

    const problema = validateMove(
      { destinationId: destino, currentId: atual.id, termDate: prazo },
      new Date(),
    )
    if (problema !== null)
      return responder(request, { erro: "dados-invalidos", mensagem: problema }, 400)

    const { error } = await client.rpc("declare_locality_transfer", {
      p_destination_locality_id: destino,
      p_term_date: prazo,
    })
    if (error) {
      const mensagem = moveErrorMessage(error)
      if (error.code === "23505")
        return responder(request, { erro: "mudanca-em-andamento", mensagem }, 409)
      if (error.code === "23514")
        return responder(request, { erro: "dados-invalidos", mensagem }, 400)
      if (error.code === "28000" || error.code === "42501")
        return responder(request, { erro: "sessao-expirada", mensagem }, 401)
      console.error("cidade: declare_locality_transfer falhou", { codigo: error.code })
      return responder(request, { erro: "cidade-indisponivel" }, 503)
    }

    // O estado novo, lido de volta sob RLS: a cidade agora é o destino e a
    // anterior aparece como saída até o prazo.
    const perfil = await perfilDaSessao(client, userId)
    if (perfil === null) return responder(request, { erro: "sem-perfil" }, 404)
    return responder(request, { perfil }, 200)
  } catch (erro) {
    const codigo =
      typeof erro === "object" && erro !== null && "code" in erro
        ? String((erro as { code?: unknown }).code)
        : "desconhecido"
    console.error("cidade: falha inesperada", { codigo })
    return responder(request, { erro: "cidade-indisponivel" }, 503)
  }
}

/**
 * A cidade que um link aponta (`/app/voce?mudar=<id>#cidade`), só o nome e a
 * UF para o formulário abrir com o destino escolhido.
 *
 * Não é rota de catálogo (o catálogo é `/api/localities`, público e inteiro):
 * é uma pergunta por UM id, de sessão, e a policy de `localities` já deixa quem
 * tem cidade ler o catálogo (migration 20260925161111). Id fora do catálogo
 * devolve `destino: null` — o formulário abre vazio, sem inventar cidade.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  const destino = request.nextUrl.searchParams.get("destino") ?? ""
  try {
    const { data, error } = await auth.sessao.cliente
      .from("localities")
      .select("id,city_name,state_code")
      .eq("id", destino)
      .maybeSingle()
    if (error) throw error
    return responder(
      request,
      {
        destino: data === null ? null : { id: data.id, nome: data.city_name, uf: data.state_code },
      },
      200,
    )
  } catch {
    return responder(request, { erro: "cidade-indisponivel" }, 503)
  }
}

export function OPTIONS(request: NextRequest): NextResponse {
  return opcoesDoApp(request)
}
