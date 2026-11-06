import type { Page } from "@playwright/test"

export async function simularGrupos(page: Page, opcoes: { membro?: boolean } = {}) {
  const grupos = [
    {
      id: "g-pets",
      nome: "Pets de Manaus",
      descricao: "Conversas sobre os cuidados com os animais.",
      regras: "Respeite os membros e cuide dos animais.",
      fechado: false,
      membro: opcoes.membro ?? false,
      pendente: false,
      admin: false,
      membros: 24,
      fixada: null as string | null,
    },
    {
      id: "g-cmm",
      nome: "Famílias do CMM",
      descricao: "Famílias da escola.",
      regras: "Assuntos da escola e das turmas.",
      fechado: true,
      membro: false,
      pendente: false,
      admin: false,
      membros: null,
      fixada: null as string | null,
    },
    {
      id: "g-futebol",
      nome: "Futebol de sábado",
      descricao: "Vamos jogar juntos.",
      regras: "",
      fechado: false,
      membro: true,
      pendente: false,
      admin: true,
      membros: 12,
      fixada: null as string | null,
    },
    {
      id: "g-1",
      nome: "Grupo",
      descricao: "",
      regras: "",
      fechado: false,
      membro: true,
      pendente: false,
      admin: false,
      membros: 1,
      fixada: null as string | null,
    },
  ]
  const publicacoes = [
    {
      id: "g-1~p-1",
      grupoId: "g-1",
      texto: "Uma conversa do grupo.",
      criadaEm: "2026-11-06T12:00:00Z",
      autor: "Ana",
      propria: false,
      comentarios: 0,
      uteis: 0,
      util: false,
      salva: false,
      oculta: false,
      fotos: [] as string[],
    },
    {
      id: "p-pets",
      grupoId: "g-pets",
      texto: "Alguém indica um veterinário na cidade?",
      criadaEm: "2026-11-06T12:00:00Z",
      autor: "Ana",
      propria: false,
      comentarios: 0,
      uteis: 1,
      util: false,
      salva: false,
      oculta: false,
      fotos: [] as string[],
    },
  ]
  const comentarios: {
    id: string
    postId: string
    texto: string
    criadaEm: string
    autor: string
    propria: boolean
    parentId: string | null
    respondeA: string | null
    para: string
    uteis: number
    util: boolean
  }[] = []
  let sequencia = 1
  await page.route(/\/api\/app\/grupos(?:\/[^?]*)?(?:\?.*)?$/, async (rota) => {
    const request = rota.request()
    const url = new URL(request.url())
    const partes = url.pathname
      .replace(/^\/api\/app\/grupos\/?/, "")
      .split("/")
      .filter(Boolean)
    const metodo = request.method()
    const corpo =
      metodo === "GET" || metodo === "DELETE"
        ? {}
        : (request.postDataJSON() as Record<string, unknown>)
    if (partes.length === 0) {
      await rota.fulfill({ json: { grupos, cidade: "Manaus", proximo: null } })
      return
    }
    if (partes[0] === "publicacoes") {
      const post = publicacoes.find((p) => p.id === partes[1])
      const grupo = grupos.find((g) => g.id === post?.grupoId)
      if (!post || !grupo || (grupo.fechado && !grupo.membro)) {
        await rota.fulfill({ status: 404, json: { erro: "nao-encontrado" } })
        return
      }
      if (metodo === "GET") {
        await rota.fulfill({
          json: {
            publicacao: post,
            grupo,
            comentarios: comentarios.filter((c) => c.postId === post.id),
            proximo: null,
          },
        })
        return
      }
      if (partes[2] === "comentarios") {
        const alvo = comentarios.find((c) => c.id === corpo["respondeA"])
        const comentario = {
          id: `c-real-${sequencia++}`,
          postId: post.id,
          texto: String(corpo["texto"]).trim(),
          criadaEm: new Date().toISOString(),
          autor: "Você",
          propria: true,
          parentId: alvo ? (alvo.parentId ?? alvo.id) : null,
          respondeA: alvo?.id ?? null,
          para: alvo?.autor ?? "",
          uteis: 0,
          util: false,
        }
        comentarios.push(comentario)
        post.comentarios++
        await rota.fulfill({ status: 201, json: { comentario } })
        return
      }
      if (partes[2] === "acoes") {
        const acao = corpo["acao"]
        const valor = corpo["valor"] === true
        if (acao === "util") {
          if (post.util !== valor) post.uteis += valor ? 1 : -1
          post.util = valor
        }
        if (acao === "salvar") post.salva = valor
        if (acao === "ocultar") post.oculta = valor
        if (acao === "fixar") grupo.fixada = valor ? post.id : null
        await rota.fulfill({ json: { publicacao: post, fixada: grupo.fixada } })
        return
      }
      if (partes[2] === "denuncia") {
        await rota.fulfill({ status: 201, json: { denuncia: { id: "denuncia-1" } } })
        return
      }
    }
    const grupo = grupos.find((g) => g.id === partes[0])
    if (!grupo) {
      await rota.fulfill({ status: 404, json: { erro: "grupo-nao-encontrado" } })
      return
    }
    if (partes[1] === "participacao") {
      grupo.membro = metodo === "PUT" && !grupo.fechado
      grupo.pendente = metodo === "PUT" && grupo.fechado
      await rota.fulfill({ json: { grupo } })
      return
    }
    if (partes[1] === "pedidos") {
      await rota.fulfill({
        json: {
          pedidos: grupo.admin
            ? [
                { id: "u1", nome: "Bruno C.", motivo: "Quero jogar aos sábados." },
                { id: "u2", nome: "Thiago S.", motivo: "Sou novo na cidade." },
              ]
            : [],
          proximo: null,
        },
      })
      return
    }
    if (partes[1] === "fotos") {
      await rota.fulfill({ status: 201, json: { caminho: "u/grupos/foto.png" } })
      return
    }
    if (partes[1] === "publicacoes" && metodo === "POST") {
      const publicacao = {
        id: `p-real-${sequencia++}`,
        grupoId: grupo.id,
        texto: String(corpo["texto"]).trim(),
        criadaEm: new Date().toISOString(),
        autor: "Você",
        propria: true,
        comentarios: 0,
        uteis: 0,
        util: false,
        salva: false,
        oculta: false,
        fotos: [] as string[],
      }
      publicacoes.unshift(publicacao)
      await rota.fulfill({ status: 201, json: { publicacao: { id: publicacao.id } } })
      return
    }
    const ocultadas = url.searchParams.get("ordem") === "ocultadas"
    await rota.fulfill({
      json: {
        grupo,
        publicacoes:
          grupo.fechado && !grupo.membro
            ? []
            : publicacoes.filter((p) => p.grupoId === grupo.id && p.oculta === ocultadas),
        proximo: null,
      },
    })
  })
}
