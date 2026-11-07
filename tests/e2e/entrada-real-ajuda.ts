/**
 * Ajuda do harness de E2E da entrada real (F01 / LAN-F01, lote B).
 *
 * A entrada de produção vive em `/app/entrar` (`apps/app/src/entrada/TelaDeEntrada.tsx`)
 * e fala com o Next em `/api/app/entry/*`. Para percorrê-la de ponta a ponta o
 * harness precisa de três coisas que o navegador não dá sozinho:
 *
 * 1. **O código do e-mail.** O GoTrue local entrega no Mailpit
 *    (`http://127.0.0.1:55324`); `lerCodigoDoEmail` espera a mensagem mais nova
 *    para o endereço e extrai os seis dígitos do `Text`, do `Subject` ou do `HTML`.
 * 2. **Uma conta já verificada.** O Portal da Transparência não responde no
 *    stack local (sem `PORTAL_DADOS_API_KEY` a consulta cai em
 *    `temporary_error`), então a fixture marca o vínculo como `verified` antes da
 *    jornada. A rota `/api/app/entry/cpf` devolve o estado canônico de quem já
 *    está verificado **sem chamar o Portal** (ver `verifyEligibility` em
 *    `apps/web/lib/onboarding/verifyAndProvision.ts`).
 * 3. **A sessão de uma persona semeada**, para o caso de membro existente.
 *
 * Regras de segurança deste arquivo:
 *
 * - **Nunca** imprime a service role key. Ela só aparece no cabeçalho das
 *   requisições; as mensagens de erro falam de configuração, não do valor.
 * - Só aceita endereços sintéticos (`*.invalid`). E-mail completo também não
 *   entra em mensagem de erro: o que aparece é a forma mascarada (`a***@dominio`).
 * - Nada de CPF real: a tela recebe o sintético válido `52998224725`.
 *
 * O estado de verificação mora em `private.verification_outcomes`, que a Data API
 * **não** expõe (o schema `private` nunca é servido pelo PostgREST). A escrita
 * usa a ponte pública `public.upsert_verification_outcome`, `security definer` e
 * concedida apenas a `service_role` — o mesmo caminho do servidor.
 */

import { createHash, randomBytes, randomInt } from "node:crypto"
import { mkdirSync } from "node:fs"
import { join } from "node:path"
import { type BrowserContext, expect, type Page } from "@playwright/test"
import { CURRENT_CONSENT, encodeAuthCookieValue, readEnvLocal } from "./helpers/session"

/** CPF sintético válido (dígitos verificadores conferem). Nunca use CPF real. */
export const CPF_SINTETICO = "52998224725"

/** Endereço da persona semeada que já é membro de Manaus. */
export const MEMBRO_SEMEADO = "visual@bivaque.example.invalid"

// Titular verificado com cidade no seed (Manaus): é quem "convida" nos testes.
const INVITER_VERIFICADO = "20000000-0000-4000-8000-000000000001"

const URL_DO_MAILPIT_PADRAO = "http://127.0.0.1:55324"
const URL_DO_SUPABASE_PADRAO = "http://127.0.0.1:55321"

const ESPERA_DO_CODIGO_MS = 20_000
const PASSO_DA_ESPERA_MS = 500
const PRAZO_DA_ETAPA_MS = 20_000
const PRAZO_DA_GRAVACAO_MS = 30_000
// O `Created` do Mailpit vem do relógio do contêiner; dois segundos cobrem a
// diferença para o relógio do host sem aceitar um código de dias atrás.
const FOLGA_DE_RELOGIO_MS = 2_000

const SENHA_SINTETICA = "bivaque-e2e-local"

/**
 * `private.eligibility_class` tem três valores (`active_federal_military`,
 * `veteran`, `military_pensioner`); não existe `active`. O vínculo ativo de
 * militar federal é o que a persona semeada usa.
 */
const CLASSE_DE_ELEGIBILIDADE = "active_federal_military"

// Um endereço deste harness termina em `.invalid` (RFC 2606). `bivaque.example.invalid`
// (personas do seed) também casa, e é sintético por construção.
const DOMINIO_SINTETICO = /@[a-z0-9.-]+\.invalid$/i
const SEIS_DIGITOS = /(?<!\d)(\d{6})(?!\d)/

/** Erro de ambiente/credencial: o caso opcional pode virar `test.skip` em vez de falha. */
export class ContaIndisponivel extends Error {
  constructor(mensagem: string) {
    super(mensagem)
    this.name = "ContaIndisponivel"
  }
}

// ── ambiente ────────────────────────────────────────────────────────────────

/**
 * Lê a chave do ambiente ou do `apps/web/.env.local` (o mesmo arquivo que o Next
 * usa). O valor nunca é impresso; só a ausência dele vira mensagem.
 */
function lerDoAmbiente(chave: string): string | undefined {
  const doProcesso = process.env[chave]
  if (typeof doProcesso === "string" && doProcesso.length > 0) return doProcesso
  return readEnvLocal(chave)
}

export function urlDoMailpit(): string {
  return (
    lerDoAmbiente("MAILPIT_URL") ??
    lerDoAmbiente("INBUCKET_URL") ??
    URL_DO_MAILPIT_PADRAO
  ).replace(/\/+$/, "")
}

export function urlDoSupabase(): string {
  return (
    lerDoAmbiente("SUPABASE_URL") ??
    lerDoAmbiente("NEXT_PUBLIC_SUPABASE_URL") ??
    URL_DO_SUPABASE_PADRAO
  ).replace(/\/+$/, "")
}

