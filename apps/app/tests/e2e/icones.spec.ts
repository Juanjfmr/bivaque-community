import { abrirGaleria, expect, test } from "./apoio"

/**
 * Os 100 ícones do inventário (§9): Material Symbols local, decorativos com
 * `aria-hidden`, e nunca o texto do ícone dentro do nome acessível.
 *
 * A lista abaixo é a régua, copiada do inventário — o teste não pergunta ao app
 * quantos ícones ele acha que tem.
 */

const LISTA = "[data-icone-lista]"

const ICONES: readonly string[] = [
  // 9.1 navegação, casca e controles
  "arrow_back",
  "chevron_left",
  "chevron_right",
  "close",
  "expand_more",
  "menu",
  "more_vert",
  "home",
  "search",
  "settings",
  "tune",
  "sort",
  "list",
  "map",
  "refresh",
  "logout",
  "lock",
  // 9.2 localização
  "place",
  "pin",
  "location_on",
  "location_off",
  "travel_explore",
  // 9.3 avisos, estado, confiança e pessoas
  "notifications",
  "notifications_active",
  "notifications_none",
  "notifications_off",
  "check",
  "check_circle",
  "cancel",
  "error",
  "info",
  "hourglass_top",
  "timer",
  "schedule",
  "bolt",
  "auto_awesome",
  "flag",
  "report",
  "gavel",
  "shield_person",
  "verified_user",
  "badge",
  "admin_panel_settings",
  "support",
  "public",
  "person",
  "person_add",
  "group",
  "group_add",
  "groups",
  "undo",
  // 9.4 conteúdo, conversa e mídia
  "chat_bubble",
  "forum",
  "send",
  "thumb_up",
  "volunteer_activism",
  "history_edu",
  "history",
  "ballot",
  "how_to_vote",
  "interests",
  "image",
  "photo_camera",
  "add_photo_alternate",
  "edit",
  "edit_square",
  "delete",
  "content_copy",
  "link",
  "share",
  "open_in_new",
  "upload",
  "bookmark",
  "bookmark_border",
  "bookmark_remove",
  "remove",
  "add",
  // 9.5 mercado, serviço, cidade e rotina
  "sell",
  "storefront",
  "build",
  "local_shipping",
  "apartment",
  "home_work",
  "pets",
  "school",
  "child_care",
  "family_restroom",
  "directions_run",
  "flight_land",
  "request_quote",
  "inbox",
  "add_business",
  "checklist",
  "event",
  "event_available",
  "event_busy",
  "trending_up",
  "search_off",
  "visibility",
  "visibility_off",
]

test.describe("os ícones do inventário", () => {
  test("são 100 na galeria, um por nome, distintos", async ({ page }) => {
    await abrirGaleria(page)
    expect(ICONES.length).toBe(100)
    expect(new Set(ICONES).size).toBe(100)
    await expect(page.locator(`${LISTA} [data-icone]`)).toHaveCount(100)
    for (const nome of ICONES) {
      await expect(page.locator(`${LISTA} [data-icone="${nome}"]`), nome).toHaveCount(1)
    }
  })

  test("cada ícone é decorativo, desenhado com a fonte local e com o glifo certo", async ({
    page,
  }) => {
    await abrirGaleria(page)
    await page.evaluate(() => document.fonts.ready)

    const medidas = await page.evaluate(
      ({ lista, nomes }: { lista: string; nomes: readonly string[] }) => {
        const problemas: string[] = []
        for (const nome of nomes) {
          const elemento = document.querySelector(`${lista} [data-icone="${nome}"]`)
          if (!elemento) {
            problemas.push(`${nome}: ausente`)
            continue
          }
          if (elemento.getAttribute("aria-hidden") !== "true") {
            problemas.push(`${nome}: sem aria-hidden`)
          }
          if (elemento.textContent !== nome) {
            problemas.push(`${nome}: ligadura "${elemento.textContent}"`)
          }
          const familia = getComputedStyle(elemento).fontFamily
          if (!familia.includes("Material Symbols")) problemas.push(`${nome}: família ${familia}`)
        }
        return problemas
      },
      { lista: LISTA, nomes: ICONES },
    )
    expect(medidas).toEqual([])
  })

  test("a ligadura vira glifo, e não a palavra escrita", async ({ page }) => {
    await abrirGaleria(page)
    await page.evaluate(() => document.fonts.ready)

    // O ícone da lista tem `size-7` (28 px): a caixa dele é fixa e não mede a
    // fonte. A sonda aqui usa a **mesma família computada** do ícone, mas sem
    // tamanho fixo, para medir a ligadura de verdade. Com o glifo, "search" cabe
    // num ícone; com a fonte trocada por monoespaçada, viram seis letras largas.
    const larguras = await page.evaluate(() => {
      const icone = document.querySelector('[data-icone-lista] [data-icone="search"]')
      if (!icone) throw new Error("sem o ícone de busca")
      const familia = getComputedStyle(icone).fontFamily
      const sonda = document.createElement("span")
      sonda.textContent = "search"
      sonda.style.display = "inline-block"
      sonda.style.fontSize = "24px"
      sonda.style.lineHeight = "1"
      sonda.style.whiteSpace = "nowrap"
      sonda.style.fontFamily = familia
      sonda.style.fontFeatureSettings = '"liga"'
      document.body.append(sonda)
      const glifo = sonda.getBoundingClientRect().width
      sonda.style.fontFamily = "monospace"
      const palavra = sonda.getBoundingClientRect().width
      sonda.remove()
      return { glifo, palavra }
    })
    expect(larguras.glifo).toBeGreaterThan(8)
    expect(larguras.glifo).toBeLessThan(40)
    expect(larguras.palavra).toBeGreaterThan(larguras.glifo * 1.8)
  })

  test("o ícone não entra no nome acessível do botão que o contém", async ({ page }) => {
    await abrirGaleria(page)
    // O botão de ícone da galeria é rotulado "Buscar": o nome tem de ser só isso,
    // sem a ligadura do Material Symbols no meio.
    const bloco = page.locator('[data-galeria="botao-de-icone"]')
    await expect(bloco.getByRole("button", { name: "Buscar", exact: true })).toHaveCount(1)
    const nome = await page
      .locator('[data-exemplo="botao-de-icone"]')
      .evaluate((elemento) => elemento.getAttribute("aria-label"))
    expect(nome).toBe("Buscar")
  })
})
