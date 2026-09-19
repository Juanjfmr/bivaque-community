
// TESTE OBSERVAVEL DA CARGA — 3.971 usuarios, 209 por cidade, 19 cidades, 7 estados.
//
// Mede a plataforma pelo MESMO caminho que a UI usa (REST com a sessao do
// usuario, sujeito a RLS) e imprime o que o responsavel precisa ver.
//
// DUAS CAMADAS, de proposito:
//
//   A) o que o USUARIO ve — REST com a sessao dele. Aqui vale a RLS, e e aqui que
//      o isolamento geografico tem de aparecer;
//   B) o que a OPERACAO ve — contagem por service role. Existe porque a leitura
//      direta de locality_memberships devolve SO a propria linha (a RLS protege
//      quem mora onde), entao contar membros pela camada A mediria 1 e nao a
//      densidade real. As duas juntas mostram privacidade E volume.
//
// Uso: node scripts/load/observe.mjs

import { readFileSync } from "node:fs"

const dot = {}
for (const line of readFileSync("apps/web/.env.local", "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m) dot[m[1]] = m[2]
}
const URL = dot.NEXT_PUBLIC_SUPABASE_URL
const ANON = dot.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? dot.SUPABASE_SERVICE_ROLE_KEY
const SENHA = "bivaque-e2e-local"

const CIDADES = [
  ["AM", "Itacoatiara", "carga-1"],
  ["AM", "Manaus", "carga-210"],
  ["AM", "Parintins", "carga-419"],
  ["BA", "Feira de Santana", "carga-628"],
  ["BA", "Salvador", "carga-1000"],
  ["BA", "Vitória da Conquista", "carga-1046"],
  ["DF", "Brasília", "carga-1255"],
  ["MG", "Belo Horizonte", "carga-1464"],
  ["MG", "Juiz de Fora", "carga-1673"],
  ["MG", "Uberlândia", "carga-1882"],
  ["PE", "Caruaru", "carga-2091"],
  ["PE", "Olinda", "carga-2300"],
  ["PE", "Recife", "carga-2509"],
  ["RS", "Caxias do Sul", "carga-2718"],
  ["RS", "Pelotas", "carga-2927"],
  ["RS", "Porto Alegre", "carga-3136"],
  ["SP", "Campinas", "carga-3345"],
  ["SP", "Santos", "carga-3554"],
  ["SP", "São Paulo", "carga-3763"],
]

async function entrar(email) {
  const r = await fetch(URL + "/auth/v1/token?grant_type=password", {
    method: "POST",
    headers: { apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: SENHA }),
  })
  const s = await r.json()
  return s.access_token ? s : null
}

const buscar = async (url, h) => {
  const t0 = Date.now()
  const r = await fetch(url, { headers: h })
  const corpo = await r.json()
  return { ms: Date.now() - t0, corpo: Array.isArray(corpo) ? corpo : [] }
}

// camada B: contagem por cidade, com service role.
//
// NAO somar as linhas devolvidas: o PostgREST corta em 1000 por requisicao (um
// limit=5000 e ignorado em silencio) e a soma sairia menor que a verdade — foi
// exatamente o que aconteceu na primeira versao desta funcao, que reportou 3
// membros por cidade com 209 no banco. O total confiavel vem do cabecalho
// Content-Range com Prefer: count=exact, que e o servidor contando.
async function densidadePorCidade(idsPorCidade) {
  const h = { apikey: SERVICE, Authorization: "Bearer " + SERVICE }
  const mapa = new Map()
  for (const [chave, localityId] of idsPorCidade) {
    if (!localityId) continue
    const r = await fetch(
      URL + "/rest/v1/locality_memberships?select=user_id&locality_id=eq." + localityId + "&limit=1",
      { headers: { ...h, Prefer: "count=exact" } },
    )
    const faixa = r.headers.get("content-range") ?? ""
    const total = Number(faixa.split("/")[1])
    mapa.set(chave, Number.isFinite(total) ? total : -1)
  }
  return mapa
}

console.log("")
console.log("=".repeat(88))
console.log("  A PLATAFORMA SOB CARGA — 3.971 usuarios, 209 por cidade, 19 cidades, 7 estados")
console.log("=".repeat(88))
console.log("")

