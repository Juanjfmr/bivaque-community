import { readdirSync, readFileSync, statSync } from "node:fs"
import { join, relative, sep } from "node:path"
import { describe, expect, it } from "vitest"

// A regra da auditoria de 26/10 (S01 e S02): o app compõe as bases do shadcn em
// `components/ui`, e nenhuma composição de domínio monta Radix ou cmdk direto.
// O teste é de contrato, sem DOM: ele garante o consumo real das peças que a
// auditoria mandou reaproveitar, e denuncia a volta do padrão antigo.

const RAIZ = join(import.meta.dirname, "..")
const PASTAS = ["components", "src", "lib"] as const
const SEPARADOR = sep

function arquivosDeCodigo(): string[] {
  const encontrados: string[] = []
  const visitar = (pasta: string) => {
    for (const nome of readdirSync(pasta)) {
      const caminho = join(pasta, nome)
      if (statSync(caminho).isDirectory()) {
        visitar(caminho)
        continue
      }
      if (caminho.endsWith(".ts") || caminho.endsWith(".tsx")) encontrados.push(caminho)
    }
  }
  for (const pasta of PASTAS) visitar(join(RAIZ, pasta))
  return encontrados
}

const ARQUIVOS = arquivosDeCodigo()
const BASE_DO_UI = `${SEPARADOR}components${SEPARADOR}ui${SEPARADOR}`

function importaDireto(arquivo: string, pacote: string): boolean {
  return new RegExp(`from "${pacote}"`).test(readFileSync(arquivo, "utf8"))
}

describe("Base shadcn — nenhuma composição importa Radix direto (S01)", () => {
  it("fora de components/ui, o Radix não é importado", () => {
    const infratores = ARQUIVOS.filter((arquivo) => !arquivo.includes(BASE_DO_UI))
      .filter((arquivo) => importaDireto(arquivo, "radix-ui"))
      .map((arquivo) => relative(RAIZ, arquivo))
    expect(infratores).toEqual([])
  })

  it("fora de components/ui, o cmdk não é importado (o Command é a peça)", () => {
    const infratores = ARQUIVOS.filter((arquivo) => !arquivo.includes(BASE_DO_UI))
      .filter((arquivo) => importaDireto(arquivo, "cmdk"))
      .map((arquivo) => relative(RAIZ, arquivo))
    expect(infratores).toEqual([])
  })
})

describe("Base shadcn — o equivalente existe e tem consumidor real", () => {
  const CASOS = [
    {
      base: "components/ui/dropdown-menu.tsx",
      consumidor: "components/bivaque/menu-de-linha.tsx",
    },
    {
      base: "components/ui/alert-dialog.tsx",
      consumidor: "components/bivaque/confirmacao.tsx",
    },
    {
      base: "components/ui/command.tsx",
      consumidor: "src/casca/Paleta.tsx",
    },
    {
      base: "components/ui/dialog.tsx",
      consumidor: "components/bivaque/sobreposicao.tsx",
    },
    {
      base: "components/ui/dialog.tsx",
      consumidor: "src/casca/MenuCriar.tsx",
    },
  ] as const

  it("todo consumidor declarado compõe a base, não uma cópia local", () => {
    for (const caso of CASOS) {
      const alias = caso.base.replace(/^components/, "@/components").replace(/\.tsx$/, "")
      const consumidor = readFileSync(join(RAIZ, caso.consumidor), "utf8")
      expect(consumidor, caso.consumidor).toContain(`from "${alias}"`)
    }
  })

  it("as seis peças da base usadas pelas telas continuam existindo", () => {
    for (const nome of [
      "alert-dialog",
      "badge",
      "button",
      "dialog",
      "dropdown-menu",
      "skeleton",
      "textarea",
      "toggle-group",
    ]) {
      expect(statSync(join(RAIZ, "components", "ui", `${nome}.tsx`)).isFile(), nome).toBe(true)
    }
  })
})