/** Chave anônima do Supabase, lida como a URL: do processo ou do arquivo local do apps/web. */
export function chaveAnonimaDoSupabase(): string {
  const chave = lerDoAmbiente("NEXT_PUBLIC_SUPABASE_ANON_KEY") ?? lerDoAmbiente("SUPABASE_ANON_KEY")
  if (chave === undefined || chave.length === 0) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY não está configurada: defina no ambiente ou no arquivo local do apps/web.",
    )
  }
  return chave
}

function exigirChaveDeServico(): string {
  const chave = lerDoAmbiente("SUPABASE_SERVICE_ROLE_KEY")
  if (chave === undefined || chave.length === 0) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY não está configurada: defina no ambiente ou em " +
        "apps/web/.env.local. As fixtures de conta verificada precisam dela (o valor nunca é impresso).",
    )
  }
  return chave
}

function exigirChaveAnonima(): string {
  const chave = lerDoAmbiente("SUPABASE_ANON_KEY") ?? lerDoAmbiente("NEXT_PUBLIC_SUPABASE_ANON_KEY")
  if (chave === undefined || chave.length === 0) {
    throw new ContaIndisponivel(
      "SUPABASE_ANON_KEY não está configurada (ambiente ou apps/web/.env.local): sem ela não " +
        "há password grant para semear a sessão da persona.",
    )
  }
  return chave
}

function senhaDaPersona(): string {
  return lerDoAmbiente("BIVAQUE_VISUAL_PASSWORD") ?? SENHA_SINTETICA
}

export function mascararEmail(email: string): string {
  // Mesma regra de `emailHint` (apps/web/app/(shell)/profile/family-invite-email-hint.ts):
  // o CHECK de family_invitations recusa domínio com mais de um rótulo visível.
  const [usuario = "", dominio = ""] = email.trim().split("@")
  const visivelLocal = usuario.length <= 2 ? usuario.slice(0, 1) : usuario.slice(0, 2)
  const visivelDominio = dominio.length <= 2 ? dominio.slice(0, 1) : dominio.slice(0, 2)
  const ponto = dominio.lastIndexOf(".")
  const tld = ponto > 2 ? dominio.slice(ponto) : ""
  return `${visivelLocal}***@${visivelDominio}***${tld}`
}

function exigirEmailSintetico(email: string): string {
  const alvo = email.trim().toLowerCase()
  if (!DOMINIO_SINTETICO.test(alvo)) {
    throw new Error(
      `Este harness só cria contas sintéticas (*.invalid). Recebido: ${mascararEmail(alvo)}.`,
    )
  }
  return alvo
}

/** Um endereço novo por execução, sempre sintético. */
export function enderecoSintetico(prefixo: string): string {
  const limpo = prefixo
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32)
  const unico = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
  return `${limpo === "" ? "entrada" : limpo}-${unico}@example.invalid`
}

// ── HTTP cru ────────────────────────────────────────────────────────────────

type RespostaHttp = Readonly<{ status: number; corpo: unknown }>

type PedidoHttp = Readonly<{
  metodo?: "GET" | "POST" | "PATCH"
  cabecalhos?: Readonly<Record<string, string>>
  corpo?: unknown
}>

function mensagemDoErro(erro: unknown): string {
  return erro instanceof Error ? erro.message : String(erro)
}

/** JSON sobre `fetch`, com timeout e erro que não vaza credencial. */
async function pedirJson(
  url: string,
  pedido: PedidoHttp,
  descricao: string,
): Promise<RespostaHttp> {
  let resposta: Response
  try {
    resposta = await fetch(url, {
      method: pedido.metodo ?? "GET",
      headers: { "content-type": "application/json", ...pedido.cabecalhos },
      ...(pedido.corpo === undefined ? {} : { body: JSON.stringify(pedido.corpo) }),
      signal: AbortSignal.timeout(10_000),
    })
  } catch (erro: unknown) {
    throw new Error(`${descricao}: falha de rede em ${url} (${mensagemDoErro(erro)}).`)
  }
  const texto = await resposta.text()
  let corpo: unknown = null
  if (texto.length > 0) {
    try {
      corpo = JSON.parse(texto)
    } catch {
      corpo = texto
    }
  }
  return { status: resposta.status, corpo }
}

function comoRegistro(corpo: unknown): Record<string, unknown> {
  return corpo !== null && typeof corpo === "object" && !Array.isArray(corpo)
    ? (corpo as Record<string, unknown>)
    : {}
}

/** Partes seguras de um erro de API (mensagem/código), sem credencial. */
function resumoDoCorpo(corpo: unknown): string {
  if (typeof corpo === "string") return corpo.slice(0, 200)
  const dados = comoRegistro(corpo)
  const partes = ["message", "msg", "error_description", "error_code", "code", "hint"].flatMap(
    (chave) => {
      const valor = dados[chave]
      return typeof valor === "string" || typeof valor === "number" ? [`${chave}=${valor}`] : []
    },
  )
  return partes.length > 0 ? partes.join(" ") : JSON.stringify(corpo).slice(0, 200)
}

function cabecalhosDeServico(chave: string): Record<string, string> {
  return { apikey: chave, Authorization: `Bearer ${chave}` }
}

