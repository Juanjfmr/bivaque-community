import type { OutboxMessage } from "@bivaque/domain"
import { describe, expect, it, vi } from "vitest"
import {
  adaptadorComDependencias,
  type DependenciasDoPush,
  FalhaDoProvedor,
  type InscricaoWeb,
} from "web/lib/push/adaptador"

const USER = "20000000-0000-4000-8000-000000000001"
const POST = "90000000-0000-4000-8000-000000000001"

function mensagem(extra: Partial<OutboxMessage> = {}): OutboxMessage {
  return {
    id: "outbox-1",
    recipient: USER,
    channel: "push",
    type: "comment",
    payload: {
      user_id: USER,
      action: "created",
      target_type: "post",
      target_id: POST,
      // Campo de terceiro de propósito: o adaptador não pode repassá-lo.
      actor_name: "Fulano de Tal",
      content: "trecho privado",
    },
    attempts: 0,
    updatedAt: 0,
    ...extra,
  }
}

function inscricao(id = "sub-1"): InscricaoWeb {
  return {
    id,
    destination: `https://updates.push.services.mozilla.com/wpush/v2/${id}`,
    keyP256dh: "chave-publica",
    keyAuth: "segredo-da-inscricao",
  }
}

function dependencias(overrides: Partial<DependenciasDoPush> = {}): DependenciasDoPush {
  return {
    inscricoes: async () => [inscricao()],
    marcarSucesso: async () => undefined,
    apagar: async () => undefined,
    enviar: async () => undefined,
    ...overrides,
  }
}

describe("adaptador de push", () => {
  it("manda título fixo, frase fixa e destino, sem dado de terceiro", async () => {
    const enviar = vi.fn<DependenciasDoPush["enviar"]>(async () => undefined)
    const marcarSucesso = vi.fn<DependenciasDoPush["marcarSucesso"]>(async () => undefined)
    const adaptador = adaptadorComDependencias(dependencias({ enviar, marcarSucesso }))

    expect(await adaptador.send(mensagem())).toEqual({ ok: true })
    expect(enviar).toHaveBeenCalledTimes(1)

    const conteudo = enviar.mock.calls[0]?.[1]
    expect(conteudo).toEqual({
      title: "Bivaque",
      body: "Responderam a sua publicação.",
      destino: `/app/publicacao/${POST}`,
    })
    expect(Object.keys(conteudo ?? {}).sort()).toEqual(["body", "destino", "title"])
    expect(JSON.stringify(conteudo)).not.toContain("Fulano")
    expect(JSON.stringify(conteudo)).not.toContain("trecho privado")
    expect(JSON.stringify(conteudo)).not.toContain(USER)
    expect(marcarSucesso).toHaveBeenCalledWith("sub-1")
  })

  it("provedor dizendo que o destino não existe apaga a inscrição", async () => {
    const apagar = vi.fn<DependenciasDoPush["apagar"]>(async () => undefined)
    const marcarSucesso = vi.fn<DependenciasDoPush["marcarSucesso"]>(async () => undefined)
    const adaptador = adaptadorComDependencias(
      dependencias({
        enviar: async () => {
          throw new FalhaDoProvedor(410)
        },
        apagar,
        marcarSucesso,
      }),
    )

    expect(await adaptador.send(mensagem())).toEqual({ ok: true })
    expect(apagar).toHaveBeenCalledWith("sub-1")
    expect(marcarSucesso).not.toHaveBeenCalled()
  })

  it("falha temporária volta para o outbox sem apagar a inscrição", async () => {
    const apagar = vi.fn<DependenciasDoPush["apagar"]>(async () => undefined)
    const adaptador = adaptadorComDependencias(
      dependencias({
        enviar: async () => {
          throw new FalhaDoProvedor(503)
        },
        apagar,
      }),
    )

    expect(await adaptador.send(mensagem())).toEqual({
      ok: false,
      error: "push delivery failed",
    })
    expect(apagar).not.toHaveBeenCalled()
  })

  it("sem inscrição não é erro: não há para onde entregar", async () => {
    const enviar = vi.fn<DependenciasDoPush["enviar"]>(async () => undefined)
    const adaptador = adaptadorComDependencias(dependencias({ inscricoes: async () => [], enviar }))

    expect(await adaptador.send(mensagem())).toEqual({ ok: true })
    expect(enviar).not.toHaveBeenCalled()
  })

  it("falha de leitura das inscrições é retentável, não entrega vazia", async () => {
    const adaptador = adaptadorComDependencias(
      dependencias({
        inscricoes: async () => {
          throw new Error("boom")
        },
      }),
    )

    expect(await adaptador.send(mensagem())).toEqual({
      ok: false,
      error: "push subscription lookup failed",
    })
  })

  it("uma entrega aceita basta para não repetir a notificação nos outros aparelhos", async () => {
    const enviar = vi
      .fn<DependenciasDoPush["enviar"]>()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new FalhaDoProvedor(500))
    const adaptador = adaptadorComDependencias(
      dependencias({
        inscricoes: async () => [inscricao("sub-1"), inscricao("sub-2")],
        enviar,
      }),
    )

    expect(await adaptador.send(mensagem())).toEqual({ ok: true })
  })

  it("destino fora dos serviços de push não recebe pedido do servidor", async () => {
    const enviar = vi.fn<DependenciasDoPush["enviar"]>(async () => undefined)
    const apagar = vi.fn<DependenciasDoPush["apagar"]>(async () => undefined)
    const adaptador = adaptadorComDependencias(
      dependencias({
        // A linha pode ter entrado pelo Data API: o envio confere o destino.
        inscricoes: async () => [
          { ...inscricao(), destination: "https://alvo.example.invalid/sub/1" },
        ],
        enviar,
        apagar,
      }),
    )

    expect(await adaptador.send(mensagem())).toEqual({
      ok: false,
      error: "push delivery failed",
    })
    expect(enviar).not.toHaveBeenCalled()
    expect(apagar).not.toHaveBeenCalled()
  })
})
