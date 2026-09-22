// Registro de cobertura de uma jornada simulada.
//
// scripts/visual/flows/journeys.json descreve cada jornada a partir das pranchas: persona,
// passos ordenados e desvios, cada um citando uma tela como '<prancha>#<indice>'. O próprio
// arquivo avisa que é documental — montado das pranchas, não gravado em runtime.
//
// Este módulo é a ponte: um spec que simula a jornada registra, passo a passo, o que observou no
// app de verdade. O registro recusa tela que a jornada não cita (o spec não pode inventar passo)
// e, ao concluir, acusa passo que ficou sem registro (o spec não pode pular passo calado). Um
// passo que o app ainda não consegue entregar entra como LACUNA com motivo — visível no
// relatório, nunca contado como observado. Um passo alcançado digitando a URL, porque nenhum
// link do app leva até ele, é observado mas carrega ATALHO com o motivo: a tela funciona, a porta
// não existe.
//
// Sem dependência do Playwright para o teste de unidade poder exercitar as regras.

export interface JourneyStep {
  tela: string
  acao?: string
}

export interface JourneyDeviation {
  tela: string
  apos: string
  quando: string
}

export interface JourneyDef {
  id: string
  titulo: string
  persona: string
  etapas: Array<{ nome: string; passos: JourneyStep[] }>
  desvios?: Array<JourneyDeviation | string>
}

export interface JourneyDoc {
  journeys: JourneyDef[]
}

export type Kind = "passo" | "desvio"
export type Outcome = "observado" | "lacuna"

export interface Entry {
  readonly ordem: number
  readonly tipo: Kind
  readonly ref: string
  readonly etapa: string | null
  readonly acao: string | null
  readonly quando: string | null
  readonly resultado: Outcome
  readonly persona: string | null
  readonly motivo: string | null
  readonly atalho: string | null
  readonly url: string | null
  readonly captura: string | null
}

export interface EntryInput {
  persona?: string
  motivo?: string
  atalho?: string
  url?: string
  captura?: string
}

export interface LedgerSummary {
  jornada: string
  titulo: string
  persona: string
  estado: "incompleta" | "concluida"
  registros: readonly Entry[]
  passosPendentes: string[]
  desviosNaoExercitados: string[]
  lacunas: number
  atalhos: number
}

export function findJourney(doc: JourneyDoc, id: string): JourneyDef {
  const journey = doc.journeys.find((candidate) => candidate.id === id)
  if (!journey) throw new Error(`jornada inexistente em journeys.json: ${id}`)
  return journey
}

function deviationsOf(journey: JourneyDef): JourneyDeviation[] {
  return (journey.desvios ?? []).filter(
    (desvio): desvio is JourneyDeviation => typeof desvio !== "string",
  )
}

export class JourneyLedger {
  readonly journey: JourneyDef
  private readonly entries: Entry[] = []
  private concluded = false

  constructor(journey: JourneyDef) {
    this.journey = journey
  }

  /** O passo da jornada que cita esta tela, com a etapa a que pertence. */
  private stepFor(ref: string): { etapa: string; acao: string | null } | null {
    for (const etapa of this.journey.etapas) {
      const passo = etapa.passos.find((candidate) => candidate.tela === ref)
      if (passo) return { etapa: etapa.nome, acao: passo.acao ?? null }
    }
    return null
  }

  record(tipo: Kind, ref: string, resultado: Outcome, input: EntryInput = {}): Entry {
    if (this.concluded) throw new Error(`jornada ${this.journey.id} já concluída`)
    if (resultado === "lacuna" && !input.motivo?.trim()) {
      throw new Error(`lacuna em ${ref} exige motivo`)
    }
    if (input.atalho !== undefined && !input.atalho.trim()) {
      throw new Error(`atalho em ${ref} exige motivo`)
    }
    if (this.entries.some((entry) => entry.tipo === tipo && entry.ref === ref)) {
      throw new Error(`${tipo} ${ref} já registrado em ${this.journey.id}`)
    }

    let etapa: string | null = null
    let acao: string | null = null
    let quando: string | null = null
    if (tipo === "passo") {
      const step = this.stepFor(ref)
      if (!step) throw new Error(`a jornada ${this.journey.id} não tem o passo ${ref}`)
      etapa = step.etapa
      acao = step.acao
    } else {
      const deviation = deviationsOf(this.journey).find((candidate) => candidate.tela === ref)
      if (!deviation) throw new Error(`a jornada ${this.journey.id} não tem o desvio ${ref}`)
      quando = deviation.quando
    }

    const entry: Entry = {
      ordem: this.entries.length + 1,
      tipo,
      ref,
      etapa,
      acao,
      quando,
      resultado,
      persona: input.persona ?? null,
      motivo: input.motivo ?? null,
      atalho: input.atalho ?? null,
      url: input.url ?? null,
      captura: input.captura ?? null,
    }
    this.entries.push(entry)
    return entry
  }

  pendingSteps(): string[] {
    const done = new Set(this.entries.filter((e) => e.tipo === "passo").map((e) => e.ref))
    return this.journey.etapas
      .flatMap((etapa) => etapa.passos.map((passo) => passo.tela))
      .filter((ref) => !done.has(ref))
  }

  /** Falha se algum passo ficou sem registro; desvio não exercitado só aparece no resumo. */
  conclude(): LedgerSummary {
    const pending = this.pendingSteps()
    if (pending.length > 0) {
      throw new Error(`jornada ${this.journey.id} terminou sem registrar: ${pending.join(", ")}`)
    }
    this.concluded = true
    return this.summary()
  }

  summary(): LedgerSummary {
    const exercised = new Set(this.entries.filter((e) => e.tipo === "desvio").map((e) => e.ref))
    return {
      jornada: this.journey.id,
      titulo: this.journey.titulo,
      persona: this.journey.persona,
      estado: this.concluded ? "concluida" : "incompleta",
      registros: [...this.entries],
      passosPendentes: this.pendingSteps(),
      desviosNaoExercitados: deviationsOf(this.journey)
        .map((desvio) => desvio.tela)
        .filter((ref) => !exercised.has(ref)),
      lacunas: this.entries.filter((entry) => entry.resultado === "lacuna").length,
      atalhos: this.entries.filter((entry) => entry.atalho !== null).length,
    }
  }
}
