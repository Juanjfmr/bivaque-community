import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import test from "node:test"

const root = process.cwd()

function read(...parts) {
  return readFileSync(join(root, ...parts), "utf8")
}

// A auditoria da landing (11/11) apontou que a navegação do celular só existia
// com JS: a nav do topo é `display: none` em ≤860px e a folha do menu só abre
// pelo comportamento. A correção tem duas metades que precisam continuar juntas:
// a classe `ld-js` entra antes da primeira pintura e o CSS sem ela transforma a
// folha na última seção do documento. O papel de diálogo modal também só vale
// quando há JS para fechá-lo.
test("a landing anuncia a presença de JS antes da primeira pintura", () => {
  const landing = read("apps", "web", "app", "landing", "landing.tsx")
  assert.match(landing, /document\.documentElement\.classList\.add\('ld-js'\)/)
  assert.ok(
    landing.indexOf("classList.add('ld-js')") < landing.indexOf('className="ld-skip"'),
    "o script entra antes do conteúdo da página",
  )
})

test("sem JS a folha do menu vira seção do documento e os botões somem", () => {
  const css = read("apps", "web", "app", "landing", "landing.css")
  assert.match(css, /html:not\(\.ld-js\) \.ld-menu-btn\s*\{\s*display:\s*none/)
  assert.match(css, /html:not\(\.ld-js\) \.ld-sheet\s*\{[\s\S]*?position:\s*static/)
  assert.match(css, /html:not\(\.ld-js\) \.ld-sheet\s*\{[\s\S]*?visibility:\s*visible/)
})

test("o papel de diálogo modal só é declarado pelo comportamento", () => {
  const landing = read("apps", "web", "app", "landing", "landing.tsx")
  const behavior = read("apps", "web", "app", "landing", "landing-behavior.tsx")

  assert.doesNotMatch(landing, /<div className="ld-sheet"[^>]*role="dialog"/)
  assert.doesNotMatch(landing, /<div className="ld-sheet"[^>]*aria-modal/)
  assert.match(behavior, /sheet\.setAttribute\("role",\s*"dialog"\)/)
  assert.match(behavior, /sheet\.setAttribute\("aria-modal",\s*"true"\)/)
})

test("as capturas abaixo da dobra não competem com a hero", () => {
  const landing = read("apps", "web", "app", "landing", "landing.tsx")
  const imgTag = (name) => landing.match(new RegExp(`<img[^>]*${name}[^>]*>`))?.[0] ?? ""

  for (const name of ["app-comunidade.webp", "app-inicio.webp", "encontro.webp"]) {
    assert.match(imgTag(name), /loading="lazy"/, `${name} carrega sob demanda`)
  }
  assert.match(imgTag("hero.webp"), /fetchPriority="high"/)
  assert.doesNotMatch(imgTag("hero.webp"), /loading="lazy"/)
})