function textoDe(corpo: unknown, chave: string): string | null {
  const valor = comoRegistro(corpo)[chave]
  return typeof valor === "string" && valor.length > 0 ? valor : null
}

function numeroDe(corpo: unknown, chave: string): number | null {
  const valor = comoRegistro(corpo)[chave]
  return typeof valor === "number" && Number.isFinite(valor) ? valor : null
}

// ── Mailpit: o código de seis dígitos ───────────────────────────────────────

type EnderecoDoMailpit = Readonly<{ Address?: string }>

type MensagemResumida = Readonly<{
  ID?: string
  Created?: string
  Subject?: string
  To?: readonly EnderecoDoMailpit[]
}>

type MensagemCompleta = Readonly<{
  ID?: string
  Created?: string
  Subject?: string
  Text?: string
  HTML?: string
}>

export type CodigoLido = Readonly<{ codigo: string; mensagemId: string; recebidoEm: string }>

export type OpcoesDeLeitura = Readonly<{
  /** Ignora mensagens anteriores a este instante (o envio do teste). */
  desde?: Date
  prazoMs?: number
}>

function instanteDaMensagem(mensagem: MensagemResumida): number {
  if (typeof mensagem.Created !== "string") return 0
  const instante = Date.parse(mensagem.Created)
  return Number.isFinite(instante) ? instante : 0
}

function enderecosDe(mensagem: MensagemResumida): readonly string[] {
  return (mensagem.To ?? []).flatMap((item) =>
    typeof item.Address === "string" ? [item.Address.toLowerCase()] : [],
  )
}

async function listarMensagens(): Promise<readonly MensagemResumida[]> {
  const url = `${urlDoMailpit()}/api/v1/messages?limit=50&start=0`
  const resposta = await pedirJson(url, {}, `Mailpit (${urlDoMailpit()})`)
  if (resposta.status !== 200) {
    throw new Error(
      `Mailpit respondeu ${resposta.status} ao listar mensagens em ${urlDoMailpit()} ` +
        `(${resumoDoCorpo(resposta.corpo)}). O stack local está no ar com o Mailpit na ` +
        "porta 55324? Veja supabase/config.toml ([inbucket]).",
    )
  }
  const corpo = comoRegistro(resposta.corpo)
  const mensagens = corpo["messages"]
  if (!Array.isArray(mensagens)) {
    throw new Error(
      `Mailpit devolveu uma lista inesperada em ${urlDoMailpit()}: ${JSON.stringify(corpo).slice(0, 200)}.`,
    )
  }
  return mensagens.filter(
    (mensagem): mensagem is MensagemResumida => mensagem !== null && typeof mensagem === "object",
  )
}

async function detalharMensagem(id: string): Promise<MensagemCompleta> {
  const url = `${urlDoMailpit()}/api/v1/message/${encodeURIComponent(id)}`
  const resposta = await pedirJson(url, {}, "Mailpit (detalhe da mensagem)")
  if (resposta.status !== 200) {
    throw new Error(
      `Mailpit respondeu ${resposta.status} ao abrir a mensagem ${id} ` +
        `(${resumoDoCorpo(resposta.corpo)}).`,
    )
  }
  return resposta.corpo !== null && typeof resposta.corpo === "object"
    ? (resposta.corpo as MensagemCompleta)
    : {}
}

function extrairCodigo(texto: string | undefined): string | null {
  if (typeof texto !== "string" || texto.length === 0) return null
  const achado = SEIS_DIGITOS.exec(texto)
  return achado === null ? null : (achado[1] ?? null)
}

/** HTML do e-mail vira texto: o código não depende de marcação. */
function semMarcacao(html: string | undefined): string | undefined {
  if (typeof html !== "string") return undefined
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
}

function esperar(ms: number): Promise<void> {
  return new Promise((resolver) => {
    setTimeout(resolver, ms)
  })
}

/**
 * Espera (até ~20 s, polling de 500 ms) a mensagem mais recente para `email` e
 * devolve o código de seis dígitos. A mensagem mais nova é a do envio atual;
 * `desde` descarta código de execução anterior para o mesmo endereço.
 */
