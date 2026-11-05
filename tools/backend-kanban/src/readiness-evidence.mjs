import { execFileSync } from "node:child_process"
import { realpathSync, statSync } from "node:fs"
import { isAbsolute, relative, resolve } from "node:path"

const globalInputs = [
  "package.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "tsconfig.base.json",
  "tsconfig.json",
  "biome.json",
  "vitest.config.mjs",
  "vitest.config.ts",
  "vitest.config.mts",
  "playwright.config.ts",
  ".npmrc",
  ".github/workflows",
  "scripts",
]

export async function inspectEvidence(root, board, revision, verifyUrl = async () => false) {
  const unchanged = {}
  const evidenceValid = {}
  const targets = [
    ...board.launch.journeys,
    ...board.launch.gates.map((id) => ({ id, cardId: id })),
  ]
  for (const target of targets) {
    const card = board.cards.find((c) => c.id === target.cardId)
    for (const [layer, receipt] of Object.entries(card.acceptance ?? {})) {
      const key = `${target.id}:${layer}`
      if (!receipt?.proof?.length) continue
      const valid = await Promise.all(
        receipt.proof.map(async (reference) => {
          if (/^https:\/\//.test(reference)) return verifyUrl(reference, receipt.revision)
          if (isAbsolute(reference) || reference.includes(":")) return false
          try {
            const path = realpathSync(resolve(root, reference))
            const within = relative(realpathSync(root), path)
            return (
              within !== ".." &&
              !within.startsWith("../") &&
              !within.startsWith("..\\") &&
              !isAbsolute(within) &&
              statSync(path).isFile()
            )
          } catch {
            return false
          }
        }),
      )
      evidenceValid[key] = valid.every(Boolean)
      const paths = board.launch.paths?.[layer]
      if (!/^[a-f0-9]{40}$/i.test(receipt.revision ?? "") || !paths?.length) continue
      try {
        execFileSync(
          "git",
          [
            "diff",
            "--quiet",
            receipt.revision,
            revision,
            "--",
            ...paths,
            ...globalInputs,
            board.launch.source,
          ],
          { cwd: root, stdio: "ignore" },
        )
        unchanged[key] = true
      } catch {
        unchanged[key] = false
      }
    }
  }
  return { unchanged, evidenceValid }
}
