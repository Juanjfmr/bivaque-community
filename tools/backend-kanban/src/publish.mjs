import { execFileSync } from "node:child_process"
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { validateBoard } from "./board-lib.mjs"
import { inspectEvidence } from "./readiness-evidence.mjs"
import { collectGithub, verifyGithubReference } from "./readiness-github.mjs"
import { buildReadiness } from "./readiness-lib.mjs"

const directory = fileURLToPath(new URL("..", import.meta.url))
const root = resolve(directory, "../..")
const option = (name) => {
  const index = process.argv.indexOf(name)
  return index === -1 ? undefined : process.argv[index + 1]
}
const output = resolve(option("--out") ?? resolve(directory, "dist"))
const board = JSON.parse(readFileSync(resolve(directory, "public/board.json"), "utf8"))
const errors = validateBoard(board)
if (errors.length) throw new Error(errors.join("\n"))
const git = (args) =>
  execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim()
const revision = git(["rev-parse", "HEAD"])
const useGithub = process.argv.includes("--github")
const token = useGithub ? (process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN) : undefined
const repository = process.env.GITHUB_REPOSITORY ?? "Juanjfmr/bivaque-community"
const context = {
  revision,
  generatedAt: new Date().toISOString(),
  checks: {},
  ...(await inspectEvidence(root, board, revision, (reference, proofRevision) =>
    token
      ? verifyGithubReference(reference, { repository, token, revision: proofRevision })
      : false,
  )),
}
const previousPath = option("--previous")
if (previousPath && existsSync(previousPath))
  context.previous = JSON.parse(readFileSync(previousPath, "utf8"))
if (useGithub) {
  if (!token) throw new Error("GITHUB_TOKEN ou GH_TOKEN obrigatório para consultar as execuções")
  try {
    Object.assign(
      context,
      await collectGithub({
        repository,
        token,
        revision,
        requirements: board.launch.checks,
      }),
    )
  } catch (error) {
    context.refreshError = true
    console.error(
      `Atualização inconclusiva: ${error.message}; nenhum resultado anterior será tratado como prova nova.`,
    )
  }
}
const report = buildReadiness(board, context)
mkdirSync(output, { recursive: true })
for (const file of ["index.html", "styles.css", "app.js"])
  copyFileSync(resolve(directory, "public", file), resolve(output, file))
writeFileSync(resolve(output, "snapshot.json"), `${JSON.stringify(report, null, 2)}\n`)
console.log(
  `Painel gerado: ${report.journeys.length} jornadas, ${report.metrics.integration.verified} comprovadas; versão ${revision.slice(0, 8)}.`,
)