export async function lerCodigoDoEmail(
  email: string,
  opcoes: OpcoesDeLeitura = {},
): Promise<CodigoLido> {
  const alvo = exigirEmailSintetico(email)
  const prazo = Date.now() + (opcoes.prazoMs ?? ESPERA_DO_CODIGO_MS)
  const desde = opcoes.desde === undefined ? null : opcoes.desde.getTime() - FOLGA_DE_RELOGIO_MS
  let vistas = 0
  let ultimoProblema: string | null = null

  while (Date.now() < prazo) {
    let mensagens: readonly MensagemResumida[]
    try {
      mensagens = await listarMensagens()
    } catch (erro: unknown) {
      ultimoProblema = mensagemDoErro(erro)
      await esperar(PASSO_DA_ESPERA_MS)
      continue
    }

    const paraPessoa = mensagens
      .filter((mensagem) => enderecosDe(mensagem).includes(alvo))
      .filter((mensagem) => desde === null || instanteDaMensagem(mensagem) >= desde)
      .sort((a, b) => instanteDaMensagem(b) - instanteDaMensagem(a))
    vistas = Math.max(vistas, paraPessoa.length)

    const maisNova = paraPessoa[0]
    if (maisNova !== undefined) {
      const id = typeof maisNova.ID === "string" ? maisNova.ID : ""
      if (id === "") {
        throw new Error(
          `Mailpit devolveu uma mensagem sem ID para ${mascararEmail(alvo)}; não há como abrir o corpo.`,
        )
      }
      const detalhe = await detalharMensagem(id)
      const texto = semMarcacao(detalhe.HTML)
      const codigo =
        extrairCodigo(detalhe.Text) ??
        extrairCodigo(detalhe.Subject) ??
        extrairCodigo(texto) ??
        extrairCodigo(maisNova.Subject)
      if (codigo === null) {
        throw new Error(
          `A mensagem ${id} para ${mascararEmail(alvo)} não tem código de seis dígitos no ` +
            `Text/Subject/HTML. Assunto: "${(detalhe.Subject ?? maisNova.Subject ?? "").slice(0, 120)}".`,
        )
      }
      return {
        codigo,
        mensagemId: id,
        recebidoEm:
          typeof detalhe.Created === "string"
            ? detalhe.Created
            : typeof maisNova.Created === "string"
              ? maisNova.Created
              : "",
      }
    }

    await esperar(PASSO_DA_ESPERA_MS)
  }

  const sufixo = ultimoProblema === null ? "" : ` Último erro do Mailpit: ${ultimoProblema}`
  throw new Error(
    `Nenhum código para ${mascararEmail(alvo)} chegou ao Mailpit (${urlDoMailpit()}) em ` +
      `${Math.round((opcoes.prazoMs ?? ESPERA_DO_CODIGO_MS) / 1000)} s` +
      `${desde === null ? "" : " depois do envio do teste"}; mensagens vistas para o endereço: ` +
      `${vistas}. O GoTrue local mandou o e-mail? (supabase/config.toml: [inbucket] e o template ` +
      `magic_link).${sufixo}`,
  )
}

// ── Supabase: conta sintética já verificada ─────────────────────────────────

export type ContaVerificada = Readonly<{
  email: string
  userId: string
  senha: string
}>

export type OpcoesDaConta = Readonly<{
  senha?: string
  /** Classe de elegibilidade canônica (`private.eligibility_class`). */
  classe?: string
}>

async function idPeloLoginPorSenha(
  email: string,
  senha: string,
  contexto: string,
): Promise<string | null> {
  const resposta = await pedirJson(
    `${urlDoSupabase()}/auth/v1/token?grant_type=password`,
    {
      metodo: "POST",
      cabecalhos: { apikey: exigirChaveAnonima() },
      corpo: { email, password: senha },
    },
    "Supabase (password grant)",
  )
  if (resposta.status !== 200) return null
  const token = textoDe(resposta.corpo, "access_token")
  const parte = token === null ? undefined : token.split(".")[1]
  if (parte === undefined) {
    throw new Error(
      `O password grant de ${mascararEmail(email)} respondeu sem access_token utilizável (${contexto}).`,
    )
  }
  const claims = JSON.parse(Buffer.from(parte, "base64").toString("utf8")) as {
    sub?: unknown
  }
  return typeof claims.sub === "string" && claims.sub.length > 0 ? claims.sub : null
}

async function marcarVinculoVerificado(userId: string, classe: string): Promise<void> {
  const resposta = await pedirJson(
    `${urlDoSupabase()}/rest/v1/rpc/upsert_verification_outcome`,
    {
      metodo: "POST",
      cabecalhos: cabecalhosDeServico(exigirChaveDeServico()),
      corpo: {
        p_user_id: userId,
        p_status: "verified",
        p_eligibility_class: classe,
      },
    },
    "Supabase (marcar vínculo verificado)",
  )
  if (resposta.status !== 200 && resposta.status !== 204) {
    throw new Error(
      `Não foi possível marcar o vínculo de ${userId} como verificado: HTTP ${resposta.status} ` +
        `(${resumoDoCorpo(resposta.corpo)}). A ponte usada é public.upsert_verification_outcome, ` +
        "concedida a service_role.",
    )
  }
}

/**
 * O titular do seed tem teto de 5 convites ativos. Como cada rodada deixa o
 * convite pendente quando o fluxo falha antes do aceite, a rodada seguinte
 * esbarraria no teto. Revoga os pendentes do próprio titular de teste antes de
 * criar o próximo — sempre no banco local, com service_role.
 */
async function revogarConvitesPendentesDoTitular(): Promise<void> {
  const chave = exigirChaveDeServico()
  const listagem = await pedirJson(
    `${urlDoSupabase()}/rest/v1/rpc/list_pending_invites_with_hint`,
    {
      metodo: "POST",
      cabecalhos: cabecalhosDeServico(chave),
      corpo: { p_user_id: INVITER_VERIFICADO },
    },
    "Supabase (listar convites pendentes)",
  )
  if (listagem.status !== 200) {
    throw new Error(
      `Não foi possível listar os convites pendentes do titular de teste: HTTP ${listagem.status} ` +
        `(${resumoDoCorpo(listagem.corpo)}). A ponte é ` +
        "public.list_pending_invites_with_hint, concedida a service_role.",
    )
  }
  if (!Array.isArray(listagem.corpo)) return
  for (const item of listagem.corpo) {
    const id = comoRegistro(item)["id"]
    if (typeof id !== "string") continue
    const revogacao = await pedirJson(
      `${urlDoSupabase()}/rest/v1/rpc/revoke_family_invitation`,
      {
        metodo: "POST",
        cabecalhos: cabecalhosDeServico(chave),
        corpo: { p_invitation_id: id, p_inviter_user_id: INVITER_VERIFICADO },
      },
      "Supabase (revogar convite pendente)",
    )
    if (revogacao.status !== 200 && revogacao.status !== 204) {
      throw new Error(
        `Não foi possível revogar o convite pendente de teste: HTTP ${revogacao.status} ` +
          `(${resumoDoCorpo(revogacao.corpo)}). A ponte é ` +
          "public.revoke_family_invitation, concedida a service_role.",
      )
    }
  }
}

