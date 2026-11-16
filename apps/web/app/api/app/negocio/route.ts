import type { ProviderCategory } from "@bivaque/domain"
import { PROVIDER_CATEGORIES, PROVIDER_CATEGORY_LABELS } from "@bivaque/domain"
import type { NextRequest, NextResponse } from "next/server"
import {
  conferirEscrita,
  exigirSessao,
  lerCorpoJson,
  opcoesDoApp,
  responder,
} from "../../../../lib/app-api/rota-do-app"
import { falhaDoNegocio, fichaDoDono, negocioDoDono } from "../../../../lib/providers/app-negocio"
import {
  firstFailure,
  validateBio,
  validateCategory,
  validateDisplayName,
} from "../../../../lib/providers/showcase"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// F07 (RUN-177) — `/api/app/negocio`: a página de negócio do PRÓPRIO membro.
//
// GET lê a ficha, o catálogo e o portfólio do dono da sessão. POST cria e PATCH
// edita pelos RPCs `create_`/`update_member_business_page` com o cliente da
// sessão — sem `service_role`: a RPC é `security definer` e deriva o dono de
// `auth.uid()`. A validação é a mesma de lib/providers/showcase que a tela web
// usava, não uma cópia.

type FichaDoCorpo = { nome: string; categoria: string; descricao: string | null }

/** O catálogo de categorias é do servidor (`@bivaque/domain`), e vai em toda resposta. */
const CATEGORIAS = PROVIDER_CATEGORIES.map((id) => ({ id, nome: PROVIDER_CATEGORY_LABELS[id] }))

function fichaDoCorpo(corpo: Record<string, unknown>): FichaDoCorpo | null {
  const nome = corpo["nome"]
  const categoria = corpo["categoria"]
  const descricao = corpo["descricao"] ?? null
  if (typeof nome !== "string" || typeof categoria !== "string") return null
  if (descricao !== null && typeof descricao !== "string") return null
  const limpa = descricao === null ? null : descricao.trim() || null
  const falha = firstFailure(
    validateDisplayName(nome),
    validateCategory(categoria),
    validateBio(limpa),
  )
  if (!falha.ok) return null
  return { nome: nome.trim(), categoria, descricao: limpa }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  try {
    const negocio = await negocioDoDono(auth.sessao.cliente, auth.sessao.usuario.id)
    return responder(request, { negocio, categorias: CATEGORIAS }, 200)
  } catch {
    return responder(request, { erro: "leitura-indisponivel" }, 503)
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  const porta = conferirEscrita(request, auth.sessao.via)
  if (porta !== "ok") return responder(request, { erro: porta }, 403)
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return responder(request, { erro: "dados-invalidos" }, 400)
  }
  const lido = await lerCorpoJson(request)
  const dados = lido.ok ? fichaDoCorpo(lido.corpo) : null
  if (dados === null)
    return responder(
      request,
      { erro: "dados-invalidos", mensagem: "Informe um nome de 2 a 80 letras e uma categoria." },
      400,
    )

  const client = auth.sessao.cliente
  const userId = auth.sessao.usuario.id
  try {
    // O RPC devolve a ficha existente em vez de recusar; a porta recusa primeiro
    // para a segunda criação nunca parecer sucesso de uma página nova.
    if ((await fichaDoDono(client, userId)) !== null)
      return responder(
        request,
        {
          erro: "ja-tem-ficha",
          mensagem: "Sua página de negócio já existe. Abra Meu negócio para editá-la.",
        },
        409,
      )
    const { data, error } = await client.rpc("create_member_business_page", {
      p_display_name: dados.nome,
      p_category: dados.categoria as ProviderCategory,
      ...(dados.descricao === null ? {} : { p_bio: dados.descricao }),
    })
    if (error) {
      const falha = falhaDoNegocio(error.code)
      return responder(request, { erro: falha.erro, mensagem: falha.mensagem }, falha.status)
    }
    if (typeof data !== "string") throw new Error("Ficha sem confirmação")
    const negocio = await negocioDoDono(client, userId)
    if (negocio === null) throw new Error("Ficha sem confirmação")
    return responder(request, { negocio, categorias: CATEGORIAS }, 201)
  } catch {
    return responder(request, { erro: "escrita-indisponivel" }, 503)
  }
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  const porta = conferirEscrita(request, auth.sessao.via)
  if (porta !== "ok") return responder(request, { erro: porta }, 403)
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return responder(request, { erro: "dados-invalidos" }, 400)
  }
  const lido = await lerCorpoJson(request)
  const dados = lido.ok ? fichaDoCorpo(lido.corpo) : null
  if (dados === null)
    return responder(
      request,
      { erro: "dados-invalidos", mensagem: "Informe um nome de 2 a 80 letras e uma categoria." },
      400,
    )

  const client = auth.sessao.cliente
  const userId = auth.sessao.usuario.id
  try {
    const ficha = await fichaDoDono(client, userId)
    if (ficha === null) return responder(request, { erro: "negocio-nao-encontrado" }, 404)
    // O id vem do banco, nunca do corpo: o p_provider_id é a ficha de quem chama.
    const { error } = await client.rpc("update_member_business_page", {
      p_provider_id: ficha.id,
      p_display_name: dados.nome,
      p_category: dados.categoria as ProviderCategory,
      ...(dados.descricao === null ? {} : { p_bio: dados.descricao }),
    })
    if (error) {
      const falha = falhaDoNegocio(error.code)
      return responder(request, { erro: falha.erro, mensagem: falha.mensagem }, falha.status)
    }
    const negocio = await negocioDoDono(client, userId)
    if (negocio === null) throw new Error("Ficha sem confirmação")
    return responder(request, { negocio, categorias: CATEGORIAS }, 200)
  } catch {
    return responder(request, { erro: "escrita-indisponivel" }, 503)
  }
}

export function OPTIONS(request: NextRequest): NextResponse {
  return opcoesDoApp(request)
}
