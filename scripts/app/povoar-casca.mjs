import { readFileSync } from "node:fs"
import { join } from "node:path"

/*
 * Acrescenta publicações e desapegos com foto ao banco LOCAL antes da gravação do APK de
 * experimento (EXP-CASCA-CAPACITOR). O seed não tem imagem nenhuma, e o
 * experimento precisa de um feed com fotos para avaliar a rolagem.
 *
 * Tudo passa pela API do app, como a persona do seed: entra no grupo, envia a
 * foto (que passa pelo `sanitize-image` de verdade) e publica. As fotos são as
 * de demonstração do próprio app (apps/app/public/demo). Só fala com
 * localhost; rodar duas vezes publica duas vezes, então rode logo depois de um
 * `supabase db reset` com seed.
 */

const raiz = process.cwd()
const base = process.env["BIVAQUE_CASCA_ORIGEM"] ?? "http://localhost:3000"

function doEnvLocal(chave) {
  try {
    const arquivo = readFileSync(join(raiz, "apps", "web", ".env.local"), "utf8")
    for (const linha of arquivo.split("\n")) {
      const igual = linha.indexOf("=")
      if (igual !== -1 && linha.slice(0, igual).trim() === chave) {
        return linha
          .slice(igual + 1)
          .trim()
          .replace(/^["']|["']$/g, "")
      }
    }
  } catch {
    return undefined
  }
  return undefined
}

function exigir(chave) {
  const valor = process.env[chave] ?? doEnvLocal(chave)
  if (!valor) throw new Error(`povoar-casca: falta ${chave} (ambiente ou apps/web/.env.local)`)
  return valor
}

const supabase = exigir("NEXT_PUBLIC_SUPABASE_URL")
const chaveAnonima = exigir("NEXT_PUBLIC_SUPABASE_ANON_KEY")
const email = exigir("BIVAQUE_VISUAL_EMAIL")
const senha = exigir("BIVAQUE_VISUAL_PASSWORD")

for (const endereco of [base, supabase]) {
  const { hostname } = new URL(endereco)
  if (hostname !== "localhost" && hostname !== "127.0.0.1") {
    throw new Error(`povoar-casca: só escreve na stack local, não em ${hostname}`)
  }
}

const entrada = await fetch(`${supabase}/auth/v1/token?grant_type=password`, {
  method: "POST",
  headers: { apikey: chaveAnonima, "content-type": "application/json" },
  body: JSON.stringify({ email, password: senha }),
})
if (!entrada.ok) throw new Error(`povoar-casca: a entrada da persona falhou (${entrada.status})`)
const { access_token: token } = await entrada.json()

async function api(metodo, caminho, corpo) {
  const resposta = await fetch(`${base}${caminho}`, {
    method: metodo,
    headers: {
      authorization: `Bearer ${token}`,
      origin: base,
      "x-bivaque-app": "bivaque-spa",
      ...(corpo === undefined ? {} : { "content-type": "application/json" }),
    },
    ...(corpo === undefined ? {} : { body: JSON.stringify(corpo) }),
  })
  const dados = await resposta.json().catch(() => ({}))
  if (!resposta.ok) {
    throw new Error(`povoar-casca: ${metodo} ${caminho} -> ${resposta.status} ${dados.erro ?? ""}`)
  }
  return dados
}

const TIPOS = { jpg: "image/jpeg", webp: "image/webp" }
const PUBLICACOES = [
  ["sunset.webp", "Fim de tarde de hoje visto da Ponta Negra. Quem mais estava por lá?"],
  ["friends.webp", "Encontro de sábado foi ótimo. Obrigada a todo mundo que apareceu!"],
  ["cake.jpg", "Sobrou bolo da confraternização. Quem passar aqui em casa hoje leva um pedaço."],
  ["moving.jpg", "Mudança chegou inteira. Se alguém precisar de caixas de papelão, tenho várias."],
  [
    "kitchen.jpg",
    "Terminamos a reforma da cozinha. Indico o pedreiro para quem estiver procurando.",
  ],
  ["pets.jpg", "Esse aqui apareceu na nossa rua hoje cedo. Alguém conhece o dono?"],
  ["classroom.jpg", "Reunião na escola foi boa. Deixo aqui o resumo para quem não pôde ir."],
  ["workshop.jpg", "Oficina de marcenaria no fim de semana. Ainda tem duas vagas."],
  ["mesa.webp", "Café da manhã do grupo no domingo. Cada um leva um prato."],
  ["interior.jpg", "Sala pronta depois de três semanas. Valeu pelas dicas de vocês."],
  ["arrival.webp", "Chegamos! Primeira semana na cidade e já deu para conhecer bastante gente."],
  ["community.webp", "Foto do último encontro. Na próxima a gente marca num lugar maior."],
  ["sofa.jpg", "Trocamos o sofá e o antigo está em bom estado. Alguém do grupo quer?"],
  ["service.jpg", "Fiz a revisão do ar-condicionado com esse pessoal e recomendo."],
  [
    "apartment.jpg",
    "Vista do apartamento novo. Ainda falta mobiliar, mas já dá para receber visita.",
  ],
  ["crib.jpg", "Montamos o quarto do bebê. Aceito indicação de pediatra aqui perto."],
]

function dataUrl(arquivo) {
  const extensao = arquivo.split(".").pop() ?? ""
  const tipo = TIPOS[extensao]
  if (!tipo) throw new Error(`povoar-casca: tipo de imagem sem suporte em ${arquivo}`)
  const conteudo = readFileSync(join(raiz, "apps", "app", "public", "demo", arquivo))
  return { tipo, conteudo: conteudo.toString("base64") }
}

const DESAPEGOS = [
  ["fridge.jpg", "Geladeira frost free 300 L", "Ponta Negra", "900,00", "casa_moveis"],
  ["sofa.jpg", "Sofá de três lugares", "Chapada", "650,00", "casa_moveis"],
  ["crib.jpg", "Berço com colchão", "Parque Dez", "380,00", "infantil"],
  ["kitchen.jpg", "Armário de cozinha planejado", "Adrianópolis", "1200,00", "casa_moveis"],
  ["interior.jpg", "Estante e mesa de centro", "Aleixo", "420,00", "casa_moveis"],
  ["workshop.jpg", "Kit de correias e polias de motor", "Flores", "750,00", "veiculos"],
]

/** `BIVAQUE_CASCA_POVOAR=grupos` ou `=mercado` roda só uma parte. */
const partes = (process.env["BIVAQUE_CASCA_POVOAR"] ?? "grupos,mercado").split(",")

if (partes.includes("mercado")) {
  for (const [arquivo, titulo, bairro, preco, categoria] of DESAPEGOS) {
    await api("POST", "/api/app/mercado", {
      chave: crypto.randomUUID(),
      titulo,
      bairro,
      preco,
      descricao: `${titulo}, em bom estado. Retirada no bairro, combino o horário pela conversa.`,
      categoria,
      condicao: "used",
      foto: dataUrl(arquivo),
    })
    console.log(`povoar-casca: desapego <- ${arquivo}`)
  }
}

if (partes.includes("grupos")) {
  const { grupos } = await api("GET", "/api/app/grupos")
  const abertos = grupos.filter((grupo) => !grupo.fechado)
  if (abertos.length === 0) throw new Error("povoar-casca: nenhum grupo aberto no seed")
  for (const [indice, [arquivo, texto]] of PUBLICACOES.entries()) {
    const grupo = abertos[indice % abertos.length]
    if (!grupo.membro) {
      await api("PUT", `/api/app/grupos/${grupo.id}/participacao`, { motivo: "" })
      grupo.membro = true
    }
    const { caminho } = await api("POST", `/api/app/grupos/${grupo.id}/fotos`, dataUrl(arquivo))
    await api("POST", `/api/app/grupos/${grupo.id}/publicacoes`, { texto, fotos: [caminho] })
    console.log(`povoar-casca: ${grupo.nome} <- ${arquivo}`)
  }
}
