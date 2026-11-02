import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { createHash } from "node:crypto"
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { createServer } from "node:http"
import { createRequire } from "node:module"
import { join, resolve } from "node:path"
import { pathToFileURL } from "node:url"
import { chromium } from "@playwright/test"
import { CENARIOS } from "../../apps/app/lib/demo/cenarios.ts"
import { ROTAS } from "../../apps/app/lib/navegacao/rotas.ts"
import { createDeterministicContext, stabilize } from "../bivaque-html/capture-support.mjs"
import { assertRound13Baseline, round13Baseline } from "../bivaque-html/round13-baseline.mjs"
import { htmlDoPar, matrizDeCaptura, validarDestino } from "./contrato-captura.mjs"

const raiz = resolve(import.meta.dirname, "../..")
const amostra = process.argv.includes("--amostra")
const mobileR72 = process.argv.includes("--mobile-r72")
const appUrl = process.env.BIVAQUE_APP_URL ?? "http://127.0.0.1:3200"
const pasta = `${mobileR72 ? "comparacao-r72-mobile" : amostra ? "amostra" : "pares"}-${new Date().toISOString().replace(/[:.]/g, "-")}`
const saida = join(raiz, ".visual", "onda-1", pasta)
mkdirSync(saida, { recursive: true })
console.log(`Saída: ${saida}`)
const html = mobileR72
  ? round13Baseline(raiz).bytes
  : readFileSync(join(raiz, "prototypes/bivaque-html/dist/Bivaque_Material_Web.html"))
if (mobileR72) assertRound13Baseline(html)
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex")
const shell = join(
  process.env.LOCALAPPDATA ?? "",
  "ms-playwright",
  "chromium_headless_shell-1248",
  "chrome-headless-shell-win64",
  "chrome-headless-shell.exe",
)
const executablePath =
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ?? (existsSync(shell) ? shell : undefined)
const chave = "bivaque-material-web-v3"
const revisao = execFileSync("git", ["rev-parse", "HEAD"], { cwd: raiz, encoding: "utf8" }).trim()
const sujo = !!execFileSync("git", ["status", "--porcelain"], {
  cwd: raiz,
  encoding: "utf8",
}).trim()
const servidor = createServer((req, res) => {
  if (req.url?.split("?")[0] === "/referencia.html") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }).end(html)
  } else res.writeHead(404).end()
})
let browser
let servidorApp
const manifesto = {
  revisao,
  sujo,
  amostra,
  modo: mobileR72
    ? "HTML R72 hash congelado × app atual; captura real mobile; não aprova paridade por si só"
    : "telas reais da V1; não é aprovação das jornadas completas",
  referenciaSha256: sha(html),
  appUrl,
  arquivosDoAppSha256: Object.fromEntries(
    execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "apps/app"], {
      cwd: raiz,
      encoding: "utf8",
    })
      .trim()
      .split(/\r?\n/)
      .filter((p) => existsSync(join(raiz, p)))
      .map((p) => [p, sha(readFileSync(join(raiz, p)))]),
  ),
  fontesSha256: Object.fromEntries(
    ["material-symbols-outlined", "noto-sans", "noto-serif"].map((nome) => [
      nome,
      sha(readFileSync(join(raiz, `apps/app/public/fonts/${nome}.woff2`))),
    ]),
  ),
  capturas: [],
  erros: [],
}
const acoes = {
  criar: { proto: "#fab", app: '[data-acao="criar"]' },
  cidade: { proto: '[data-action="city"]:visible', app: '[data-acao="cidade"]' },
}

