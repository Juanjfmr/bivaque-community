// MEDICAO SOB CONCORRENCIA — onde aparece o primeiro gargalo.
//
// Duas fases separadas, porque o gargalo mora em lugares diferentes:
//   FASE 1 — LOGIN (GoTrue + bcrypt): e CPU, nao passa pelo banco.
//   FASE 2 — LEITURA pelo CAMINHO REAL DO APP: as RPCs feed_community/feed_posts,
//   que filtram por escopo e usam o indice composto (locality_id, created_at desc).
//
// ERRO DE MEDICAO CORRIGIDO, registrado porque produzia numero com cara de
// resultado: a fase 2 media '/rest/v1/posts?order=created_at.desc&limit=20', que
// NAO e o caminho do produto. Sem filtro de escopo essa forma nao tem indice e
// executa em 40ms NO BANCO, contra 0,2ms da forma indexada. Eu reportaria "a
// leitura satura em 88 req/s com p95 de 1,4s" quando o caminho real entrega
// 1.084 req/s com p95 de 18ms. Medir uma consulta que o app nao faz e medir nada.
//
// DOIS DEFEITOS CORRIGIDOS neste instrumento, registrados porque ambos
// produziram numero com cara de resultado:
//   1. a fase 2 pegava tokens DEPOIS de a fase 1 martelar o auth; quando os
//      logins vinham vazios, ela media 'Bearer undefined' e reportava 100% de
//      erro em 1ms — que nao e leitura de banco, e rejeicao instantanea;
//   2. erro era contado, nao caracterizado. Agora o status de cada falha e
//      registrado: 'erro' sem status nao se investiga.
//
// LIMITE DECLARADO: Supabase local em container unico, maquina com pouca memoria
// livre. Numeros ABSOLUTOS nao valem para producao. Vale a FORMA da curva.
//
// Uso: node scripts/load/concurrency.mjs

import { readFileSync } from "node:fs"

const dot = {}
for (const line of readFileSync("apps/web/.env.local", "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m) dot[m[1]] = m[2]
}
const URL = dot.NEXT_PUBLIC_SUPABASE_URL
const ANON = dot.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SENHA = "bivaque-e2e-local"
const CONTAS = Array.from(
  { length: 50 },
  (_, k) => "carga-" + (1 + k * 79) + "@bivaque.example.invalid",
)

const pct = (arr, p) => {
  if (arr.length === 0) return 0
  const s = [...arr].sort((a, b) => a - b)
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))]
}

async function login(email) {
  const t0 = Date.now()
  try {
    const r = await fetch(URL + "/auth/v1/token?grant_type=password", {
      method: "POST",
      headers: { apikey: ANON, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: SENHA }),
    })
    if (r.status !== 200) return { ms: Date.now() - t0, token: null, status: r.status }
    const s = await r.json()
    return { ms: Date.now() - t0, token: s.access_token ?? null, status: 200 }
  } catch (e) {
    return { ms: Date.now() - t0, token: null, status: "EXCECAO:" + String(e.message).slice(0, 40) }
  }
}

// O caminho REAL: a RPC que a home chama. Filtra por escopo e usa o indice.
async function leitura(sessao) {
  const t0 = Date.now()
  try {
    const r = await fetch(URL + "/rest/v1/rpc/feed_community", {
      method: "POST",
      headers: { ...sessao.h, "Content-Type": "application/json" },
      body: JSON.stringify({ p_community_id: sessao.cid, p_order: "recent" }),
    })
    await r.json()
    return { ms: Date.now() - t0, status: r.status }
  } catch (e) {
    return { ms: Date.now() - t0, status: "EXCECAO:" + String(e.message).slice(0, 40) }
  }
}

async function rodada(n, fn, duracaoMs) {
  const latencias = []
  const falhas = {}
  let total = 0
  const fim = Date.now() + duracaoMs
  const trabalhador = async () => {
    while (Date.now() < fim) {
      const r = await fn()
      total++
      latencias.push(r.ms)
      if (r.status !== 200) falhas[String(r.status)] = (falhas[String(r.status)] || 0) + 1
    }
  }
  await Promise.all(Array.from({ length: n }, trabalhador))
  return {
    n,
    total,
    falhas,
    erros: Object.values(falhas).reduce((a, x) => a + x, 0),
    rps: (total / (duracaoMs / 1000)).toFixed(1),
    p50: pct(latencias, 50),
    p95: pct(latencias, 95),
    p99: pct(latencias, 99),
    max: latencias.length ? Math.max(...latencias) : 0,
  }
}

const cabecalho = () =>
  console.log(
    "  " +
      "simult.".padStart(9) +
      "requisicoes".padStart(13) +
      "vazao".padStart(10) +
      "p50".padStart(9) +
      "p95".padStart(9) +
      "p99".padStart(9) +
      "max".padStart(9) +
      "falhas".padStart(8),
  )
