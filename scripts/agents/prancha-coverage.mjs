#!/usr/bin/env node
// prancha-coverage.mjs — nenhuma prancha web fica sem dono.
//
// A entrega de setembro perdeu telas de dois jeitos: contrato escrito sem abrir a imagem, e
// prancha que simplesmente não entrou em contrato nenhum. O primeiro problema é humano e mora
// em docs/agents/PRANCHAS-WEB-RESTANTES.md. O segundo é mecânico, e é o que este módulo resolve:
// confronta o manifesto do guia visual com os contratos de tarefa e falha alto quando uma
// prancha web não é citada por nenhum deles.
//
//   node scripts/agents/prancha-coverage.mjs           # relatório legível, exit 1 se faltar
//   node scripts/agents/prancha-coverage.mjs --json    # saída estruturada
//
// Citar não é entregar. Este módulo mede COBERTURA DE CONTRATO, não implementação — a prova de
// que a tela existe continua sendo runtime, não a existência de um arquivo YAML.

import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

const root = join(import.meta.dirname, "..", "..")

export const MANIFEST_PATH = join(
  root,
  "docs",
  "design",
  "visual-guide-2026-09-06",
  "manifest.json",
)

export const TASKS_DIR = join(root, "docs", "agents", "tasks")

export const INVENTORY_PATH = join(root, "docs", "agents", "PRANCHAS-WEB-RESTANTES.md")

// Somente pranchas web. Mobile é projeto futuro e não bloqueia a conclusão web — decisão
// registrada na especificação de 08/09/2026 §1.
const isWebBoard = (file) => /^\d+-web-[a-z0-9-]+\.png$/.test(String(file ?? ""))

export function readWebBoards(manifestPath = MANIFEST_PATH) {
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"))
  const artifacts = Array.isArray(manifest.artifacts) ? manifest.artifacts : []
  return artifacts
    .map((entry) => String(entry.file ?? ""))
    .filter(isWebBoard)
    .sort()
}

export function readContractCitations(tasksDir = TASKS_DIR) {
  const citations = new Map()
  for (const name of readdirSync(tasksDir)) {
    if (!name.endsWith(".task.yml") || name === "TEMPLATE.task.yml") continue
    const source = readFileSync(join(tasksDir, name), "utf8")
    const taskId = name.replace(/\.task\.yml$/, "")
    for (const match of source.matchAll(/(\d+-web-[a-z0-9-]+)\.png/g)) {
      const board = `${match[1]}.png`
      if (!citations.has(board)) citations.set(board, [])
      if (!citations.get(board).includes(taskId)) citations.get(board).push(taskId)
    }
  }
  return citations
}

export function readInventorySections(inventoryPath = INVENTORY_PATH) {
  const source = readFileSync(inventoryPath, "utf8")
  const covered = new Set()
  for (const match of source.matchAll(/^##\s+(.+)$/gm)) {
    for (const board of match[1].matchAll(/(\d+-web-[a-z0-9-]+)/g)) {
      covered.add(`${board[1]}.png`)
    }
  }
  return covered
}

export function checkCoverage(options = {}) {
  const boards = readWebBoards(options.manifestPath)
  const citations = readContractCitations(options.tasksDir)
  const inventory = readInventorySections(options.inventoryPath)

  const rows = boards.map((board) => ({
    board,
    contracts: citations.get(board) ?? [],
    inventoried: inventory.has(board),
  }))

  return {
    total: boards.length,
    rows,
    orphans: rows.filter((row) => row.contracts.length === 0).map((row) => row.board),
  }
}

function main() {
  const json = process.argv.includes("--json")
  const result = checkCoverage()

  if (json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
  } else {
    for (const row of result.rows) {
      const owner = row.contracts.length > 0 ? row.contracts.join(", ") : "SEM CONTRATO"
      const read = row.inventoried ? "lida" : "sem leitura"
      process.stdout.write(`  ${row.board.padEnd(34)} ${owner.padEnd(24)} ${read}\n`)
    }
    process.stdout.write(
      `\n${result.total} prancha(s) web, ${result.orphans.length} sem contrato.\n`,
    )
  }

  process.exit(result.orphans.length === 0 ? 0 : 1)
}

if (process.argv[1]?.endsWith("prancha-coverage.mjs")) main()
