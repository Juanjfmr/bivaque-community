import { createHmac } from "node:crypto"
import { isIP } from "node:net"
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
 *    processo: o banco, os logs e um dump não devolvem endereço nenhum. O segredo
 *    (`BIVAQUE_LIMITER_PEPPER`) é só do servidor e, em produção, não tem padrão:
 *    sem ele as rotas respondem 503 (um padrão público transformaria um dump da
 *    tabela em dicionário de e-mails). IPv6 entra reduzido ao /64, que é o que uma
 *    casa ou um celular recebe: sem isso um cliente gira dentro do próprio prefixo.
 * 2. **IP só de cabeçalho que a plataforma escreve.** `x-vercel-forwarded-for` e
 *    `x-real-ip` são sobrescritos pela borda da Vercel; `x-forwarded-for` chega
 *    do cliente e NUNCA é identidade de IP. Sem nenhum dos dois (desenvolvimento
 *    local), vale só o limite por e-mail.
 * 3. **Falha fecha.** Se o banco do limitador não responde, a rota responde
 *    indisponível: um limitador que falha aberto deixa de existir justo quando
 *    alguém está abusando.
 * 4. **Nada disto vai para log.** Nenhuma função daqui registra e-mail, código, IP
 *    ou chave; quem chama registra só a frase fixa.
 */

export const TENTATIVAS_POR_CODIGO = 6

// Só existe fora de produção (desenvolvimento e testes). Em produção o segredo vem
// do ambiente ou a rota não responde.
const SEGREDO_DE_DESENVOLVIMENTO = "bivaque-entrada-desenvolvimento"

function segredoDoLimitador(): string | null {
  const configurado = process.env["BIVAQUE_LIMITER_PEPPER"]
  if (configurado !== undefined && configurado.trim() !== "") return configurado
  return process.env.NODE_ENV === "production" ? null : SEGREDO_DE_DESENVOLVIMENTO
}

/**
 * `false` em produção sem `BIVAQUE_LIMITER_PEPPER` (ou com valor vazio): as rotas
 * do código respondem 503 antes de tocar o banco ou o GoTrue.
 */
export function limitadorConfigurado(): boolean {
  return segredoDoLimitador() !== null
}

/**
 * IPv6 reduzido ao prefixo /64 (`2001:db8:0:1::/64`), forma canônica; IPv4 fica
 * como veio; IPv4 embutido em IPv6 (`::ffff:203.0.113.9`) vira o IPv4. Valor que
 * não é IP volta intacto (o chamador só passa o que `ipConfiavel` aceitou).
 */
export function normalizarIp(ip: string): string {
  if (isIP(ip) !== 6) return ip
  const grupos = gruposDoIpv6(ip)
  if (grupos === null) return ip
  const [g0, g1, g2, g3, g4, g5, g6, g7] = grupos
  if (g0 === 0 && g1 === 0 && g2 === 0 && g3 === 0 && g4 === 0 && g5 === 0xffff) {
    return `${(g6 ?? 0) >> 8}.${(g6 ?? 0) & 0xff}.${(g7 ?? 0) >> 8}.${(g7 ?? 0) & 0xff}`
  }
  return `${[g0, g1, g2, g3].map((grupo) => (grupo ?? 0).toString(16)).join(":")}::/64`
}

/** Os oito grupos de 16 bits de um IPv6 válido, ou `null`. */
function gruposDoIpv6(ip: string): number[] | null {
  let texto = ip.toLowerCase()
  const zona = texto.indexOf("%")
  if (zona !== -1) texto = texto.slice(0, zona)

  if (texto.includes(".")) {
    const corte = texto.lastIndexOf(":")
    const octetos = texto
      .slice(corte + 1)
      .split(".")
      .map(Number)
    if (octetos.length !== 4 || octetos.some((o) => !Number.isInteger(o) || o < 0 || o > 255)) {
      return null
    }
    const [o0 = 0, o1 = 0, o2 = 0, o3 = 0] = octetos
    texto = `${texto.slice(0, corte + 1)}${((o0 << 8) | o1).toString(16)}:${((o2 << 8) | o3).toString(16)}`
  }

  const partes = texto.split("::")
  if (partes.length > 2) return null
  const cabeca = partes[0] ? partes[0].split(":") : []
  const cauda = partes[1] ? partes[1].split(":") : []
  let textos: string[]
  if (partes.length === 1) {
    textos = cabeca
  } else {
    const faltam = 8 - cabeca.length - cauda.length
    if (faltam < 0) return null
    textos = [...cabeca, ...Array<string>(faltam).fill("0"), ...cauda]
  }
  if (textos.length !== 8 || textos.some((grupo) => !/^[0-9a-f]{1,4}$/.test(grupo))) return null
  return textos.map((grupo) => Number.parseInt(grupo, 16))
}

/**
 * HMAC-SHA256 em hex (64 caracteres), o formato que o banco exige. O IP entra pelo
 * /64 (IPv6) e a chave do e-mail é a do endereço em minúsculas que a rota já
 * normalizou. Lança se não há segredo (produção sem `BIVAQUE_LIMITER_PEPPER`):
 * as rotas conferem `limitadorConfigurado()` antes e respondem 503.
 */