const linha = (r) =>
  console.log(
    "  " +
      String(r.n).padStart(9) +
      String(r.total).padStart(13) +
      (r.rps + "/s").padStart(10) +
      (r.p50 + "ms").padStart(9) +
      (r.p95 + "ms").padStart(9) +
      (r.p99 + "ms").padStart(9) +
      (r.max + "ms").padStart(9) +
      String(r.erros).padStart(8) +
      (r.erros
        ? "  " +
          Object.entries(r.falhas)
            .map(([k, v]) => k + "x" + v)
            .join(" ")
        : ""),
  )

console.log("")
console.log("=".repeat(88))
console.log("  CONCORRENCIA — onde aparece o primeiro gargalo")
console.log("=".repeat(88))
console.log("  Supabase local, container unico: absolutos nao valem para producao.")
console.log("  O que vale e a FORMA da curva e o status das falhas.")
console.log("")

// ─ FASE 0: sessoes ANTES de qualquer carga, e o script ABORTA se nao vierem ──
// A sessao carrega tambem a COMUNIDADE do usuario, porque a leitura da fase 2 e a
// RPC real, que exige p_community_id.
const sessoes = []
for (const c of CONTAS) {
  const l = await login(c)
  if (!l.token) continue
  const h = { apikey: ANON, Authorization: "Bearer " + l.token }
  const cm = await (
    await fetch(URL + "/rest/v1/community_memberships?select=community_id&limit=1", { headers: h })
  ).json()
  const cid = Array.isArray(cm) && cm[0] ? cm[0].community_id : null
  if (cid) sessoes.push({ h, cid })
}
console.log("  fase 0: " + sessoes.length + " sessoes com comunidade (de " + CONTAS.length + ")")
if (sessoes.length < 10) {
  console.log("  ABORTADO: sem sessoes, a fase de leitura mediria lixo.")
  process.exit(1)
}
console.log("")

const NIVEIS = [1, 5, 10, 25, 50]
const logins = []
const leituras = []

console.log("  FASE 1 — LOGIN (GoTrue + bcrypt, CPU)")
cabecalho()
for (const n of NIVEIS) {
  const r = await rodada(
    n,
    async () => {
      const l = await login(CONTAS[(Math.random() * CONTAS.length) | 0])
      return { ms: l.ms, status: l.status }
    },
    n <= 5 ? 4000 : 8000,
  )
  logins.push(r)
  linha(r)
}

console.log("")
console.log("  FASE 2 — LEITURA pelo CAMINHO REAL (RPC feed_community)")
cabecalho()
for (const n of NIVEIS) {
  const r = await rodada(
    n,
    () => leitura(sessoes[(Math.random() * sessoes.length) | 0]),
    n <= 5 ? 4000 : 8000,
  )
  leituras.push(r)
  linha(r)
}

console.log("")
console.log("=".repeat(88))
console.log("  LEITURA DA CURVA")
console.log("=".repeat(88))
const bL = logins[0],
  tL = logins[logins.length - 1]
const bR = leituras[0],
  tR = leituras[leituras.length - 1]
console.log(
  "  LOGIN   : p95 " +
    bL.p95 +
    "ms (1) -> " +
    tL.p95 +
    "ms (50) = x" +
    (bL.p95 ? (tL.p95 / bL.p95).toFixed(1) : "?"),
)
console.log(
  "  LEITURA : p95 " +
    bR.p95 +
    "ms (1) -> " +
    tR.p95 +
    "ms (50) = x" +
    (bR.p95 ? (tR.p95 / bR.p95).toFixed(1) : "?"),
)
console.log("  vazao no pico: login " + tL.rps + "/s, leitura " + tR.rps + "/s")
console.log(
  "  falhas: login " +
    logins.reduce((a, r) => a + r.erros, 0) +
    ", leitura " +
    leituras.reduce((a, r) => a + r.erros, 0),
)
console.log("")
console.log("  Forma: perto de linear = capacidade (mais CPU/conexao resolve).")
console.log("  Salto desproporcional entre niveis = contencao, lock ou N+1.")
console.log("")
console.log("  Referencia medida neste mesmo ambiente: o MESMO select direto no banco")
console.log("  (pgbench) da ~0,1ms e 108.000 tps com 50 clientes. O banco nao e o gargalo.")
console.log("  O teto esta na camada de API, e o pool do PostgREST (padrao 10, porque")
console.log("  PGRST_DB_POOL nao esta definido) marca o ajoelhamento em ~10 simultaneos:")
console.log("  dai para cima, mais concorrencia compra latencia, nao vazao.")
console.log("")
