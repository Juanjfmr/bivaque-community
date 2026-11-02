import { readFileSync } from "node:fs"
import { join } from "node:path"
import type { KeyboardEvent } from "react"
import { describe, expect, it, vi } from "vitest"
import { submitEntryFormOnEnter } from "web/lib/auth/entry-enter"

// Revisão independente de 22/10/2026 (P2): em `/recuperar-senha` e `/nova-senha`
// o Enter no campo gerava zero envios; o clique gerava um. A regra já existia no
// login, presa a uma função local. Este arquivo prova a regra e prova que as três
// telas usam a mesma — o e2e da frente cobre o navegador.

const FIELD = { closest: (selector: string) => (selector === "md-outlined-text-field" ? {} : null) }

function keydown(options: { isComposing?: boolean; key?: string; target?: unknown }): {
  event: KeyboardEvent<HTMLFormElement>
  preventDefault: ReturnType<typeof vi.fn>
  requestSubmit: ReturnType<typeof vi.fn>
} {
  const preventDefault = vi.fn()
  const requestSubmit = vi.fn()
  const event = {
    currentTarget: { requestSubmit },
    key: options.key ?? "Enter",
    nativeEvent: { isComposing: options.isComposing ?? false },
    preventDefault,
    target: options.target ?? null,
  }
  return {
    event: event as unknown as KeyboardEvent<HTMLFormElement>,
    preventDefault,
    requestSubmit,
  }
}

describe("Enter num campo da entrada envia o formulário", () => {
  it("dentro do campo, submete uma vez", () => {
    const { event, preventDefault, requestSubmit } = keydown({ target: FIELD })
    submitEntryFormOnEnter(event)
    expect(preventDefault).toHaveBeenCalledTimes(1)
    expect(requestSubmit).toHaveBeenCalledTimes(1)
  })

  it("fora do campo, deixa o caminho nativo e não duplica o envio", () => {
    const { event, preventDefault, requestSubmit } = keydown({
      target: { closest: () => null },
    })
    submitEntryFormOnEnter(event)
    expect(preventDefault).not.toHaveBeenCalled()
    expect(requestSubmit).not.toHaveBeenCalled()
  })

  it("alvo sem ancestral (botão retargetado) não vira envio", () => {
    const { event, requestSubmit } = keydown({ target: {} })
    submitEntryFormOnEnter(event)
    expect(requestSubmit).not.toHaveBeenCalled()
  })

  it("tecla que não é Enter não envia", () => {
    const { event, requestSubmit } = keydown({ key: "Tab", target: FIELD })
    submitEntryFormOnEnter(event)
    expect(requestSubmit).not.toHaveBeenCalled()
  })

  it("composição de IME não envia: Enter ali confirma o texto", () => {
    const { event, requestSubmit } = keydown({ isComposing: true, target: FIELD })
    submitEntryFormOnEnter(event)
    expect(requestSubmit).not.toHaveBeenCalled()
  })
})

const read = (...segments: string[]) => readFileSync(join(process.cwd(), ...segments), "utf8")

const signIn = read("apps", "web", "app", "(preauth)", "login", "components", "bivaque-sign-in.tsx")
const recover = read("apps", "web", "app", "(preauth)", "recuperar-senha", "page.tsx")
const newPassword = read("apps", "web", "app", "(preauth)", "nova-senha", "page.tsx")

describe("as três telas usam a mesma regra", () => {
  it("login, recuperação e senha nova ligam o mesmo tratador", () => {
    for (const screen of [signIn, recover, newPassword]) {
      expect(screen).toContain("onKeyDown={submitEntryFormOnEnter}")
      expect(screen).toContain('lib/auth/entry-enter"')
    }
  })

  it("a cópia local do login não voltou", () => {
    expect(signIn).not.toContain("const handleEnter")
    expect(signIn).not.toContain('closest("md-outlined-text-field")')
  })
})
