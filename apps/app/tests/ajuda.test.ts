import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

// AJUDA-SEM-SENHA (RUN-187), achado do RUN-184. ADR-20261101-entrada-unica-por-codigo
// §2: e-mail e senha saem da tela, junto com "Esqueci minha senha". A Ajuda do app
// continuava mandando tocar num link que a entrada não tem, e a prova aqui é o
// texto da própria tela: contrato de fonte, como as demais telas de tests/unit/ui.
const fonte = readFileSync(join(import.meta.dirname, "..", "src", "telas", "Ajuda.tsx"), "utf8")

describe("Ajuda do app", () => {
  it("responde pela entrada com código no e-mail, não por senha", () => {
    expect(fonte).toContain('"Preciso de senha para entrar?"')
    expect(fonte).toContain("o Bivaque não usa senha")
    expect(fonte).toContain("Continuar com e-mail")
    expect(fonte).toContain("código de 6 números")
  })

  it("não manda tocar em Esqueci minha senha nem promete Google ou Apple", () => {
    const texto = fonte.toLowerCase()
    expect(texto).not.toContain("esqueci minha senha")
    expect(texto).not.toContain("google")
    expect(texto).not.toContain("apple")
  })
})
