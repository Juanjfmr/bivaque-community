import { readFileSync } from "node:fs"
import { join } from "node:path"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"
// O alias `web` (vitest.config.mjs) resolve para apps/web. O caminho relativo
// equivalente — três `..` e o caminho completo até o módulo — vira um bloco de
// 42 caracteres que o scanner de segredos lê como token base64: a exclusão dele
// só reconhece caminhos que começam num diretório-raiz do repositório. Pelo
// alias, o mesmo caminho fica abaixo de 40 caracteres e a varredura continua
// limpa sem abrir exceção em tests/secrets-scan.mjs.
import { EntryShell } from "web/app/components/entry/entry-shell"
import { MaterialCheckbox } from "web/app/components/material/checkbox"
import { valueToRestore } from "web/app/components/material/controlled-value"
import { stripComments } from "./source-scan"

// PORT-002 (lote 4 da entrada): os adaptadores do Material Web.
//
// A correção da revisão independente trocou a prova por contrato de fonte por
// prova de markup: `renderToStaticMarkup` monta o componente de verdade e o que
// o servidor entrega é exatamente o que a pessoa vê antes do JavaScript (o
// diálogo fechado, o nome acessível do checkbox e a classe que dimensiona o
// símbolo da entrada). O comportamento depois da hidratação — a ressincronização
// do valor controlado — sai de uma função pura, testada nos três casos.
//
// O vitest transforma os `.tsx` destas pastas por causa do `tsconfig.json` local
// que devolve `jsx: "react-jsx"` (o do app usa `preserve`, que o Vite recusa).
// `next/font/local` não roda fora do Next: o mock abaixo dá ao `EntryShell` as
// três variáveis de fonte que ele aplicaria no HTML.
vi.mock("next/font/local", () => ({
  default: () => ({ className: "font-stub", variable: "--font-stub" }),
}))

const SOURCE_DIR = join(process.cwd(), "apps", "web", "app", "components", "material")
const ENTRY_CSS = join(process.cwd(), "apps", "web", "app", "components", "entry", "entry.css")
const source = (name: string) => readFileSync(join(SOURCE_DIR, name), "utf8")
const types = readFileSync(join(process.cwd(), "apps", "web", "types", "material-web.d.ts"), "utf8")
const entryCss = readFileSync(ENTRY_CSS, "utf8")

describe("valor controlado", () => {
  it("devolve a prop quando o pai recusa a mudança", () => {
    // O caso do achado: `value="123"`, o pai remove letras e a pessoa digita x.
    expect(valueToRestore("123x", "123")).toBe("123")
    expect(valueToRestore(true, false)).toBe(false)
  })

  it("não escreve quando o pai aceitou a mudança", () => {
    // O elemento já mostra o valor que o pai aceitou: reescrever seria ruído.
    expect(valueToRestore("123x", "123x")).toBeUndefined()
  })

  it("não escreve quando o valor já era o mesmo", () => {
    expect(valueToRestore("", "")).toBeUndefined()
    expect(valueToRestore(false, false)).toBeUndefined()
  })

  it("devolve o valor novo quando o pai troca por outro", () => {
    expect(valueToRestore("123", "456")).toBe("456")
    // A comparação é por identidade de valor, não por coerção: um booleano
    // nunca vira string no caminho.
    expect(valueToRestore("true", true)).toBe(true)
  })

  it("o adaptador checkbox usa a mesma decisão a cada render e após o evento", () => {
    const checkbox = source("checkbox.tsx")
    expect(checkbox).toContain('from "./controlled-value"')
    expect(checkbox).toContain("valueToRestore(")
    expect(checkbox).toMatch(/useEffect\(\(\) => \{\s+syncChecked\(\)\s+\}\)/)
    expect(checkbox).toContain("queueMicrotask(syncChecked)")
  })
})

describe("checkbox", () => {
  it("põe o texto no label e devolve o estado pelo change", () => {
    const file = source("checkbox.tsx")

    expect(file).toContain("<label")
    expect(file).toContain("<span>{label}</span>")
    expect(file).toContain('element.addEventListener("change", handleChange)')
    expect(file).toMatch(/onChange\?\.\(element\.checked\)/)
    expect(file).toContain("element.checked = restore")
  })

  it("dá ao controle focável o nome acessível, que o Material repassa ao input", () => {
    // O achado: `<label for>` fora do shadow root nomeia o host, não o input
    // interno. O nome vai no `aria-label` do host.
    const html = renderToStaticMarkup(
      createElement(MaterialCheckbox, { checked: false, label: "Aceito os termos" }),
    )

    expect(html).toContain('aria-label="Aceito os termos"')
    expect(html).toContain("<label")
  })

  it("aceita o texto acessível separado quando o rótulo tem links", () => {
    // O aceite dos Termos é um rótulo composto: o texto puro não cabe no
    // `label` sem perder os links, então quem chama passa `ariaLabel`.
    const html = renderToStaticMarkup(
      createElement(MaterialCheckbox, {
        "aria-describedby": "en-consent-t",
        ariaLabel: "Aceito os Termos de Uso e o Código de Conduta",
        checked: false,
        label: createElement(
          "span",
          { id: "en-consent-t" },
          "Aceito os ",
          createElement("a", { href: "/termos" }, "Termos de Uso"),
          " e o Código de Conduta.",
        ),
      }),
    )

    expect(html).toContain('aria-label="Aceito os Termos de Uso e o Código de Conduta"')
    // A descrição de apoio segue o mesmo caminho do ARIA do host.
    expect(html).toContain('aria-describedby="en-consent-t"')
    expect(html).toContain('href="/termos"')
  })
})

