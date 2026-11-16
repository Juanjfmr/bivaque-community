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

/** Manaus é a cidade de casa da persona no seed; o id do Rio é só desta simulação. */
const CIDADE_MANAUS = "00000000-0000-4000-8000-000000000001"
const CIDADE_RIO = "00000000-0000-4000-8000-000000000002"

/** O catálogo público simulado: duas UFs e uma cidade em cada uma. */
const CATALOGO: Record<string, readonly { id: string; cityName: string }[]> = {
  AM: [{ id: CIDADE_MANAUS, cityName: "Manaus" }],
  RJ: [{ id: CIDADE_RIO, cityName: "Rio de Janeiro" }],
}
export async function simularVoce(
  page: Page,
  opcoes: {
    /** Estado da leitura: CEP guardado sem posição (ADR-20261112). */
    distanciaDisponivel?: boolean
    /** O que a gravação do CEP responde, para o caminho de falha da tela. */
    respostaDaLocalizacao?: "sem-coordenada" | "cep-nao-encontrado" | "geocodificador-indisponivel"
    /** O que a saída responde, para o caminho de falha da tela. */
    respostaDoSair?: "indisponivel" | "ja-saiu"
    /** Pessoa já em transferência (RUN-170): a cidade de saída e a data. */
    saida?: { nome: string; uf: string; endsAt: string; readOnly: boolean } | null
    /** O que a declaração de mudança responde, para o caminho de recusa. */
    respostaDaMudanca?: "mudanca-em-andamento" | "indisponivel"
  } = {},
) {
  // A entrada lê o progresso para saber se há sessão. Depois de sair não há, e
  // é este 401 que a tela de entrada recebe do servidor de verdade.
  await page.route(/\/api\/app\/entry\/progress$/, (rota) =>
    rota.fulfill({ status: 401, json: { autenticado: false } }),
  )
  // Preferências de aviso (F09): a área Você lê e grava a matriz de canais.
  // A simulação devolve o mesmo corpo de `/api/app/avisos/preferencias`.
  const canaisDeAviso = (escolha: {
    comments: boolean
    events: boolean
    productNews: boolean
    indications: boolean
    messages: boolean
  }) => ({
    comments: escolha.comments,
    events: escolha.events,
    productNews: escolha.productNews,
    indications: escolha.indications,
    messages: escolha.messages,
    resumoCidade: "off" as "off" | "daily" | "weekly",
    channels: (["comments", "events", "product_news", "indications", "messages"] as const).flatMap(
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
    messages: true,
  })
  await page.route(/\/api\/app\/avisos\/preferencias$/, async (rota) => {
    if (rota.request().method() === "PATCH") {
      const corpo = rota.request().postDataJSON() as {
        comments: boolean
        events: boolean
        productNews: boolean
        indications: boolean
        messages: boolean
        resumoCidade: "off" | "daily" | "weekly"
        channels: typeof preferenciasDeAviso.channels
      }
      preferenciasDeAviso = { ...corpo }
    }
    return rota.fulfill({ json: { preferencias: preferenciasDeAviso } })
  })
  // `distanciaDisponivel: false` simula o CEP conhecido sem posição
  // (ADR-20261112): guardado, mas ainda sem distância calculável.
  const perfil: {
    nome: string
    bio: string
    cidade: { id: string; nome: string }
    outbound: { id: string; nome: string; uf: string; endsAt: string; readOnly: boolean } | null
    localizacao: { cep: string | null; definida: boolean }
    distanciaDisponivel: boolean
  } = {
    nome: "Ana Verificada",
    bio: "Mãe de dois, moro no Centro.",
    cidade: { id: CIDADE_MANAUS, nome: "Manaus" },
    outbound:
      opcoes.saida === undefined || opcoes.saida === null
        ? null
        : { id: CIDADE_RIO, ...opcoes.saida },
    localizacao: { cep: "69020-000", definida: true },
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

  // Catálogo público (RUN-170): as mesmas rotas que a entrada consome.
  await page.route(/\/api\/localities(?:\/|$)/, (rota) => {
    const partes = new URL(rota.request().url()).pathname.split("/").filter(Boolean)
    const uf = partes[2]
    if (uf === undefined) return rota.fulfill({ json: { ufs: Object.keys(CATALOGO) } })
    const municipios = CATALOGO[uf.toUpperCase()]
    return municipios === undefined
      ? rota.fulfill({ status: 404, json: { error: "unknown_uf" } })
      : rota.fulfill({
          json: {
            municipalities: municipios.map((cidade) => ({ ...cidade, ibgeCode: "0000000" })),
          },
        })
  })

  let afiliacao: { armedForce: string | null; om: string | null } = { armedForce: null, om: null }

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
    if (recurso === "cidade") {
      if (metodo === "GET") {
        const pedido = url.searchParams.get("destino")
        const achada = Object.values(CATALOGO)
          .flat()
          .find((cidade) => cidade.id === pedido)
        const uf = Object.entries(CATALOGO).find(([, cidades]) =>
          cidades.some((cidade) => cidade.id === pedido),
        )?.[0]
        return rota.fulfill({
          json: {
            destino:
              achada === undefined || uf === undefined
                ? null
                : { id: achada.id, nome: achada.cityName, uf },
          },
        })
      }
      if (opcoes.respostaDaMudanca === "indisponivel")
        return rota.fulfill({ status: 503, json: { erro: "cidade-indisponivel" } })
      if (perfil.outbound !== null || opcoes.respostaDaMudanca === "mudanca-em-andamento")
        return rota.fulfill({
          status: 409,
          json: {
            erro: "mudanca-em-andamento",
            mensagem:
              "Você já tem uma mudança em andamento. Espere o prazo da cidade anterior terminar para mudar de novo.",
          },
        })
      const corpo = rota.request().postDataJSON() as { destino?: string; prazo?: string }
      const achada = Object.values(CATALOGO)
        .flat()
        .find((cidade) => cidade.id === corpo.destino)
      if (achada === undefined)
        return rota.fulfill({ status: 400, json: { erro: "dados-invalidos" } })
      const anterior = perfil.cidade
      perfil.cidade = { id: achada.id, nome: achada.cityName }
      perfil.outbound = {
        id: anterior.id,
        nome: anterior.nome,
        uf: "AM",
        endsAt: String(corpo.prazo ?? ""),
        readOnly: false,
      }
      return rota.fulfill({ json: { perfil } })
    }
    if (recurso === "afiliacao") {
      if (metodo === "PUT") {
        const corpo = rota.request().postDataJSON() as {
          armedForce?: string | null
          om?: string | null
        }
        afiliacao = {
          armedForce: typeof corpo.armedForce === "string" ? corpo.armedForce : null,
          om: typeof corpo.om === "string" && corpo.om.trim() !== "" ? corpo.om.trim() : null,
        }
      }
      return rota.fulfill({ json: { afiliacao } })
    }
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
    if (recurso === "localizacao" && metodo === "PUT") {
      if (opcoes.respostaDaLocalizacao === "cep-nao-encontrado")
        return rota.fulfill({ status: 422, json: { erro: "cep-nao-encontrado" } })
      if (opcoes.respostaDaLocalizacao === "geocodificador-indisponivel")
        return rota.fulfill({ status: 503, json: { erro: "geocodificador-indisponivel" } })
      const corpo = rota.request().postDataJSON() as { cep?: string | null }
      const digitos = typeof corpo.cep === "string" ? corpo.cep : ""
      perfil.localizacao = {
        cep: digitos === "" ? null : `${digitos.slice(0, 5)}-${digitos.slice(5)}`,
        definida: digitos !== "",
      }
      perfil.distanciaDisponivel = opcoes.respostaDaLocalizacao !== "sem-coordenada"
      return rota.fulfill({
        json: {
          localizacao: perfil.localizacao,
          distanciaDisponivel: perfil.distanciaDisponivel,
        },
      })
    }
    if (recurso === "sair" && metodo === "POST") {
      if (opcoes.respostaDoSair === "indisponivel")
        return rota.fulfill({ status: 503, json: { erro: "saida-indisponivel" } })
      // Sessão que já não existe: o mesmo corpo do `exigirSessao`.
      if (opcoes.respostaDoSair === "ja-saiu")
        return rota.fulfill({ status: 401, json: { autenticado: false } })
      return rota.fulfill({ json: { ok: true } })
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
