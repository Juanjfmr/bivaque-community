import type { Page } from "@playwright/test"

export async function simularConversas(page: Page) {
  const conversas = [
    { id: "t1", nome: "Paulo R.", tipo: "listing", contextoId: "i3", ultima: "Olá" },
    { id: "t2", nome: "Amazon Climatização", tipo: "provider", contextoId: "n1", ultima: "Oi" },
  ]
  const mensagens: Record<
    string,
    { id: string; conteudo: string; minha: boolean; criadaEm: string }[]
  > = {}
  await page.route(/\/api\/app\/conversas(?:\/|\?|$)/, async (rota) => {
    const url = new URL(rota.request().url())
    const partes = url.pathname.split("/").filter(Boolean)
    const id = partes[3]
    if (!id) return rota.fulfill({ json: { conversas, proximo: null } })
    if (id === "nao-existe") return rota.fulfill({ status: 404, json: { erro: "nao-encontrado" } })
    const conversa = conversas.find((item) => item.id === id) ?? {
      id,
      nome: "Conversa",
      tipo: "shared_group",
      contextoId: "g1",
      ultima: "",
    }
    if (partes[4] === "mensagens") {
      const body = rota.request().postDataJSON() as { texto: string }
      const mensagem = {
        id: String(Date.now()),
        conteudo: body.texto,
        minha: true,
        criadaEm: new Date().toISOString(),
      }
      mensagens[id] = [...(mensagens[id] ?? []), mensagem]
      return rota.fulfill({ status: 201, json: { mensagem } })
    }
    return rota.fulfill({ json: { conversa, mensagens: mensagens[id] ?? [], anterior: null } })
  })
}
