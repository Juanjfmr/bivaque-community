import type { Page, TestInfo } from "@playwright/test"
import { expect, test } from "@playwright/test"

// PORT-001 (R73): a landing v8 no Next. O spec cobre o que o piloto do porte
// visual promete (ADR-20261022): os textos aprovados na R71, as rotas de todos
// os CTAs, a ausência de requisição externa, o contraste nos dois temas, o foco
// contido na folha, a barra fixa fora do teclado e a ausência de rolagem
// horizontal.
//
// Só roda em 375 e 1440: são os dois tamanhos da comparação de captura.
const PROJECTS = new Set(["mobile-375", "desktop-1440"])

const TITLE = "Juntos somos mais fortes."
const LEAD =
  "A família militar se ajuda, em qualquer cidade: pergunte a quem já mora perto, ache serviços e imóveis, passe adiante o que não usa mais. Gratuito para militares, veteranos, pensionistas e suas famílias."
const SECTIONS = [
  ["inicio", TITLE],
  ["exemplo", "Uma pergunta, várias famílias respondendo"],
  ["recursos", "O que a gente resolve junto, na sua cidade"],
  ["mudanca", "Transferido? Chegue sabendo."],
  ["participar", "Três passos para entrar"],
  ["perguntas", "Perguntas frequentes"],
  ["fim", "Entre na comunidade da sua cidade."],
]

function onlyCaptureProjects(testInfo: TestInfo) {
  test.skip(!PROJECTS.has(testInfo.project.name), "PORT-001: a landing é medida em 375 e 1440")
}

// O `goto` pode resolver antes de o documento da landing estar no DOM; toda
// medição espera a raiz aparecer.
async function openLanding(page: Page) {
  await page.goto("/")
  await expect(page.locator("#landing")).toBeVisible()
  // Os botões são md-filled-button: só navegam depois que o elemento é
  // registrado no cliente. Clicar antes disso não faz nada, e no celular do CI
  // o clique chegava antes do registro.
  await page.waitForFunction(() => customElements.get("md-filled-button") !== undefined)
}

const flat = (text: string | null | undefined) =>
  String(text ?? "")
    .replace(/\s+/g, " ")
    .trim()

// Cor e contraste pela fórmula da WCAG, como as provas das rodadas 71 e 72.
function parseColor(value: string) {
  const text = value.trim().toLowerCase()
  const hex = text.match(/^#([0-9a-f]{3,8})$/)
  if (hex?.[1]) {
    const digits = hex[1]
    const full =
      digits.length === 3 || digits.length === 4 ? [...digits].map((d) => d + d).join("") : digits
    const parts = [0, 2, 4, 6].map((index) =>
      index < full.length ? Number.parseInt(full.slice(index, index + 2), 16) : undefined,
    )
    const [r = 0, g = 0, b = 0, a] = parts
    return { r, g, b, a: a === undefined ? 1 : a / 255 }
  }
  const rgb = text.match(/^rgba?\(([^)]+)\)$/)
  if (rgb?.[1]) {
    const parts = rgb[1]
      .split(/[\s,/]+/)
      .filter(Boolean)
      .map(Number)
    return { r: parts[0] ?? 0, g: parts[1] ?? 0, b: parts[2] ?? 0, a: parts[3] ?? 1 }
  }
  throw new Error(`cor não reconhecida: ${value}`)
}

