import {
  action,
  expect,
  go,
  KEY,
  reload,
  runProof,
  settle,
  snapshot,
  toast,
} from "./proof-harness.mjs"

// Rodada 18: fotos com arrastar e soltar (com capa) e galeria em tela cheia.
const png = (page) =>
  page.evaluate(() => {
    const c = document.createElement("canvas")
    c.width = c.height = 16
    const g = c.getContext("2d")
    g.fillStyle = `hsl(${Math.random() * 360},70%,50%)`
    g.fillRect(0, 0, 16, 16)
    return c.toDataURL("image/png").split(",")[1]
  })
async function dropFiles(page, files) {
  await page.evaluate((list) => {
    const dt = new DataTransfer()
    for (const f of list) {
      const bytes = Uint8Array.from(atob(f.b64), (ch) => ch.charCodeAt(0))
      dt.items.add(new File([bytes], f.name, { type: f.type }))
    }
    const box = document.querySelector(".photo-upload")
    box.dispatchEvent(
      new DragEvent("dragenter", { bubbles: true, cancelable: true, dataTransfer: dt }),
    )
    box.dispatchEvent(new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer: dt }))
  }, files)
  await page.waitForTimeout(600)
}
async function openListingEditor(page) {
  await go(page, "inicio")
  await page.locator('[data-action="create"]:visible').first().click()
  await settle(page)
  await page.locator('#create-menu [data-action="create-item"]').click()
  await settle(page)
}
const previews = (page) =>
  page.locator("#photo-previews img").evaluateAll((els) => els.map((e) => e.src))
async function openItemWithPhotos(page) {
  const s = await snapshot(page)
  const item = s.items.find((x) => x.city === s.homeCity && x.status === "active" && !x.mine)
  await page.evaluate(
    ([k, id]) => {
      const x = JSON.parse(localStorage.getItem(k))
      x.items.find((i) => i.id === id).photos = ["sofa", "apartment", "crib"]
      localStorage.setItem(k, JSON.stringify(x))
    },
    [KEY, item.id],
  )
  await reload(page)
  await go(page, `anuncio/${item.id}`)
}
const isOpen = (page) => page.evaluate(() => Boolean(document.querySelector("#lightbox")))
const count = (page) => page.locator("#lightbox-count").innerText()

