import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
// O alias `web` (vitest.config.mjs) resolve para apps/web. O caminho relativo
// equivalente — três `..` e o caminho completo até o módulo — vira um bloco de
// 42 caracteres que o scanner de segredos lê como token base64: a exclusão dele
// só reconhece caminhos que começam num diretório-raiz do repositório. Pelo
// alias, o mesmo caminho fica abaixo de 40 caracteres e a varredura continua
// limpa sem abrir exceção em tests/secrets-scan.mjs.
import {
  passwordFieldType,
  passwordToggleIcon,
  passwordToggleLabel,
} from "web/app/components/material/password-toggle"
import { stripComments } from "./source-scan"

// PORT-002 (lote 4 da entrada): os adaptadores do Material Web.
//
// O repositório prova componente por contrato de fonte nas varreduras de
// `tests/unit`, e aqui não há ambiente de DOM: o vitest não monta React com
// `jsdom` e o `jsx: "preserve"` do app impede importar um `.tsx` de
// `apps/web` no transform do teste. O que dá para provar de verdade é a regra
// pura do mostrar/esconder; o resto é o contrato escrito — que continua sendo
// útil, porque são exatamente as decisões que quebram em silêncio (o evento
// certo, a escrita do valor depois do registro, o nome acessível que muda).
//
// O comportamento em navegador do Material já é exercitado por
// `tests/e2e/landing-v8.spec.ts`, que usa o adaptador do botão preenchido.
const SOURCE_DIR = join(process.cwd(), "apps", "web", "app", "components", "material")
const source = (name: string) => readFileSync(join(SOURCE_DIR, name), "utf8")
const types = readFileSync(join(process.cwd(), "apps", "web", "types", "material-web.d.ts"), "utf8")

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
    expect(file).toContain("element.value = value")
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
    expect(file).toContain("element.checked = checked")
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
    expect(file).toContain("element.value = value")
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
})
