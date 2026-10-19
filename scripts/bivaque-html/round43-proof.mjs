import { expect, go, reload, runProof, settle, snapshot, stored } from "./proof-harness.mjs"

// Rodada 43: avisos pedidos com explicação antes (simulado: nenhum pedido real do navegador) e o
// Bivaque instalável como app (manifesto, ícones e a linha de instalar em Você).
async function noRealPermission(page) {
  await page.addInitScript(() => {
    window.__asked = 0
    if (window.Notification)
      Notification.requestPermission = async () => {
        window.__asked++
        return "default"
      }
  })
}
async function createAlert(page, amen) {
  await go(page, "imoveis")
  await page.locator(`#main [data-action="catalog-toggle"][data-value="${amen}"]`).click()
  await settle(page)
  await page.locator('#main [data-action="search-alert"]').click()
  await page.waitForTimeout(1300)
}
const dialogKind = (page) =>
  page.evaluate(() => {
    const d = document.querySelector("#dialog")
    return d.open ? d.dataset.kind : null
  })

const checkpoints = {
  async "first-alert-explains-notifications-then-waits"(page) {
    await snapshot(page)
    await noRealPermission(page)
    await reload(page)
    await createAlert(page, "pets")
    expect((await dialogKind(page)) === "push", `sem a folha dos avisos: ${await dialogKind(page)}`)
    expect(
      /Imóvel novo/.test(await page.locator("#dialog .push-sample").first().innerText()),
      "primeiro exemplo não é o do alerta",
    )
    await page.locator('#dialog [data-action="push-later"]').click()
    await settle(page)
    expect(!(await dialogKind(page)), "Agora não não fechou")
    await createAlert(page, "furnished")
    expect(!(await dialogKind(page)), "pediu de novo antes de 7 dias")
    expect((await page.evaluate(() => window.__asked)) === 0, "fez o pedido real do navegador")
  },
  async "enable-from-you-and-show-the-state"(page) {
    await snapshot(page)
    await noRealPermission(page)
    await reload(page)
    await go(page, "voce")
    await page.locator('#main [data-action="push-ask"]').click()
    await settle(page)
    expect((await dialogKind(page)) === "push", "Ativar em Você não abriu a explicação")
    await page.locator('#dialog [data-action="push-enable"]').click()
    await settle(page)
    expect((await stored(page)).prefs.push === "on", "avisos não ficaram ativados")
    expect(/Ativados/.test(await page.locator("#main").innerText()), "Você não mostra o estado")
    expect(await page.locator('#main [data-action="push-disable"]').count(), "sem Desativar")
    expect((await page.evaluate(() => window.__asked)) === 0, "fez o pedido real do navegador")
  },
  async "read-only-city-never-asks"(page) {
    await snapshot(page)
    await go(page, "voce?cidade=Brasília")
    expect(
      !(await page.locator('#main [data-action="push-ask"]').count()),
      "cidade de consulta com avisos",
    )
  },
  async "install-row-uses-the-browser-prompt"(page) {
    await snapshot(page)
    await page.addInitScript(() => {
      window.__prompted = 0
      addEventListener("load", () =>
        setTimeout(() => {
          const e = new Event("beforeinstallprompt", { cancelable: true })
          e.prompt = async () => {
            window.__prompted++
          }
          e.userChoice = Promise.resolve({ outcome: "accepted" })
          dispatchEvent(e)
        }, 50),
      )
    })
    await reload(page)
    await go(page, "voce")
    await page.locator('#main [data-action="install-app"]').click()
    await settle(page)
    expect(
      (await page.evaluate(() => window.__prompted)) === 1,
      "não chamou o pedido de instalação",
    )
    expect(
      !(await page.locator('#main [data-action="install-app"]').count()),
      "linha ficou depois de instalar",
    )
  },
  async "iphone-gets-the-steps"(page) {
    await snapshot(page)
    await page.addInitScript(() =>
      Object.defineProperty(navigator, "userAgent", {
        get: () =>
          "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1",
      }),
    )
    await reload(page)
    await go(page, "voce")
    await page.locator('#main [data-action="install-app"]').click()
    await settle(page)
    expect((await dialogKind(page)) === "install", "iPhone sem o passo a passo")
    expect(
      /Adicionar à Tela de Início/.test(await page.locator("#dialog").innerText()),
      "passo a passo incompleto",
    )
  },
  async "no-support-no-install-row-and-manifest-linked"(page) {
    await snapshot(page)
    await go(page, "voce")
    expect(
      !(await page.locator('#main [data-action="install-app"]').count()),
      "linha de instalar sem suporte",
    )
    const head = await page.evaluate(() => [
      document.querySelector('link[rel="manifest"]')?.getAttribute("href"),
      document.querySelector('link[rel="apple-touch-icon"]')?.getAttribute("href"),
    ])
    expect(head[0] === "manifest.webmanifest" && head[1] === "icon-192.png", `cabeçalho: ${head}`)
  },
  // Revisão do lote: fechar a folha pelo X ou Esc também espera 7 dias.
  async "closing-the-sheet-counts-as-asked"(page) {
    await snapshot(page)
    await noRealPermission(page)
    await reload(page)
    await createAlert(page, "pets")
    expect((await dialogKind(page)) === "push", "sem a folha dos avisos")
    await page.keyboard.press("Escape")
    await settle(page)
    expect(!(await dialogKind(page)), "Esc não fechou")
    expect((await stored(page)).prefs.pushAskedAt, "fechar não registrou a pergunta")
    await createAlert(page, "furnished")
    expect(!(await dialogKind(page)), "pediu de novo depois de fechar pelo Esc")
  },
}

await runProof(checkpoints, "round43")
