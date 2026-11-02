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
import { MaterialConfirmDialog } from "web/app/components/material/confirm-dialog"
import { valueToRestore } from "web/app/components/material/controlled-value"
import {
  passwordFieldType,
  passwordToggleIcon,
  passwordToggleLabel,
} from "web/app/components/material/password-toggle"
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

describe("campo de texto outlined", () => {
  const file = source("outlined-text-field.tsx")

  it("leva valor, rótulo, tipo, apoio e erro para os atributos do Material", () => {
    expect(file).toContain("value={value}")
    expect(file).toContain("label={label}")
    expect(file).toContain("type={type}")
    expect(file).toContain("inputmode={inputmode}")
    expect(file).toContain("autocomplete={autocomplete}")
    expect(file).toContain("supporting-text={supportingText}")
    expect(file).toContain("error-text={errorText}")
    expect(file).toContain("required={required}")
    expect(file).toContain("readonly={readOnly}")
  })

  it("entrega o valor digitado pelo evento input do Material", () => {
    // O Material reemite o `input` do shadow root; o adaptador escuta isso e
    // converte para a API do React com o valor já atualizado.
    expect(file).toContain('element.addEventListener("input", handleInput)')
    expect(file).toMatch(/onChange\?\.\(element\.value\)/)
  })

  it("escreve o valor controlado depois do registro", () => {
    // Antes do registro, `value` não é acessor: escrever criaria uma
    // propriedade própria que passaria por cima do Material para sempre.
    expect(file).toMatch(/registerOutlinedTextField\(\)\.then/)
    expect(file).toContain("element.value = restore")
  })
})

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

  it("os adaptadores controlados usam a mesma decisão a cada render e após o evento", () => {
    for (const file of ["outlined-text-field.tsx", "outlined-select.tsx"]) {
      const content = source(file)
      expect(content).toContain('from "./controlled-value"')
      expect(content).toContain("valueToRestore(")
      // O efeito sem lista de dependências roda a cada render; o microtask cobre
      // a recusa que não gera estado novo.
      expect(content).toMatch(/useEffect\(\(\) => \{\s+syncValue\(\)\s+\}\)/)
      expect(content).toContain("queueMicrotask(syncValue)")
    }

    const checkbox = source("checkbox.tsx")
    expect(checkbox).toContain('from "./controlled-value"')
    expect(checkbox).toContain("valueToRestore(")
    expect(checkbox).toMatch(/useEffect\(\(\) => \{\s+syncChecked\(\)\s+\}\)/)
    expect(checkbox).toContain("queueMicrotask(syncChecked)")
  })
})