function luminance({ r, g, b }: { r: number; g: number; b: number }) {
  const channel = (value: number) => {
    const c = value / 255
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

function contrast(a: string, b: string) {
  const [lighter = 0, darker = 0] = [luminance(parseColor(a)), luminance(parseColor(b))].sort(
    (x, y) => y - x,
  )
  return Math.round(((lighter + 0.05) / (darker + 0.05)) * 100) / 100
}

// Os valores de token são hex; a sonda precisa ficar DENTRO de `.ld`, porque é
// ali que o tema da landing declara as propriedades. A sonda devolve a cor já
// computada pelo navegador.
async function tokenColor(page: Page, name: string) {
  return page.evaluate((property) => {
    const landing = document.getElementById("landing")
    if (!landing) throw new Error("a landing não está no DOM")
    const probe = document.createElement("span")
    probe.style.position = "fixed"
    probe.style.left = "-9999px"
    probe.style.backgroundColor = `var(${property})`
    landing.append(probe)
    const value = getComputedStyle(probe).backgroundColor
    probe.remove()
    return value
  }, name)
}

// O preenchimento do botão do Material mora no shadow root.
async function deepBackground(page: Page, selector: string) {
  return page
    .locator(selector)
    .first()
    .evaluate((host) => {
      const queue: Element[] = [host]
      while (queue.length) {
        const element = queue.shift()
        if (!element) break
        if (element !== host) {
          const background = getComputedStyle(element).backgroundColor
          if (background && background !== "rgba(0, 0, 0, 0)" && background !== "transparent")
            return background
        }
        if (element.shadowRoot) queue.push(...element.shadowRoot.children)
        queue.push(...element.children)
      }
      return getComputedStyle(host).backgroundColor
    })
}

// A cor de `fill` de um caminho do símbolo dentro de um escopo. `fill` é
// herdado, então quem responde é a regra que alcança o `<path>` — é isso que
// prova que a exceção (foto, rodapé) e o tema continuam valendo.
async function symbolFill(page: Page, scope: string) {
  return page.evaluate((parent) => {
    const read = (className: string) => {
      const path = document.querySelector(`${parent} .brand-mark .${className}`)
      if (!path) throw new Error(`o símbolo não está em ${parent}`)
      return getComputedStyle(path).fill
    }
    return { body: read("bv-symbol-body"), threshold: read("bv-symbol-threshold") }
  }, scope)
}

// O fundo que a pessoa vê atrás de um elemento: sobe até achar uma camada opaca.
async function backgroundOf(page: Page, selector: string) {
  return page.evaluate((target) => {
    for (let element = document.querySelector(target); element; element = element.parentElement) {
      const background = getComputedStyle(element).backgroundColor
      if (background && background !== "rgba(0, 0, 0, 0)" && background !== "transparent")
        return background
    }
    return getComputedStyle(document.body).backgroundColor
  }, selector)
}

test.describe("landing v8", () => {
  test("entrega a landing no HTML do servidor, sem executar JavaScript", async ({
    request,
  }, testInfo) => {
    onlyCaptureProjects(testInfo)

    // Given um cliente HTTP puro: nenhum JavaScript é executado, como quem
    // rastreia a página ou monta a prévia de um link no WhatsApp
    const response = await request.get("/")

    // Then o servidor responde 200 e o HTML já traz o título e o texto do CTA
    expect(response.status()).toBe(200)
    const html = await response.text()
    expect(html, "o h1 da v8 vem no HTML do servidor").toMatch(
      /<h1[^>]*>Juntos somos mais fortes\.<\/h1>/,
    )
    expect(html, "o texto do CTA vem no HTML do servidor").toContain("Criar conta")
  })

  test("mostra o título, a linha de apoio e as seções na ordem da v8", async ({
    page,
  }, testInfo) => {
    onlyCaptureProjects(testInfo)

    // Given a landing pública servida pelo Next em produção
    await openLanding(page)

    // Then o título e a linha de apoio são os do protótipo, palavra por palavra
    await expect(page).toHaveTitle(/Juntos somos mais fortes/)
    const heading = page.getByRole("heading", { level: 1 })
    await expect(heading).toHaveCount(1)
    expect(flat(await heading.innerText())).toBe(TITLE)
    expect(flat(await page.locator("#inicio .ld-lead").innerText())).toBe(LEAD)
    expect(flat(await page.locator("#inicio .ld-forces").innerText())).toBe(
      "Marinha, Exército e Aeronáutica",
    )

    // And as sete seções aparecem na ordem aprovada, cada uma com o seu título
    const sections = await page.locator("#ld-main section[id]").evaluateAll((nodes) =>
      nodes.map((node) => ({
        id: node.id,
        title: (node.querySelector("h1, h2")?.textContent ?? "").replace(/\s+/g, " ").trim(),
      })),
    )
    expect(sections.map((section) => section.id)).toEqual(SECTIONS.map(([id]) => id))
    for (const [id, title] of SECTIONS) {
      const section = sections.find((candidate) => candidate.id === id)
      expect(flat(section?.title), `#${id} abre com o título da v8`).toBe(title)
    }

    // And as seis perguntas existem, com a do CPF aberta
    const faq = await page.evaluate(() => {
      const items = [...document.querySelectorAll("#perguntas details")]
      return {
        count: items.length,
        open: items
          .filter((item) => item.hasAttribute("open"))
          .map((item) => item.querySelector("summary")?.textContent?.trim() ?? ""),
      }
    })
    expect(faq.count).toBe(6)
    expect(faq.open).toHaveLength(1)
    expect(faq.open[0]).toContain("confirmação pelo CPF")

    // And o que a versão anterior prometia e a v8 retirou não voltou
    const text = await page.locator("#ld-main").innerText()
    for (const gone of ["Quero fazer parte", "Recebi um convite", "Muda a cidade"])
      expect(text.includes(gone), `a landing não deveria dizer "${gone}"`).toBe(false)
  })

  test("cada Criar conta é um link de verdade para /signup", async ({ page }, testInfo) => {
    onlyCaptureProjects(testInfo)

    // Given a landing pública
    await openLanding(page)

    // Then o Material Web já registrou o componente e cada CTA tem um <a>
    await expect
      .poll(() =>
        page.evaluate(() =>
          Boolean(document.getElementById("ld-hero-cta")?.shadowRoot?.querySelector("a")),
        ),
      )
      .toBe(true)

    const ctas = await page.locator("md-filled-button").evaluateAll((hosts) =>
      hosts
        .filter((host) => (host.textContent ?? "").replace(/\s+/g, " ").trim() === "Criar conta")
        .map((host) => {
          const link = host.shadowRoot?.querySelector("a")
          return {
            href: link?.getAttribute("href") ?? null,
            tag: link?.tagName ?? null,
          }
        }),
    )
    expect(ctas.length).toBeGreaterThan(0)
    for (const cta of ctas) {
      expect(cta.tag, "com href o CTA é um <a>, não um <button>").toBe("A")
      expect(cta.href, "todo Criar conta leva ao cadastro").toBe("/signup")
    }

    // And a árvore de acessibilidade expõe cada CTA como link "Criar conta" — o
    // rótulo entra no <a> do shadow root pelo slot, então quem prova o nome é a
    // consulta por papel, não o textContent do link.
    const links = page.getByRole("link", { name: "Criar conta", includeHidden: true })
    await expect(links).toHaveCount(ctas.length)
    for (let index = 0; index < ctas.length; index++) {
      await expect(links.nth(index)).toHaveAttribute("href", "/signup")
    }

    // And o CTA da dobra é focável, e o foco entra no link do shadow root
    const focus = await page.locator("#ld-hero-cta").evaluate((host) => {
      host.focus()
      const active = host.shadowRoot?.activeElement
      return {
        href: active?.getAttribute("href") ?? null,
        inner: active?.tagName ?? null,
        outer: document.activeElement === host,
      }
    })
    expect(focus).toEqual({ href: "/signup", inner: "A", outer: true })
  })

  test("leva todo Criar conta para /signup", async ({ page }, testInfo) => {
    onlyCaptureProjects(testInfo)
    const narrow = testInfo.project.name === "mobile-375"

    // Given a landing pública
    await openLanding(page)

    // Then o CTA da dobra abre o cadastro
    await page.locator("#ld-hero-cta").click()
    await expect(page).toHaveURL(/\/signup$/)

    // And o CTA da chamada final também
    await openLanding(page)
    await page.locator("#fim md-filled-button").scrollIntoViewIfNeeded()
    await page.locator("#fim md-filled-button").click()
    await expect(page).toHaveURL(/\/signup$/)

    if (narrow) {
      // And no celular a barra fixa, quando aparece, leva ao mesmo lugar
      await openLanding(page)
      await page.evaluate(() => window.scrollTo({ top: 1400, behavior: "instant" }))
      await expect(page.locator("#ld-bar")).toHaveClass(/ld-show/)
      await page.locator("#ld-bar md-filled-button").click()
      await expect(page).toHaveURL(/\/signup$/)

      // And o CTA da folha do menu também
      await openLanding(page)
      await page.locator("#ld-top [data-ld-menu]").click()
      await page.locator("#ld-sheet .ld-sheet-acts md-filled-button").click()
      await expect(page).toHaveURL(/\/signup$/)
      return
    }

    // And no desktop o CTA que entra no topo depois da foto leva ao cadastro
    await openLanding(page)
    await page.evaluate(() => window.scrollTo({ top: 1400, behavior: "instant" }))
    await expect(page.locator("#ld-top")).toHaveClass(/ld-show-cta/)
    await page.locator("#ld-top .ld-cta md-filled-button").click()
    await expect(page).toHaveURL(/\/signup$/)
  })

  test("leva Entrar para /login", async ({ page }, testInfo) => {
    onlyCaptureProjects(testInfo)
    const narrow = testInfo.project.name === "mobile-375"

    // Given a landing pública
    await openLanding(page)

    // Then o Entrar do topo abre o login
    await page.locator("#ld-top .ld-text").click()
    await expect(page).toHaveURL(/\/login$/)

    // And o do rodapé também
    await openLanding(page)
    await page.locator(".ld-footer nav a", { hasText: "Entrar" }).click()
    await expect(page).toHaveURL(/\/login$/)

    // And os links legais vão para as páginas do Next
    await openLanding(page)
    await page.locator(".ld-footer nav a", { hasText: "Privacidade" }).click()
    await expect(page).toHaveURL(/\/privacidade$/)
    await openLanding(page)
    await page.locator(".ld-footer nav a", { hasText: "Código de conduta" }).click()
    await expect(page).toHaveURL(/\/codigo-de-conduta$/)

    if (!narrow) return

    // And na folha do menu, "Já tenho conta · Entrar" leva ao login
    await openLanding(page)
    await page.locator("#ld-top [data-ld-menu]").click()
    await page.locator("#ld-sheet .ld-sheet-acts a", { hasText: "Entrar" }).click()
    await expect(page).toHaveURL(/\/login$/)
  })

  test("não faz requisição externa", async ({ page }, testInfo) => {
    onlyCaptureProjects(testInfo)

    // Given um navegador que registra cada requisição
    const external: string[] = []
    page.on("request", (request) => {
      const url = request.url()
      if (
        !url.startsWith("http://127.0.0.1:3000") &&
        !url.startsWith("data:") &&
        !url.startsWith("blob:")
      )
        external.push(url)
    })

    // When a landing carrega e rola até o fim
    await openLanding(page)
    await page.locator("#fim").scrollIntoViewIfNeeded()
    await page.waitForLoadState("networkidle")

    // Then nada saiu do próprio servidor: fonte, ícone, imagem e script são locais
    expect(external).toEqual([])
  })

  test("mantém o contraste do corpo e do CTA no claro e no escuro", async ({ page }, testInfo) => {
    onlyCaptureProjects(testInfo)

    for (const colorScheme of ["light", "dark"] as const) {
      // Given a landing no tema do sistema
      await page.emulateMedia({ colorScheme })
      await openLanding(page)

      // Then o texto do corpo sobre a superfície passa de 4,5:1
      const onSurface = await tokenColor(page, "--md-sys-color-on-surface")
      const surface = await tokenColor(page, "--md-sys-color-surface")
      expect(
        contrast(onSurface, surface),
        `corpo sobre surface (${colorScheme})`,
      ).toBeGreaterThanOrEqual(4.5)

      // And o rótulo do CTA sobre a Brasa também
      const onBrasa = await tokenColor(page, "--bv-on-brasa")
      const brasa = await tokenColor(page, "--bv-brasa")
      expect(contrast(onBrasa, brasa), `CTA em Brasa (${colorScheme})`).toBeGreaterThanOrEqual(4.5)
      const fill = await deepBackground(page, "#ld-hero-cta")
      expect(contrast(onBrasa, fill), `fundo do CTA (${colorScheme})`).toBeGreaterThanOrEqual(4.5)

      // And o texto das perguntas sobre o fundo da seção
      const question = await page
        .locator("#perguntas summary")
        .first()
        .evaluate((element) => getComputedStyle(element).color)
      const questionBackground = await backgroundOf(page, "#perguntas")
      expect(
        contrast(question, questionBackground),
        `pergunta sobre o fundo (${colorScheme})`,
      ).toBeGreaterThanOrEqual(4.5)
    }

    // And o escuro é o par escuro dos tokens, e não o claro herdado
    await page.emulateMedia({ colorScheme: "light" })
    await openLanding(page)
    const lightSurface = await tokenColor(page, "--md-sys-color-surface")
    await page.emulateMedia({ colorScheme: "dark" })
    await openLanding(page)
    const darkSurface = await tokenColor(page, "--md-sys-color-surface")
    expect(darkSurface).not.toBe(lightSurface)
    expect(darkSurface).toBe("rgb(23, 30, 32)")
    expect(lightSurface).toBe("rgb(242, 240, 235)")
  })

  test("mantém as cores do símbolo na folha do menu e no topo sólido", async ({
    page,
  }, testInfo) => {
    onlyCaptureProjects(testInfo)

    // Os tokens do símbolo (brand-tokens.css): petróleo e terracota no claro;
    // branco inteiro no escuro.
    const expected = {
      light: { body: "rgb(37, 48, 51)", threshold: "rgb(184, 74, 58)" },
      dark: { body: "rgb(255, 255, 255)", threshold: "rgb(255, 255, 255)" },
    } as const

    for (const colorScheme of ["light", "dark"] as const) {
      // Given a landing no tema do sistema
      await page.emulateMedia({ colorScheme })
      await openLanding(page)

      // Then o símbolo da folha do menu usa as cores do tema
      expect(await symbolFill(page, "#ld-sheet"), `folha no ${colorScheme}`).toEqual(
        expected[colorScheme],
      )

      // And o do topo sólido, depois da foto, também
      await page.evaluate(() => window.scrollTo({ top: 1400, behavior: "instant" }))
      await expect(page.locator("#ld-top")).toHaveClass(/ld-solid/)
      expect(await symbolFill(page, "#ld-top"), `topo sólido no ${colorScheme}`).toEqual(
        expected[colorScheme],
      )
    }

    // And a exceção do rodapé continua valendo: branco sobre o fundo escuro
    await page.emulateMedia({ colorScheme: "light" })
    await openLanding(page)
    expect(await symbolFill(page, ".ld-footer")).toEqual({
      body: "rgb(255, 255, 255)",
      threshold: "rgb(255, 255, 255)",
    })
  })

  test("monta a conversa ao entrar na tela e já montada com movimento reduzido", async ({
    page,
  }, testInfo) => {
    onlyCaptureProjects(testInfo)

    // Given movimento reduzido
    await page.emulateMedia({ reducedMotion: "reduce" })
    await openLanding(page)
    await expect(page.locator("#ld-thread .ld-msg")).toHaveCount(3)

    // Then a conversa já vem montada, sem rolar
    const reduced = await page.evaluate(() =>
      [...document.querySelectorAll("#ld-thread .ld-msg, #ld-thread .ld-done")].map(
        (element) => getComputedStyle(element).opacity,
      ),
    )
    expect(reduced).toHaveLength(4)
    expect(reduced.every((opacity) => Number(opacity) === 1)).toBe(true)

    // When o movimento volta ao padrão
    await page.emulateMedia({ reducedMotion: "no-preference" })
    await openLanding(page)

    // Then a conversa espera entrar na tela
    await expect(page.locator("#ld-thread")).toHaveClass(/ld-reveal/)
    await expect(page.locator("#ld-thread")).not.toHaveClass(/ld-in/)

    // And se monta quando chega lá
    await page.locator("#ld-thread").scrollIntoViewIfNeeded()
    await expect(page.locator("#ld-thread")).toHaveClass(/ld-in/)
    await expect(page.locator("#ld-thread .ld-done")).toHaveCSS("opacity", "1")
  })

  test("zera as transições da folha e da barra com movimento reduzido", async ({
    page,
  }, testInfo) => {
    onlyCaptureProjects(testInfo)
    test.skip(testInfo.project.name !== "mobile-375", "PORT-001: a folha e a barra são do celular")

    // Given movimento reduzido
    await page.emulateMedia({ reducedMotion: "reduce" })
    await openLanding(page)

    // Then nada desliza: as duas transições computadas são de 0 s. O reset
    // universal de globals.css usa `*` e perde para a classe da landing; por
    // isso a medida é na duração computada, e não na presença de `animation`.
    const durations = await page.evaluate(() =>
      // O ícone das perguntas frequentes gira ao abrir: também precisa parar (confirmação do Codex).
      ["#ld-sheet", "#ld-bar", "#perguntas summary md-icon"].map((selector) => {
        const element = document.querySelector(selector)
        if (!element) throw new Error(`${selector} não está no DOM`)
        return {
          selector,
          values: getComputedStyle(element)
            .transitionDuration.split(",")
            .map((value) => value.trim()),
        }
      }),
    )
    for (const { selector, values } of durations) {
      expect(values.length, `${selector} declara transição para medir`).toBeGreaterThan(0)
      expect(values, `${selector} ainda anima com movimento reduzido`).toEqual(
        values.map(() => "0s"),
      )
    }
  })

  test("a folha rola até os links legais em tela baixa e deitada", async ({ page }, testInfo) => {
    onlyCaptureProjects(testInfo)
    test.skip(testInfo.project.name !== "mobile-375", "PORT-001: a folha é do celular")

    // Given o celular deitado, onde a folha é mais alta que a tela
    await page.setViewportSize({ width: 812, height: 375 })
    await openLanding(page)
    await page.locator("#ld-top [data-ld-menu]").click()
    await expect(page.locator("#ld-sheet")).toHaveClass(/ld-open/)

    // When a pessoa rola até o último link legal
    const legal = page.locator("#ld-sheet .ld-sheet-legal a").last()
    await legal.scrollIntoViewIfNeeded()

    // Then ele cabe inteiro na tela e recebe o toque
    const box = await legal.boundingBox()
    if (!box) throw new Error("o último link legal não tem caixa")
    expect(box.y, "o link começa dentro da tela").toBeGreaterThanOrEqual(0)
    expect(box.y + box.height, "o link termina dentro da tela").toBeLessThanOrEqual(375)
    await expect(legal).toBeVisible()
    await legal.click({ trial: true })
  })

  test("prende o foco na folha e tira a barra fixa do teclado", async ({ page }, testInfo) => {
    onlyCaptureProjects(testInfo)
    test.skip(testInfo.project.name !== "mobile-375", "PORT-001: a folha e a barra são do celular")

    // Given a landing no topo, com a barra fixa escondida
    await openLanding(page)
    const bar = page.locator("#ld-bar")
    await expect(bar).toHaveAttribute("aria-hidden", "true")
    expect(await bar.evaluate((element) => (element as HTMLElement).inert)).toBe(true)
    await expect(bar).toHaveCSS("visibility", "hidden")

    // When a barra aparece depois da dobra
    await page.evaluate(() => window.scrollTo({ top: 1400, behavior: "instant" }))
    await expect(bar).toHaveClass(/ld-show/)
    await expect(bar).not.toHaveAttribute("aria-hidden", "true")
    expect(await bar.evaluate((element) => (element as HTMLElement).inert)).toBe(false)

    // Then na chamada final ela sai do teclado de novo
    await page.locator("#fim").scrollIntoViewIfNeeded()
    await expect(bar).not.toHaveClass(/ld-show/)
    await expect(bar).toHaveAttribute("aria-hidden", "true")
    expect(await bar.evaluate((element) => (element as HTMLElement).inert)).toBe(true)

    // When a folha do menu abre
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }))
    await page.locator("#ld-top [data-ld-menu]").click()

    // Then o resto da landing fica inerte
    for (const selector of ["#ld-top", "#ld-main", ".ld-footer", "#ld-bar"]) {
      expect(
        await page.locator(selector).evaluate((element) => (element as HTMLElement).inert),
        `${selector} deveria estar inerte com a folha aberta`,
      ).toBe(true)
    }

    // And o foco entra na folha, e Tab e Shift+Tab dão a volta dentro dela
    const focusInsideSheet = () =>
      page.evaluate(
        () => document.getElementById("ld-sheet")?.contains(document.activeElement) ?? false,
      )
    expect(await focusInsideSheet()).toBe(true)
    for (const key of ["Tab", "Shift+Tab"]) {
      for (let step = 0; step < 12; step++) {
        await page.keyboard.press(key)
        expect(await focusInsideSheet(), `${key} saiu da folha no passo ${step + 1}`).toBe(true)
      }
    }

    // And Esc fecha a folha e devolve o foco ao botão que a abriu
    await page.keyboard.press("Escape")
    await expect(page.locator("#ld-sheet")).not.toHaveClass(/ld-open/)
    expect(
      await page.evaluate(
        () => document.activeElement === document.querySelector("#ld-top [data-ld-menu]"),
      ),
    ).toBe(true)
    for (const selector of ["#ld-top", "#ld-main", ".ld-footer"]) {
      expect(
        await page.locator(selector).evaluate((element) => (element as HTMLElement).inert),
        `${selector} voltou a ficar inerte`,
      ).toBe(false)
    }
  })

  test("não rola de lado", async ({ page }, testInfo) => {
    onlyCaptureProjects(testInfo)

    // Given a landing em produção
    await openLanding(page)

    // Then a largura do documento cabe na janela
    const width = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
      viewport: window.innerWidth,
    }))
    expect(
      width.scroll <= width.client,
      `a landing rola de lado em ${width.viewport}px: ${width.scroll} > ${width.client}`,
    ).toBe(true)
  })

  test("registra o Material Web só no cliente, sem erro de hidratação", async ({
    page,
  }, testInfo) => {
    onlyCaptureProjects(testInfo)

    // Given um navegador que ouve o console e os erros de página
    const problems: string[] = []
    page.on("console", (message) => {
      if (message.type() === "error") problems.push(message.text())
    })
    page.on("pageerror", (error) => problems.push(error.message))

    // When a landing carrega e o CTA está pronto para uso
    await openLanding(page)
    await expect(page.locator("#ld-hero-cta")).toBeVisible()

    // Then o elemento do Material foi registrado no cliente (o import dinâmico
    // do adaptador chega depois da hidratação)
    await expect
      .poll(() => page.evaluate(() => Boolean(customElements.get("md-filled-button"))))
      .toBe(true)

    // And nenhuma mensagem é de hidratação, e nenhuma exceção de página aconteceu
    expect(
      problems.filter((problem) => /hydrat|did not match|server-rendered/i.test(problem)),
    ).toEqual([])
    expect(problems).toEqual([])
  })
})
