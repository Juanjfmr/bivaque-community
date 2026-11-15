import type { Page } from "@playwright/test"

export async function simularConversas(page: Page) {
  // A tela lê os bloqueios da sessão para saber se o compositor está fechado
  // (F09-A). Sem esta rota, o pedido cairia no preview do Vite e a lista viria
  // quebrada — o teste mediria um estado que não existe. O POST é o gesto de
  // bloquear: a resposta tem o mesmo formato da rota real (`{ bloqueado }`).
  let bloqueados: { id: string; nome: string | null; bloqueadoEm: string }[] = []
  await page.route(/\/api\/app\/voce\/bloqueados$/, (rota) => {
    if (rota.request().method() === "POST") {
      const corpo = rota.request().postDataJSON() as { id: string }
      const pessoa = { id: corpo.id, nome: null, bloqueadoEm: new Date().toISOString() }
      if (!bloqueados.some((item) => item.id === corpo.id)) bloqueados = [...bloqueados, pessoa]
      return rota.fulfill({ json: { bloqueado: pessoa } })
    }
    return rota.fulfill({ json: { bloqueados } })
  })
  // `outroId` é o outro participante: o cabeçalho abre o perfil por ele.
  const conversas = [
    {
      id: "t1",
      nome: "Paulo R.",
      outroId: "u-paulo",
      tipo: "listing",
      contextoId: "i3",
      ultima: "Olá",
    },
    {
      id: "t2",
      nome: "Amazon Climatização",
      outroId: "u-amazon",
      tipo: "provider",
      contextoId: "n1",
      ultima: "Oi",
    },
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
      outroId: "u-conversa",
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
