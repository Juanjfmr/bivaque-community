import { readFileSync } from "node:fs"
import { join } from "node:path"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"
// O alias `web` (vitest.config.mjs) resolve para apps/web.
import { LandingPage } from "web/app/landing/landing"

// LANDING-CTA-ANTES-DO-REGISTRO: o defeito era o CTA ser `md-filled-button` com
// href — o `<a>` do Material só nasce quando o elemento é registrado no
// cliente, e um toque antes disso não levava a lugar nenhum. A prova aqui é o
// que o servidor entrega, antes de qualquer JavaScript: as cinco âncoras.
vi.mock("next/font/local", () => ({
  default: () => ({ className: "font-stub", variable: "--font-stub" }),
}))

const html = renderToStaticMarkup(createElement(LandingPage))
const anchors = html.match(/<a[^>]*class="ld-cta-btn"[^>]*>/g) ?? []
const landingCss = readFileSync(
  join(process.cwd(), "apps", "web", "app", "landing", "landing.css"),
  "utf8",
)
const ctaCss = landingCss.match(/\.ld \.ld-cta-btn \{([^}]*)\}/)?.[1] ?? ""

describe("CTA da landing no HTML do servidor", () => {
  it("serve os cinco Criar conta (topo, dobra, final, barra e folha) como link", () => {
    expect(anchors).toHaveLength(5)
    for (const anchor of anchors) {
      expect(anchor).toContain('href="/signup"')
      // Sem gancho de cliente: nada de onClick, nada de rota em atributo.
      expect(anchor).not.toContain("onclick")
    }
    expect(html.match(/>Criar conta</g)).toHaveLength(5)
  })

  it("não depende de md-filled-button, que só navega depois de registrado", () => {
    expect(html).not.toContain("<md-filled-button")
  })

  it("mantém o id que a ilha usa para medir a dobra", () => {
    expect(html).toMatch(/<a[^>]*id="ld-hero-cta"[^>]*href="\/signup"/)
  })
})

describe("aparência do CTA", () => {
  it("continua a do botão preenchido: Brasa, rótulo on-brasa e recorte cheio", () => {
    expect(ctaCss).toContain("background: var(--bv-brasa)")
    expect(ctaCss).toContain("color: var(--bv-on-brasa)")
    expect(ctaCss).toContain("border-radius: 9999px")
    expect(ctaCss).toContain("min-height: var(--md-filled-button-container-height)")
    expect(ctaCss).toContain("padding-inline: var(--md-filled-button-leading-space)")
  })
})
