import { mkdirSync } from "node:fs"
import { join } from "node:path"
import { expect, type Page } from "@playwright/test"

/**
 * Fotografa uma tela como prova visual, com as mesmas pré-condições em todas as
 * execuções do lote.
 *
 * Um <img> ainda em carga sai como moldura vazia e a prova mente sobre o estado
 * real; uma animação em curso corta a captura no meio. Por isso o print espera
 * as imagens decodificarem e as animações terminarem.
 *
 * Essas esperas são LIMITADAS dentro da página, e o que não resolveu é nomeado
 * no log. Sem o limite, uma animação pausada — cujo `finished` jamais resolve —
 * consome o orçamento inteiro do teste e o relatório só diz "timeout", sem dizer
 * onde: foi exatamente o que aconteceu na tela de edição, e o defeito é do
 * helper, não do produto.
 */
export async function shot(page: Page, name: string, project: string) {
  const dir = join(process.cwd(), ".visual/opencode-figma-20261005/figma002-runtime/shots")
  mkdirSync(dir, { recursive: true })
  // `complete` cobre carregado E erro — o que falha de fato já é asserido em
  // separado, com status e bytes. Imagem `loading="lazy"` fora da tela não entra:
  // o navegador ainda nem a buscou, e esperar por ela só gastaria o orçamento.
  await page
    .waitForFunction(() =>
      [...document.images].every((img) => img.complete || img.loading !== "lazy"),
    )
    .catch(() => {})
  const pending = await page.evaluate(async () => {
    const limit = (work: Promise<unknown>, ms: number): Promise<"ok" | "timeout"> =>
      Promise.race([
        work.then(() => "ok" as const),
        new Promise<"timeout">((resolve) => {
          setTimeout(() => resolve("timeout"), ms)
        }),
      ])
    const images = [...document.images]
    // `decode()` força o carregamento real antes do print: `complete` é true
    // também para imagem com erro. Fica de fora a lazy que o navegador ainda não
    // buscou — em Chromium o `decode()` dela não resolve nunca, e era exatamente
    // isso que segurava o print até o fim do orçamento do teste.
    const decodable = images.filter((img) => img.complete || img.loading !== "lazy")
    const imageResult = await limit(
      Promise.allSettled(
        decodable.map(async (img) => {
          try {
            await img.decode()
          } catch {
            /* imagem quebrada é tratada por asserção de bytes/estado */
          }
        }),
      ),
      10_000,
    )
    for (const body of document.querySelectorAll(".modal__body")) body.scrollTop = 0
    // Só animação que CORRE e tem iterações finitas tem `finished` resolvível:
    // pausada, em laço infinito ou sem duração efetiva não terminaria nunca.
    const animations = document.getAnimations()
    const finite = animations.filter((animation) => {
      const iterations = animation.effect?.getComputedTiming().iterations
      return (
        animation.playState === "running" &&
        typeof iterations === "number" &&
        iterations !== Number.POSITIVE_INFINITY
      )
    })
    const animationResult = await limit(
      Promise.allSettled(finite.map((animation) => animation.finished)),
      5_000,
    )
    return {
      imageResult,
      animationResult,
      stillLoading: images
        .filter((img) => !img.complete)
        .map((img) => `${img.alt || "(sem alt)"} [${img.loading || "?"}]`),
      withoutEnd: animations.length - finite.length,
    }
  })
  if (pending.imageResult === "timeout" || pending.animationResult === "timeout") {
    console.log(
      `SHOT-WAIT::${name}::imagens=${pending.imageResult} animacoes=${pending.animationResult} em-carga=${JSON.stringify(pending.stillLoading)} sem-fim=${pending.withoutEnd}`,
    )
  }
  await page.screenshot({ path: join(dir, `${name}--${project}.png`), fullPage: true })
  // Overflow horizontal é falha de layout, não detalhe de print.
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
}
