import {
  action,
  choose,
  dismissPushAsk,
  expect,
  fill,
  go,
  KEY,
  reload,
  routeOf,
  runProof,
  settle,
  snapshot,
  stored,
} from "./proof-harness.mjs"

// Rodada 66: bairro em qualquer cidade. O campo de bairro virou busca (nome sem acento, CEP de teste ou
// localização do aparelho) no pedido, no anúncio, no imóvel, na indicação e em Configurações. O CEP e as
// coordenadas só servem para achar o bairro: a prova confere que nenhum dos dois chega ao armazenamento.
async function patchState(page, code) {
  await snapshot(page)
  await page.evaluate(
    ([k, src]) => {
      const s = JSON.parse(localStorage.getItem(k))
      new Function("s", `{${src}}`)(s)
      localStorage.setItem(k, JSON.stringify(s))
    },
    [KEY, code],
  )
  await reload(page)
}
async function inCity(page, city) {
  await patchState(page, `s.homeCity='${city}';s.city='${city}'`)
  await go(page, `inicio?cidade=${city}`)
}
const raw = (page) => page.evaluate((k) => localStorage.getItem(k) || "", KEY)
async function openCreateChoice(page, choice) {
  await page.locator('[data-action="create"]:visible').first().click()
  await settle(page)
  await page.locator(`#create-menu [data-action="${choice}"]`).click()
  await settle(page)
}
const type = (page, id, text) => page.locator(`#${id} input`).fill(text)
const menuText = async (page, id) => {
  await page.locator(`#${id}-menu`).waitFor({ state: "visible", timeout: 3000 })
  return page.locator(`#${id}-menu`).innerText()
}
const support = (page, id) => page.locator(`#${id}`).evaluate((el) => el.supportingText)
const fieldValue = (page, id) => page.locator(`#${id}`).evaluate((el) => el.value)
async function submitRequest(page, hood) {
  await choose(page, "request-cat", "Casa e reparos")
  if (hood) await choose(page, "request-hood", hood)
  await fill(page, "request-desc", "Preciso trocar a fiação do quarto, com material incluso.")
  await action(page, "submit-request")
}

