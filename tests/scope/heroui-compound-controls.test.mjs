import assert from "node:assert/strict"
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"
import { test } from "node:test"

// No HeroUI v3, `Radio`, `Checkbox` e `Switch` são COMPOSTOS: o componente de
// fora é o campo, e quem carrega o <input> — e portanto o papel ARIA, o clique,
// o foco e o nome acessível — é o `.Content`.
//
// Escrito sem ele, `<Radio value="x">Rótulo</Radio>` renderiza literalmente
//
//   <div data-slot="radio" class="radio">Rótulo</div>
//
// um div com texto: sem input, sem role, sem handler. O controle fica
// impossível de selecionar por mouse, teclado ou leitor de tela.
//
// Isso passou por typecheck, por lint e pelo gate inteiro, em QUATRO
// superfícies do produto ao mesmo tempo — veredito de moderação, visibilidade
// de grupo, audiência da publicação e motivo de denúncia (09/09/2026). Uma
// revisão de código lê `<Radio value="manter">Manter conteúdo</Radio>` e
// concorda. Só o navegador sabe.
//
// Este teste é a rede que faltava: barato, roda em milissegundos, e falha no
// commit em vez de na auditoria visual.

const root = join(import.meta.dirname, "..", "..")
const APP = join(root, "apps", "web", "app")

const COMPOSTOS = ["Radio", "Checkbox", "Switch"]

function arquivosTsx(dir) {
  const out = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      out.push(...arquivosTsx(full))
    } else if (entry.endsWith(".tsx")) {
      out.push(full)
    }
  }
  return out
}

test("todo controle composto do HeroUI declara o seu .Content", () => {
  // Given todo TSX da aplicação web
  const arquivos = arquivosTsx(APP)
  const faltando = []

  // When cada abertura de um composto é confrontada com o bloco que ela abre
  for (const file of arquivos) {
    const code = readFileSync(file, "utf8")
    for (const nome of COMPOSTOS) {
      // Só a abertura do componente de fora: `<Radio` seguido de espaço ou
      // quebra de linha. `<Radio.Content` e `<RadioGroup` não contam.
      const abertura = new RegExp(`<${nome}(\\s|\\n)`, "g")
      for (const match of code.matchAll(abertura)) {
        const inicio = match.index
        const fim = code.indexOf(`</${nome}>`, inicio)
        const bloco = fim === -1 ? code.slice(inicio) : code.slice(inicio, fim)
        if (!bloco.includes(`<${nome}.Content`)) {
          const linha = code.slice(0, inicio).split("\n").length
          faltando.push(`${file.slice(root.length + 1)}:${linha} — <${nome}> sem <${nome}.Content>`)
        }
      }
    }
  }

  // Then nenhum composto foi escrito como se fosse um controle simples
  assert.deepEqual(
    faltando,
    [],
    `Controle composto do HeroUI sem .Content — renderiza um <div> e não é selecionável:\n${faltando.join("\n")}`,
  )
})