export function chaveDeLimite(escopo: "email" | "ip", valor: string): string {
  const segredo = segredoDoLimitador()
  if (segredo === null) throw new Error("BIVAQUE_LIMITER_PEPPER is required in production")
  const entrada = escopo === "ip" ? normalizarIp(valor) : valor
  return createHmac("sha256", segredo).update(`${escopo}:${entrada}`).digest("hex")
}

const IP_VALIDO = /^[0-9a-fA-F:.]{2,45}$/

/**
 * O IP do cliente segundo a plataforma, ou `null`. Só `x-vercel-forwarded-for` e
 * `x-real-ip` entram; o primeiro valor da lista vence e precisa ser um IP de verdade.
 */
export function ipConfiavel(cabecalhos: Headers): string | null {
  for (const nome of ["x-vercel-forwarded-for", "x-real-ip"]) {
    const bruto = cabecalhos.get(nome)
    if (bruto === null) continue
    const primeiro = bruto.split(",")[0]?.trim() ?? ""
    if (IP_VALIDO.test(primeiro) && isIP(primeiro) !== 0) return primeiro
  }
  return null
}

type ClienteDeServico = SupabaseClient<Database>

export type VereditoDoLimiteDeEnvio =
  | { readonly liberado: true }
  | { readonly liberado: false; readonly reenviarEm: number }
  | { readonly indisponivel: true }

/**
 * Consome um envio nos três tetos (e-mail, IP e global do projeto). 0 libera;
 * acima de 0 são os segundos de espera. O envio é contado ANTES do GoTrue: se o
 * GoTrue recusar depois, a cota gasta não volta (custo aceito no ADR).
 */
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
 * Chamada só DEPOIS de o GoTrue confirmar o envio: código novo, seis tentativas
 * novas. Se o GoTrue recusou, o código antigo segue vivo com as tentativas gastas.
 * Devolve `false` se o banco não respondeu (o código saiu; a pessoa só perde as
 * tentativas que já tinha gasto).
 */
export async function confirmarEnvio(cliente: ClienteDeServico, email: string): Promise<boolean> {
  const { error } = await cliente.rpc("entry_otp_send_confirmed", {
    p_email_hash: chaveDeLimite("email", email),
  })
  return !error
}

export type VereditoDaTentativa =
  | { readonly tentativa: number }
  | { readonly esgotado: true }
  | { readonly limiteDoIp: number }
  | { readonly indisponivel: true }

/**
 * Consome uma tentativa de verificação ANTES de falar com o GoTrue (tentativas
 * paralelas não passam do teto). O escopo do IP confiável (30 por 10 minutos) vem
 * antes do escopo do e-mail (6 por código); recusa não gasta cota. Devolve o número
 * da tentativa, `esgotado` quando o código do e-mail já gastou as seis, `limiteDoIp`
 * (com os segundos até reabrir) ou `indisponivel` quando o limitador não respondeu.
 */
export async function consumirTentativa(
  cliente: ClienteDeServico,
  email: string,
  ip: string | null,
): Promise<VereditoDaTentativa> {
  const { data, error } = await cliente.rpc("entry_otp_verify_attempt", {
    p_email_hash: chaveDeLimite("email", email),
    p_max: TENTATIVAS_POR_CODIGO,
    ...(ip === null ? {} : { p_ip_hash: chaveDeLimite("ip", ip) }),
  })
  if (error || typeof data !== "number") return { indisponivel: true }
  if (data < 0) return { limiteDoIp: -data }
  if (data === 0) return { esgotado: true }
  return { tentativa: data }
}

/**
 * Invalida no servidor o código ainda aberto do e-mail, com o tipo de link certo
 * pelo estado da conta. O GoTrue guarda o código de uma conta NÃO confirmada como
 * token de confirmação e o de uma conta confirmada como token de magic link, e
 * `magiclink` só troca o segundo (medido: com confirmação ligada, o código de uma
 * conta nova seguia valendo):
 *
 * - `confirmed`: `magiclink`;
 * - `unconfirmed`: `invite` (troca o token de confirmação sem pedir senha);
 * - `none`: não há código; nenhuma conta é criada.
 *
 * Nenhum e-mail sai (`generateLink` só devolve o link, que ninguém recebe).
 * Devolve `false` se o estado ou o GoTrue falharam: a rota segue recusando (a 7ª
 * tentativa nem chega ao GoTrue) e registra o erro sem o e-mail.
 */
export async function invalidarCodigo(cliente: ClienteDeServico, email: string): Promise<boolean> {
  const { data: estado, error: erroDoEstado } = await cliente.rpc("entry_otp_account_state", {
    p_email: email,
  })
  if (erroDoEstado || typeof estado !== "string") return false
  if (estado === "none") return true
  if (estado !== "confirmed" && estado !== "unconfirmed") return false

  const { error } = await cliente.auth.admin.generateLink({
    type: estado === "confirmed" ? "magiclink" : "invite",
    email,
  })
  return !error
}
