import type { ChannelAdapter, OutboxMessage } from "@bivaque/domain"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "supabase/database.generated"
import * as webpush from "web-push"
import { log } from "../logger"
import { createServerClient } from "../supabase/server"
import { criarAndroid } from "./android"
import { FalhaNativa } from "./classificacao"
import { type ConteudoDoPush, conteudoDoPush } from "./frases"
import { destinoDePushPermitido } from "./inscricao"
import { criarIos } from "./ios"

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
  kind?: "web" | "android" | "ios"
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
  inscricoes: (
    userId: string,
    tipoDoAviso: string,
    autorId: string | null,
  ) => Promise<readonly InscricaoWeb[]>
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
        inscricoes = await deps.inscricoes(
          userId,
          message.type,
          typeof message.payload["actor_user_id"] === "string"
            ? message.payload["actor_user_id"]
            : null,
        )
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
        if (
          (!inscricao.kind || inscricao.kind === "web") &&
          !destinoDePushPermitido(inscricao.destination)
        ) {
          log.error("push destination refused", { type: message.type })
          falhas++
          continue
        }
        try {
          await deps.enviar(inscricao, conteudo)
          entregues++
          await deps.marcarSucesso(inscricao.id).catch(() => undefined)
        } catch (erro) {
          if (
            (erro instanceof FalhaDoProvedor && (erro.status === 404 || erro.status === 410)) ||
            (erro instanceof FalhaNativa && erro.categoria === "destino")
          ) {
            await deps.apagar(inscricao.id).catch(() => undefined)
            continue
          }
          falhas++
          log.error("push delivery failed", {
            channel: message.channel,
            type: message.type,
            status:
              erro instanceof FalhaDoProvedor || erro instanceof FalhaNativa ? erro.status : 0,
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
  android?: ReturnType<typeof criarAndroid> | undefined
  ios?: ReturnType<typeof criarIos> | undefined
}>

export function criarAdaptadorPush(opcoes: OpcoesDoAdaptadorPush): ChannelAdapter {
  if (opcoes.chavePublica && opcoes.chavePrivada)
    webpush.setVapidDetails(opcoes.assunto, opcoes.chavePublica, opcoes.chavePrivada)

  return adaptadorComDependencias({
    async inscricoes(userId, tipoDoAviso, autorId) {
      const { data, error } = await opcoes.cliente.rpc("reserve_push_deliveries", {
        p_user_id: userId,
        p_type: tipoDoAviso,
        p_actor_user_id: autorId as string,
      })
      if (error) throw error
      return (data ?? []).flatMap((linha) => {
        if (linha.kind === "android" || linha.kind === "ios") {
          if (!opcoes[linha.kind]?.ligado) return []
          return [
            {
              id: linha.id,
              kind: linha.kind,
              destination: linha.destination,
              keyP256dh: "",
              keyAuth: "",
            },
          ]
        }
        if (
          linha.kind !== "web" ||
          !opcoes.chavePublica ||
          !opcoes.chavePrivada ||
          linha.key_p256dh === null ||
          linha.key_auth === null
        )
          return []
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
        if (inscricao.kind === "android" || inscricao.kind === "ios") {
          await opcoes[inscricao.kind]?.enviar(inscricao.destination, conteudo)
          return
        }
        await opcoes.enviar(
          {
            endpoint: inscricao.destination,
            keys: { p256dh: inscricao.keyP256dh, auth: inscricao.keyAuth },
          },
          JSON.stringify(conteudo),
          { TTL: 3_600 },
        )
      } catch (erro) {
        if (erro instanceof FalhaDoProvedor || erro instanceof FalhaNativa) throw erro
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
  const env = process.env
  const android =
    env["PUSH_ANDROID_PROJECT_ID"] &&
    env["PUSH_ANDROID_CLIENT_EMAIL"] &&
    env["PUSH_ANDROID_PRIVATE_KEY"]
      ? criarAndroid({
          projectId: env["PUSH_ANDROID_PROJECT_ID"],
          clientEmail: env["PUSH_ANDROID_CLIENT_EMAIL"],
          privateKey: env["PUSH_ANDROID_PRIVATE_KEY"],
        })
      : undefined
  const ios =
    env["PUSH_IOS_KEY_ID"] &&
    env["PUSH_IOS_TEAM_ID"] &&
    env["PUSH_IOS_PRIVATE_KEY"] &&
    env["PUSH_IOS_TOPIC"]
      ? criarIos({
          keyId: env["PUSH_IOS_KEY_ID"],
          teamId: env["PUSH_IOS_TEAM_ID"],
          privateKey: env["PUSH_IOS_PRIVATE_KEY"],
          topic: env["PUSH_IOS_TOPIC"],
          sandbox: env["PUSH_IOS_SANDBOX"] === "true",
        })
      : undefined
  if ((!chavePublica || !chavePrivada) && !android && !ios) return null

  try {
    const cliente = createServerClient()
    return criarAdaptadorPush({
      cliente,
      enviar: webpush.sendNotification as unknown as EnviarNotification,
      chavePublica: chavePublica ?? "",
      chavePrivada: chavePrivada ?? "",
      android,
      ios,
      // Contato exigido pelo padrão VAPID; não é segredo.
      assunto: process.env["WEB_PUSH_CONTACT"] ?? "mailto:contato@bivaque.app",
    })
  } catch {
    return null
  }
}

export { adaptadorDesligado as pushDesligado }
