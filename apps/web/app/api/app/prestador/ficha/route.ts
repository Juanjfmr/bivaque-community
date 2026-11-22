import { PROVIDER_CATEGORIES, PROVIDER_CATEGORY_LABELS } from "@bivaque/domain"
import type { NextRequest, NextResponse } from "next/server"
import {
  conferirEscrita,
  exigirSessao,
  lerCorpoJson,
  opcoesDoApp,
  responder,
} from "../../../../../lib/app-api/rota-do-app"
import { negocioDoDono } from "../../../../../lib/providers/app-negocio"
import {
  type EntradaDaFicha,
  salvarFichaDoPrestador,
} from "../../../../../lib/providers/ficha-do-prestador"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// TROCA-005 — a ficha do prestador civil pela porta do app (aba Ficha de Meu
// negócio). A regra de escrita é uma só, em `lib/providers/ficha-do-prestador`,
// a mesma que a Server Action antiga chama: os RPCs de página de negócio do
// membro recusam conta de prestador (AUTHZ-007), então esta conta grava direto
// em `provider_profiles`, sob a policy owner-only. GET lê com o cliente da
// sessão; nenhum `service_role` aqui.

type FichaDoCorpo = Pick<EntradaDaFicha, "nome" | "categoria" | "descricao"> &
  Partial<Pick<EntradaDaFicha, "telefone" | "telefonePublico">>

/** O catálogo de categorias é do servidor e vai em toda resposta, como na rota de negócio. */
function categorias() {
  return PROVIDER_CATEGORIES.map((id) => ({ id, nome: PROVIDER_CATEGORY_LABELS[id] }))
}

function fichaDoCorpo(corpo: Record<string, unknown>): FichaDoCorpo | null {
  const nome = corpo["nome"]
  const categoria = corpo["categoria"]
  const descricao = corpo["descricao"] ?? null
  const telefone = corpo["telefone"]
  const telefonePublico = corpo["telefonePublico"]
  if (typeof nome !== "string" || typeof categoria !== "string") return null
  if (descricao !== null && typeof descricao !== "string") return null
  if (telefone !== undefined && telefone !== null && typeof telefone !== "string") return null
  if (telefonePublico !== undefined && typeof telefonePublico !== "boolean") return null
  return {
    nome,
    categoria,
    descricao,
    ...(telefone === undefined ? {} : { telefone }),
    ...(telefonePublico === undefined ? {} : { telefonePublico }),
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  try {
    const negocio = await negocioDoDono(auth.sessao.cliente, auth.sessao.usuario.id)
    return responder(request, { negocio, categorias: categorias() }, 200)
  } catch {
    return responder(request, { erro: "leitura-indisponivel" }, 503)
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
  if (dados === null) {
    return responder(
      request,
      { erro: "dados-invalidos", mensagem: "Informe um nome de 2 a 80 letras e uma categoria." },
      400,
    )
  }

  const client = auth.sessao.cliente
  const userId = auth.sessao.usuario.id
  try {
    const resultado = await salvarFichaDoPrestador(client, userId, dados)
    if (!resultado.ok) {
      return responder(
        request,
        { erro: resultado.erro, mensagem: resultado.mensagem },
        resultado.status,
      )
    }
    const negocio = await negocioDoDono(client, userId)
    if (negocio === null) throw new Error("Ficha sem confirmação")
    return responder(request, { negocio, categorias: categorias() }, 200)
  } catch {
    return responder(request, { erro: "escrita-indisponivel" }, 503)
  }
}

export function OPTIONS(request: NextRequest): NextResponse {
  return opcoesDoApp(request)
}
