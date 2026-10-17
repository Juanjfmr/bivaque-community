import { expect, go, KEY, reload, runProof, settle, snapshot } from "./proof-harness.mjs"

// Rodada 40: galeria com gestos de app. Os toques são simulados com PointerEvent do tipo touch.
async function openGallery(page) {
  await snapshot(page)
  // O exemplo não tem anúncio com várias fotos: o i2 recebe as fotos de outros três anúncios.
  await page.evaluate((k) => {
    const x = JSON.parse(localStorage.getItem(k))
    const photos = x.items
      .map((i) => i.photos?.[0])
      .filter(Boolean)
      .slice(0, 3)
    x.items.find((i) => i.id === "i2").photos = photos
    localStorage.setItem(k, JSON.stringify(x))
  }, KEY)
  await reload(page)
  await go(page, "anuncio/i2")
  await page.locator('#main [data-action="lightbox"]').first().click()
  await settle(page)
  expect(await page.locator("#lightbox").count(), "galeria não abriu")
  // Espera as fotos decodificarem: com o navegador ocupado, o segundo toque chegaria tarde.
  await page.waitForFunction(() =>
    [...document.querySelectorAll("#lightbox img")].every((i) => i.complete && i.naturalWidth),
  )
  await page.evaluate(() =>
    Promise.all(
      [...document.querySelectorAll("#lightbox img")].map((i) => i.decode().catch(() => {})),
    ),
  )
}
// Gesto com um ou dois dedos: cada passo é a lista de posições dos dedos.
async function touch(page, steps, { gap = 16 } = {}) {
  await page.evaluate(
    async ({ steps, gap }) => {
      const stage = document.querySelector("#lightbox .lightbox-stage")
      const fire = (type, id, [x, y]) =>
        stage.dispatchEvent(
          new PointerEvent(type, {
            pointerId: id,
            pointerType: "touch",
            clientX: x,
            clientY: y,
            bubbles: true,
            isPrimary: id === 1,
          }),
        )
      const wait = () => new Promise((r) => setTimeout(r, gap))
      for (const [i, p] of steps[0].entries()) fire("pointerdown", i + 1, p)
      for (const s of steps.slice(1, -1)) {
        for (const [i, p] of s.entries()) fire("pointermove", i + 1, p)
        await wait()
      }
      for (const [i, p] of steps.at(-1).entries()) fire("pointerup", i + 1, p)
    },
    { steps, gap },
  )
  await settle(page)
}
const center = (page) =>
  page.evaluate(() => {
    const r = document.querySelector("#lightbox .lightbox-stage").getBoundingClientRect()
    return [Math.round(r.left + r.width / 2), Math.round(r.top + r.height / 2)]
  })
const zoom = (page) =>
  page.evaluate(() => ({
    t: document.querySelector("#lightbox-img")?.style.transform || "",
    zoomed: document.querySelector("#lightbox")?.classList.contains("zoomed") || false,
  }))
const count = (page) => page.locator("#lightbox-count").innerText()