const checkpoints = {
  async "request-hood-by-name-without-accent-in-natal"(page) {
    await inCity(page, "Natal")
    await openCreateChoice(page, "create-request")
    await page.locator("#request-hood input").focus()
    const first = await menuText(page, "request-hood")
    expect(/Mais escolhidos em Natal/i.test(first), `sem os mais escolhidos: ${first}`)
    expect(!/Parque 10|Adrianópolis|Tarumã/.test(first), "Natal sugere bairros de Manaus")
    await type(page, "request-hood", "lagoa")
    const lagoa = await menuText(page, "request-hood")
    expect(
      /Lagoa Nova/.test(lagoa) && /Lagoa Seca/.test(lagoa) && /Lagoa Azul/.test(lagoa),
      `busca por nome: ${lagoa}`,
    )
    expect(/Usar “lagoa” como está/.test(lagoa), "falta usar o texto como está")
    // sem acento acha o nome certo; teclado: seta para baixo e Enter
    await type(page, "request-hood", "candelaria")
    expect(
      /Candelária/.test(await menuText(page, "request-hood")),
      "sem acento não achou Candelária",
    )
    await page.keyboard.press("ArrowDown")
    await page.keyboard.press("Enter")
    await settle(page)
    expect((await fieldValue(page, "request-hood")) === "Candelária", "teclado não escolheu")
    expect((await support(page, "request-hood")) === "Natal · Zona Sul", "zona não apareceu")
    await submitRequest(page)
    await dismissPushAsk(page)
    const r = (await stored(page)).requests.find((x) => x.mine && x.city === "Natal")
    expect(r?.hood === "Candelária", `pedido com bairro errado: ${JSON.stringify(r?.hood)}`)
    expect((await routeOf(page)).name === "pedido", "pedido não abriu")
  },

  async "cep-finds-the-hood-and-is-never-stored"(page) {
    await inCity(page, "Natal")
    await openCreateChoice(page, "create-request")
    await type(page, "request-hood", "59075-000")
    const hit = await menuText(page, "request-hood")
    expect(/Lagoa Nova/.test(hit) && /Natal · pelo CEP/.test(hit), `CEP não achou: ${hit}`)
    expect(/O CEP só serve para achar o bairro e não fica salvo/.test(hit), "falta o aviso do CEP")
    await type(page, "request-hood", "70390-000")
    expect(
      /Esse CEP é de Brasília/.test(await menuText(page, "request-hood")),
      "CEP de outra cidade",
    )
    await type(page, "request-hood", "12345-678")
    expect(/CEP não encontrado/.test(await menuText(page, "request-hood")), "CEP desconhecido")
    // CEP digitado sem escolher o bairro não é enviado
    const before = ((await stored(page)).requests || []).length
    await type(page, "request-hood", "59075-000")
    await submitRequest(page)
    await settle(page)
    expect(
      ((await stored(page)).requests || []).length === before,
      "pedido saiu com o CEP no lugar do bairro",
    )
    expect(!/59075/.test(await raw(page)), "o CEP foi gravado")
    // escolhendo pela sugestão do CEP, sai só o bairro
    await type(page, "request-hood", "59075000")
    await page.locator('#request-hood-menu .hood-opt[data-hood-name="Lagoa Nova"]').click()
    expect((await fieldValue(page, "request-hood")) === "Lagoa Nova", "CEP não preencheu o bairro")
    await action(page, "submit-request")
    await dismissPushAsk(page)
    const r = (await stored(page)).requests.find((x) => x.mine && x.city === "Natal")
    expect(r?.hood === "Lagoa Nova", `bairro pelo CEP: ${JSON.stringify(r?.hood)}`)
    expect(!/59075/.test(await raw(page)), "o CEP foi gravado")
  },

  async "free-text-hood-when-it-is-not-on-the-list"(page) {
    await inCity(page, "Rio de Janeiro")
    await openCreateChoice(page, "create-item")
    await fill(page, "item-title", "Bicicleta aro 29 revisada")
    await fill(page, "item-price", "900")
    await choose(page, "item-cat")
    await choose(page, "item-cond")
    await type(page, "item-hood", "Vila Isabel")
    expect(
      /Usar “Vila Isabel” como está/.test(await menuText(page, "item-hood")),
      "falta usar o texto como está",
    )
    await page.locator("#item-hood-menu .hood-free").click()
    expect(
      (await support(page, "item-hood")) === "Rio de Janeiro · bairro digitado",
      "aviso do texto livre",
    )
    await fill(page, "item-desc", "Bicicleta revisada, pneus novos, retirada combinada.")
    await action(page, "submit-item")
    const item = (await stored(page)).items.find((i) => i.title === "Bicicleta aro 29 revisada")
    expect(
      item?.hood === "Vila Isabel" && item.city === "Rio de Janeiro",
      `texto livre: ${JSON.stringify(item?.hood)}`,
    )
    // nome da base escrito de outro jeito vira o nome certo ao sair do campo
    await go(page, "inicio?cidade=Rio de Janeiro")
    await openCreateChoice(page, "create-item")
    await type(page, "item-hood", "  copacabana ")
    await page.locator("#item-title input").focus()
    expect(
      (await fieldValue(page, "item-hood")) === "Copacabana",
      "não corrigiu para o nome da base",
    )
  },

  async "location-picks-the-nearest-hood-and-drops-the-coordinates"(page) {
    await page.context().grantPermissions(["geolocation"])
    await page.context().setGeolocation({ latitude: -5.8812, longitude: -35.1793 })
    await inCity(page, "Natal")
    await openCreateChoice(page, "create-request")
    await page.locator("#dialog [data-hood-loc]").click()
    await page.waitForFunction(
      () => document.querySelector("#request-hood")?.value === "Ponta Negra",
    )
    expect(
      (await support(page, "request-hood")) === "Natal · Zona Sul · pela localização",
      "aviso da localização",
    )
    await submitRequest(page)
    await dismissPushAsk(page)
    const r = (await stored(page)).requests.find((x) => x.mine && x.city === "Natal")
    expect(r?.hood === "Ponta Negra", `bairro pela localização: ${JSON.stringify(r?.hood)}`)
    expect(!/-5\.88|-35\.17|latitude|longitude/.test(await raw(page)), "coordenadas gravadas")
    // longe da cidade: não escolhe nada e explica
    await page.context().setGeolocation({ latitude: -3.1, longitude: -60.02 })
    await go(page, "inicio?cidade=Natal")
    await openCreateChoice(page, "create-request")
    await page.locator("#dialog [data-hood-loc]").click()
    await page.waitForFunction(() => /não fica em Natal/.test(document.body.innerText))
    expect((await fieldValue(page, "request-hood")) === "", "escolheu bairro de outra cidade")
  },

  async "settings-hood-in-any-city"(page) {
    await inCity(page, "Rio de Janeiro")
    await go(page, "voce")
    await action(page, "settings")
    await type(page, "profile-hood", "tiju")
    await page.locator('#profile-hood-menu .hood-opt[data-hood-name="Tijuca"]').click()
    await action(page, "save-settings")
    expect((await stored(page)).profile.hood === "Tijuca", "bairro do perfil não salvou")
    await action(page, "settings")
    expect(
      (await support(page, "profile-hood")) === "Rio de Janeiro · Zona Norte",
      "zona no perfil",
    )
    // CEP no perfil não é salvo
    await type(page, "profile-hood", "20510-000")
    await action(page, "save-settings")
    await settle(page)
    expect((await stored(page)).profile.hood === "Tijuca", "o CEP entrou no perfil")
    expect(!/20510/.test(await raw(page)), "o CEP foi gravado")
    // apagar o campo deixa o perfil sem bairro (é opcional)
    await type(page, "profile-hood", "")
    await action(page, "save-settings")
    expect((await stored(page)).profile.hood === "", "não deu para tirar o bairro")
  },
}

await runProof(checkpoints, "round66")
