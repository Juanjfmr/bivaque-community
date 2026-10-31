import { spawnSync } from "node:child_process"
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs"
import { join, resolve } from "node:path"

const workspace = "C:/Users/juana/.codex/worktrees/figma-production/bivaque-community"
const stateDir = join(workspace, ".visual/opencode-figma-20261005/orchestration")
mkdirSync(stateDir, { recursive: true })
const stateFile = join(stateDir, "sessions.json")
let state
try {
  state = JSON.parse(readFileSync(stateFile, "utf8"))
} catch (error) {
  if (error.code !== "ENOENT") throw error
  state = { implementer: "ses_ef21a4896ffeBHjUCPxo7A4Sjk" }
}
const runtime = join(process.env.APPDATA, "ai.opencode.desktop/cli")
const versions = readdirSync(runtime)
  .filter((version) => /^\d+\.\d+\.\d+$/.test(version))
  .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
if (!versions.length) throw new Error("OpenCode CLI não encontrado")
const exe = join(runtime, versions.at(-1), "opencode-cli.exe")

function api(operation, body, sessionID) {
  const args = ["api", operation]
  if (sessionID) args.push("--param", `sessionID=${sessionID}`)
  if (body) args.push("--data", JSON.stringify(body))
  const result = spawnSync(exe, args, {
    cwd: workspace,
    encoding: "utf8",
    timeout: 45_000,
    maxBuffer: 32 * 1024 * 1024,
    windowsHide: true,
  })
  if (result.error || result.status !== 0) {
    throw new Error(`${operation}: ${result.error?.message ?? result.stderr?.slice(0, 800)}`)
  }
  const payload = JSON.parse(result.stdout)
  return payload.data ?? payload
}

function save() {
  writeFileSync(stateFile, `${JSON.stringify(state, null, 2)}\n`)
}

const [command = "status", role, ...rest] = process.argv.slice(2)
const active = api("session.active")
if (command === "status") {
  for (const [name, id] of Object.entries(state)) {
    if (typeof id !== "string" || !id.startsWith("ses_")) continue
    const info = api("session.get", undefined, id)
    const exported = api("experimental.session.export", undefined, id)
    const recent = exported.messages.filter((m) => m.type === "assistant").slice(-3)
    console.log(
      JSON.stringify({
        role: name,
        id,
        model: info.model,
        active: active[id] ?? null,
        time: info.time,
        recent: recent.map((m) => ({
          time: m.time,
          content: (m.content ?? []).map((part) =>
            part.type === "text"
              ? { text: part.text.slice(0, 1600) }
              : { tool: part.name, status: part.state?.status },
          ),
        })),
      }),
    )
  }
} else if (command === "send") {
  if (role !== "implementer") throw new Error("Orientações de implementação só ao escritor")
  if (active[state.reviewer] || active[state.verifier]) {
    throw new Error("Revisão/prova ativa: não retomar escritor no candidato em avaliação")
  }
  if (!rest.length) throw new Error("Mensagem necessária")
  console.log(JSON.stringify(api("session.prompt", { text: rest.join(" ") }, state.implementer)))
} else if (command === "start") {
  if (!["reviewer", "verifier"].includes(role)) throw new Error("Papel inválido")
  if (active[state.implementer]) throw new Error("Executor ativo: aguarde candidato estável")
  if (state[role] && active[state[role]]) throw new Error("Este papel já está ativo")
  const contract = rest[0]
  if (!/^docs\/agents\/tasks\/[A-Za-z0-9_-]+\.task\.yml$/.test(contract ?? "")) {
    throw new Error("Contrato válido necessário")
  }
  readFileSync(resolve(workspace, contract), "utf8")
  if (role === "verifier" && rest[1] !== "--review-approved") {
    throw new Error("Codex deve validar a revisão antes da prova")
  }
  const model = role === "reviewer" ? "glm-5.3" : "deepseek-v4.1-flash"
  const permissions =
    role === "reviewer"
      ? [
          { action: "*", resource: "*", effect: "deny" },
          ...["read", "grep", "glob"].map((action) => ({ action, resource: "*", effect: "allow" })),
          ...["git diff*", "git status*", "git show*", "git log*"].map((resource) => ({
            action: "shell",
            resource,
            effect: "allow",
          })),
        ]
      : [
          { action: "*", resource: "*", effect: "allow" },
          { action: "edit", resource: "*", effect: "deny" },
          { action: "write", resource: "*", effect: "deny" },
          ...[
            "*--linked*",
            "*git reset*",
            "*git clean*",
            "*git push*",
            "*supabase stop*",
            "*db reset*",
            "*db:reset*",
          ].map((resource) => ({ action: "shell", resource, effect: "deny" })),
        ]
  const info = api("session.create", {
    title: `Bivaque Figma — ${role} — ${contract.split("/").at(-1)}`,
    model: { providerID: "alibaba-token-plan", id: model },
    location: { directory: workspace },
    permissions: [
      ...permissions,
      { action: "task", resource: "*", effect: "deny" },
      ...["*.env", "*.env.*"].map((resource) => ({
        action: "read",
        resource,
        effect: "deny",
      })),
    ],
  })
  state[role] = info.id
  save()
  const common = `Você é ${role} independente; Codex é coordenador. Leia PRIMEIRO ${contract}, seção0 de docs/design/visual-guide-2026-09-06/PROCESSO-DE-CONSTRUCAO.md e referências Figma em .visual/opencode-figma-20261005/references. Não leia defesa/sessão/relatório de Qwen antes do primeiro parecer. Preserve outros diffs e banco compartilhado. Não implemente, não faça deploy/push/merge/reset. Informe candidato/revisão exata e provas. Não envie prompts ao implementador: reporte a Codex nesta sessão.`
  const task =
    role === "reviewer"
      ? "Leia .claude/skills/adversarial-review/SKILL.md. Revise código real, fronteiras/policies e teste positivo/negativo; compare com baseline.patch e baseline-target-status.txt. Não confunda trabalho pré-existente com este lote. Resultado PASS ou FAIL com severidade arquivo:linha; lacunas de prova explícitas. Não execute shell genérico; read/grep/glob e git somente leitura estão disponíveis."
      : "Leia .claude/skills/runtime-proof/SKILL.md. Execute provas direcionadas do contrato; confira persistência por reload, falhas/retomadas, ator alheio real e capturas 375/768/1440. Confira route/h1/sessão nas capturas e compare Figma. Não altere código ou banco compartilhado, nem execute gate/build concorrente. Se falta fixture/stack isolado registre BLOCKED preciso; existência de código e relato não são PASS. Comandos que geram artefatos de teste são permitidos. Resultado PASS/FAIL/BLOCKED com saídas e limites."
  console.log(JSON.stringify(api("session.prompt", { text: `${common}\n${task}` }, info.id)))
} else {
  throw new Error("Use status, send implementer <texto> ou start reviewer|verifier <contrato>")
}
