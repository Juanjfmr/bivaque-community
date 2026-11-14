/**
 * Demonstração autônoma da casca (EXP-CASCA-CAPACITOR).
 *
 * Só existe no build `--mode casca`: o APK de experimento leva o app embutido e
 * não tem servidor. Este módulo responde aos pedidos de `/api/` com respostas
 * gravadas da stack local com seed (`scripts/app/gravar-casca.mjs`), para a
 * pessoa sentir rolagem, teclado e transições num aparelho sem montar nada.
 *
 * O que isto NÃO é: uma segunda porta de dados do app. Nenhuma tela sabe que
 * ele existe; o cliente único continua pedindo o mesmo endereço. O build de
 * produção não carrega este arquivo (`main.tsx` só o importa no modo `casca`).
 *
 * Leitura: a resposta gravada para o mesmo endereço. Escrita: nada é gravado em
 * lugar nenhum; o envio de mensagem devolve a mensagem e a acrescenta à
 * conversa em memória, e o resto responde vazio com sucesso.
 */

type Gravada = { status: number; corpo: unknown }
type Gravacao = { respostas: Record<string, Gravada> }
type Corpo = Record<string, unknown>

const PREFIXO_DA_API = "/api/"
const PREFIXO_DA_MIDIA = "/app/casca/midia/"
const PAGINACAO = ["depois", "antes", "cursor"]

function json(status: number, corpo: unknown): Response {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { "content-type": "application/json" },
  })
}

function registro(valor: unknown): Corpo | null {
  return valor !== null && typeof valor === "object" && !Array.isArray(valor)
    ? (valor as Corpo)
    : null
}

function semConsulta(chave: string): string {
  return chave.split("?")[0] ?? chave
}

const IDENTIFICADOR = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g

function moldeDe(caminho: string): string {
  return caminho.replace(IDENTIFICADOR, ":id")
}

export async function instalarDemonstracao(): Promise<void> {
  const original = window.fetch.bind(window)
  const arquivo = await original(`${import.meta.env.BASE_URL}casca/gravacao.json`)
  // As telas só aceitam foto por URL absoluta (a assinada do servidor): os
  // arquivos embutidos ganham a origem do próprio app.
  const texto = (await arquivo.text()).replaceAll(
    `"${PREFIXO_DA_MIDIA}`,
    `"${window.location.origin}${PREFIXO_DA_MIDIA}`,
  )
  const gravacao = JSON.parse(texto) as Gravacao
  const respostas = new Map(Object.entries(gravacao.respostas))
  const porCaminho = new Map<string, Gravada>()
  for (const [chave, valor] of respostas) {
    const caminho = semConsulta(chave)
    if (chave === caminho || !porCaminho.has(caminho)) porCaminho.set(caminho, valor)
  }
  const porMolde = new Map<string, Gravada>()
  for (const [caminho, valor] of porCaminho) {
    const molde = moldeDe(caminho)
    if (molde !== caminho && !porMolde.has(molde)) porMolde.set(molde, valor)
  }
  let sequencia = 0

  function ler(url: URL): Response {
    const exata = respostas.get(`${url.pathname}${url.search}`)
    if (exata) return json(exata.status, exata.corpo)
    // Página seguinte que a gravação não tem: repetir a primeira duplicaria a
    // lista sem fim, então a resposta é "não encontrado".
    const pagina = PAGINACAO.some((nome) => url.searchParams.has(nome))
    if (pagina) return json(404, { erro: "nao-encontrado" })
    // Mesmo caminho com outra consulta; depois, um detalhe que a gravação não
    // visitou responde com outro do mesmo molde (só o identificador muda).
    const parecida = porCaminho.get(url.pathname) ?? porMolde.get(moldeDe(url.pathname))
    if (parecida) return json(parecida.status, parecida.corpo)
    return json(404, { erro: "nao-encontrado" })
  }

  function enviarMensagem(url: URL, pedido: Corpo): Response {
    const conteudo = typeof pedido["texto"] === "string" ? pedido["texto"] : ""
    sequencia += 1
    const mensagem = {
      id: `demonstracao-${sequencia}`,
      conteudo,
      minha: true,
      criadaEm: new Date().toISOString(),
    }
    const conversa = url.pathname.replace(/\/mensagens$/, "")
    for (const [chave, gravada] of respostas) {
      if (semConsulta(chave) !== conversa) continue
      const corpo = registro(gravada.corpo)
      if (corpo && Array.isArray(corpo["mensagens"]) && !chave.includes("antes=")) {
        corpo["mensagens"] = [...corpo["mensagens"], mensagem]
      }
    }
    return json(200, { mensagem })
  }

  window.fetch = async (entrada, opcoes) => {
    const pedido = new Request(entrada, opcoes)
    const url = new URL(pedido.url, window.location.href)
    if (url.origin !== window.location.origin || !url.pathname.startsWith(PREFIXO_DA_API)) {
      return original(entrada, opcoes)
    }
    if (pedido.method === "GET") return ler(url)
    const corpo = registro(await pedido.json().catch(() => null)) ?? {}
    if (pedido.method === "POST" && /\/conversas\/[^/]+\/mensagens$/.test(url.pathname)) {
      return enviarMensagem(url, corpo)
    }
    return json(200, {})
  }
}