/**
 * Cria um convite familiar PENDENTE para `email`, pelo RPC que a tela do titular
 * usa (`create_family_invitation`). Quem convida é a persona verificada com
 * cidade do seed. Devolve o código em claro — ele só existe aqui e na tela; o
 * banco guarda o hash.
 */
export async function criarConvitePendente(email: string): Promise<{ codigo: string }> {
  const alvo = exigirEmailSintetico(email)
  await revogarConvitesPendentesDoTitular()
  const alfabeto = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
  let codigo = ""
  for (let indice = 0; indice < 8; indice += 1) {
    codigo += alfabeto[randomInt(0, alfabeto.length)]
  }
  const sha256 = (valor: string) => createHash("sha256").update(valor).digest("hex")
  const resposta = await pedirJson(
    `${urlDoSupabase()}/rest/v1/rpc/create_family_invitation`,
    {
      metodo: "POST",
      cabecalhos: cabecalhosDeServico(exigirChaveDeServico()),
      corpo: {
        p_code_hash: `\\x${sha256(codigo)}`,
        p_inviter_user_id: INVITER_VERIFICADO,
        p_token_digest: `\\x${sha256(randomBytes(32).toString("hex"))}`,
        p_invitee_email_digest: `\\x${sha256(alvo.trim().toLowerCase())}`,
        p_invitee_email_hint: mascararEmail(alvo),
      },
    },
    "Supabase (criar convite familiar)",
  )
  if (resposta.status !== 200 && resposta.status !== 201) {
    throw new Error(
      `Não foi possível criar o convite familiar de ${mascararEmail(alvo)}: HTTP ` +
        `${resposta.status} (${resumoDoCorpo(resposta.corpo)}). A ponte é ` +
        "public.create_family_invitation, concedida a service_role.",
    )
  }
  const invitationId = Array.isArray(resposta.corpo) ? resposta.corpo[0] : resposta.corpo
  // O e-mail do convite vive no destinatário do outbox (o banco guarda o
  // digest). A prévia do app devolve esse endereço a quem tem o código, e é o
  // que deixa o campo de e-mail só de leitura no caminho real.
  const envio = await pedirJson(
    `${urlDoSupabase()}/rest/v1/outbox`,
    {
      metodo: "POST",
      cabecalhos: { ...cabecalhosDeServico(exigirChaveDeServico()), Prefer: "return=minimal" },
      corpo: {
        recipient: alvo,
        channel: "email",
        type: "family_invite",
        payload: { invitation_id: invitationId, invite_code: codigo },
      },
    },
    "Supabase (enfileirar convite familiar)",
  )
  if (envio.status !== 201 && envio.status !== 204) {
    throw new Error(
      `Não foi possível enfileirar o e-mail do convite: HTTP ${envio.status} ` +
        `(${resumoDoCorpo(envio.corpo)}).`,
    )
  }
  return { codigo }
}

/**
 * Cria (ou reaproveita) o usuário de Auth local com `email_confirm: true`, sem
 * tocar em `verification_outcomes`. É a conta do caminho de falha: o CPF
 * consulta o Portal de verdade (no stack local, sem chave, ele está fora) e a
 * pessoa cai no envio de documento.
 */
export async function criarContaConfirmada(email: string): Promise<ContaVerificada> {
  const alvo = exigirEmailSintetico(email)
  const senha = SENHA_SINTETICA
  const url = urlDoSupabase()
  const servico = exigirChaveDeServico()

  const criacao = await pedirJson(
    `${url}/auth/v1/admin/users`,
    {
      metodo: "POST",
      cabecalhos: cabecalhosDeServico(servico),
      corpo: { email: alvo, password: senha, email_confirm: true },
    },
    "Supabase admin (criar usuário)",
  )

  let userId: string | null = null
  if (criacao.status >= 200 && criacao.status < 300) {
    userId = textoDe(criacao.corpo, "id")
  }

  if (userId === null) {
    if (criacao.status === 401 || criacao.status === 403) {
      throw new Error(
        "O Supabase local recusou a service role key (HTTP " +
          `${criacao.status}); confira SUPABASE_SERVICE_ROLE_KEY para o stack local.`,
      )
    }
    // E-mail já registrado (422/409) de uma execução anterior: resolve o id pelo
    // password grant, com a mesma senha sintética.
    userId = await idPeloLoginPorSenha(alvo, senha, "conta pré-existente")
    if (userId === null) {
      throw new Error(
        `A conta ${mascararEmail(alvo)} já existe no Auth local e não aceitou a senha sintética: ` +
          `a criação respondeu HTTP ${criacao.status} (${resumoDoCorpo(criacao.corpo)}). ` +
          "Use um endereço novo por execução (enderecoSintetico).",
      )
    }
  }

  return { email: alvo, userId, senha }
}

/**
 * Cria (ou reaproveita) o usuário de Auth local com `email_confirm: true` e grava
 * `private.verification_outcomes` como `verified` — a rota do CPF devolve
 * `verified` sem consultar o Portal.
 */
