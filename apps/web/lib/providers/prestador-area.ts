import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "supabase/database.generated"
import { validateContactPhone } from "./showcase"

type Cliente = SupabaseClient<Database>

// TROCA-005 — a conta e a área de atendimento do PRESTADOR pela porta do app.
//
// A regra do antigo painel (apps/web/app/(provider)/prestador), agora no módulo
// que a rota `/api/app` chama: a validação do telefone é a de `showcase`. Tudo lê e grava com o
// cliente da SESSÃO — a RLS `provider_accounts_select_self` e as policies
// owner-only de `provider_reach` decidem. Nenhum `service_role` aqui.

export type ContaDoPrestador = Readonly<{
  email: string | null
  temFicha: boolean
  telefone: string | null
  telefonePublico: boolean
}>

export type AtendimentoDoPrestador = Readonly<{
  temFicha: boolean
  alcanceAtivo: boolean
  comunidade: string | null
  cidade: string | null
}>

export type ResultadoSimples =
  | { readonly ok: true }
  | {
      readonly ok: false
      readonly motivo: "sem-ficha" | "sem-comunidade" | "sem-permissao" | "dados-invalidos"
      readonly mensagem: string
    }

async function fichaDoDono(client: Cliente, userId: string) {
  const { data, error } = await client
    .from("provider_profiles")
    .select("id,contact_is_public")
    .eq("owner_user_id", userId)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function contaDoPrestador(
  client: Cliente,
  userId: string,
  email: string | null,
): Promise<ContaDoPrestador> {
  const ficha = await fichaDoDono(client, userId)
  if (ficha === null) {
    return { email, temFicha: false, telefone: null, telefonePublico: false }
  }
  const { data, error } = await client.rpc("get_provider_contact_phone", {
    p_provider_id: ficha.id,
  })
  if (error) throw error
  return {
    email,
    temFicha: true,
    telefone: typeof data === "string" && data !== "" ? data : null,
    telefonePublico: ficha.contact_is_public,
  }
}

export async function salvarContaDoPrestador(
  client: Cliente,
  userId: string,
  entrada: Readonly<{ telefone: string | null; telefonePublico: boolean }>,
): Promise<ResultadoSimples> {
  const telefone = entrada.telefone === null ? null : entrada.telefone.trim() || null
  const veredito = validateContactPhone(telefone)
  if (!veredito.ok) {
    return { ok: false, motivo: "dados-invalidos", mensagem: veredito.message }
  }
  const ficha = await fichaDoDono(client, userId)
  if (ficha === null) {
    return {
      ok: false,
      motivo: "sem-ficha",
      mensagem: "Crie a página do negócio antes de editar a conta.",
    }
  }
  // `.select("id")` + contagem: para conta de membro a policy owner-only filtra
  // o UPDATE em silêncio (zero linhas, sem erro); sem contar linhas isso virava
  // "Conta salva." com o telefone descartado (achado 1 da correção 3).
  const { data: gravadas, error } = await client
    .from("provider_profiles")
    .update({
      contact_phone: telefone,
      contact_is_public: entrada.telefonePublico && telefone !== null,
    })
    .eq("id", ficha.id)
    .select("id")
  if (error) throw error
  if ((gravadas ?? []).length === 0) {
    return {
      ok: false,
      motivo: "sem-permissao",
      mensagem: "Esta conta não edita o contato do negócio.",
    }
  }
  return { ok: true }
}

export async function atendimentoDoPrestador(
  client: Cliente,
  userId: string,
): Promise<AtendimentoDoPrestador> {
  const ficha = await fichaDoDono(client, userId)
  if (ficha === null) {
    return { temFicha: false, alcanceAtivo: false, comunidade: null, cidade: null }
  }

  const { data: conta, error: erroDaConta } = await client
    .from("provider_accounts")
    .select("community_id,locality_id")
    .eq("auth_user_id", userId)
    .is("revoked_at", null)
    .maybeSingle()
  if (erroDaConta) throw erroDaConta

  const { data: alcance, error: erroDoAlcance } = await client
    .from("provider_reach")
    .select("active")
    .eq("provider_id", ficha.id)
    .eq("scope_type", "community")
    .eq("source", "free")
    .maybeSingle()
  if (erroDoAlcance) throw erroDoAlcance

  let comunidade: string | null = null
  if (conta?.community_id) {
    const { data, error } = await client
      .from("communities")
      .select("name")
      .eq("id", conta.community_id)
      .maybeSingle()
    if (error) throw error
    comunidade = data?.name ?? null
  }

  let cidade: string | null = null
  if (conta?.locality_id) {
    const { data, error } = await client
      .from("localities")
      .select("city_name,state_code")
      .eq("id", conta.locality_id)
      .maybeSingle()
    if (error) throw error
    cidade = data === null ? null : `${data.city_name}, ${data.state_code}`
  }

  return {
    temFicha: true,
    alcanceAtivo: alcance?.active ?? false,
    comunidade,
    cidade,
  }
}

export async function salvarAtendimento(
  client: Cliente,
  userId: string,
  ativo: boolean,
): Promise<ResultadoSimples> {
  const ficha = await fichaDoDono(client, userId)
  if (ficha === null) {
    return {
      ok: false,
      motivo: "sem-ficha",
      mensagem: "Crie a página do negócio antes de definir a área de atendimento.",
    }
  }
  const { data: conta, error: erroDaConta } = await client
    .from("provider_accounts")
    .select("community_id")
    .eq("auth_user_id", userId)
    .is("revoked_at", null)
    .maybeSingle()
  if (erroDaConta) throw erroDaConta
  if (conta === null) {
    return {
      ok: false,
      motivo: "sem-comunidade",
      mensagem: "Sua conta de prestador não está ligada a uma comunidade.",
    }
  }
  const { error } = await client.from("provider_reach").upsert(
    {
      provider_id: ficha.id,
      scope_type: "community",
      scope_id: conta.community_id,
      source: "free",
      active: ativo,
    },
    { onConflict: "provider_id,scope_type,scope_id" },
  )
  // A conta revogada entre a leitura e o upsert cai na RLS (42501): é recusa,
  // como na ficha e na conta, não serviço fora.
  if (error?.code === "42501") {
    return {
      ok: false,
      motivo: "sem-permissao",
      mensagem: "Esta conta não define a área de atendimento.",
    }
  }
  if (error) throw error
  return { ok: true }
}