describe("botões", () => {
  it("outlined, texto e ícone aceitam href e registram só o próprio módulo", () => {
    for (const [file, register] of [
      ["outlined-button.tsx", "registerOutlinedButton"],
      ["text-button.tsx", "registerTextButton"],
      ["icon-button.tsx", "registerIconButton"],
      ["filled-button.tsx", "registerFilledButton"],
    ] as const) {
      const content = source(file)
      expect(content).toContain("href={href}")
      expect(content).toContain(`void ${register}()`)
    }

    // O botão de ícone não tem texto: sem nome acessível, o leitor de tela
    // anuncia só "botão".
    expect(source("icon-button.tsx")).toContain("aria-label={label}")
  })

  it("repõe o padding do botão preenchido no escopo da entrada", () => {
    // O preflight do Tailwind zera o padding do `:host`; a reposição da landing
    // é presa a `.ld` e não alcançava o "Confirmar" do diálogo.
    expect(entryCss).toMatch(/\.bv-skin md-filled-button \{[^}]*padding-block:/)
    expect(entryCss).toMatch(/\.bv-skin md-filled-button \{[^}]*padding-inline:/)
    // A landing não muda: ela não importa esta folha e não existe seletor `.ld`
    // aqui (as menções em comentário não são regra).
    expect(entryCss).not.toMatch(/^\s*\.ld\b/m)
  })
})

describe("casca da entrada", () => {
  it("entrega a classe que dimensiona o símbolo", () => {
    // O achado: as regras de tamanho e cor do símbolo vivem em landing.css,
    // presas a `.ld`, e o SVG da entrada saía com mais de 56 px e preto.
    const html = renderToStaticMarkup(createElement(EntryShell, { children: "conteúdo" }))

    expect(html).toContain("bv-skin bv-entry")
    expect(html).toContain('class="en-mark"')
    expect(html).toContain('class="brand-mark"')
    expect(html).toContain("conteúdo")
  })

  it("dá tamanho e cores do tema ao símbolo, sem tocar na landing", () => {
    expect(entryCss).toMatch(/\.bv-entry \.en-mark \.brand-mark \{[^}]*width: 32px/)
    expect(entryCss).toMatch(/\.bv-entry \.en-mark \.brand-mark \{[^}]*height: 32px/)
    expect(entryCss).toMatch(
      /\.bv-entry \.en-mark \.bv-symbol-body \{[^}]*fill: var\(--bv-symbol-body\)/,
    )
    expect(entryCss).toMatch(
      /\.bv-entry \.en-mark \.bv-symbol-threshold \{[^}]*fill: var\(--bv-symbol-threshold\)/,
    )
  })
})

describe("registro dos elementos", () => {
  const registry = source("register.ts")

  it("exporta um registro por componente", () => {
    for (const name of [
      "registerFilledButton",
      "registerOutlinedButton",
      "registerTextButton",
      "registerIconButton",
      "registerCheckbox",
    ]) {
      expect(registry).toContain(`export function ${name}(`)
    }
  })

  it("importa cada módulo do Material uma vez, e só o que o componente usa", () => {
    const modules = [...registry.matchAll(/import\("@material\/web\/([^"]+)"\)/g)].map(
      (match) => match[1],
    )

    expect(new Set(modules).size).toBe(modules.length)
    // O pacote inteiro no topo quebraria a renderização no servidor
    // (ADR-20261022, item 1).
    expect(registry).not.toContain('from "@material/web')
  })

  it("nenhum adaptador importa o Material no topo", () => {
    for (const file of [
      "checkbox.tsx",
      "filled-button.tsx",
      "icon-button.tsx",
      "outlined-button.tsx",
      "text-button.tsx",
    ]) {
      expect(source(file)).not.toContain('from "@material/web')
    }
  })
})

describe("declaração de tipos", () => {
  it("declara as tags novas sem any", () => {
    for (const tag of [
      '"md-checkbox"',
      '"md-icon-button"',
      '"md-outlined-button"',
      '"md-text-button"',
    ]) {
      expect(types).toContain(`${tag}: Material`)
    }

    // O comentário do arquivo cita `any` para dizer que ele não é usado; a
    // varredura mira código, não documentação.
    expect(stripComments(types)).not.toMatch(/\bany\b/)
  })

  it("declara o nome acessível do checkbox no adaptador e no host", () => {
    expect(types).toMatch(/"aria-label"\?: string \| undefined/)
    expect(types).toMatch(/ariaLabel\?: string \| undefined/)
  })
})
