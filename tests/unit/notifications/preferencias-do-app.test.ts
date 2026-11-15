import { describe, expect, it, vi } from "vitest"
import {
  lerPreferencias,
  salvarPreferencias,
  TIPOS_DO_AVISO,
  validarAtualizacao,
} from "../../../apps/web/lib/notifications/preferencias-do-app"

// A matriz tipo × canal do app (F09-A): `messages` é o par do `direct_message`
// do banco (`preferenceKeyForOutboxType`), e a coluna `notification_preferences.
// messages` já existia — o que faltava era o tipo no contrato, no espelho da
// tela e no upsert. Um campo aditivo exige TODOS os caminhos; este teste cobre a
// leitura, a validação do corpo e a gravação.

type LinhaDaPreferencia = {
  comments: boolean
  events: boolean
  product_news: boolean
  indications: boolean
  messages: boolean
  city_digest_frequency: "off" | "daily" | "weekly"
}

function cliente(opcoes: { linha?: LinhaDaPreferencia | null; matriz?: unknown[] } = {}) {
  const selects: { tabela: string; colunas: string }[] = []
  const upserts: { tabela: string; valor: unknown }[] = []

  function builder(tabela: string) {
    const q: Record<string, unknown> = {}
    q["select"] = (colunas: string) => {
      selects.push({ tabela, colunas })
      return q
    }
    q["eq"] = () => q
    q["maybeSingle"] = async () => ({
      data: tabela === "notification_preferences" ? (opcoes.linha ?? null) : null,
      error: null,
    })
    q["upsert"] = async (valor: unknown) => {
      upserts.push({ tabela, valor })
      return { error: null }
    }
    // biome-ignore lint/suspicious/noThenProperty: o builder do PostgREST é aguardável
    Object.defineProperty(q, "then", {
      value: (resolve: (valor: unknown) => unknown) =>
        Promise.resolve(
          resolve({
            data: tabela === "notification_channel_preferences" ? (opcoes.matriz ?? []) : null,
            error: null,
          }),
        ),
    })
    return q
  }

  return { client: { from: vi.fn(builder) } as never, selects, upserts }
}

const LINHA: LinhaDaPreferencia = {
  comments: true,
  events: false,
  product_news: false,
  indications: true,
  messages: false,
  city_digest_frequency: "weekly",
}

describe("preferências de aviso do app", () => {
  it("lista messages entre os tipos, e a matriz tem três canais para ele", async () => {
    expect(TIPOS_DO_AVISO).toContain("messages")
    const mock = cliente()
    const lidas = await lerPreferencias(mock.client, "user-1")
    expect(lidas.channels.filter((canal) => canal.notificationType === "messages")).toHaveLength(3)
  })

  it("lê a coluna messages, que antes não era selecionada", async () => {
    const mock = cliente({ linha: LINHA })
    const lidas = await lerPreferencias(mock.client, "user-1")
    expect(mock.selects).toContainEqual({
      tabela: "notification_preferences",
      colunas: expect.stringContaining("messages"),
    })
    expect(lidas.messages).toBe(false)
    expect(
      lidas.channels.find(
        (canal) => canal.notificationType === "messages" && canal.channel === "in_app",
      ),
    ).toMatchObject({ enabled: false })
  })

  it("sem linha gravada, mensagens nasce ligada no app e desligada no push", async () => {
    const lidas = await lerPreferencias(cliente().client, "user-1")
    expect(lidas.messages).toBe(true)
    expect(
      lidas.channels.find(
        (canal) => canal.notificationType === "messages" && canal.channel === "push",
      ),
    ).toMatchObject({ enabled: false })
  })

  it("o corpo do PATCH exige messages, como exige os outros tipos", () => {
    const base = { comments: true, events: true, productNews: false, indications: true }
    expect(validarAtualizacao(base)).toBeNull()
    expect(validarAtualizacao({ ...base, messages: "sim" })).toBeNull()
    expect(validarAtualizacao({ ...base, messages: false })).toMatchObject({ messages: false })
    expect(
      validarAtualizacao({
        ...base,
        messages: true,
        channels: [{ notificationType: "mentions", channel: "in_app", enabled: true }],
      }),
    ).toBeNull()
  })

  it("grava messages na coluna e na matriz, desligando o canal do tipo desligado", async () => {
    const mock = cliente()
    await salvarPreferencias(mock.client, "user-1", {
      comments: true,
      events: true,
      productNews: false,
      indications: true,
      messages: false,
      resumoCidade: undefined,
      channels: [{ notificationType: "messages", channel: "email", enabled: true }],
    })
    expect(mock.upserts[0]).toMatchObject({
      tabela: "notification_preferences",
      valor: expect.objectContaining({ messages: false }),
    })
    expect(mock.upserts[1]).toMatchObject({
      tabela: "notification_channel_preferences",
      valor: [expect.objectContaining({ notification_type: "messages", enabled: false })],
    })
  })
})
