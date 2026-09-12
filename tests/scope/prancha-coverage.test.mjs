import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import test from "node:test"
import {
  checkCoverage,
  INVENTORY_PATH,
  readContractCitations,
  readWebBoards,
} from "../../scripts/agents/prancha-coverage.mjs"

// A entrega de setembro perdeu tela de dois jeitos. O primeiro foi humano: contrato escrito sem
// abrir a imagem — está registrado em docs/agents/HANDOFF-2026-09-09-fidelidade-pranchas.md e a
// correção é a leitura versionada em docs/agents/PRANCHAS-WEB-RESTANTES.md.
//
// O segundo é mecânico e é o que este teste trava: prancha web que não entra em contrato nenhum
// desaparece em silêncio. Citar não prova entrega — prova que alguém assumiu a tela.

const root = join(import.meta.dirname, "..", "..")

test("toda prancha web tem pelo menos um contrato que a cita", () => {
  const { orphans, total } = checkCoverage()
  assert.equal(
    orphans.length,
    0,
    `pranchas web sem contrato: ${orphans.join(", ")} (de ${total}) — crie o contrato ou registre a decisão de não construir`,
  )
})

test("o manifesto continua descrevendo as 35 pranchas web", () => {
  // Se o número mudar, alguém acrescentou ou removeu referência visual: o inventário e a fila de
  // execução precisam mudar junto, e não em silêncio. A 32ª entrou em 12/09/2026
  // (70-web-evento-organizar, autoridade do RECON-029) e a 33ª no mesmo dia
  // (71-web-auth-recuperacao, autoridade do RECON-018).
  assert.equal(readWebBoards().length, 35)
})

test("a leitura das pranchas restantes existe e cobre as que ainda serão construídas", () => {
  assert.ok(existsSync(INVENTORY_PATH), "docs/agents/PRANCHAS-WEB-RESTANTES.md não existe")

  const source = readFileSync(INVENTORY_PATH, "utf8")
  // As pranchas cujo contrato é posterior ao handoff de 09/09 precisam de leitura própria:
  // são exatamente aquelas sobre as quais nenhuma sessão pode dizer "segue a prancha" de memória.
  const mustBeRead = [
    "13-web-mercado",
    "17-web-pedido-servico",
    "19-web-imoveis",
    "21-web-meus-anuncios",
    "23-web-meu-negocio",
    "25-web-guia-referencia",
    "36-web-auth-entrada",
    "37-web-auth-confirmacao",
    "38-web-auth-admissao",
    "39-web-onboarding-contexto",
    "61-web-explorar-servicos",
    "62-web-prestador-pedido",
    "63-web-mercado-anuncio",
    "64-web-mercado-edicao",
    "65-web-imoveis-alertas",
    "67-web-evento-informacoes",
    "69-web-identidade-recuperacao",
    "70-web-evento-organizar",
    "71-web-auth-recuperacao",
    "72-web-auth-link-invalido",
    "73-web-comunidade-pedidos",
  ]

  for (const board of mustBeRead) {
    assert.ok(source.includes(board), `${board} não tem leitura em PRANCHAS-WEB-RESTANTES.md`)
  }
})

test("cada contrato que cita uma prancha também cita a leitura dela", () => {
  // O par é o ponto: a imagem é a verdade, a leitura é o que um modelo sem visão consegue
  // conferir item a item. Contrato que cita só um dos dois repete o erro que custou a sessão.
  const citations = readContractCitations()
  const offenders = []

  for (const [, tasks] of citations) {
    for (const task of tasks) {
      const path = join(root, "docs", "agents", "tasks", `${task}.task.yml`)
      const source = readFileSync(path, "utf8")
      const isPostHandoff = Number(task.split("-")[1]) >= 18
      if (isPostHandoff && !source.includes("PRANCHAS-WEB-RESTANTES.md")) offenders.push(task)
    }
  }

  assert.deepEqual([...new Set(offenders)], [])
})