const checkpoints = {
  async "drop-adds-photos-and-rejects-other-files"(page) {
    await snapshot(page)
    await openListingEditor(page)
    const b64 = await png(page)
    await dropFiles(page, [
      { name: "a.png", type: "image/png", b64 },
      { name: "nota.txt", type: "text/plain", b64: btoa("texto") },
    ])
    expect((await previews(page)).length === 1, "soltar não adicionou a foto válida")
    expect(/JPG, PNG/.test(await toast(page)), "arquivo que não é imagem sem aviso")
    expect(
      await page.evaluate(
        () => !document.querySelector(".photo-upload").classList.contains("is-drag"),
      ),
      "destaque de arrastar ficou preso",
    )
  },
  async "cover-moves-photo-to-front"(page) {
    await snapshot(page)
    await openListingEditor(page)
    await dropFiles(page, [
      { name: "a.png", type: "image/png", b64: await png(page) },
      { name: "b.png", type: "image/png", b64: await png(page) },
    ])
    const before = await previews(page)
    expect(before.length === 2, `fotos: ${before.length}`)
    expect(
      /Capa/.test(await page.locator("#photo-previews .photo-preview").first().innerText()),
      "primeira foto sem selo Capa",
    )
    await action(page, "cover-photo", "1")
    await settle(page)
    const after = await previews(page)
    expect(after[0] === before[1] && after[1] === before[0], "Tornar capa não trocou a ordem")
  },
  async "lightbox-navigation-and-close"(page) {
    await openItemWithPhotos(page)
    await page.locator('#main [data-action="lightbox"]').click()
    await settle(page)
    expect(await isOpen(page), "galeria não abriu")
    expect((await count(page)) === "1 de 3", `contador: ${await count(page)}`)
    await page.keyboard.press("ArrowRight")
    expect((await count(page)) === "2 de 3", "seta direita não avançou")
    await page.locator('#lightbox [data-lightbox="go"][data-index="2"]').click()
    expect((await count(page)) === "3 de 3", "miniatura não abriu a foto")
    await page.keyboard.press("ArrowRight")
    expect((await count(page)) === "1 de 3", "não voltou ao início")
    expect(
      await page.evaluate(
        () => document.querySelector("#main").inert && document.querySelector("#fab").inert,
      ),
      "fundo não ficou inerte",
    )
    await page.keyboard.press("Escape")
    await settle(page)
    expect(!(await isOpen(page)), "Esc não fechou a galeria")
    expect(
      await page.evaluate(
        () =>
          document.activeElement?.dataset?.action === "lightbox" &&
          !document.querySelector("#main").inert,
      ),
      "foco não voltou ao botão Ver fotos",
    )
  },
  async "lightbox-swipe-and-focus-trap"(page) {
    await openItemWithPhotos(page)
    await page.locator('#main [data-action="lightbox"]').click()
    await settle(page)
    // Rodada 40: os gestos ficam no palco da foto, onde um toque de verdade cai.
    await page.evaluate(() => {
      const el = document.querySelector("#lightbox .lightbox-stage")
      el.dispatchEvent(
        new PointerEvent("pointerdown", {
          bubbles: true,
          pointerType: "touch",
          isPrimary: true,
          clientX: 300,
          clientY: 400,
        }),
      )
      el.dispatchEvent(
        new PointerEvent("pointerup", {
          bubbles: true,
          pointerType: "touch",
          isPrimary: true,
          clientX: 150,
          clientY: 405,
        }),
      )
    })
    expect((await count(page)) === "2 de 3", "deslizar não avançou")
    for (let i = 0; i < 8; i++) await page.keyboard.press("Tab")
    expect(
      await page.evaluate(() => document.activeElement?.closest?.("#lightbox") !== null),
      "Tab saiu da galeria",
    )
  },
  async "business-single-photo-hides-arrows"(page) {
    const s = await snapshot(page)
    const biz = s.biz.find((b) => b.city === s.homeCity && b.photos?.length)
    await go(page, `negocio/${biz.id}`)
    await page.locator('#main [data-action="lightbox"]').click()
    await settle(page)
    expect(await isOpen(page), "galeria do negócio não abriu")
    expect(
      await page.evaluate(
        () =>
          document.querySelector(".lightbox-next").hidden &&
          document.querySelector(".lightbox-thumbs").hidden,
      ),
      "foto única com setas ou miniaturas",
    )
    await page.goBack()
    await settle(page)
    expect(!(await isOpen(page)), "Voltar do navegador não fechou a galeria")
  },
  async "every-icon-exists-in-embedded-font"(page) {
    await openItemWithPhotos(page)
    await page.locator('#main [data-action="lightbox"]').click()
    await settle(page)
    const wide = await page.evaluate(async () => {
      await document.fonts.ready
      const names = [
        ...new Set(
          [...document.querySelectorAll("#lightbox md-icon, .hero-zoom md-icon")].map((i) =>
            i.textContent.trim(),
          ),
        ),
      ]
      return names.filter((n) => {
        const el = document.createElement("span")
        el.style.cssText =
          "font-family:'Material Symbols Rounded';font-size:24px;position:absolute;white-space:nowrap"
        el.textContent = n
        document.body.append(el)
        const w = el.getBoundingClientRect().width
        el.remove()
        return w > 30
      })
    })
    expect(!wide.length, `ícones fora da fonte: ${wide.join(", ")}`)
  },
  async "second-drop-while-busy-respects-limit"(page) {
    await snapshot(page)
    await openListingEditor(page)
    const files = []
    for (let i = 0; i < 4; i++)
      files.push({ name: `f${i}.png`, type: "image/png", b64: await png(page) })
    await page.evaluate((list) => {
      const box = document.querySelector(".photo-upload")
      const send = () => {
        const dt = new DataTransfer()
        for (const f of list)
          dt.items.add(
            new File([Uint8Array.from(atob(f.b64), (c) => c.charCodeAt(0))], f.name, {
              type: f.type,
            }),
          )
        box.dispatchEvent(
          new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer: dt }),
        )
      }
      send()
      send()
    }, files)
    await page.waitForTimeout(1200)
    const n = (await previews(page)).length
    expect(n <= 6, `limite estourado: ${n} fotos`)
    expect(n === 4, `a segunda remessa durante o preparo entrou: ${n} fotos`)
  },
  async "drop-outside-does-not-open-file"(page) {
    await snapshot(page)
    await openListingEditor(page)
    const prevented = await page.evaluate(() => {
      const dt = new DataTransfer()
      dt.items.add(new File(["x"], "a.png", { type: "image/png" }))
      const over = new DragEvent("dragover", { bubbles: true, cancelable: true, dataTransfer: dt })
      const drop = new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer: dt })
      const target = document.querySelector("#dialog [slot=headline]") || document.body
      target.dispatchEvent(over)
      target.dispatchEvent(drop)
      return over.defaultPrevented && drop.defaultPrevented
    })
    expect(prevented, "soltar fora da área deixaria o navegador abrir o arquivo")
  },
  async "esc-after-clicking-photo-and-shortcuts-blocked"(page) {
    await openItemWithPhotos(page)
    await page.locator('#main [data-action="lightbox"]').click()
    await settle(page)
    await page.locator("#lightbox-img").click()
    await page.keyboard.press("ArrowRight")
    expect((await count(page)) === "2 de 3", "seta não funcionou depois de clicar na foto")
    await page.keyboard.press("c")
    await page.keyboard.press("Control+k")
    await settle(page)
    expect(
      await page.evaluate(
        () =>
          document.querySelector("#create-menu").hidden &&
          !document.querySelector("#palette:not([hidden])"),
      ),
      "atalho abriu menu por baixo da galeria",
    )
    await page.keyboard.press("Escape")
    await settle(page)
    expect(!(await isOpen(page)), "Esc não fechou depois de clicar na foto")
  },
  async "browser-back-closes-gallery-and-stays"(page) {
    await openItemWithPhotos(page)
    const before = await page.evaluate(() => location.hash)
    await page.locator('#main [data-action="lightbox"]').click()
    await settle(page)
    await page.goBack()
    await settle(page)
    expect(!(await isOpen(page)), "Voltar não fechou a galeria")
    expect((await page.evaluate(() => location.hash)) === before, "Voltar saiu do anúncio")
    expect(await page.evaluate(() => !document.querySelector("#main").inert), "fundo ficou inerte")
    await page.locator('#main [data-action="lightbox"]').click()
    await settle(page)
    await page.locator('#lightbox [data-lightbox="close"]').click()
    await settle(page)
    expect((await page.evaluate(() => location.hash)) === before, "fechar pelo X mudou de página")
  },
}

await runProof(checkpoints, "round18")