export async function criarContaVerificada(
  email: string,
  opcoes: OpcoesDaConta = {},
): Promise<ContaVerificada> {
  const conta = await criarContaConfirmada(email)
  await marcarVinculoVerificado(conta.userId, opcoes.classe ?? CLASSE_DE_ELEGIBILIDADE)
  return conta
}

/**
 * Descobre o id de um usuário pelo e-mail via Admin API. Usado pela conta que o
 * próprio fluxo criou (o OTP cria a conta): o teste não a pré-cria, mas precisa
 * do id para marcar o vínculo e ler o rascunho.
 */
export async function idDoUsuarioPorEmail(email: string): Promise<string | null> {
  const alvo = exigirEmailSintetico(email)
  const chave = exigirChaveDeServico()
  const url = `${urlDoSupabase()}/auth/v1/admin/users?page=1&per_page=1000`
  const resposta = await pedirJson(
    url,
    { cabecalhos: cabecalhosDeServico(chave) },
    "Supabase admin (listar usuários)",
  )
  if (resposta.status !== 200) {
    throw new Error(
      `Não foi possível listar os usuários do Auth local: HTTP ${resposta.status} ` +
        `(${resumoDoCorpo(resposta.corpo)}).`,
    )
  }
  const corpo = comoRegistro(resposta.corpo)
  const usuarios = Array.isArray(corpo["users"]) ? corpo["users"] : []
  for (const item of usuarios) {
    const registro = comoRegistro(item)
    const id = registro["id"]
    const endereco = registro["email"]
    if (typeof id === "string" && typeof endereco === "string" && endereco.toLowerCase() === alvo) {
      return id
    }
  }
  return null
}

/**
 * Devolve nome e apresentação de uma persona do seed pelo papel de serviço.
 * Serve de `finally` para testes que editam o perfil: se a tela falhar no meio,
 * a próxima largura ainda começa do seed.
 */
export async function restaurarPerfilSemeado(
  email: string,
  perfil: Readonly<{ nome: string; bio: string | null }>,
): Promise<void> {
  const id = await idDoUsuarioPorEmail(email)
  if (id === null) throw new Error("A persona do seed não existe no Auth local.")
  const chave = exigirChaveDeServico()
  const resposta = await pedirJson(
    `${urlDoSupabase()}/rest/v1/profiles?user_id=eq.${id}`,
    {
      metodo: "PATCH",
      cabecalhos: cabecalhosDeServico(chave),
      corpo: { display_name: perfil.nome, bio: perfil.bio },
    },
    "Supabase (restaurar perfil semeado)",
  )
  if (resposta.status !== 200 && resposta.status !== 204) {
    throw new Error(
      `O perfil semeado não foi restaurado: HTTP ${resposta.status} (${resumoDoCorpo(resposta.corpo)}).`,
    )
  }
}

/**
 * Marca o vínculo como `verified` para uma conta que nasceu no próprio fluxo
 * (o OTP criou). Devolve o id, para a prova de rascunho no banco.
 */
export async function marcarVinculoVerificadoPorEmail(
  email: string,
  classe: string = CLASSE_DE_ELEGIBILIDADE,
): Promise<string> {
  const id = await idDoUsuarioPorEmail(email)
  if (id === null) {
    throw new Error(
      `A conta ${mascararEmail(email)} não apareceu no Auth local depois do código; ` +
        "o envio do OTP criou a conta?",
    )
  }
  await marcarVinculoVerificado(id, classe)
  return id
}

/**
 * Prova de que a entrada terminou sem rascunho: conta as linhas de
 * `entry_progress` da pessoa (service role, tabela pública sob RLS forçada).
 */
export async function contarRascunhosDaEntrada(email: string): Promise<number> {
  const id = await idDoUsuarioPorEmail(email)
  if (id === null) throw new Error(`A conta ${mascararEmail(email)} não existe no Auth local.`)
  const chave = exigirChaveDeServico()
  const url = `${urlDoSupabase()}/rest/v1/entry_progress?select=user_id&user_id=eq.${id}`
  const resposta = await pedirJson(
    url,
    { cabecalhos: cabecalhosDeServico(chave) },
    "Supabase (ler rascunho)",
  )
  if (resposta.status !== 200 || !Array.isArray(resposta.corpo)) {
    throw new Error(
      `Não foi possível ler entry_progress: HTTP ${resposta.status} (${resumoDoCorpo(resposta.corpo)}).`,
    )
  }
  return resposta.corpo.length
}

// ── Sessão da persona semeada (caso do membro existente) ────────────────────

/**
 * Instala no contexto a sessão da persona semeada, com o mesmo cookie que o
 * `@supabase/ssr` espera (`base64-<base64url>`) — o password grant é o caminho
 * confiável no stack local (o link mágico do Mailpit não é).
 *
 * Lança `ContaIndisponivel` quando o ambiente não permite autenticar por senha;
 * o chamador pode converter em `test.skip`, nunca em falha do produto.
 */
