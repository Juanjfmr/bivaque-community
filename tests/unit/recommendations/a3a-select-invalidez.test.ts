import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { stripComments } from "../ui/source-scan"

// A3a (acessibilidade, reparo r3): o `aria-invalid` cru NÃO chega ao DOM do
// Select do HeroUI — o componente engole o atributo arbitrário em qualquer
// nível (raiz e Trigger) e expõe a própria API de invalidez. Medido em
// `c85a833`/`verify-a3-raiz.spec.ts`: `selectInvalido: 0`,
// `triggerOutline: { w: "0px", s: "none" }`.
//
// A consequência não era só o ARIA ausente: o CSS da própria biblioteca pinta a
// borda de perigo por `.select[data-invalid="true"] .select__trigger`, então o
// seletor nunca casava e o campo infrator ficava sem a borda que a biblioteca já
// oferecia. A correção é usar `isInvalid` — o caminho previsto — e deixar o CSS
// do HeroUI desenhar. Este teste guarda a causa, não o sintoma: nada de
// `className` sobrescrito nem `!important` no campo.

const root = join(import.meta.dirname, "..", "..", "..")
const read = (...segments: string[]) => readFileSync(join(root, ...segments), "utf8")

const page = read("apps", "web", "app", "(shell)", "recommendations", "page.tsx")
const code = stripComments(page)

// A regra do vendor que a marcação tem de fazer casar. Ancorada no pacote
// fixado do HeroUI v3 (`@heroui/styles`), que é quem desenha o campo.
const vendorSelect = join(
  root,
  "node_modules",
  "@heroui",
  "styles",
  "dist",
  "components",
  "select.css",
)

describe("A3a — invalidez do Select da categoria", () => {
  it("o Select usa a API de invalidez do componente, não o atributo inerte", () => {
    expect(code).toContain('isInvalid={requestFieldError?.field === "category"}')
    // O atributo que nunca chega ao DOM não volta como se fosse a correção.
    expect(code).not.toMatch(/aria-invalid=\{requestFieldError\?\.field === "category"\}/)
  })

  it("a borda de perigo é desenhada pelo CSS do HeroUI que a marcação faz casar", () => {
    expect(existsSync(vendorSelect), "pacote @heroui/styles ausente").toBe(true)
    const css = readFileSync(vendorSelect, "utf8")
    // O CSS do vendor é aninhado: a regra de perigo vive dentro de
    // `.select__trigger` e exige a marcação no elemento RAIZ `.select` — que é
    // exatamente onde `isInvalid` aterrissa (medido em runtime:
    // `selectDataInvalido: 1`, `triggerOutline.w: "1px"`, cor `rgb(180,35,24)`).
    expect(css).toContain('.select[data-invalid="true"] &')
    expect(css).toContain('.select[aria-invalid="true"] &')
    expect(css).toContain("status-invalid-field")
  })

  it("não mascara o sintoma: nada de className no campo nem !important", () => {
    expect(code).not.toMatch(/!important/)
    // A tela não estiliza a classe interna do vendor nem escreve `data-invalid`
    // na mão — quem marca é o componente.
    expect(code).not.toContain("select__trigger")
    expect(code).not.toContain("data-invalid")
  })

  it("os dois campos de texto mantêm o ARIA que já funcionava", () => {
    for (const field of ["title", "description"]) {
      expect(code).toContain(`aria-invalid={requestFieldError?.field === "${field}"}`)
    }
  })

  it("a mensagem inline continua tokenizada e ligada ao campo por aria-describedby", () => {
    // A mensagem já estava correta antes do reparo (STATE §38, nota positiva):
    // este reparo não a toca.
    expect(code).toContain('id="pedido-categoria-erro"')
    expect(code).toContain('"aria-describedby": "pedido-categoria-erro"')
    expect(code).toMatch(/text-\[var\(--semantic-danger\)\]/)
    expect(code).toContain('role="alert"')
  })
})
