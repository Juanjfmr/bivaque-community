// Jornada simulada: o lado Playwright do registro em journey-ledger.ts.
//
// Um spec abre a jornada pelo id de scripts/visual/flows/journeys.json e registra cada passo que
// executa no app de verdade. Cada passo vira um test.step com nome legível, uma captura da tela
// alcançada e uma linha no registro. O registro é gravado a cada passo em
// .visual/journeys/<jornada>/<projeto>/registro.json, para o relatório mostrar até onde a jornada
// chegou mesmo quando ela falha no meio. scripts/visual/journey-report.mjs monta, a partir
// disso, a comparação prancha x tela real.
//
// Sem import.meta: specs viram CJS. Caminhos saem de process.cwd(), a raiz do repositório.

import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { type Page, type TestInfo, test } from "@playwright/test"
import {
  type EntryInput,
  findJourney,
  type JourneyDoc,
  JourneyLedger,
  type Kind,
  type LedgerSummary,
} from "./journey-ledger"

const JOURNEYS_FILE = join(process.cwd(), "scripts", "visual", "flows", "journeys.json")
export const JOURNEY_OUT = join(process.cwd(), ".visual", "journeys")

function loadDoc(): JourneyDoc {
  return JSON.parse(readFileSync(JOURNEYS_FILE, "utf8")) as JourneyDoc
}

export interface StepOptions {
  /** Quem está agindo, quando a jornada tem mais de uma persona. */
  persona?: string
  /** O passo só foi alcançado digitando a URL: diga por que nenhum link leva até ele. */
  atalho?: string
}

export interface SimulatedJourney {
  readonly ledger: JourneyLedger
  /**
   * `run` leva `page` até a tela citada por `ref` e afirma o que a prancha mostra nela; a
   * captura é dessa tela. A ação que leva ao passo seguinte começa no `run` do passo seguinte.
   */
  passo(ref: string, page: Page, run: () => Promise<void>, options?: StepOptions): Promise<void>
  /** Mesmo contrato para um desvio (erro, retomada) que a jornada declara. */
  desvio(ref: string, page: Page, run: () => Promise<void>, options?: StepOptions): Promise<void>
  /** Passo que o app ainda não entrega: fica registrado com motivo, nunca como observado. */
  lacuna(ref: string, motivo: string): void
  /** Falha se algum passo da jornada ficou sem registro. */
  concluir(): LedgerSummary
}

export function simulateJourney(testInfo: TestInfo, id: string): SimulatedJourney {
  const ledger = new JourneyLedger(findJourney(loadDoc(), id))
  const dir = join(JOURNEY_OUT, id, testInfo.project.name)
  // Cada execução reescreve a pasta: captura de uma rodada anterior não pode posar de evidência.
  rmSync(dir, { recursive: true, force: true })
  mkdirSync(dir, { recursive: true })

  const persist = (summary: LedgerSummary) => {
    const payload = {
      ...summary,
      projeto: testInfo.project.name,
      spec: testInfo.titlePath.join(" › "),
      geradoEm: new Date().toISOString(),
    }
    writeFileSync(join(dir, "registro.json"), `${JSON.stringify(payload, null, 2)}\n`)
  }
  persist(ledger.summary())

  const observe = async (
    tipo: Kind,
    ref: string,
    page: Page,
    run: () => Promise<void>,
    options: StepOptions = {},
  ) => {
    const acao = ledger.journey.etapas.flatMap((e) => e.passos).find((p) => p.tela === ref)?.acao
    await test.step(`${tipo} ${ref}${acao ? ` — ${acao}` : ""}`, async () => {
      await run()
      const ordem = ledger.summary().registros.length + 1
      const file = `${String(ordem).padStart(2, "0")}-${ref.replace("#", "_")}.png`
      const body = await page.screenshot({ path: join(dir, file) })
      await testInfo.attach(`${ledger.journey.id} ${ref}`, { body, contentType: "image/png" })
      const input: EntryInput = { url: new URL(page.url()).pathname, captura: file }
      if (options.persona) input.persona = options.persona
      if (options.atalho) {
        input.atalho = options.atalho
        testInfo.annotations.push({ type: "atalho", description: `${ref}: ${options.atalho}` })
      }
      ledger.record(tipo, ref, "observado", input)
      persist(ledger.summary())
    })
  }

  return {
    ledger,
    passo: (ref, page, run, options) => observe("passo", ref, page, run, options),
    desvio: (ref, page, run, options) => observe("desvio", ref, page, run, options),
    lacuna(ref, motivo) {
      ledger.record("passo", ref, "lacuna", { motivo })
      testInfo.annotations.push({ type: "lacuna", description: `${ref}: ${motivo}` })
      persist(ledger.summary())
    },
    concluir() {
      const summary = ledger.conclude()
      persist(summary)
      return summary
    },
  }
}
