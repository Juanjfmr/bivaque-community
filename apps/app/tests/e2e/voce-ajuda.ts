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
export async function simularVoce(page: Page, opcoes: { distanciaDisponivel?: boolean } = {}) {
  // Preferências de aviso (F09): a área Você lê e grava a matriz de canais.
  // A simulação devolve o mesmo corpo de `/api/app/avisos/preferencias`.
  const canaisDeAviso = (escolha: {
    comments: boolean
    events: boolean
    productNews: boolean
    indications: boolean
  }) => ({
    comments: escolha.comments,
    events: escolha.events,
    productNews: escolha.productNews,
    indications: escolha.indications,
    resumoCidade: "off" as "off" | "daily" | "weekly",
    channels: (["comments", "events", "product_news", "indications"] as const).flatMap(
      (notificationType) =>
        (["in_app", "email", "push"] as const).map((channel) => ({
          notificationType,
          channel,
          enabled:
            notificationType === "product_news"
              ? escolha.productNews
              : escolha[notificationType] && channel !== "push",
        })),
    ),
  })
  let preferenciasDeAviso = canaisDeAviso({
    comments: true,
    events: true,
    productNews: false,
    indications: true,
  })
  await page.route(/\/api\/app\/avisos\/preferencias$/, async (rota) => {
    if (rota.request().method() === "PATCH") {
      const corpo = rota.request().postDataJSON() as {
        comments: boolean
        events: boolean
        productNews: boolean
        indications: boolean
        resumoCidade: "off" | "daily" | "weekly"
        channels: typeof preferenciasDeAviso.channels
      }
      preferenciasDeAviso = { ...corpo }
    }
    return rota.fulfill({ json: { preferencias: preferenciasDeAviso } })
  })
  // `distanciaDisponivel: false` simula o CEP conhecido sem posição
  // (ADR-20261112): guardado, mas ainda sem distância calculável.
  const perfil = {
    nome: "Ana Verificada",
    bio: "Mãe de dois, moro no Centro.",
    cidade: "Manaus",
    localizacao: { cep: "69020000", definida: true },
    distanciaDisponivel: opcoes.distanciaDisponivel ?? true,
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
  // Família (RUN-018): mesma regra de máscara da tela antiga, só que aqui é
  // simulação — o banco de verdade está em tests/e2e/f10-voce-real.spec.ts.
  const mascarar = (email: string): string => {
    const [local = "", dominio = ""] = email.trim().toLowerCase().split("@")
    const visivelLocal = local.length <= 2 ? local.slice(0, 1) : local.slice(0, 2)
    const visivelDominio = dominio.length <= 2 ? dominio.slice(0, 1) : dominio.slice(0, 2)
    const ponto = dominio.lastIndexOf(".")
    return `${visivelLocal}***@${visivelDominio}***${ponto > 2 ? dominio.slice(ponto) : ""}`
  }
  let pendentes = [
    {
      id: "c1",
      emailMascarado: "ma***@gm***.com",
      criadoEm: "2026-11-01T10:00:00.000Z",
      expiraEm: "2026-11-08T10:00:00.000Z",
    },
  ]
  let proximoConvite = 2

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
    if (recurso === "familia") {
      if (alvo === undefined) {
        if (metodo === "POST") {
          const corpo = rota.request().postDataJSON() as { email?: string }
          const convite = {
            id: `c${proximoConvite++}`,
            emailMascarado: mascarar(String(corpo.email ?? "")),
            criadoEm: "2026-11-06T12:00:00.000Z",
            expiraEm: "2026-11-13T12:00:00.000Z",
          }
          pendentes = [...pendentes, convite]
          return rota.fulfill({ status: 201, json: { convite } })
        }
        return rota.fulfill({ json: { familia: { podeConvidar: true, pendentes } } })
      }
      if (metodo === "DELETE") {
        const antes = pendentes.length
        pendentes = pendentes.filter((convite) => convite.id !== alvo)
        return pendentes.length === antes
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