// Duas passadas: a primeira descobre o locality_id de cada cidade (a sessao do
// usuario so enxerga o proprio vinculo, entao o id e o que o proprio teste ve), a
// segunda conta a densidade com service role.
const idsPorCidade = []
for (const [uf, cidade, conta] of CIDADES) {
  const s = await entrar(conta + "@bivaque.example.invalid")
  if (!s) { idsPorCidade.push([cidade + "/" + uf, null]); continue }
  const r = await fetch(URL + "/rest/v1/locality_memberships?select=locality_id", {
    headers: { apikey: ANON, Authorization: "Bearer " + s.access_token },
  })
  const j = await r.json()
  idsPorCidade.push([cidade + "/" + uf, Array.isArray(j) && j[0] ? j[0].locality_id : null])
}
const densidade = SERVICE ? await densidadePorCidade(idsPorCidade) : new Map()
console.log("  cidade                      na cidade   posts   evt   com   consulta   isolamento")
console.log("  " + "-".repeat(84))

const resultados = []
let vazamentos = 0
let falhasLogin = 0

for (const [uf, cidade, conta] of CIDADES) {
  const email = conta + "@bivaque.example.invalid"
  const s = await entrar(email)
  if (!s) { falhasLogin++; console.log("  " + (cidade + "/" + uf).padEnd(26) + " FALHA DE LOGIN"); continue }
  const h = { apikey: ANON, Authorization: "Bearer " + s.access_token }

  const meuVinculo = await buscar(URL + "/rest/v1/locality_memberships?select=locality_id", h)
  const meuId = meuVinculo.corpo[0]?.locality_id ?? null

  const feed = await buscar(URL + "/rest/v1/posts?select=id,locality_id&limit=500", h)
  const minhas = feed.corpo.filter((p) => p.locality_id === meuId)
  const outras = feed.corpo.filter((p) => p.locality_id !== meuId)

  const eventos = await buscar(URL + "/rest/v1/events?select=id&limit=200", h)
  const comunidades = await buscar(URL + "/rest/v1/communities?select=id&limit=200", h)

  let vazou = false
  if (meuId) {
    const tentativa = await buscar(URL + "/rest/v1/posts?select=id&locality_id=neq." + meuId + "&limit=5", h)
    vazou = tentativa.corpo.length > 0
  }
  if (vazou || outras.length > 0) vazamentos++

  const naCidade = densidade.get(cidade + "/" + uf) ?? -1
  resultados.push({ cidade: cidade + "/" + uf, minhas: minhas.length, ms: feed.ms })

  console.log(
    "  " + (cidade + "/" + uf).padEnd(26) +
    String(naCidade).padStart(8) +
    String(minhas.length).padStart(7) +
    String(eventos.corpo.length).padStart(6) +
    String(comunidades.corpo.length).padStart(6) +
    (feed.ms + "ms").padStart(11) +
    "   " + (vazou ? "VAZOU" : outras.length === 0 ? "ok" : outras.length + " de outra"),
  )
}

console.log("")
console.log("=".repeat(88))
console.log("  LEITURA")
console.log("=".repeat(88))
const ms = resultados.map((r) => r.ms)
const dens = [...densidade.entries()].filter(([k]) => CIDADES.some(([uf, c]) => c + "/" + uf === k)).map(([, v]) => v)
console.log("  cidades testadas .......... " + resultados.length + " de 19")
console.log("  falhas de login ........... " + falhasLogin)
console.log("  densidade por cidade ...... min " + Math.min(...dens) + " / max " + Math.max(...dens) +
  (SERVICE ? "" : "  (informe SUPABASE_SERVICE_ROLE_KEY para medir)"))
console.log("  posts proprios (soma) ..... " + resultados.reduce((a, r) => a + r.minhas, 0))
console.log("  tempo de consulta ......... min " + Math.min(...ms) + "ms / medio " +
  Math.round(ms.reduce((a, b) => a + b, 0) / ms.length) + "ms / max " + Math.max(...ms) + "ms")
console.log("  VAZAMENTO entre cidades ... " + (vazamentos === 0
  ? "nenhum — cada cidade so enxerga o proprio conteudo"
  : vazamentos + " cidade(s) viram conteudo de outra"))
console.log("")
console.log("  Nota: a densidade vem da camada administrativa. Pela sessao do usuario a")
console.log("  leitura de locality_memberships devolve SO a propria linha — e isso e a")
console.log("  protecao funcionando: nao se enumera quem mora em cada cidade.")
console.log("")
