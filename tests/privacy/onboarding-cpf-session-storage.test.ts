import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { ONBOARDING_CPF_KEY, purgeCpfResidue } from "web/lib/onboarding/storage"

const root = join(import.meta.dirname, "..", "..")

// A chave que a entrada antiga deixava no navegador. A tela que a limpava na
// carga saiu no TROCA-005; a chave continua sendo lixo de quem já passou por
// ela, e a regra que importa — o CPF nunca mora no armazenamento do navegador —
// passou a valer para as portas que sobraram (o app e as páginas da web).
function arquivosDeFonte(pasta: string): string[] {
  const achados: string[] = []
  for (const entrada of readdirSync(join(root, pasta), {
    recursive: true,
    withFileTypes: true,
  })) {
    if (!entrada.isFile()) continue
    if (!/\.(ts|tsx)$/.test(entrada.name)) continue
    achados.push(join(entrada.parentPath, entrada.name))
  }
  return achados
}

const PORTAS = ["apps/app/src", "apps/app/lib", "apps/web/app"].flatMap(arquivosDeFonte)

describe("onboarding CPF session storage", () => {
  it("purges the residue key on boot without reading it back", () => {
    const removed: string[] = []
    purgeCpfResidue({
      removeItem: (key: string) => {
        removed.push(key)
      },
    })
    expect(removed).toEqual([ONBOARDING_CPF_KEY])
  })

  it("nenhuma porta grava o CPF no armazenamento do navegador", () => {
    const ofensores = PORTAS.filter((arquivo) => {
      const codigo = readFileSync(arquivo, "utf8")
      return /(?:sessionStorage|localStorage)\.setItem\([^)]*cpf/i.test(codigo)
    })
    expect(ofensores).toEqual([])
  })

  it("nenhuma porta lê o CPF de volta do armazenamento do navegador", () => {
    const ofensores = PORTAS.filter((arquivo) => {
      const codigo = readFileSync(arquivo, "utf8")
      return /(?:sessionStorage|localStorage)\.getItem\([^)]*cpf/i.test(codigo)
    })
    expect(ofensores).toEqual([])
  })
})
