import { readdirSync, readFileSync, statSync } from "node:fs"
import { join, relative } from "node:path"
import { describe, expect, it } from "vitest"

// ADR-20261118-brasa-so-no-criar: a Brasa é só do começar a criar (FAB e
// Criar da barra, peças da casca pintadas em CSS — styles.css e pecas.css —,
// fora desta varredura). Toda ação de concluir é ardósia (--acao); seleção é
// tinta. O teste varre src e components e falha em qualquer outro uso da
// variante `brasa` ou de pintura em Brasa.
//
// O que NÃO conta como uso: a definição da variante no cva (ui/button.tsx), os
// nomes nos tipos do alert-dialog e as MENÇÕES em texto e comentário — a
// galeria e os comentários DIZEM a regra, não a usam.

const RAIZ = join(import.meta.dirname, "..")

/** Padrões que configuram um uso de Brasa: variante escolhida ou pintura. */
const USO = [
  /variant\s*=\s*[^>\n]*["']brasa["']/,
  /:\s*["']brasa["']/,
  /bg-\(--brasa\)|text-\(--brasa-foreground\)|ring-\(--brasa\)|var\(--brasa\)/,
]

/**
 * As únicas pinturas em Brasa que sobram, cada uma com o porquê. Fora desta
 * lista, qualquer linha que um padrão de USO alcançar reprova o lote.
 *
 * Badges de estado (contador da barra, marca de não lido) NÃO moram aqui: são
 * tinta (ADR-20261118 sem ressalvas; revisão cega D10 e a nota do F10 — o selo
 * laranja competia com o Criar).
 */
const PERMITIDAS: ReadonlyArray<{
  readonly arquivo: string
  readonly padrao: RegExp
  readonly porque: string
}> = [
  {
    arquivo: "components/ui/button.tsx",
    padrao: /^\s*"bg-\(--brasa\)/,
    porque: "definição da variante no cva — nenhum uso a chama; o botão preenchido é ardósia",
  },
  {
    arquivo: "components/bivaque/marca.tsx",
    padrao: /fill="var\(--brasa\)"/,
    porque: "o traço da marca no logotipo, não uma ação",
  },
  {
    arquivo: "src/galeria/mercado/ecomcn/filter-sheet.tsx",
    padrao: /bg-\(--brasa\) text-\(--brasa-foreground\)/,
    porque: "laboratório de prova do Mercado, só no servidor de desenvolvimento",
  },
]

function arquivos(pasta: string): string[] {
  return readdirSync(pasta).flatMap((nome) => {
    const caminho = join(pasta, nome)
    if (statSync(caminho).isDirectory()) return arquivos(caminho)
    return /\.tsx?$/.test(nome) ? [caminho] : []
  })
}

function linhasComBrasa(caminho: string): string[] {
  return readFileSync(caminho, "utf8")
    .split(/\r?\n/)
    .filter((linha) => USO.some((padrao) => padrao.test(linha)))
}

describe("brasa só no Criar (ADR-20261118)", () => {
  it("nenhum arquivo de src ou components usa a variante brasa fora da lista permitida", () => {
    const violacoes: string[] = []
    for (const caminho of ["src", "components"].flatMap((pasta) => arquivos(join(RAIZ, pasta)))) {
      const arquivo = relative(RAIZ, caminho).replaceAll("\\", "/")
      const linhas = linhasComBrasa(caminho)
      if (linhas.length === 0) continue
      const permissao = PERMITIDAS.find((item) => item.arquivo === arquivo)
      if (permissao === undefined) {
        violacoes.push(`${arquivo}: sem permissão — ${linhas[0]?.trim()}`)
        continue
      }
      const foraDaPermissao = linhas.filter((linha) => !permissao.padrao.test(linha))
      if (foraDaPermissao.length > 0) violacoes.push(`${arquivo}: ${foraDaPermissao[0]?.trim()}`)
    }
    expect(violacoes, "usos de Brasa fora do Criar").toEqual([])
  })

  it("a varredura pega os padrões antigos", () => {
    expect(USO.some((padrao) => padrao.test('<Button variant="brasa">'))).toBe(true)
    expect(USO.some((padrao) => padrao.test('preenchido: "brasa"'))).toBe(true)
    expect(USO.some((padrao) => padrao.test('variant={perigo ? "destructive" : "brasa"}'))).toBe(
      true,
    )
    expect(
      USO.some((padrao) => padrao.test('className="bg-(--brasa) text-(--brasa-foreground)"')),
    ).toBe(true)
    // Menção não é uso: a galeria diz a regra em texto.
    expect(USO.some((padrao) => padrao.test('regra="Brasa só no começar a criar."'))).toBe(false)
  })

  it("o botão preenchido do app conclui em ardósia", () => {
    const botao = readFileSync(join(RAIZ, "components", "bivaque", "botao.tsx"), "utf8")
    expect(botao).toContain('preenchido: "default"')
    expect(botao).toContain("bg-(--acao) text-(--acao-foreground)")
  })
})
