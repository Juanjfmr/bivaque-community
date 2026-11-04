import { createHmac } from "node:crypto"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "supabase/database.generated"

/**
 * O limitador do código de entrada, do lado do servidor (SEC-007,
 * ADR-20261101-entrada-unica-por-codigo §2).
 *
 * A conta mora no banco (`private.entry_otp_limits`, pontes
 * `public.entry_otp_send_gate` e `public.entry_otp_verify_attempt`, só
 * `service_role`). Aqui ficam três decisões que são do servidor:
 *
 * 1. **A chave nunca é o valor.** E-mail e IP viram HMAC-SHA256 antes de sair do
 *    processo: o banco, os logs e um dump não devolvem endereço nenhum.
 * 2. **IP só de cabeçalho que a plataforma escreve.** `x-vercel-forwarded-for` e
 *    `x-real-ip` são sobrescritos pela borda da Vercel; `x-forwarded-for` chega
 *    do cliente e NUNCA é identidade de IP. Sem nenhum dos dois (desenvolvimento
 *    local), vale só o limite por e-mail.
 * 3. **Falha fecha.** Se o banco do limitador não responde, a rota responde
 *    indisponível: um limitador que falha aberto deixa de existir justo quando
 *    alguém está abusando.
 */

export const TENTATIVAS_POR_CODIGO = 6

const SEGREDO_PADRAO = "bivaque-entrada-v1"

/** HMAC-SHA256 em hex (64 caracteres), o formato que o banco exige. */
export function chaveDeLimite(escopo: "email" | "ip", valor: string): string {
  const segredo = process.env["BIVAQUE_LIMITER_PEPPER"] ?? SEGREDO_PADRAO
  return createHmac("sha256", segredo).update(`${escopo}:${valor}`).digest("hex")
}

const IP_VALIDO = /^[0-9a-fA-F:.]{2,45}$/

/**
 * O IP do cliente segundo a plataforma, ou `null`. Só `x-vercel-forwarded-for` e
 * `x-real-ip` entram; o primeiro valor da lista vence e precisa parecer IP.
 */
export function ipConfiavel(cabecalhos: Headers): string | null {
  for (const nome of ["x-vercel-forwarded-for", "x-real-ip"]) {
    const bruto = cabecalhos.get(nome)
    if (bruto === null) continue
    const primeiro = bruto.split(",")[0]?.trim() ?? ""
    if (IP_VALIDO.test(primeiro)) return primeiro
  }
  return null
}

type ClienteDeServico = SupabaseClient<Database>

export type VereditoDoLimiteDeEnvio =
  | { readonly liberado: true }
  | { readonly liberado: false; readonly reenviarEm: number }
  | { readonly indisponivel: true }

/** Consome um envio. 0 libera; acima de 0 são os segundos de espera. */
export async function consumirEnvio(
  cliente: ClienteDeServico,
  email: string,
  ip: string | null,
): Promise<VereditoDoLimiteDeEnvio> {
  const { data, error } = await cliente.rpc("entry_otp_send_gate", {
    p_email_hash: chaveDeLimite("email", email),
    ...(ip === null ? {} : { p_ip_hash: chaveDeLimite("ip", ip) }),
  })
  if (error || typeof data !== "number") return { indisponivel: true }
  return data === 0 ? { liberado: true } : { liberado: false, reenviarEm: data }
}

/**
 * Consome uma tentativa de verificação ANTES de falar com o GoTrue (tentativas
 * paralelas não passam do teto). Devolve o número da tentativa, `0` quando o teto
 * foi atingido, ou `null` quando o limitador não respondeu.
 */
export async function consumirTentativa(
  cliente: ClienteDeServico,
  email: string,
): Promise<number | null> {
  const { data, error } = await cliente.rpc("entry_otp_verify_attempt", {
    p_email_hash: chaveDeLimite("email", email),
    p_max: TENTATIVAS_POR_CODIGO,
  })
  if (error || typeof data !== "number") return null
  return data
}

/**
 * Invalida no servidor o código ainda aberto do e-mail: `generateLink` troca o
 * token de um uso por outro que ninguém recebe (nenhum e-mail sai). Quem
 * adivinhou cinco dígitos do código antigo não tem mais o que acertar.
 * Devolve `false` se o GoTrue recusou — a rota segue recusando (a sétima
 * tentativa nem chega ao GoTrue), mas registra o erro sem o e-mail.
 */
export async function invalidarCodigo(cliente: ClienteDeServico, email: string): Promise<boolean> {
  const { error } = await cliente.auth.admin.generateLink({ type: "magiclink", email })
  return !error
}