export async function semearSessaoDeMembro(
  context: BrowserContext,
  email: string,
  senha: string = senhaDaPersona(),
): Promise<void> {
  const alvo = exigirEmailSintetico(email)
  const anon = exigirChaveAnonima()
  const url = urlDoSupabase()

  const resposta = await pedirJson(
    `${url}/auth/v1/token?grant_type=password`,
    {
      metodo: "POST",
      cabecalhos: { apikey: anon },
      corpo: { email: alvo, password: senha },
    },
    "Supabase (password grant da persona)",
  )
  if (resposta.status === 400 || resposta.status === 401 || resposta.status === 422) {
    throw new ContaIndisponivel(
      `o password grant de ${mascararEmail(alvo)} foi recusado (HTTP ${resposta.status})`,
    )
  }
  if (resposta.status !== 200) {
    throw new Error(
      `O password grant de ${mascararEmail(alvo)} falhou com HTTP ${resposta.status} ` +
        `(${resumoDoCorpo(resposta.corpo)}). O stack local está com o seed aplicado?`,
    )
  }

  const accessToken = textoDe(resposta.corpo, "access_token")
  const refreshToken = textoDe(resposta.corpo, "refresh_token")
  if (accessToken === null || refreshToken === null) {
    throw new Error(
      `O password grant de ${mascararEmail(alvo)} respondeu sem access_token/refresh_token.`,
    )
  }
  const expiresAt = numeroDe(resposta.corpo, "expires_at") ?? Math.floor(Date.now() / 1000) + 3600
  const expiresIn = numeroDe(resposta.corpo, "expires_in") ?? 3600
  const tokenType = textoDe(resposta.corpo, "token_type") ?? "bearer"

  const cookieDeSessao = encodeAuthCookieValue(
    {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: expiresAt,
      expires_in: expiresIn,
      token_type: tokenType,
    },
    alvo,
  )

  const projectRef = new URL(url).hostname.split(".")[0] ?? "127"
  const expira = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 400
  const comum = {
    domain: "127.0.0.1",
    path: "/",
    expires: expira,
    httpOnly: false,
    secure: false,
    sameSite: "Lax" as const,
  }

  await context.addCookies([
    { name: `sb-${projectRef}-auth-token`, value: cookieDeSessao, ...comum },
    { name: "bivaque-consent-version", value: CURRENT_CONSENT, ...comum },
  ])
}

// ── passos da tela ──────────────────────────────────────────────────────────

/** Abre `/app/entrar`, escolhe a entrada por e-mail, envia o código e para na etapa do código. */
export async function abrirEntradaComEmail(page: Page, email: string): Promise<Date> {
  const alvo = exigirEmailSintetico(email)

  await page.goto("/app/entrar")
  await expect(
    page.getByRole("heading", { level: 1, name: "A comunidade militar da sua cidade." }),
    "A entrada real não está servida em /app/entrar: o build em apps/web/public/app está " +
      "desatualizado ou é de outra tela. Rode `npx pnpm@11.18.0 app:export` antes do E2E.",
  ).toBeVisible({ timeout: PRAZO_DA_ETAPA_MS })

  await page.getByRole("button", { name: "Continuar com e-mail" }).click()
  await expect(page.getByRole("heading", { level: 1, name: "Qual é o seu e-mail?" })).toBeVisible({
    timeout: PRAZO_DA_ETAPA_MS,
  })

  await page.getByLabel("E-mail").fill(alvo)
  // O instante do envio limita a leitura no Mailpit: só vale código desta rodada.
  const desde = new Date()
  await page.getByRole("button", { name: "Enviar código" }).click()
  await expect(page.getByRole("heading", { level: 1, name: "Digite o código" })).toBeVisible({
    timeout: PRAZO_DA_ETAPA_MS,
  })
  return desde
}

/** Digita os seis dígitos no campo do código (o preenchimento automático verifica). */
export async function preencherCodigoDeEntrada(page: Page, codigo: string): Promise<void> {
  if (!/^\d{6}$/.test(codigo)) {
    throw new Error(`Código fora do formato de seis dígitos não é digitado na tela: "${codigo}".`)
  }
  const campo = page.getByLabel("Código de 6 números")
  await expect(campo).toBeVisible({ timeout: PRAZO_DA_ETAPA_MS })
  await campo.fill(codigo)
}

/** Espera a moldura de uma etapa pelo título (string exata ou padrão). */
export async function esperarEtapaDaEntrada(page: Page, titulo: string | RegExp): Promise<void> {
  await expect(
    page.getByRole("heading", { level: 1, name: titulo }),
    `A etapa "${String(titulo)}" não apareceu em /app/entrar.`,
  ).toBeVisible({ timeout: PRAZO_DA_ETAPA_MS })
}

/**
 * Jornada curta: e-mail → código no Mailpit → dígitos → etapa seguinte.
 * Devolve o código usado, para o teste que precisa reusá-lo.
 */
export async function entrarComCodigo(
  page: Page,
  email: string,
  proximaEtapa = "Antes de começar",
): Promise<CodigoLido> {
  const desde = await abrirEntradaComEmail(page, email)
  const lido = await lerCodigoDoEmail(email, { desde })
  await preencherCodigoDeEntrada(page, lido.codigo)
  await esperarEtapaDaEntrada(page, proximaEtapa)
  return lido
}

/** Espera o POST de provisionamento disparado pela tela ao concluir cidade e momento. */
export function esperarProvisionamento(
  page: Page,
): Promise<Awaited<ReturnType<Page["waitForResponse"]>>> {
  return page.waitForResponse(
    (resposta) =>
      resposta.url().includes("/api/app/entry/provision") && resposta.request().method() === "POST",
    { timeout: PRAZO_DA_GRAVACAO_MS },
  )
}