const checkpoints = {
  async "drag-down-closes-and-short-drag-snaps-back"(page) {
    await openGallery(page)
    const [x, y] = await center(page)
    await touch(page, [[[x, y]], [[x, y + 30]], [[x, y + 50]], [[x, y + 50]]], { gap: 60 })
    expect(await page.locator("#lightbox").count(), "arrasto curto fechou a galeria")
    expect(
      /translate\(0px, 0px\) scale\(1\)/.test((await zoom(page)).t),
      "foto não voltou ao lugar",
    )
    await touch(page, [[[x, y]], [[x, y + 80]], [[x, y + 180]], [[x, y + 220]]])
    expect(!(await page.locator("#lightbox").count()), "arrastar para baixo não fechou")
  },
  async "drag-down-follows-the-finger"(page) {
    await openGallery(page)
    const [x, y] = await center(page)
    const mid = await page.evaluate(
      async ([x, y]) => {
        const stage = document.querySelector("#lightbox .lightbox-stage")
        const fire = (type, cy) =>
          stage.dispatchEvent(
            new PointerEvent(type, {
              pointerId: 1,
              pointerType: "touch",
              clientX: x,
              clientY: cy,
              bubbles: true,
            }),
          )
        fire("pointerdown", y)
        fire("pointermove", y + 20)
        fire("pointermove", y + 100)
        const out = {
          t: document.querySelector("#lightbox-img").style.transform,
          fade: document.querySelector("#lightbox").style.getPropertyValue("--lb-fade"),
        }
        fire("pointercancel", y + 100)
        return out
      },
      [x, y],
    )
    expect(/translate\(0px, 100px\)/.test(mid.t), `foto não acompanhou o dedo: ${mid.t}`)
    expect(Number(mid.fade) < 1, `fundo não esmaeceu: ${mid.fade}`)
  },
  async "side-drag-changes-photo"(page) {
    await openGallery(page)
    const before = await count(page)
    const [x, y] = await center(page)
    await touch(page, [[[x, y]], [[x - 30, y]], [[x - 120, y]], [[x - 140, y]]])
    const after = await count(page)
    expect(before.startsWith("1 de") && after.startsWith("2 de"), `contagem: ${before} → ${after}`)
    await page.locator("#lightbox .lightbox-stage").dispatchEvent("click")
    await settle(page)
    expect(await page.locator("#lightbox").count(), "o clique depois do gesto fechou a galeria")
  },
  async "double-tap-zooms-pans-and-returns"(page) {
    await openGallery(page)
    const [x, y] = await center(page)
    // Os dois toques numa sequência só (o toque duplo vale até 320 ms entre eles).
    const tap = () =>
      page.evaluate(
        async ([x, y]) => {
          const stage = document.querySelector("#lightbox .lightbox-stage")
          const fire = (type) =>
            stage.dispatchEvent(
              new PointerEvent(type, {
                pointerId: 1,
                pointerType: "touch",
                clientX: x,
                clientY: y,
                bubbles: true,
              }),
            )
          fire("pointerdown")
          fire("pointerup")
          fire("pointerdown")
          fire("pointerup")
          await new Promise((r) => setTimeout(r, 350))
        },
        [x, y],
      )
    await tap()
    let z = await zoom(page)
    expect(z.zoomed && /scale\(2\.5\)/.test(z.t), `toque duplo não ampliou: ${z.t}`)
    await touch(page, [[[x, y]], [[x + 20, y]], [[x + 60, y + 10]], [[x + 60, y + 10]]])
    z = await zoom(page)
    expect(z.zoomed && !/translate\(0px, 0px\)/.test(z.t), `foto ampliada não se moveu: ${z.t}`)
    expect(await page.locator("#lightbox").count(), "arrastar ampliada fechou ou trocou")
    await tap()
    z = await zoom(page)
    expect(!z.zoomed && /scale\(1\)/.test(z.t), `toque duplo não voltou: ${z.t}`)
  },
  async "pinch-zooms-in"(page) {
    await openGallery(page)
    const [x, y] = await center(page)
    await touch(page, [
      [
        [x - 40, y],
        [x + 40, y],
      ],
      [
        [x - 60, y],
        [x + 60, y],
      ],
      [
        [x - 90, y],
        [x + 90, y],
      ],
      [
        [x - 90, y],
        [x + 90, y],
      ],
    ])
    const z = await zoom(page)
    const s = Number(/scale\(([\d.]+)\)/.exec(z.t)?.[1])
    expect(z.zoomed && s > 2 && s <= 4, `pinça: ${z.t}`)
  },
  async "keyboard-and-mouse-zoom"(page) {
    await openGallery(page)
    await page.keyboard.press("+")
    expect((await zoom(page)).zoomed, "+ não ampliou")
    await page.keyboard.press("0")
    expect(!(await zoom(page)).zoomed, "0 não voltou")
    await page.locator("#lightbox-img").dblclick()
    await settle(page)
    expect((await zoom(page)).zoomed, "clique duplo não ampliou")
  },
}

await runProof(checkpoints, "round40")
