// Renderiza a fonte HTML de uma prancha no PNG final, na geometria exata do guia.
//
// Algumas pranchas nascem de HTML versionado (`src/<id>.html`) em vez de image_gen. Para essas,
// este script é o gerador. Ele se recusa a escrever quando o navegador aplica escala
// (`devicePixelRatio` diferente de 1) ou quando o quadro não bate com o tamanho pedido: foi
// exatamente assim que uma prancha saiu com dois terços de canvas vazio — o Chrome reduziu a
// página a 2/3 para caber na janela, o PNG ficou com o conteúdo espremido no canto e o recorte
// da galeria passou a mostrar dois painéis no lugar de um.
//
// Uso:
//   node scripts/visual/render-board.mjs <board-id> [--size 2076x757]
//   node scripts/visual/render-board.mjs <board-id> --check   compara sem escrever

import { readFileSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import { chromium } from "@playwright/test"

const here = fileURLToPath(new URL(".", import.meta.url))
const repoRoot = join(here, "..", "..")
const manifestPath = join(repoRoot, "docs", "design", "visual-guide-2026-09-06", "manifest.json")

const args = process.argv.slice(2)
const boardId = args.find((a) => !a.startsWith("--"))
const sizeIndex = args.indexOf("--size")
const sizeArg = sizeIndex >= 0 ? args[sizeIndex + 1] : "2076x757"
const CHECK = args.includes("--check")

if (!boardId || !/^\d+x\d+$/.test(sizeArg)) {
  console.error("uso: node scripts/visual/render-board.mjs <board-id> [--size WxH] [--check]")
  process.exit(2)
}
const [width, height] = sizeArg.split("x").map(Number)

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"))
const artifact = manifest.artifacts.find((a) => a.id === boardId)
if (!artifact) {
  console.error(`prancha ${boardId} não está no manifesto`)
  process.exit(2)
}
if (!artifact.source?.endsWith(".html")) {
  console.error(`${boardId} não tem fonte HTML (source: ${artifact.source})`)
  process.exit(2)
}

const sourcePath = join(repoRoot, artifact.source)
const outPath = join(repoRoot, artifact.path)

const executablePath = process.env["PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH"]
const browser = await chromium.launch(executablePath ? { executablePath } : {})
const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 })
const page = await context.newPage()
await page.goto(pathToFileURL(sourcePath).href)
await page.waitForLoadState("load")

const info = await page.evaluate(() => {
  const board = document.querySelector(".board")
  const rect = board ? board.getBoundingClientRect() : null
  return {
    dpr: window.devicePixelRatio,
    board: rect ? { w: Math.round(rect.width), h: Math.round(rect.height) } : null,
  }
})

const problems = []
if (Math.abs(info.dpr - 1) > 0.001) {
  problems.push(`devicePixelRatio ${info.dpr}: o navegador aplicou escala e o PNG sairia reduzido`)
}
if (!info.board) {
  problems.push("não encontrei o elemento .board na fonte")
} else if (info.board.w !== width || info.board.h !== height) {
  problems.push(`.board mede ${info.board.w}x${info.board.h}, esperado ${width}x${height}`)
}

if (problems.length) {
  console.error("render recusado:")
  for (const problem of problems) console.error(`  - ${problem}`)
  await browser.close()
  process.exit(1)
}

const shot = await page.screenshot()
await browser.close()

if (CHECK) {
  let current = null
  try {
    current = readFileSync(outPath)
  } catch {
    console.error(`${artifact.path} não existe — rode sem --check para gerar`)
    process.exit(1)
  }
  if (!current.equals(shot)) {
    console.error(
      `${artifact.path} está desatualizado — rode node scripts/visual/render-board.mjs ${boardId}`,
    )
    process.exit(1)
  }
  console.log(`--check ok: ${artifact.path} em dia`)
} else {
  const { writeFileSync } = await import("node:fs")
  writeFileSync(outPath, shot)
  console.log(`escrito ${artifact.path} (${width}x${height}, dpr ${info.dpr})`)
}
