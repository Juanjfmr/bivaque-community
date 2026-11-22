import type { ProviderCategory } from "@bivaque/domain"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "supabase/database.generated"
import {
  firstFailure,
  type FieldValidation,
  validateBio,
  validateCategory,
  validateContactPhone,
  validateDisplayName,
} from "./showcase"

type Cliente = SupabaseClient<Database>

/**
 * TROCA-005 — a ficha do prestador civil, numa regra só.
 *
 * A página de negócio tem dois caminhos de escrita, e eles não são
 * intercambiáveis: o membro grava pelos RPCs `create_/update_member_business_page`
 * (que recusam quem tem `provider_accounts`), e a conta de prestador grava direto
 * em `provider_profiles`, sob a policy owner-only (AUTHZ-007). Esta é a regra do
 * segundo caminho — a mesma da Server Action antiga
 * (`saveProfileAction`), agora chamada por ela e pela rota `/api/app/prestador/ficha`.
 *
 * Nada de `service_role`: a RLS decide, e o dono vem da sessão.
 */

export type EntradaDaFicha = Readonly<{
  nome: string
  categoria: string
  descricao: string | null
  /** Ausente = o campo não é tocado (a aba Ficha do app não edita telefone). */
  telefone?: string | null
  telefonePublico?: boolean
}>

export type FalhaDaFicha = Readonly<{
  erro: "dados-invalidos" | "recusado" | "indisponivel"
  mensagem: string
  status: 400 | 403 | 503
}>

export type ResultadoDaFicha = { readonly ok: true } | ({ readonly ok: false } & FalhaDaFicha)

/** A mesma validação que a Server Action antiga aplica, com a frase da pessoa. */
export function validarEntradaDaFicha(entrada: EntradaDaFicha): string | null {
  const telefone: FieldValidation =
    entrada.telefone === undefined ? { ok: true } : validateContactPhone(entrada.telefone)
  const falha = firstFailure(
    validateDisplayName(entrada.nome),
    validateCategory(entrada.categoria),
    validateBio(entrada.descricao),
    telefone,
  )
  return falha.ok ? null : falha.message
}

/** A recusa do banco traduzida — o texto do Postgres nunca sai daqui. */
export function falhaDaFicha(codigo: string | undefined): FalhaDaFicha {
  if (codigo === "42501" || codigo === "P0001") {
    return {
      erro: "recusado",
      mensagem: "Sua conta não pode gerenciar a página do negócio agora.",
      status: 403,
    }
  }
  if (codigo === "22023" || codigo === "23514") {
    return {
      erro: "dados-invalidos",
      mensagem: "Revise o nome, a categoria e a descrição da página.",
      status: 400,
    }
  }
  return {
    erro: "indisponivel",
    mensagem: "Não foi possível salvar a página agora. Tente de novo em instantes.",
    status: 503,
  }
}

type LinhaDaFicha = { id: string }

export async function salvarFichaDoPrestador(
  client: Cliente,
  userId: string,
  entrada: EntradaDaFicha,
): Promise<ResultadoDaFicha> {
  const problema = validarEntradaDaFicha(entrada)
  if (problema !== null) return { ok: false, ...falhaDaFicha("22023"), mensagem: problema }

  const { data: existente, error: erroDaLeitura } = await client
    .from("provider_profiles")
    .select("id")
    .eq("owner_user_id", userId)
    .maybeSingle()
  if (erroDaLeitura) return { ok: false, ...falhaDaFicha(erroDaLeitura.code) }

  const valores = {
    display_name: entrada.nome.trim(),
    category: entrada.categoria as ProviderCategory,
    bio: entrada.descricao === null ? null : entrada.descricao.trim() || null,
    ...(entrada.telefone === undefined
      ? {}
      : {
          contact_phone: entrada.telefone === null ? null : entrada.telefone.trim() || null,
          contact_is_public: entrada.telefonePublico === true && entrada.telefone !== null,
        }),
  }

  const ficha = existente as LinhaDaFicha | null
  const { error } = ficha === null
    ? await client.from("provider_profiles").insert({ ...valores, owner_user_id: userId })
    : await client.from("provider_profiles").update(valores).eq("id", ficha.id)
  if (error) return { ok: false, ...falhaDaFicha(error.code) }
  return { ok: true }
}

/**
 * Qual caminho de escrita vale para a sessão. Conta de prestador ATIVA grava
 * direto; qualquer outra conta é membro e grava pelos RPCs. Conta de prestador
 * revogada é membro para efeito de `is_provider_account`, então cai no caminho
 * de membro e recebe a recusa honesta de lá.
 */
export async function tipoDaConta(
  client: Cliente,
  userId: string,
): Promise<"membro" | "prestador"> {
  const { data, error } = await client
    .from("provider_accounts")
    .select("auth_user_id")
    .eq("auth_user_id", userId)
    .is("revoked_at", null)
    .maybeSingle()
  if (error) throw error
  return data === null ? "membro" : "prestador"
}
