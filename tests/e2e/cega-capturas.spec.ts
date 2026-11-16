import { mkdirSync } from "node:fs"
import { dirname, join } from "node:path"
import { type BrowserContext, expect, type Page, test } from "@playwright/test"
import { arquivoDaCaptura, ROTEIRO, type TelaDoRoteiro } from "./cega-capturas-roteiro"
import { semearSessaoDeMembro } from "./entrada-real-ajuda"

/**
 * Capturas das jornadas para a revisão às cegas pela régua Nextdoor (DS-022).
 *
 * O revisor externo só vê imagens, e elas precisam sair do CI completo (não há
 * banco local em toda máquina). Este spec percorre o roteiro de
 * `cega-capturas-roteiro.ts` em cada projeto (375, 768, 1440), entra com a
 * persona do seed pelos ajudantes que os specs de jornada já usam, espera o
 * seletor de dado real, e grava `.visual/cega/<jornada>/<tela>-<largura>-claro.png`
 * com a página inteira. O artefato `visual-evidence` do workflow publica
 * `.visual/` inteiro.
 *
 * Sem a tag `@stateful`: o spec só lê e navega, então roda no lote paralelo —
 * é esse job que publica o artefato. Nenhum passo do roteiro grava no banco.
 */

const LARGURAS: Readonly<Record<string, number>> = {
  "mobile-375": 375,
  "tablet-768": 768,
  "desktop-1440": 1440,
}

const PRAZO_MS = 30_000

async function entrarComo(contexto: BrowserContext, persona: string): Promise<void> {
  await contexto.clearCookies()
  await semearSessaoDeMembro(contexto, persona)
}

/** Abre a tela e executa os passos que a revelam (menu, busca, formulário). */
async function abrirTela(page: Page, tela: TelaDoRoteiro): Promise<void> {
  await page.goto(tela.rota)
  for (const passo of tela.passos ?? []) {
    const alvo = page.locator(passo.alvo).first()
    await expect(alvo, `passo "${passo.tipo} ${passo.alvo}" não apareceu`).toBeVisible({
      timeout: PRAZO_MS,
    })
    if (passo.tipo === "clique") {
      await alvo.click()
    } else {
      await alvo.fill(passo.valor ?? "")
    }
  }
}

async function capturar(page: Page, jornada: string, tela: string, largura: number): Promise<void> {
  const arquivo = join(process.cwd(), arquivoDaCaptura(jornada, tela, largura))
  mkdirSync(dirname(arquivo), { recursive: true })
  // As fontes e o movimento reduzido entram antes da captura: a imagem é o que
  // o revisor julga, e texto em fonte de fallback julga a máquina, não a tela.
  await page.evaluate(async () => {
    await document.fonts.ready
  })
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.screenshot({ path: arquivo, fullPage: true, animations: "disabled" })
}

for (const jornada of ROTEIRO) {
  test.describe(`${jornada.jornada} — capturas da régua`, () => {
    test(`${jornada.jornada} · ${jornada.titulo}`, async ({ page, context }, info) => {
      test.setTimeout(300_000)
      const largura = LARGURAS[info.project.name]
      if (largura === undefined) {
        throw new Error(`Projeto sem largura declarada: ${info.project.name}`)
      }

      let personaAtual: string | null = null
      for (const tela of jornada.telas) {
        try {
          if (tela.persona !== personaAtual) {
            await entrarComo(context, tela.persona)
            personaAtual = tela.persona
          }
          await abrirTela(page, tela)
          const prova =
            tela.texto === undefined
              ? page.locator(tela.seletor).first()
              : page.locator(tela.seletor, { hasText: tela.texto }).first()
          await expect(
            prova,
            `a tela "${tela.id}" não carregou dado real em ${tela.rota} ` +
              `(esperava ${tela.seletor}${tela.texto === undefined ? "" : ` com "${tela.texto}"`})`,
          ).toBeVisible({ timeout: PRAZO_MS })
          await capturar(page, jornada.jornada, tela.id, largura)
        } catch (erro) {
          const motivo = erro instanceof Error ? erro.message : String(erro)
          throw new Error(`Captura "${jornada.jornada}/${tela.id}" falhou: ${motivo}`)
        }
      }
    })
  })
}
