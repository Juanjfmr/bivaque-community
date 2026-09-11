import { describe, expect, it } from "vitest"
import {
  countUnread,
  formatRequestDate,
  formatSentLine,
  formatUpdatedLine,
  isClosedStatus,
  isUnread,
  REQUEST_MESSAGE_MAX,
  REQUEST_STATUS_LABELS,
  requestTitle,
  statusMatchesFilter,
  validateEditDescription,
  validateMessageContent,
} from "../../../apps/web/lib/service-requests/tracking"

// RECON-023 — logica deterministica da lista e do detalhe. Prova que a
// situacao vem da coluna (nao da contagem) e que "nao lida" e uma comparacao
// de tempo, nao um tique inventado.

describe("situacao do pedido", () => {
  it("cada situacao tem rotulo proprio", () => {
    expect(REQUEST_STATUS_LABELS.open).toBe("Em aberto")
    expect(REQUEST_STATUS_LABELS.in_conversation).toBe("Em conversa")
    expect(REQUEST_STATUS_LABELS.closed).toBe("Encerrado")
    expect(REQUEST_STATUS_LABELS.cancelled).toBe("Cancelado")
  })

  it("encerrado agrupa closed e cancelled; as outras abas sao exatas", () => {
    expect(statusMatchesFilter("closed", "closed")).toBe(true)
    expect(statusMatchesFilter("cancelled", "closed")).toBe(true)
    expect(statusMatchesFilter("open", "closed")).toBe(false)
    expect(statusMatchesFilter("open", "open")).toBe(true)
    expect(statusMatchesFilter("in_conversation", "in_conversation")).toBe(true)
    expect(statusMatchesFilter("in_conversation", "open")).toBe(false)
    expect(statusMatchesFilter("closed", "all")).toBe(true)
  })

  it("isClosedStatus reconhece os dois estados terminais", () => {
    expect(isClosedStatus("closed")).toBe(true)
    expect(isClosedStatus("cancelled")).toBe(true)
    expect(isClosedStatus("open")).toBe(false)
    expect(isClosedStatus("in_conversation")).toBe(false)
  })
})

describe("titulo do pedido", () => {
  it("usa a primeira linha nao vazia da descricao", () => {
    expect(requestTitle("Instalar ar-condicionado\nquarto", "fallback")).toBe(
      "Instalar ar-condicionado",
    )
  })

  it("trunca descricao longa em uma linha", () => {
    const long = "x".repeat(100)
    const title = requestTitle(long, "fallback")
    expect(title.length).toBeLessThanOrEqual(72)
    expect(title.endsWith("…")).toBe(true)
  })

  it("cai no rotulo quando a descricao nao tem texto util", () => {
    expect(requestTitle("   \n  ", "Climatiza Manaus")).toBe("Climatiza Manaus")
  })
})

describe("datas da linha de metadados", () => {
  it("formata dia e mes abreviado", () => {
    expect(formatRequestDate("2026-09-06T12:00:00Z")).toBe("6 set")
  })

  it("devolve vazio para data invalida em vez de Invalid Date", () => {
    expect(formatRequestDate("nao-e-data")).toBe("")
    expect(formatSentLine("nao-e-data")).toBe("")
  })

  it("monta a linha de envio", () => {
    expect(formatSentLine("2026-09-06T12:00:00Z")).toBe("Enviado em 6 set")
  })

  it("monta a linha de ultima atualizacao", () => {
    expect(formatUpdatedLine("2026-09-08T12:00:00Z")).toBe("Atualizado em 8 set")
    expect(formatUpdatedLine("Inválida")).toBe("")
  })
})

describe("marcador de nao lida", () => {
  const viewer = "11111111-1111-1111-1111-111111111111"
  const other = "22222222-2222-2222-2222-222222222222"

  it("mensagem do outro posterior a leitura e nao lida", () => {
    expect(
      isUnread(
        { sender_id: other, created_at: "2026-09-06T12:00:00Z" },
        viewer,
        "2026-09-06T11:00:00Z",
      ),
    ).toBe(true)
  })

  it("mensagem do outro anterior a leitura ja foi lida", () => {
    expect(
      isUnread(
        { sender_id: other, created_at: "2026-09-06T10:00:00Z" },
        viewer,
        "2026-09-06T11:00:00Z",
      ),
    ).toBe(false)
  })

  it("mensagem própria nunca conta como nao lida", () => {
    expect(isUnread({ sender_id: viewer, created_at: "2026-09-06T12:00:00Z" }, viewer, null)).toBe(
      false,
    )
  })

  it("sem leitura registrada, toda mensagem do outro e nao lida", () => {
    expect(
      countUnread([{ sender_id: other, created_at: "2026-09-06T12:00:00Z" }], viewer, null),
    ).toBe(1)
    expect(
      countUnread(
        [
          { sender_id: other, created_at: "2026-09-06T12:00:00Z" },
          { sender_id: other, created_at: "2026-09-06T09:00:00Z" },
          { sender_id: viewer, created_at: "2026-09-06T13:00:00Z" },
        ],
        viewer,
        "2026-09-06T10:00:00Z",
      ),
    ).toBe(1)
  })
})

describe("bordas de escrita", () => {
  it("mensagem exige texto e respeita 2000", () => {
    expect(validateMessageContent("")).not.toHaveProperty("ok", true)
    expect(validateMessageContent("   ")).not.toHaveProperty("ok", true)
    expect(validateMessageContent("Oi, consigo na quinta?")).toHaveProperty("ok", true)
    expect(validateMessageContent("x".repeat(REQUEST_MESSAGE_MAX))).toHaveProperty("ok", true)
    expect(validateMessageContent("x".repeat(REQUEST_MESSAGE_MAX + 1))).not.toHaveProperty(
      "ok",
      true,
    )
  })

  it("edicao da descricao reusa o teto do formulario", () => {
    expect(validateEditDescription("")).not.toHaveProperty("ok", true)
    expect(validateEditDescription("Instalar tres luminarias")).toHaveProperty("ok", true)
    expect(validateEditDescription("x".repeat(501))).not.toHaveProperty("ok", true)
  })
})