try {
  if (!process.env.BIVAQUE_APP_URL) {
    const resolverApp = createRequire(join(raiz, "apps/app/package.json"))
    const { preview } = await import(pathToFileURL(resolverApp.resolve("vite")).href)
    servidorApp = await preview({
      root: join(raiz, "apps/app"),
      preview: { host: "127.0.0.1", port: 3200, strictPort: true },
    })
  }
  await new Promise((ok) => servidor.listen(0, "127.0.0.1", ok))
  const referenciaUrl = `http://127.0.0.1:${servidor.address().port}/referencia.html`
  browser = await chromium.launch(executablePath ? { executablePath } : {})
  const rotas = mobileR72
    ? ROTAS.filter((rota) => ["inicio", "busca", "comunidade", "imoveis"].includes(rota.nome))
    : amostra
      ? ROTAS.filter((rota) => rota.nome === "inicio")
      : ROTAS
  const nomes = [
    ...rotas.map((rota) => rota.nome),
    ...(amostra || mobileR72 ? [] : ["entrada-sem-estado"]),
    ...(mobileR72 ? [] : ["criar", "cidade"]),
  ]
  const matriz = mobileR72
    ? nomes.flatMap((rota) =>
        [320, 375, 430].flatMap((largura) =>
          ["light", "dark"].map((tema) => ({
            id: `${rota}-${largura}-${tema}`,
            rota,
            largura,
            tema,
            altura: largura === 320 ? 700 : largura === 375 ? 812 : 932,
          })),
        ),
      )
    : matrizDeCaptura(nomes)
  for (const largura of mobileR72 ? [320, 375, 430] : [375, 1440])
    for (const tema of ["light", "dark"]) {
      const refContext = await createDeterministicContext(browser, { width: largura, theme: tema })
      const appContext = await createDeterministicContext(browser, { width: largura, theme: tema })
      const parContext = await browser.newContext({
        viewport: {
          width: largura * 2 + 16,
          height:
            (mobileR72
              ? largura === 320
                ? 700
                : largura === 375
                  ? 812
                  : 932
              : largura === 375
                ? 812
                : 900) + 36,
        },
      })
      try {
        const referencia = await refContext.newPage()
        const app = await appContext.newPage()
        const par = await parContext.newPage()
        if (mobileR72) {
          const altura = largura === 320 ? 700 : largura === 375 ? 812 : 932
          await Promise.all([
            referencia.setViewportSize({ width: largura, height: altura }),
            app.setViewportSize({ width: largura, height: altura }),
          ])
        }
        for (const [lado, pagina] of [
          ["html", referencia],
          ["app", app],
        ]) {
          pagina.setDefaultTimeout(15_000)
          pagina.on("pageerror", (erro) => manifesto.erros.push({ lado, mensagem: erro.message }))
        }
        // Fixture da referência nasce de um salvamento real da UI. O armazenamento
        // é usado apenas como entrada sintética; nenhum resultado é medido nele.
        await referencia.goto(`${referenciaUrl}#voce`)
        await stabilize(referencia)
        await referencia.locator('[data-action="settings"]:visible').first().click()
        await referencia.locator('[data-action="save-settings"]:visible').first().click()
        await referencia.locator("#dialog").waitFor({ state: "hidden" })
        const fixture = await referencia.evaluate(
          (key) => JSON.parse(localStorage.getItem(key)),
          chave,
        )
        assert.equal(fixture?.schema, 2, "Referência sem fixture da UI")
        const grupo = fixture.groups.find((item) => item.id === "g-familias")
        const publicacao = grupo.posts.find((item) => item.type === "question")
        assert(publicacao, "A referência precisa de publicação existente")
        const publicacaoApp = CENARIOS.live.publicacoes.find(
          (p) => p.group_id === grupo.id && p.content === publicacao.text,
        )
        assert(publicacaoApp, "Publicação da referência sem equivalente no app")
        const titulosNormais = {
          inicio: "Sua rede em Manaus",
          busca: "Buscar em Manaus",
          mercado: "Desapegos",
          anuncio: fixture.items.find((p) => p.id === "i1").title,
          negocio: fixture.biz.find((p) => p.id === "b1").name,
          pergunta: fixture.asks.find((p) => p.id === "a1").q,
          grupo: grupo.t,
          evento: fixture.events.find((p) => p.id === "e3").title,
          conversa: fixture.threads.find((p) => p.id === "t1").who,
          entrar: "Criar sua conta",
        }
        const ids = {
          conversa: "t1",
          anuncio: "i1",
          negocio: "b1",
          pergunta: "a1",
          grupo: "g-familias",
          publicacao: `g-familias~${publicacao.id}`,
          evento: "e3",
          pedido: "r-captura",
        }
        fixture.requests = [
          {
            id: "r-captura",
            city: "Manaus",
            cat: "Elétrica",
            spec: null,
            hood: "Flores",
            desc: "Instalar duas luminárias na sala do apartamento.",
            when: { kind: "asap", date: null },
            photos: [],
            status: "open",
            createdAt: Date.UTC(2026, 9, 13),
            expiresAt: Date.UTC(2026, 9, 20),
            proposals: [],
            who: fixture.profile.name,
            mine: true,
          },
        ]
        for (const cena of matriz.filter(
          (item) => item.largura === largura && item.tema === tema,
        )) {
          const sobreposicao = acoes[cena.rota]
          const rota = ROTAS.find(
            (item) =>
              item.nome ===
              (sobreposicao ? "inicio" : cena.rota === "entrada-sem-estado" ? "entrar" : cena.rota),
          )
          assert(rota, `Rota sem contrato: ${cena.rota}`)
          const entrada = rota.nome === "entrar"
          const caminho =
            cena.rota === "entrada-sem-estado"
              ? "/app/entrar"
              : "/app" +
                (rota.nome === "ajuda" ? rota.caminhoSemParametro : rota.caminho)
                  .replace(
                    "$id",
                    encodeURIComponent(
                      rota.nome === "publicacao" ? publicacaoApp.id : (ids[rota.nome] ?? ""),
                    ),
                  )
                  .replace("$estado", "conta")
          const hash = sobreposicao
            ? "inicio"
            : rota.nome === "mercado"
              ? "catalogo"
              : entrada
                ? cena.rota === "entrada-sem-estado"
                  ? "entrar"
                  : "entrar/conta"
                : rota.nome + (ids[rota.nome] ? `/${ids[rota.nome]}` : "")
          const tituloCatalogo = rota.titulo.replace("{cidade}", "Manaus")
          const tituloApp = titulosNormais[rota.nome] ?? tituloCatalogo
          const telaEsperada = ["mercado", "catalogo"].includes(rota.nome) ? "desapegos" : rota.nome
          const tituloRef =
            rota.nome === "mercado"
              ? "Desapegos"
              : rota.nome === "indisponivel"
                ? "Bivaque"
                : tituloCatalogo
          await referencia.evaluate(
            ({ key, dados, entrada }) =>
              localStorage.setItem(key, JSON.stringify({ ...dados, signedOut: entrada })),
            { key: chave, dados: fixture, entrada },
          )
          await referencia.goto("about:blank")
          await referencia.goto(`${referenciaUrl}#${hash}`)
          await stabilize(referencia)
          validarDestino(
            {
              caminho: decodeURIComponent(new URL(referencia.url()).hash.slice(1)),
              titulo: (await referencia.title()).replace(/ · Bivaque$/, ""),
              pronto: await referencia.locator("#page").isVisible(),
            },
            { caminho: hash, titulo: tituloRef },
          )
          if (rota.nome !== "indisponivel")
            assert(
              !(await referencia.locator("#page").innerText()).includes("Página indisponível"),
              `Referência indisponível: ${hash}`,
            )
          await app.goto("about:blank")
          const resposta = await app.goto(`${appUrl}${caminho}`)
          assert(resposta?.ok(), `App HTTP incorreto: ${caminho}`)
          await app.locator("[data-titulo-da-tela]").waitFor({ state: "visible" })
          await app.waitForFunction(
            () => document.querySelector('[data-esqueleto="lista"]') === null,
          )
          assert.equal(
            await app.locator('[data-prova="controles-do-app"]').count(),
            0,
            "Captura não pode usar o modo de prova",
          )
          await app.evaluate(() => document.fonts.ready)
          validarDestino(
            {
              caminho: decodeURIComponent(new URL(app.url()).pathname),
              titulo: await app.locator("[data-titulo-da-tela]").innerText(),
              pronto: await app.locator("[data-tela]").isVisible(),
              tela: await app.locator("[data-tela]").getAttribute("data-tela"),
            },
            { caminho: decodeURIComponent(caminho), titulo: tituloApp, tela: telaEsperada },
          )
          if (sobreposicao) {
            await referencia.locator(sobreposicao.proto).first().click()
            await app.locator(sobreposicao.app).click()
            await app
              .locator(`[data-sobreposicao="${cena.rota === "criar" ? "menu-criar" : "cidade"}"]`)
              .waitFor({ state: "visible" })
            await stabilize(referencia)
          } else {
            await app.mouse.move(0, 0)
            await app.evaluate(() => document.activeElement?.blur())
          }
          assert.equal(manifesto.erros.length, 0, "Erro de runtime antes da captura")
          const esquerda = `${cena.id}-html.png`
          const direita = `${cena.id}-app.png`
          const pngEsquerda = await referencia.screenshot({
            path: join(saida, esquerda),
            animations: "disabled",
          })
          const pngDireita = await app.screenshot({
            path: join(saida, direita),
            animations: "disabled",
          })
          await par.setContent(
            htmlDoPar({
              esquerda: `data:image/png;base64,${pngEsquerda.toString("base64")}`,
              direita: `data:image/png;base64,${pngDireita.toString("base64")}`,
              largura,
            }),
          )
          await par
            .locator("img")
            .evaluateAll((imagens) => Promise.all(imagens.map((imagem) => imagem.decode())))
          const arquivo = `${cena.id}-par.png`
          const bytesPar = await par.screenshot({ path: join(saida, arquivo), fullPage: true })
          manifesto.capturas.push({
            ...cena,
            caminho,
            hash,
            tituloApp,
            tituloRef,
            esquerda,
            direita,
            arquivo,
            sha256: sha(bytesPar),
            fontes: await app.evaluate(() =>
              Array.from(document.fonts).map(({ family, status }) => ({ family, status })),
            ),
          })
          console.log(`par ${manifesto.capturas.length}/${matriz.length}: ${arquivo}`)
        }
      } finally {
        await Promise.all([refContext.close(), appContext.close(), parContext.close()])
      }
    }
  assert.equal(manifesto.capturas.length, matriz.length, "Matriz incompleta")
  await browser.close()
  browser = undefined
  assert.equal(manifesto.erros.length, 0, "Erro de runtime ao concluir a captura")
  const cards = manifesto.capturas
    .map(
      (item) =>
        `<article><h2>${item.id}</h2><a href="${item.arquivo}"><img loading="lazy" src="${item.arquivo}" alt="Par ${item.id}"></a></article>`,
    )
    .join("\n")
  writeFileSync(
    join(saida, "index.html"),
    `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Bivaque — onda 1</title><style>body{font:16px system-ui;background:#eeece6;color:#173b2b;max-width:1500px;margin:32px auto;padding:16px}img{max-width:100%}article{border-top:1px solid #aaa;margin-top:32px}</style><h1>Onda 1 — HTML à esquerda, app à direita</h1><p>Escopo: casca, navegação, temas e componentes. O conteúdo das jornadas das ondas 2 a 8 permanece pendente. Mercado e a barra seguem a mudança aprovada no ADR. Captura não prova interação nem aprovação visual.</p><p>Revisão ${revisao}; árvore com alterações: ${sujo}; ${manifesto.capturas.length} pares.</p>${cards}</html>`,
  )
  writeFileSync(
    join(raiz, ".visual", "onda-1", amostra ? "ultima-amostra.json" : "ultimo.json"),
    JSON.stringify({ pasta, pares: manifesto.capturas.length }),
  )
} finally {
  writeFileSync(join(saida, "manifesto.json"), JSON.stringify(manifesto, null, 2))
  if (browser) await browser.close()
  if (servidorApp) {
    servidorApp.httpServer.closeAllConnections()
    await new Promise((ok) => servidorApp.httpServer.close(ok))
  }
  await new Promise((ok) => servidor.close(ok))
}
