import { afterEach, describe, expect, it, vi } from "vitest"

import { enviar, FalhaDaApi, ler } from "@/lib/api/cliente"

/**
 * O cliente único do app (ADR-20261105 §1). O que este teste protege é o que
 * quebra silencioso: credencial, cabeçalho do app, erro tipado por status e —
 * o mais caro — nenhuma retentativa em escrita.
 */

function resposta(status: number, corpo: unknown = {}): Response {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { "content-type": "application/json" },
  })
}

function espiao(corpo: unknown = {}, status = 200) {
  const buscar = vi.fn(async (..._argumentos: unknown[]) => resposta(status, corpo))
  vi.stubGlobal("fetch", buscar)
  return buscar
}

function pedido(buscar: ReturnType<typeof espiao>): RequestInit {
  const init = buscar.mock.calls[0]?.[1] as RequestInit | undefined
  if (init === undefined) throw new Error("fetch não foi chamado")
  return init
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("cliente do app", () => {
  it("lê com a sessão do cookie e o cabeçalho do app, sem content-type", async () => {
    const buscar = espiao({ eventos: [] })
    await ler("/api/app/eventos")
    const init = pedido(buscar)
    expect(init.credentials).toBe("include")
    expect(init.method).toBe("GET")
    expect(init.headers).toMatchObject({ "x-bivaque-app": "bivaque-spa" })
    expect((init.headers as Record<string, string>)["content-type"]).toBeUndefined()
  })

  it("escreve com JSON no content-type", async () => {
    const buscar = espiao({ ok: true })
    await enviar("POST", "/api/app/eventos", { titulo: "Festa" })
    const init = pedido(buscar)
    expect(init.method).toBe("POST")
    expect(init.headers).toMatchObject({
      "x-bivaque-app": "bivaque-spa",
      "content-type": "application/json",
    })
    expect(init.body).toBe(JSON.stringify({ titulo: "Festa" }))
  })

  it("DELETE não manda corpo nem content-type", async () => {
    const buscar = espiao({ presenca: { confirmados: 0, minha: null } })
    await enviar("DELETE", "/api/app/eventos/1/presenca")
    const init = pedido(buscar)
    expect(init.method).toBe("DELETE")
    expect(init.body).toBeUndefined()
    expect((init.headers as Record<string, string>)["content-type"]).toBeUndefined()
  })

  it.each([
    [401, "sem-sessao"],
    [403, "recusado"],
    [404, "nao-encontrado"],
    [409, "conflito"],
    [429, "limite"],
    [503, "indisponivel"],
  ])("status %i vira o código %s", async (status, codigo) => {
    espiao({ erro: "x" }, status)
    const falha = await ler("/api/app/eventos").catch((erro: unknown) => erro)
    expect(falha).toBeInstanceOf(FalhaDaApi)
    expect((falha as FalhaDaApi).codigo).toBe(codigo)
    expect((falha as FalhaDaApi).status).toBe(status)
  })

  it("leva a mensagem do servidor para a tela", async () => {
    espiao(
      { erro: "dados-invalidos", mensagem: "O título precisa de pelo menos 2 caracteres." },
      400,
    )
    const falha = (await enviar("POST", "/api/app/eventos", {}).catch(
      (erro: unknown) => erro,
    )) as FalhaDaApi
    expect(falha.codigo).toBe("indisponivel")
    expect(falha.mensagem).toBe("O título precisa de pelo menos 2 caracteres.")
  })

  it("queda de rede vira código de rede, sem status", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("fetch failed")
      }),
    )
    const falha = (await ler("/api/app/eventos").catch((erro: unknown) => erro)) as FalhaDaApi
    expect(falha.codigo).toBe("rede")
    expect(falha.status).toBe(0)
  })

  it("abortar sobe como aborto, não como falha de rede", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new DOMException("abortado", "AbortError")
      }),
    )
    const falha = await ler("/api/app/eventos", { signal: new AbortController().signal }).catch(
      (erro: unknown) => erro,
    )
    expect(falha).not.toBeInstanceOf(FalhaDaApi)
    expect((falha as DOMException).name).toBe("AbortError")
  })

  it("não repete a escrita quando o servidor falha", async () => {
    const buscar = espiao({ erro: "escrita-indisponivel" }, 503)
    await enviar("POST", "/api/app/eventos", { titulo: "Festa" }).catch(() => undefined)
    expect(buscar).toHaveBeenCalledTimes(1)
  })

  it("resposta sem JSON não derruba a leitura", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("", { status: 200 })),
    )
    await expect(ler("/api/app/eventos")).resolves.toEqual({})
  })
})
