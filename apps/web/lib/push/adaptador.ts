import type { ChannelAdapter, OutboxMessage } from "@bivaque/domain"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "supabase/database.generated"
import webpush from "web-push"
import { log } from "../logger"
import { createServerClient } from "../supabase/server"
import { type ConteudoDoPush, conteudoDoPush } from "./frases"
import { destinoDePushPermitido } from "./inscricao"

/**
 * O adaptador de push do outbox (ADR-20261107, item 3).
 *
 * Um aviso por tipo, não por aparelho: a linha do outbox alcança todas as
 * inscrições web do destinatário. Destino recusado como inexistente (404/410)
 * apaga a inscrição — o aparelho não existe mais. Falha temporária volta pelo
 * outbox, com o mesmo limite de lote e a mesma reserva.
 *
 * Sem as chaves VAPID no ambiente o canal fica desligado e responde `ok` sem
 * erro: não é falha do aviso, é o produto sem push configurado. Nenhuma chave
 * privada passa por aqui para o cliente; só o servidor a usa.
 */

export type InscricaoWeb = Readonly<{
  id: string
  destination: string
  keyP256dh: string
  keyAuth: string
}>

/** Erro do provedor com o status HTTP, sem vazar o endpoint ou o corpo. */
export class FalhaDoProvedor extends Error {
  readonly status: number

  constructor(status: number) {
    super(`push provider refused the delivery (${status})`)
    this.name = "FalhaDoProvedor"
    this.status = status
  }
}

export type DependenciasDoPush = Readonly<{
  inscricoes: (userId: string) => Promise<readonly InscricaoWeb[]>
  marcarSucesso: (id: string) => Promise<void>
  apagar: (id: string) => Promise<void>
  enviar: (inscricao: InscricaoWeb, conteudo: ConteudoDoPush) => Promise<void>
}>

function usuarioDaMensagem(message: OutboxMessage): string | null {
  const doCorpo = message.payload["user_id"]
  if (typeof doCorpo === "string" && doCorpo !== "") return doCorpo
  // No canal push o `recipient` é o id do membro, nunca um endereço.
  return message.recipient === "" ? null : message.recipient
}

/**
 * O adaptador com as dependências injetadas: é esta função que os testes
 * exercitam sem banco nem provedor.
 */
export function adaptadorComDependencias(deps: DependenciasDoPush): ChannelAdapter {
  return {
    async send(message) {
      const userId = usuarioDaMensagem(message)
      if (userId === null) return { ok: true }

      let inscricoes: readonly InscricaoWeb[]
      try {
        inscricoes = await deps.inscricoes(userId)
      } catch {
        return { ok: false, error: "push subscription lookup failed" }
      }
      if (inscricoes.length === 0) return { ok: true }

      const conteudo = conteudoDoPush(message.type, message.payload)
      let entregues = 0
      let falhas = 0

      for (const inscricao of inscricoes) {
        // A lista de destinos vale aqui também: a linha pode ter entrado pelo
        // Data API, e o servidor não faz pedido para alvo escolhido pelo cliente.
        if (!destinoDePushPermitido(inscricao.destination)) {
          log.error("push destination refused", { type: message.type })
          falhas++
          continue
        }
        try {
          await deps.enviar(inscricao, conteudo)
          entregues++
          await deps.marcarSucesso(inscricao.id).catch(() => undefined)
        } catch (erro) {
          if (erro instanceof FalhaDoProvedor && (erro.status === 404 || erro.status === 410)) {
            await deps.apagar(inscricao.id).catch(() => undefined)
            continue
          }
          falhas++
          log.error("push delivery failed", {
            channel: message.channel,
            type: message.type,
            status: erro instanceof FalhaDoProvedor ? erro.status : 0,
          })
        }
      }

      // Uma entrega já aceita basta para a linha não ser repetida: repetir
      // mandaria a mesma notificação de novo aos aparelhos que receberam.
      if (falhas === 0 || entregues > 0) return { ok: true }
      return { ok: false, error: "push delivery failed" }
    },
  }
}

type Cliente = SupabaseClient<Database>

type EnviarNotification = (
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  payload: string,
  options: { TTL: number },
) => Promise<unknown>

export type OpcoesDoAdaptadorPush = Readonly<{
  cliente: Cliente
  enviar: EnviarNotification
  chavePublica: string
  chavePrivada: string
  assunto: string
}>

export function criarAdaptadorPush(opcoes: OpcoesDoAdaptadorPush): ChannelAdapter {
  webpush.setVapidDetails(opcoes.assunto, opcoes.chavePublica, opcoes.chavePrivada)

  return adaptadorComDependencias({
    async inscricoes(userId) {
      const { data, error } = await opcoes.cliente
        .from("push_subscriptions")
        .select("id,destination,key_p256dh,key_auth")
        .eq("user_id", userId)
        .eq("kind", "web")
      if (error) throw error
      return (data ?? []).flatMap((linha) => {
        if (linha.key_p256dh === null || linha.key_auth === null) return []
        return [
          {
            id: linha.id,
            destination: linha.destination,
            keyP256dh: linha.key_p256dh,
            keyAuth: linha.key_auth,
          },
        ]
      })
    },
    async marcarSucesso(id) {
      const { error } = await opcoes.cliente
        .from("push_subscriptions")
        .update({ last_success_at: new Date().toISOString() })
        .eq("id", id)
      if (error) throw error
    },
    async apagar(id) {
      const { error } = await opcoes.cliente.from("push_subscriptions").delete().eq("id", id)
      if (error) throw error
    },
    async enviar(inscricao, conteudo) {
      try {
        await opcoes.enviar(
          {
            endpoint: inscricao.destination,
            keys: { p256dh: inscricao.keyP256dh, auth: inscricao.keyAuth },
          },
          JSON.stringify(conteudo),
          { TTL: 3_600 },
        )
      } catch (erro) {
        if (erro instanceof FalhaDoProvedor) throw erro
        const status =
          erro instanceof webpush.WebPushError
            ? erro.statusCode
            : typeof erro === "object" && erro !== null && "statusCode" in erro
              ? Number((erro as { statusCode: unknown }).statusCode)
              : 0
        throw new FalhaDoProvedor(Number.isFinite(status) ? status : 0)
      }
    },
  })
}

/** Canal desligado: sem chaves, nada sai e nada é retentado. */
function adaptadorDesligado(): ChannelAdapter {
  return {
    async send() {
      return { ok: true }
    },
  }
}

/**
 * O adaptador real. Devolve `null` quando as chaves não estão configuradas ou
 * o cliente de serviço não existe; `createChannelAdapters` então usa o canal
 * desligado.
 */
export function adaptadorPush(): ChannelAdapter | null {
  const chavePublica = process.env["WEB_PUSH_PUBLIC_KEY"]
  const chavePrivada = process.env["WEB_PUSH_PRIVATE_KEY"]
  if (!chavePublica || !chavePrivada) return null

  try {
    const cliente = createServerClient()
    return criarAdaptadorPush({
      cliente,
      enviar: webpush.sendNotification as unknown as EnviarNotification,
      chavePublica,
      chavePrivada,
      // Contato exigido pelo padrão VAPID; não é segredo.
      assunto: process.env["WEB_PUSH_CONTACT"] ?? "mailto:contato@bivaque.app",
    })
  } catch {
    return null
  }
}

export { adaptadorDesligado as pushDesligado }
