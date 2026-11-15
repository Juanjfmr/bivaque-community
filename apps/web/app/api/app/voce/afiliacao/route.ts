import type { SupabaseClient } from "@supabase/supabase-js"
import type { NextRequest, NextResponse } from "next/server"
import type { Database } from "supabase/database.generated"
import {
  conferirEscrita,
  exigirSessao,
  lerCorpoJson,
  opcoesDoApp,
  responder,
} from "../../../../../lib/app-api/rota-do-app"
import { isArmedForceId, validateOm } from "../../../../../lib/profile/affiliation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type Cliente = SupabaseClient<Database>
type Campo = "armed_force" | "om"

export type AfiliacaoDaPessoa = Readonly<{
  armedForce: string | null
  om: string | null
}>

/**
 * Força Armada e OM no app (F10 / RUN-170, ADR-20261116): autodeclaração
 * PRIVADA.
 *
 * A decisão é a do ADR: `is_visible` é SEMPRE false neste caminho — a rota nem
 * aceita campo de visibilidade no corpo (corpo com chave fora de `armedForce` e
 * `om` é 400, e é por isso que a recusa é por chave desconhecida em vez de por
 * uma lista de nomes de toggle: um sinônimo novo não vira porta). Expor Força/OM
 * a outros membros continua fora de escopo (BLOCK-AFFILIATION), e o toggle
 * "Exibir" da tela web sai com ela no Lote B.
 *
 * A posse é do banco: as linhas são lidas e escritas pelo cliente da SESSÃO, e
 * a policy `profile_affiliations_select_own`/`_insert_self`/`_update_self`/
 * `_delete_self` só deixa o dono. Nenhum filtro desta camada escolhe dono — o
 * `user_id` gravado é `auth.sessao.usuario.id`, nunca um id do corpo.
 *
 * A regra de valor é a compartilhada (`lib/profile/affiliation.ts`, a mesma da
 * tela web): enum fechado de três forças, OM de até 80 com varredura de CPF e
 * CEP, e limpar o campo apaga a linha.
 */
function lerAfiliacao(linhas: readonly { field: string; value: string }[]): AfiliacaoDaPessoa {
  const afiliacao: { armedForce: string | null; om: string | null } = {
    armedForce: null,
    om: null,
  }
  for (const linha of linhas) {
    if (linha.field === "armed_force" && isArmedForceId(linha.value))
      afiliacao.armedForce = linha.value
    else if (linha.field === "om") afiliacao.om = linha.value
  }
  return afiliacao
}

async function afiliacaoDaSessao(client: Cliente): Promise<AfiliacaoDaPessoa> {
  const { data, error } = await client.from("profile_affiliations").select("field,value")
  if (error) throw error
  return lerAfiliacao(data)
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  try {
    return responder(request, { afiliacao: await afiliacaoDaSessao(auth.sessao.cliente) }, 200)
  } catch {
    return responder(request, { erro: "afiliacao-indisponivel" }, 503)
  }
}

/** Código do banco → copy recuperável. O texto do Postgres nunca sai daqui. */
function respostaDaFalha(request: NextRequest, codigo: string): NextResponse {
  console.error("afiliacao: falha na escrita", { codigo })
  if (codigo === "23514")
    return responder(
      request,
      { erro: "dados-invalidos", mensagem: "Confira a Força Armada e a OM informadas." },
      400,
    )
  if (codigo === "42501")
    return responder(
      request,
      { erro: "sessao-expirada", mensagem: "Sua sessão expirou. Entre novamente para continuar." },
      401,
    )
  return responder(request, { erro: "afiliacao-indisponivel" }, 503)
}

export async function PUT(request: NextRequest): Promise<NextResponse> {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  const porta = conferirEscrita(request, auth.sessao.via)
  if (porta !== "ok") return responder(request, { erro: porta }, 403)

  const lido = await lerCorpoJson(request)
  if (!lido.ok) return responder(request, { erro: "corpo-invalido" }, 400)
  const corpo = lido.corpo
  const chaves = Object.keys(corpo)
  if (chaves.length === 0 || chaves.some((chave) => chave !== "armedForce" && chave !== "om"))
    return responder(request, { erro: "corpo-invalido" }, 400)

  const forca = corpo["armedForce"]
  const om = corpo["om"]
  const temForca = Object.hasOwn(corpo, "armedForce")
  const temOm = Object.hasOwn(corpo, "om")
  if (forca !== undefined && forca !== null && typeof forca !== "string")
    return responder(request, { erro: "corpo-invalido" }, 400)
  if (om !== undefined && om !== null && typeof om !== "string")
    return responder(request, { erro: "corpo-invalido" }, 400)

  const escolhida = typeof forca === "string" ? forca : ""
  if (escolhida !== "" && !isArmedForceId(escolhida))
    return responder(
      request,
      { erro: "dados-invalidos", mensagem: "Escolha a Força Armada na lista." },
      400,
    )
  if (typeof om === "string") {
    const problema = validateOm(om)
    if (problema !== null)
      return responder(request, { erro: "dados-invalidos", mensagem: problema }, 400)
  }

  // O corpo é o que MUDA: campo ausente não é tocado, campo com valor vazio ou
  // nulo é o apagar da D3 (limpar o campo remove a linha). O caminho do app não
  // tem visibilidade — a linha nasce e morre com `is_visible: false`.
  const userId = auth.sessao.usuario.id
  const client = auth.sessao.cliente
  const agora = new Date().toISOString()

  const linhas: Database["public"]["Tables"]["profile_affiliations"]["Insert"][] = []
  const apagar: Campo[] = []
  if (temForca) {
    if (escolhida === "") {
      apagar.push("armed_force")
    } else {
      linhas.push({
        user_id: userId,
        field: "armed_force",
        value: escolhida,
        is_visible: false,
        updated_at: agora,
      })
    }
  }
  if (temOm) {
    const texto = typeof om === "string" ? om.trim() : ""
    if (texto === "") {
      apagar.push("om")
    } else {
      linhas.push({
        user_id: userId,
        field: "om",
        value: texto,
        is_visible: false,
        updated_at: agora,
      })
    }
  }

  try {
    if (linhas.length > 0) {
      const { error } = await client
        .from("profile_affiliations")
        .upsert(linhas, { onConflict: "user_id,field" })
      if (error) return respostaDaFalha(request, error.code)
    }
    if (apagar.length > 0) {
      const { error } = await client
        .from("profile_affiliations")
        .delete()
        .eq("user_id", userId)
        .in("field", apagar)
      if (error) return respostaDaFalha(request, error.code)
    }
    return responder(request, { afiliacao: await afiliacaoDaSessao(client) }, 200)
  } catch (erro) {
    const codigo =
      typeof erro === "object" && erro !== null && "code" in erro
        ? String((erro as { code?: unknown }).code)
        : "desconhecido"
    return respostaDaFalha(request, codigo)
  }
}

export function OPTIONS(request: NextRequest): NextResponse {
  return opcoesDoApp(request)
}
