import { expect, go, KEY, reload, runProof, settle, snapshot } from "./proof-harness.mjs"

// Rodada 29: compartilhar anúncio ou negócio abre uma folha com o cartão desenhado no aparelho,
// pronto para WhatsApp. "Compartilhar com imagem" manda imagem e link, "Baixar imagem" salva o
// PNG e "Compartilhar link" segue o fluxo antigo. Outros conteúdos continuam só com link.
async function withShare(page, canShareFiles) {
  await page.addInitScript((files) => {
    window.__shares = []
    Object.defineProperty(navigator, "canShare", {
      configurable: true,
      value: files ? () => true : undefined,
    })
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: files
        ? async (data) => {
            window.__shares.push({
              text: data.text,
              files: (data.files || []).map((f) => [f.name, f.type, f.size]),
            })
          }
        : undefined,
    })
  }, canShareFiles)
  await reload(page)
}
async function openSheet(page, hash) {
  await snapshot(page)
  await go(page, hash)
  await page.locator(`#detail-actions [data-action="share"]`).click()
  await page.waitForFunction(() => document.querySelector("#share-preview img")?.complete)
  await settle(page)
}
const preview = (page) => page.locator("#share-preview img")

const checkpoints = {
  async "listing-sheet-shows-card"(page) {
    await openSheet(page, "anuncio/i2")
    const size = await preview(page).evaluate((i) => [i.naturalWidth, i.naturalHeight])
    expect(size.join() === "1080,1350", `cartão com tamanho errado: ${size}`)
    const alt = await preview(page).getAttribute("alt")
    expect(
      /Apartamento 3 quartos/.test(alt) && /R\$\s?3\.200/.test(alt) && /Ponta Negra/.test(alt),
      `descrição do cartão: ${alt}`,
    )
  },
  async "business-sheet-shows-recommendations"(page) {
    await openSheet(page, "negocio/b4")
    expect(
      /indicações/.test(await preview(page).getAttribute("alt")),
      "cartão do negócio sem indicações",
    )
  },
  async "share-with-image-sends-file-and-link"(page) {
    await snapshot(page)
    await withShare(page, true)
    await openSheet(page, "anuncio/i2")
    await page.locator('#dialog [data-action="share-image"]').click()
    await settle(page)
    const [shared] = await page.evaluate(() => window.__shares)
    expect(
      shared?.files?.[0]?.[0] === "bivaque-anuncio-i2.png" &&
        shared.files[0][1] === "image/png" &&
        shared.files[0][2] > 10000,
      `arquivo: ${JSON.stringify(shared)}`,
    )
    expect(/#anuncio\/i2\?cidade=Manaus/.test(shared.text), `texto sem o link: ${shared.text}`)
  },
  async "without-file-sharing-the-image-button-hides"(page) {
    await snapshot(page)
    await withShare(page, false)
    await openSheet(page, "anuncio/i2")
    expect(
      await page
        .locator('#dialog [data-action="share-image"]')
        .evaluate((b) => getComputedStyle(b).display === "none"),
      "botão de imagem aparece onde o aparelho não compartilha arquivos",
    )
    expect(
      await page.locator('#dialog [data-action="share-download"]').isVisible(),
      "sem Baixar imagem",
    )
  },
  async "download-saves-png"(page) {
    await openSheet(page, "anuncio/i1")
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.locator('#dialog [data-action="share-download"]').click(),
    ])
    expect(
      download.suggestedFilename() === "bivaque-anuncio-i1.png",
      `nome: ${download.suggestedFilename()}`,
    )
  },
  async "events-keep-link-sharing"(page) {
    await snapshot(page)
    const id = await page.evaluate(
      () => JSON.parse(localStorage.getItem("bivaque-material-web-v3")).events[0].id,
    )
    await go(page, `evento/${id}`)
    await page.locator('#detail-actions [data-action="share"]').click()
    await settle(page)
    expect(!(await page.locator("#share-preview").count()), "encontro abriu o cartão")
  },
  // Revisão do lote C: foto em retrato não invade a faixa do texto.
  async "tall-photo-stays-in-its-band"(page) {
    await snapshot(page)
    await page.evaluate((k) => {
      const c = document.createElement("canvas")
      c.width = 200
      c.height = 600
      const g = c.getContext("2d")
      g.fillStyle = "#ff0000"
      g.fillRect(0, 0, 200, 600)
      const x = JSON.parse(localStorage.getItem(k))
      x.items.find((i) => i.id === "i2").photos = [c.toDataURL("image/png")]
      localStorage.setItem(k, JSON.stringify(x))
    }, KEY)
    await reload(page)
    await openSheet(page, "anuncio/i2")
    const [top, text] = await preview(page).evaluate((img) => {
      const c = document.createElement("canvas")
      c.width = img.naturalWidth
      c.height = img.naturalHeight
      const g = c.getContext("2d")
      g.drawImage(img, 0, 0)
      return [g.getImageData(540, 360, 1, 1).data, g.getImageData(1000, 1000, 1, 1).data].map(
        (d) => [...d.slice(0, 3)],
      )
    })
    expect(top.join() === "255,0,0", `foto fora da faixa de cima: ${top}`)
    expect(text.join() !== "255,0,0", `foto invadiu o texto: ${text}`)
  },
  // Revisão do lote C: o segundo cartão não baixa o arquivo do primeiro.
  async "second-card-never-downloads-the-first"(page) {
    await openSheet(page, "anuncio/i1")
    await page.keyboard.press("Escape")
    await settle(page)
    const names = []
    page.on("download", (d) => names.push(d.suggestedFilename()))
    await go(page, "anuncio/i2")
    await page.locator('#detail-actions [data-action="share"]').click()
    await page.locator('#dialog [data-action="share-download"]').click()
    await page.waitForFunction(() => document.querySelector("#share-preview img")?.complete)
    await settle(page)
    expect(!names.includes("bivaque-anuncio-i1.png"), `baixou o cartão anterior: ${names}`)
  },
}

await runProof(checkpoints, "round29")
