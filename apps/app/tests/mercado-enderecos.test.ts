import { readdirSync, readFileSync, statSync } from "node:fs"
import { join, relative } from "node:path"
import { describe, expect, it } from "vitest"

// NAV-002: o Mercado tem um endereço só (`/app/mercado`, com a aba na busca).
// Os endereços antigos continuam existindo para o roteador redirecionar, mas
// link interno não os usa: a varredura reprova qualquer navegação da interface
// para `/app/desapegos`, `/app/catalogo` ou `/app/imoveis`.
//
// A varredura cobre `src` (telas, casca, peças e jornadas). `lib` fica de fora
// porque é lá que o catálogo e o mapa de redirecionamento declaram os antigos
// de propósito.

const RAIZ = join(import.meta.dirname, "..")

/** Padrões que configuram navegação interna para um endereço antigo. */
const USO = [
  /irPara\(\s*["'](?:desapegos|catalogo|imoveis)["']/,
  /rota:\s*["'](?:desapegos|catalogo|imoveis)["']/,
  /destino:\s*["'](?:desapegos|catalogo|imoveis)["']/,
  // Navegação direta do roteador (`navegar`, `useNavigate`, `Link`): o caminho
  // com a barra e fechado logo depois do nome — `/imoveis/alertas` é outra rota.
  /to:\s*["'`]\/(?:desapegos|catalogo|imoveis)["'`]/,
]

function arquivos(pasta: string): string[] {
  return readdirSync(pasta).flatMap((nome) => {
    const caminho = join(pasta, nome)
    if (statSync(caminho).isDirectory()) return arquivos(caminho)
    return /\.tsx?$/.test(nome) ? [caminho] : []
  })
}

describe("nenhum link interno usa os endereços antigos do Mercado (NAV-002)", () => {
  it("a interface navega só para /app/mercado?aba=...", () => {
    const violacoes: string[] = []
    for (const caminho of arquivos(join(RAIZ, "src"))) {
      const linhas = readFileSync(caminho, "utf8").split(/\r?\n/)
      for (const [indice, linha] of linhas.entries()) {
        if (USO.some((padrao) => padrao.test(linha))) {
          violacoes.push(
            `${relative(RAIZ, caminho).replaceAll("\\", "/")}:${indice + 1} ${linha.trim()}`,
          )
        }
      }
    }
    expect(violacoes, "links internos para endereços antigos do Mercado").toEqual([])
  })

  it("a varredura pega os padrões antigos", () => {
    const exemplos = [
      'void navegacao.irPara("imoveis")',
      'irPara("desapegos")',
      '{ rota: "catalogo", icone: "sell", rotulo: "Desapegos" }',
      'destino: "imoveis",',
      'void navegar({ to: "/imoveis", search: alerta.busca, replace: true })',
      "to: '/catalogo',",
      "to: `/desapegos`,",
    ]
    for (const exemplo of exemplos) {
      expect(
        USO.some((padrao) => padrao.test(exemplo)),
        exemplo,
      ).toBe(true)
    }
    // O endereço novo não é violação, e a aba como dado também não.
    expect(USO.some((padrao) => padrao.test('irPara("mercado", { aba: "imoveis" })'))).toBe(false)
    expect(USO.some((padrao) => padrao.test('{ id: "imoveis", rotulo: "Imóveis" }'))).toBe(false)
    expect(USO.some((padrao) => padrao.test('to: "/mercado",'))).toBe(false)
    // `/app/imoveis/alertas` é outra rota, não o endereço antigo do Mercado.
    expect(USO.some((padrao) => padrao.test('to: "/imoveis/alertas",'))).toBe(false)
  })
})
