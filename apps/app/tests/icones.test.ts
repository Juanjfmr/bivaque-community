import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import {
  GRUPOS_DE_ICONE,
  iconeDeDado,
  ligadura,
  NOMES_DE_ICONE,
  nomeDeIconeValido,
} from "../lib/icones"

const raiz = join(import.meta.dirname, "..", "..", "..")

function bytes(caminho: string): Buffer {
  return readFileSync(join(raiz, caminho))
}

/** Os arquivos de fonte embutidos no protótipo, por ordem do `fonts.css`. */
function fontesDoPrototipo(): Buffer[] {
  const css = readFileSync(
    join(raiz, "prototypes", "bivaque-html", "src", "styles", "fonts.css"),
    "utf8",
  )
  return css
    .split(/\r?\n/)
    .filter((linha) => linha.trim() !== "")
    .map((linha) => {
      const achado = /base64,([A-Za-z0-9+/=]+)\)/.exec(linha)
      const base64 = achado?.[1]
      if (!base64) throw new Error("linha de @font-face sem base64")
      return Buffer.from(base64, "base64")
    })
}

describe("os 100 ícones do inventário (§9)", () => {
  it("são 100, distintos, nos cinco grupos do inventário", () => {
    expect(NOMES_DE_ICONE.length).toBe(100)
    expect(new Set(NOMES_DE_ICONE).size).toBe(100)
    expect(GRUPOS_DE_ICONE["9.1"].length).toBe(17)
    expect(GRUPOS_DE_ICONE["9.2"].length).toBe(5)
    expect(GRUPOS_DE_ICONE["9.3"].length).toBe(29)
    expect(GRUPOS_DE_ICONE["9.4"].length).toBe(26)
    expect(GRUPOS_DE_ICONE["9.5"].length).toBe(23)
  })

  it("a ligadura é o próprio nome, e só nome do inventário vale", () => {
    for (const nome of NOMES_DE_ICONE) {
      expect(ligadura(nome)).toBe(nome)
      expect(nomeDeIconeValido(nome)).toBe(true)
    }
    expect(nomeDeIconeValido("procurar")).toBe(false)
    expect(nomeDeIconeValido(undefined)).toBe(false)
  })

  it("nome vindo de dado cai no mesmo conjunto, ou no ícone de reserva", () => {
    expect(iconeDeDado("badge")).toBe("badge")
    expect(iconeDeDado("nada-a-ver")).toBe("photo_camera")
    expect(iconeDeDado(null)).toBe("photo_camera")
  })
})

describe("as fontes locais são as do protótipo", () => {
  it("bate byte a byte com o base64 embutido em prototypes/…/fonts.css", () => {
    const doPrototipo = fontesDoPrototipo()
    expect(doPrototipo.length).toBe(3)
    const nomes = ["material-symbols-outlined", "noto-sans", "noto-serif"]
    nomes.forEach((nome, indice) => {
      const esperado = doPrototipo[indice]
      expect(esperado, nome).toBeDefined()
      const local = bytes(`apps/app/public/fonts/${nome}.woff2`)
      expect(local.equals(esperado as Buffer), nome).toBe(true)
      expect(local.subarray(0, 4).toString("ascii")).toBe("wOF2")
    })
  })

  it("a fonte de símbolos cobre os 100 nomes do inventário", () => {
    // A lista de glifos do subconjunto vem do arquivo que o apps/web já publica
    // — o mesmo byte a byte que o app serve. Sem isso, um nome do inventário
    // poderia não existir na fonte e desenhar nada, sem nada falhar.
    const glifos = new Set(
      readFileSync(
        join(raiz, "apps", "web", "app", "fonts", "material-symbols-outlined-subset.txt"),
        "utf8",
      )
        .split(/\s+/)
        .filter((linha) => linha !== ""),
    )
    const ausentes = NOMES_DE_ICONE.filter((nome) => !glifos.has(nome))
    expect(ausentes).toEqual([])
    expect(
      bytes("apps/app/public/fonts/material-symbols-outlined.woff2").equals(
        bytes("apps/web/app/fonts/material-symbols-outlined-subset.woff2"),
      ),
    ).toBe(true)
  })
})
