import type { Page } from "@playwright/test"

/**
 * A área "Você" do app de prova: `/app` é servido pelo Vite puro, sem o Next e
 * sem o banco. As telas desta jornada leem `/api/app/voce/*`, então o spec
 * simula as rotas — a medida continua sendo a de verdade (mesmos componentes,
 * mesmos estados), só a origem do dado é de mentira.
 *
 * O corpo simulado segue o contrato de `.visual/run-016/contrato-api.md`: se o
 * contrato mudar, este arquivo muda junto, senão os specs passam medindo uma
 * tela que não é a de produção.
 */
export async function simularVoce(page: Page) {
  const perfil = {
    nome: "Ana Verificada",
    bio: "Mãe de dois, moro no Centro.",
    cidade: "Manaus",
  }
  const contagens = { salvos: 2, anuncios: 3, perguntas: 2, grupos: 1 }
  const conta = { exclusaoPendente: false }
  const publicacoes = [
    {
      id: "p1",
      texto: "A padaria da esquina voltou a abrir aos domingos.",
      criadaEm: "2026-11-01T12:00:00.000Z",
      grupo: null,
    },
    {
      id: "p2",
      texto: "Alguém tem indicação de eletricista no Adrianópolis?",
      criadaEm: "2026-10-28T09:00:00.000Z",
      grupo: "Vila Ajuricaba",
    },
  ]
  const perguntas = [
    {
      id: "q1",
      titulo: "Alguém indica pediatra que atenda pelo FuSEx?",
      criadaEm: "2026-10-30T10:00:00.000Z",
      resolvida: false,
      respostas: 3,
    },
    {
      id: "q2",
      titulo: "Onde encontrar gás de cozinha com entrega no Centro?",
      criadaEm: "2026-10-20T18:00:00.000Z",
      resolvida: true,
      respostas: 1,
    },
  ]
  let bloqueados = [
    {
      id: "30000000-0000-4000-8000-00000000001a",
      nome: "Maria Souza",
      bloqueadoEm: "2026-11-03T12:00:00.000Z",
    },
  ]
  let ocultados = [
    {
      id: "90000000-0000-4000-8000-000000000001",
      titulo: "Obra na rua das Palmeiras",
      ocultadoEm: "2026-11-02T08:00:00.000Z",
    },
  ]

  await page.route(/\/api\/app\/voce(?:\/|\?|$)/, async (rota) => {
    const url = new URL(rota.request().url())
    const partes = url.pathname.split("/").filter(Boolean)
    const recurso = partes[3]
    const alvo = partes[4]
    const metodo = rota.request().method()

    if (recurso === undefined) {
      if (metodo === "PATCH") {
        const corpo = rota.request().postDataJSON() as { nome?: string; bio?: string }
        if (typeof corpo.nome === "string") perfil.nome = corpo.nome.trim()
        if (typeof corpo.bio === "string") perfil.bio = corpo.bio.trim()
        return rota.fulfill({ json: { perfil } })
      }
      return rota.fulfill({ json: { perfil, contagens, conta } })
    }
    if (recurso === "publicacoes") return rota.fulfill({ json: { publicacoes, perguntas } })
    if (recurso === "bloqueados") {
      if (alvo === undefined) return rota.fulfill({ json: { bloqueados } })
      if (metodo === "DELETE") {
        const antes = bloqueados.length
        bloqueados = bloqueados.filter((pessoa) => pessoa.id !== alvo)
        return bloqueados.length === antes
          ? rota.fulfill({ status: 404, json: { erro: "nao-encontrado" } })
          : rota.fulfill({ json: { removido: true } })
      }
    }
    if (recurso === "ocultados") {
      if (alvo === undefined) return rota.fulfill({ json: { ocultados } })
      if (metodo === "DELETE") {
        const antes = ocultados.length
        ocultados = ocultados.filter((item) => item.id !== alvo)
        return ocultados.length === antes
          ? rota.fulfill({ status: 404, json: { erro: "nao-encontrado" } })
          : rota.fulfill({ json: { removido: true } })
      }
    }
    if (recurso === "apagar-conta" && metodo === "POST") {
      conta.exclusaoPendente = true
      return rota.fulfill({
        json: {
          pedido: { solicitadoEm: "2026-11-06T12:00:00.000Z", prazoEm: "2026-12-06T12:00:00.000Z" },
          pendente: true,
        },
      })
    }
    return rota.fulfill({ status: 404, json: { erro: "nao-encontrado" } })
  })
}