/** Espera a leitura de grupos públicos da cidade, chamada pela etapa de interesses. */
export function esperarGruposDaCidade(
  page: Page,
): Promise<Awaited<ReturnType<Page["waitForResponse"]>>> {
  return page.waitForResponse(
    (resposta) =>
      resposta.url().includes("/api/app/entry/groups") && resposta.request().method() === "GET",
    { timeout: PRAZO_DA_GRAVACAO_MS },
  )
}

// ── capturas (evidência, nunca versionada: .visual/ é ignorada) ─────────────

async function esperarAsFontes(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await document.fonts.ready
  })
}

function diretorioDasCapturas(): string {
  const diretorio = join(process.cwd(), ".visual", "f01-entrada")
  mkdirSync(diretorio, { recursive: true })
  return diretorio
}

async function capturar(page: Page, arquivo: string): Promise<void> {
  await esperarAsFontes(page)
  await page.screenshot({ path: join(diretorioDasCapturas(), arquivo), fullPage: true })
}

/**
 * Um ponto-chave nos dois temas. A captura escura troca a mídia e volta ao claro,
 * então a jornada continua uma vez só — não é preciso repetir o fluxo por tema.
 */
export async function capturarEmDoisTemas(
  page: Page,
  projeto: string,
  etapa: string,
): Promise<void> {
  for (const tema of ["claro", "escuro"] as const) {
    await page.emulateMedia({ colorScheme: tema === "claro" ? "light" : "dark" })
    await capturar(page, `${projeto}-${tema}-${etapa}.png`)
  }
  await page.emulateMedia({ colorScheme: "light" })
}

/** As capturas canônicas pedidas pelo contrato: `<projeto>-<tema>.png`. */
export async function capturarFinais(page: Page, projeto: string): Promise<void> {
  for (const tema of ["claro", "escuro"] as const) {
    await page.emulateMedia({ colorScheme: tema === "claro" ? "light" : "dark" })
    await capturar(page, `${projeto}-${tema}.png`)
  }
  await page.emulateMedia({ colorScheme: "light" })
}

// ── Marca de grupo padrão (RUN-025b, ADR-20261107 item 4) ──────────────────

async function idDoGrupoSemeado(nome: string): Promise<string> {
  const chave = exigirChaveDeServico()
  const busca = await pedirJson(
    `${urlDoSupabase()}/rest/v1/groups?select=id&name=eq.${encodeURIComponent(nome)}`,
    { cabecalhos: cabecalhosDeServico(chave) },
    "Supabase (achar o grupo semeado)",
  )
  if (busca.status !== 200 || !Array.isArray(busca.corpo) || busca.corpo.length !== 1) {
    throw new Error(
      `O grupo semeado "${nome}" não apareceu exatamente uma vez (HTTP ${busca.status}). ` +
        "A marca de padrão do E2E precisa de um grupo canônico da cidade.",
    )
  }
  const id = textoDe(busca.corpo[0], "id")
  if (id === null) throw new Error(`O grupo semeado "${nome}" veio sem id.`)
  return id
}

/**
 * Marca como padrão o grupo semeado com este nome e devolve o id — é a mesma
 * escrita que a RPC `set_group_default` reserva ao operador; aqui o que se
 * prova é o automático da entrada, não o painel do operador.
 */
export async function marcarGrupoPadrao(nome: string): Promise<string> {
  const id = await idDoGrupoSemeado(nome)
  await gravarMarcaDePadrao(id, true)
  return id
}

/** Devolve a marca ao estado do seed. */
export async function desmarcarGrupoPadrao(id: string): Promise<void> {
  await gravarMarcaDePadrao(id, false)
}

async function gravarMarcaDePadrao(id: string, padrao: boolean): Promise<void> {
  const chave = exigirChaveDeServico()
  const gravacao = await pedirJson(
    `${urlDoSupabase()}/rest/v1/groups?id=eq.${id}`,
    {
      metodo: "PATCH",
      cabecalhos: cabecalhosDeServico(chave),
      corpo: { is_default: padrao },
    },
    `Supabase (${padrao ? "marcar" : "desmarcar"} grupo padrão)`,
  )
  if (gravacao.status !== 200 && gravacao.status !== 204) {
    throw new Error(
      `A marca de padrão não foi gravada: HTTP ${gravacao.status} (${resumoDoCorpo(gravacao.corpo)}).`,
    )
  }
}

/** A participação no grupo, lida no banco (estado canônico, não a tela). */
export async function participacaoNoGrupo(
  userId: string,
  groupId: string,
): Promise<{ role: string; status: string } | null> {
  const chave = exigirChaveDeServico()
  const resposta = await pedirJson(
    `${urlDoSupabase()}/rest/v1/group_memberships?select=role,status&user_id=eq.${userId}&group_id=eq.${groupId}`,
    { cabecalhos: cabecalhosDeServico(chave) },
    "Supabase (ler participação no grupo padrão)",
  )
  if (resposta.status !== 200 || !Array.isArray(resposta.corpo)) {
    throw new Error(
      `Não foi possível ler a participação no grupo: HTTP ${resposta.status} ` +
        `(${resumoDoCorpo(resposta.corpo)}).`,
    )
  }
  const linha = resposta.corpo[0]
  if (linha === undefined) return null
  const registro = comoRegistro(linha)
  return { role: String(registro["role"]), status: String(registro["status"]) }
}
