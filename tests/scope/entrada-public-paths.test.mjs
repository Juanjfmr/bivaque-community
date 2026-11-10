import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import test from "node:test"

const root = join(import.meta.dirname, "..", "..")
const ler = (...partes) => readFileSync(join(root, ...partes), "utf8")

const proxy = ler("apps", "web", "proxy.ts")
const superficie = ler("apps", "web", "lib", "security", "route-surface.ts")
const nextConfig = ler("apps", "web", "next.config.ts")

// SEC-010, ADR-20261110-superficie-publica-do-proxy: a lista pública mora em
// `apps/web/lib/security/route-surface.ts` e o proxy a consome; o proxy não
// volta a comparar prefixo solto. Este teste de escopo lê a lista como texto
// (não há loader de TypeScript aqui) e falha se:
// - o proxy voltar a ter lista própria ou `startsWith` cru;
// - a Ajuda sair do público (PORT-006/ADR-20261022);
// - `/convite/ABCD1234`, `/loginx`, `/apiario` ou `/landing` exato voltarem a
//   ser tratados como públicos por prefixo;
// - o redirect exato `/landing` → `/` sumir do next.config.ts.
function entradasPublicas() {
  const regex = /\{\s*caminho: "([^"]+)",\s*modo: "(exata|pasta|ativos)",\s*motivo:/g
  return [...superficie.matchAll(regex)].map((match) => ({ caminho: match[1], modo: match[2] }))
}

const semBarraFinal = (caminho) =>
  caminho.length > 1 && caminho.endsWith("/") ? caminho.slice(0, -1) : caminho

const casaFronteira = (caminho, prefixo) => {
  const alvo = semBarraFinal(caminho)
  const base = semBarraFinal(prefixo)
  return alvo === base || alvo.startsWith(`${base}/`)
}

const casaSubarvore = (caminho, entrada) => {
  const base = semBarraFinal(entrada)
  return caminho.startsWith(`${base}/`) && caminho.length > base.length + 1
}

// Mesma semântica de `isPublicPath`, aplicada à lista lida como texto.
const isPublic = (pathname) =>
  entradasPublicas().some((entrada) => {
    if (entrada.modo === "exata") return semBarraFinal(pathname) === semBarraFinal(entrada.caminho)
    if (entrada.modo === "pasta") return casaFronteira(pathname, entrada.caminho)
    return casaSubarvore(pathname, entrada.caminho)
  })

test("a lista é a única fonte: o proxy não tem lista própria nem prefixo solto", () => {
  assert.match(superficie, /export const PUBLIC_SURFACE/)
  assert.match(proxy, /from "\.\/lib\/security\/route-surface"/)
  assert.match(proxy, /isPublicPath\(/)
  assert.match(proxy, /entradaEmAndamento\(/)
  assert.match(proxy, /areaDoPrestador\(/)
  assert.doesNotMatch(proxy, /PUBLIC_PATHS/)
  assert.doesNotMatch(proxy, /PUBLIC_POR_PASTA/)
  assert.doesNotMatch(proxy, /startsWith\(/)
})

test("as três fronteiras e os dois allowlists internos são os exportados", () => {
  assert.match(superficie, /export function casaFronteira/)
  assert.match(superficie, /export function isPublicPath/)
  assert.match(superficie, /export function entradaEmAndamento/)
  assert.match(superficie, /export function areaDoPrestador/)
  assert.match(superficie, /case "exata"/)
  assert.match(superficie, /case "pasta"/)
  assert.match(superficie, /case "ativos"/)
})

test("toda entrada declara um modo dos três e um motivo", () => {
  const entradas = entradasPublicas()
  assert.ok(entradas.length >= 19, `esperava ao menos 19 entradas, achei ${entradas.length}`)
  for (const entrada of entradas) {
    assert.ok(["exata", "pasta", "ativos"].includes(entrada.modo), entrada.caminho)
  }
  const caminhos = entradas.map((entrada) => entrada.caminho)
  assert.equal(new Set(caminhos).size, caminhos.length)
})

test("a conta apagada é pública sem sessão", () => {
  assert.equal(isPublic("/conta-apagada"), true)
})

test("o convite de familiar é exato: a subrota não é pública", () => {
  assert.equal(isPublic("/convite"), true)
  assert.equal(isPublic("/convite/"), true)
  assert.equal(isPublic("/convite/ABCD1234"), false)
})

test("a Ajuda é pública: quem não consegue entrar precisa das respostas", () => {
  assert.equal(isPublic("/ajuda"), true)
  assert.equal(
    entradasPublicas().some((entrada) => entrada.caminho === "/ajuda"),
    true,
  )
})

test("a Ajuda mora fora do grupo que exige sessão", () => {
  // O grupo (shell) tem o portão de sessão no layout e na navegação: uma
  // página pública dentro dele voltaria a exigir login.
  assert.equal(existsSync(join(root, "apps", "web", "app", "(shell)", "ajuda")), false)
  assert.equal(existsSync(join(root, "apps", "web", "app", "(public)", "ajuda", "page.tsx")), true)
})

test("/api é pasta; /apiario não é público", () => {
  assert.equal(isPublic("/api"), true)
  assert.equal(isPublic("/api/qualquer"), true)
  assert.equal(isPublic("/apiario"), false)
})

test("/landing é espaço de assets: exato e barra final fechados", () => {
  assert.equal(isPublic("/landing/hero-bivaque-arrival.webp"), true)
  assert.equal(isPublic("/landing"), false)
  assert.equal(isPublic("/landing/"), false)
  assert.equal(isPublic("/landingx"), false)
})

test("entradas exatas não abrem o vizinho de prefixo", () => {
  assert.equal(isPublic("/login"), true)
  assert.equal(isPublic("/loginx"), false)
  assert.equal(isPublic("/prestador-convite/abc"), true)
  assert.equal(isPublic("/prestador-convitex"), false)
  assert.equal(isPublic("/auth/callback-error"), true)
  assert.equal(isPublic("/auth/callback-falso"), false)
})

test("/auth/confirmar-email continua no portão, não na lista pública", () => {
  assert.doesNotMatch(superficie, /"\/auth\/confirmar-email"/)
  assert.equal(isPublic("/auth/confirmar-email"), false)
})

test("o redirect exato /landing → / continua no next.config.ts", () => {
  const bloco = /\{\s*source: "\/landing",\s*destination: "\/",\s*permanent: false\s*\}/.exec(
    nextConfig,
  )
  assert.ok(
    bloco,
    "next.config.ts precisa manter { source: /landing, destination: /, permanent: false }",
  )
})

test("a superfície cita o ADR do proxy", () => {
  assert.match(superficie, /ADR-20261110-superficie-publica-do-proxy/)
})