describe("campo de senha", () => {
  it("mostra e esconde trocando tipo, rótulo e glifo", () => {
    expect(passwordFieldType(false)).toBe("password")
    expect(passwordFieldType(true)).toBe("text")
    expect(passwordToggleLabel(false)).toBe("Mostrar senha")
    expect(passwordToggleLabel(true)).toBe("Esconder senha")
    expect(passwordToggleIcon(false)).toBe("visibility")
    expect(passwordToggleIcon(true)).toBe("visibility_off")
  })

  it("monta o botão no slot trailing-icon e alterna o estado", () => {
    const file = source("password-field.tsx")

    expect(file).toContain('slot="trailing-icon"')
    expect(file).toContain("label={passwordToggleLabel(visible)}")
    expect(file).toContain("name={passwordToggleIcon(visible)}")
    expect(file).toContain("type={passwordFieldType(visible)}")
    expect(file).toMatch(/setVisible\(\(current\) => !current\)/)
    // Os dois módulos são deste componente: um campo de senha sozinho não pode
    // depender da ordem de montagem de outro adaptador.
    expect(file).toContain("registerOutlinedTextField()")
    expect(file).toContain("registerIconButton()")
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

describe("seleção outlined", () => {
  it("monta md-select-option com o texto no slot headline", () => {
    const file = source("outlined-select.tsx")

    expect(file).toContain("<md-select-option")
    expect(file).toContain('<div slot="headline">{option.label}</div>')
    expect(file).toContain("selected={option.value === value}")
    expect(file).toContain('element.addEventListener("change", handleChange)')
    expect(file).toMatch(/onChange\?\.\(element\.value\)/)
    expect(file).toContain("element.value = restore")
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

describe("diálogo de confirmação", () => {
  const file = source("confirm-dialog.tsx")

  it("tem título, texto, cancelar e a ação", () => {
    expect(file).toContain('<div slot="headline">{title}</div>')
    expect(file).toContain('<div slot="content">{text}</div>')
    expect(file).toContain('cancelLabel = "Cancelar"')
    expect(file).toContain("{confirmLabel}")
  })

  it("guarda o foco de retorno e trata o fechamento por Esc", () => {
    expect(file).toContain("document.activeElement")
    expect(file).toContain('element.addEventListener("closed", handleClosed)')
    expect(file).toContain("target.focus({ preventScroll: true })")
    // Esc/clique fora fecham sem escolha: quem chamou precisa saber para não
    // ficar com `open` preso em true.
    expect(file).toMatch(/if \(settled\.current\) return\s+settled\.current = true\s+onCancel\(\)/)
  })

  it("não entrega conteúdo no HTML do servidor com o diálogo fechado", () => {
    // Sem o registro, `md-dialog` é elemento desconhecido e o conteúdo do light
    // DOM aparecia como HTML comum na página.
    const html = renderToStaticMarkup(
      createElement(MaterialConfirmDialog, {
        confirmLabel: "Sair",
        onCancel: () => undefined,
        onConfirm: () => undefined,
        open: false,
        text: "Você vai sair da conta.",
        title: "Sair da conta?",
      }),
    )

    expect(html).toContain("<md-dialog")
    expect(html).not.toContain("Sair da conta?")
    expect(html).not.toContain("Você vai sair da conta.")
    expect(html).not.toContain("Cancelar")
    expect(html).not.toContain("Confirmar")
  })

  it("só abre depois do registro, para o diálogo já ter slots preenchidos", () => {
    // `ready` separa o HTML do servidor do momento em que o `md-dialog` existe:
    // mostrar antes abriria uma caixa vazia e o conteúdo chegaria depois.
    expect(file).toContain("const [ready, setReady] = useState(false)")
    expect(file).toMatch(/registerDialog\(\)\.then\(\(\) => \{\s+if \(active\) setReady\(true\)/)
    expect(file).toMatch(/if \(!element \|\| !ready\) return/)
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
      "registerOutlinedTextField",
      "registerCheckbox",
      "registerOutlinedSelect",
      "registerDialog",
    ]) {
      expect(registry).toContain(`export function ${name}(`)
    }
  })

  it("importa cada módulo do Material uma vez, e só o que o componente usa", () => {
    const modules = [...registry.matchAll(/import\("@material\/web\/([^"]+)"\)/g)].map(
      (match) => match[1],
    )

    expect(new Set(modules).size).toBe(modules.length)
    expect(modules).toContain("textfield/outlined-text-field.js")
    expect(modules).toContain("select/outlined-select.js")
    expect(modules).toContain("select/select-option.js")
    expect(modules).toContain("dialog/dialog.js")
    // O pacote inteiro no topo quebraria a renderização no servidor
    // (ADR-20261022, item 1).
    expect(registry).not.toContain('from "@material/web')
  })

  it("nenhum adaptador importa o Material no topo", () => {
    for (const file of [
      "checkbox.tsx",
      "confirm-dialog.tsx",
      "filled-button.tsx",
      "icon-button.tsx",
      "outlined-button.tsx",
      "outlined-select.tsx",
      "outlined-text-field.tsx",
      "password-field.tsx",
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
      '"md-dialog"',
      '"md-icon-button"',
      '"md-outlined-button"',
      '"md-outlined-select"',
      '"md-outlined-text-field"',
      '"md-select-option"',
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
