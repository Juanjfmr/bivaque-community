// Capture support waits for the real UI; it does not replace or hide components.
export async function createDeterministicContext(browser, { width, theme }) {
  const context = await browser.newContext({
    viewport: { width, height: width === 375 ? 812 : width === 768 ? 1024 : 900 },
    colorScheme: theme,
    reducedMotion: "reduce",
    timezoneId: "America/Manaus",
    locale: "pt-BR",
  })
  await context.addInitScript(() => {
    const NativeDate = Date
    const fixed = NativeDate.parse("2026-10-13T16:00:00Z")
    class FixedDate extends NativeDate {
      constructor(...args) {
        super(...(args.length ? args : [fixed]))
      }
      static now() {
        return fixed
      }
    }
    window.Date = FixedDate
    let sequence = 0
    Object.defineProperty(crypto, "randomUUID", {
      // uid() uses the first twelve UUID characters after stripping hyphens.
      value: () => `${(++sequence).toString(16).padStart(8, "0")}-0000-4000-8000-000000000000`,
    })
  })
  return context
}

export async function stabilize(page, { neutralizeInteraction = false } = {}) {
  await page.waitForFunction(() => window.Bivaque?.inspect().officialComponents)
  if (neutralizeInteraction) {
    await page.mouse.move(0, 0)
    await page.evaluate(() => {
      let active = document.activeElement
      while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement
      active?.blur?.()
    })
  }
  return page.evaluate(async () => {
    const start = performance.now()
    const roots = () => {
      const result = [document]
      for (let i = 0; i < result.length; i++) {
        for (const el of result[i].querySelectorAll("*")) {
          if (el.shadowRoot) result.push(el.shadowRoot)
        }
      }
      return result
    }
    const frame = () => new Promise((done) => requestAnimationFrame(done))
    await document.fonts.ready
    await Promise.all([
      document.fonts.load('14px "Noto Sans"'),
      document.fonts.load('24px "Material Symbols Outlined"'),
    ])
    // Child updates can be scheduled by their parents; repeat until the tree has settled.
    for (let round = 0; round < 4; round++) {
      await Promise.all(
        roots().flatMap((root) =>
          Array.from(root.querySelectorAll("*"))
            .filter((el) => el.updateComplete)
            .map((el) => el.updateComplete),
        ),
      )
      await frame()
    }
    const visibleImages = Array.from(document.images).filter((img) => {
      const r = img.getBoundingClientRect()
      return r.width > 0 && r.height > 0 && r.top < innerHeight && r.bottom > 0
    })
    await Promise.all(visibleImages.map((img) => img.decode()))
    const observedAnimations = []
    for (let round = 0; round < 120; round++) {
      const running = roots()
        .flatMap((root) => root.getAnimations())
        .filter(
          (animation) => animation.playState === "running" || animation.playState === "pending",
        )
      if (!running.length) break
      for (const animation of running) {
        const timing = animation.effect?.getComputedTiming()
        if (timing?.iterations === Infinity)
          throw new Error("Infinite animation prevents stable capture")
        const record = {
          target: animation.effect?.target?.localName,
          duration: timing?.duration,
          currentTime: animation.currentTime,
        }
        observedAnimations.push(record)
      }
      await frame()
      if (round === 119) throw new Error("Animations did not settle in 120 rendered frames")
    }
    await frame()
    await frame()
    return {
      elapsedMs: performance.now() - start,
      shadowRoots: roots().length - 1,
      fonts: Array.from(document.fonts).map((font) => ({
        family: font.family,
        status: font.status,
      })),
      decodedImages: visibleImages.length,
      observedAnimations,
    }
  })
}
