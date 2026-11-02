#!/usr/bin/env node
// autonomo.mjs — o DeepSeek executa o lançamento sozinho, card a card (dono, 02/11/2026).
//
// O dono escolheu: o DeepSeek roda sem supervisão, com o CI como único portão, e o
// trabalho volta para revisão quando estiver pronto. Este script é o laço:
//
//   1. pega o próximo card do quadro (`board.mjs --next`);
//   2. manda o DeepSeek (OpenCode, `run --auto`) resolver esse card na branch
//      `ds/lancamento`, seguindo AGENTS.md e docs/LANCAMENTO.md;
//   3. roda o gate local; vermelho volta para o DeepSeek corrigir (até 2 vezes);
//   4. sobe a branch e mantém um PR em rascunho para a main;
//   5. espera o CI; vermelho volta para o DeepSeek com o trecho do log (até 2 vezes);
//   6. repete.
//
// Nunca faz merge, nunca publica, nunca mexe em .env ou em produção. Para quando
// o quadro não tem próximo card, quando um card não avança, quando o saldo do
// provedor acaba ou quando bate o limite de cards. O estado fica em
// `.visual/autonomo/ESTADO.md`, para o dono acompanhar.
//
// Uso (na worktree da branch ds/lancamento):
//   node scripts/agents/autonomo.mjs [--max-cards 20] [--modelo opencode-go/deepseek-v4.1-flash]

import { spawnSync } from "node:child_process"
import { appendFileSync, mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"

const raiz = process.cwd()
const pasta = join(raiz, ".visual", "autonomo")
mkdirSync(pasta, { recursive: true })

const argumento = (nome, padrao) => {
  const i = process.argv.indexOf(nome)
  return i === -1 ? padrao : process.argv[i + 1]
}
const MAX_CARDS = Number(argumento("--max-cards", "20"))
const MODELO = argumento("--modelo", "opencode-go/deepseek-v4.1-flash")
const BRANCH = "ds/lancamento"
const REPO = "Juanjfmr/bivaque-community"
const OPENCODE = "C:\\Users\\juana\\.local\\bin\\opencode.cmd"
const MINUTO = 60_000

const historico = []
const agora = () => new Date().toISOString().slice(0, 16).replace("T", " ")

function registrar(linha) {
  historico.push(`- ${agora()} ${linha}`)
  appendFileSync(join(pasta, "diario.log"), `${agora()} ${linha}\n`)
  writeFileSync(
    join(pasta, "ESTADO.md"),
    `# DeepSeek autônomo — estado\n\nBranch \`${BRANCH}\`, modelo \`${MODELO}\`.\n\n${historico.slice(-40).join("\n")}\n`,
  )
  console.log(`${agora()} ${linha}`)
}

function rodar(comando, args, { timeout = 30 * MINUTO } = {}) {
  const r = spawnSync(comando, args, {
    cwd: raiz,
    encoding: "utf8",
    shell: true,
    timeout,
    maxBuffer: 64 * 1024 * 1024,
  })
  return { codigo: r.status ?? 1, saida: `${r.stdout ?? ""}${r.stderr ?? ""}` }
}

const git = (...args) => rodar("git", args).saida.trim()

function lerJson(texto) {
  try {
    return JSON.parse(texto)
  } catch {
    return []
  }
}

/** O check que manda: o job "Install, test, and build" do PR da branch. */
function estadoDoCi() {
  const checks = lerJson(
    rodar("gh", ["pr", "checks", BRANCH, "--repo", REPO, "--json", "name,bucket"]).saida,
  )
  const principal = checks.find((c) => c.name === "Install, test, and build")
  return principal?.bucket ?? "pending"
}
const cabeca = () => git("rev-parse", "HEAD")

function proximoCard() {
  const { saida } = rodar("node", ["tools/backend-kanban/src/board.mjs", "--next"])
  const [id, status] = saida.split("\n")[0].split("\t")
  return id && status && status !== "blocked" ? { id, texto: saida } : null
}

function deepseek(titulo, instrucoes) {
  const arquivo = join(pasta, `instrucoes-${Date.now()}.md`)
  writeFileSync(arquivo, instrucoes)
  const log = join(pasta, `${Date.now()}-${titulo.replace(/[^\w-]/g, "_")}.log`)
  const r = rodar(
    OPENCODE,
    [
      "run",
      "-m",
      MODELO,
      "--auto",
      "--title",
      `"${titulo}"`,
      "--file",
      `"${arquivo}"`,
      '"Siga as instruções do arquivo anexado, do começo ao fim."',
    ],
    { timeout: 120 * MINUTO },
  )
  writeFileSync(log, r.saida)
  if (/Insufficient account funds|quota|rate limit/i.test(r.saida)) return { semSaldo: true, log }
  return { semSaldo: false, log, saida: r.saida }
}

const REGRAS = `Você é o executor autônomo do Bivaque. Leia AGENTS.md (é a regra), docs/LANCAMENTO.md (a
definição de pronto) e o card abaixo antes de tocar em qualquer arquivo.

Regras que não se negociam:
- Trabalhe só nesta worktree, na branch ${BRANCH}. Nunca faça push, merge, deploy, nem mexa em main.
- Nunca leia, crie ou edite arquivos .env. Nunca use --linked nem toque em produção.
- Nunca grave CPF real, payload do Portal ou dado pessoal real; testes usam fixtures.
- Banco local só pela fila: node scripts/agents/prova-fila.mjs -- <comando>.
- Decisão R3: escreva o ADR com status "Aceito por delegação — aguarda ratificação" e a linha em
  docs/decisions/RATIFICACAO.md, no mesmo commit.
- Implementação e teste juntos. Rode: npx pnpm@11.18.0 gate --fast e os testes que você tocou.
- Atualize o card em tools/backend-kanban/public/board.json (prova, checklist, status), rode
  node tools/backend-kanban/src/board.mjs --write-summary e --check.
- Commits convencionais em português. Marque "done" só com os critérios de pronto cumpridos;
  se não couber neste turno, deixe o card em "now" com o que falta registrado.
- Se o card estiver errado ou depender do dono (conta, chave, assinatura), registre o bloqueio no
  card, mude o status para "blocked" e pare.`

let cards = 0
let anterior = null
let repeticoes = 0
registrar(`início; HEAD ${cabeca().slice(0, 8)}`)

while (cards < MAX_CARDS) {
  const card = proximoCard()
  if (!card) {
    registrar("sem próximo card disponível; parando")
    break
  }
  repeticoes = card.id === anterior ? repeticoes + 1 : 0
  anterior = card.id
  if (repeticoes >= 2) {
    registrar(`${card.id} voltou 3 vezes sem fechar; parando para revisão`)
    break
  }

  const antes = cabeca()
  registrar(`card ${card.id}: começando`)
  const r = deepseek(card.id, `${REGRAS}\n\n## Card\n\n${card.texto}`)
  if (r.semSaldo) {
    registrar(`provedor sem saldo ou cota; parando (log ${r.log})`)
    break
  }
  if (cabeca() === antes) {
    registrar(`${card.id}: nenhum commit (log ${r.log})`)
    continue
  }

  // Gate local; vermelho volta para o DeepSeek.
  let verde = false
  for (let tentativa = 1; tentativa <= 3; tentativa++) {
    const gate = rodar("npx", ["pnpm@11.18.0", "gate"], { timeout: 45 * MINUTO })
    if (gate.codigo === 0) {
      verde = true
      break
    }
    registrar(`${card.id}: gate vermelho (tentativa ${tentativa})`)
    if (tentativa === 3) break
    deepseek(
      `${card.id}-gate`,
      `${REGRAS}\n\nO gate local falhou depois do seu commit. Corrija a causa (não o teste, salvo se o teste estiver errado) e commite.\n\n\`\`\`\n${gate.saida.slice(-6000)}\n\`\`\``,
    )
  }
  if (!verde) {
    registrar(`${card.id}: gate segue vermelho; parando para revisão`)
    break
  }

  rodar("git", ["push", "-u", "origin", BRANCH])
  if (rodar("gh", ["pr", "view", BRANCH, "--repo", REPO, "--json", "state"]).codigo !== 0) {
    rodar("gh", [
      "pr",
      "create",
      "--repo",
      REPO,
      "--draft",
      "--base",
      "main",
      "--head",
      BRANCH,
      "--title",
      '"DeepSeek autônomo: lançamento"',
      "--body",
      '"Trabalho do executor autônomo (scripts/agents/autonomo.mjs). Não fazer merge sem revisão. Estado: .visual/autonomo/ESTADO.md na máquina do dono."',
    ])
  }

  // CI; vermelho volta para o DeepSeek com o log.
  let ciVerde = false
  for (let tentativa = 1; tentativa <= 3 && !ciVerde; tentativa++) {
    const inicio = Date.now()
    let estado = "pending"
    while (estado === "pending" && Date.now() - inicio < 60 * MINUTO) {
      spawnSync(process.execPath, ["-e", "setTimeout(()=>{},120000)"])
      estado = estadoDoCi()
    }
    if (estado === "pass") {
      ciVerde = true
      break
    }
    registrar(`${card.id}: CI ${estado} (tentativa ${tentativa})`)
    if (tentativa === 3) break
    const execucoes = lerJson(
      rodar("gh", [
        "run",
        "list",
        "--repo",
        REPO,
        "--branch",
        BRANCH,
        "--limit",
        "5",
        "--json",
        "databaseId,name",
      ]).saida,
    )
    const principal = execucoes.find((e) => e.name === "Pull Request CI") ?? execucoes[0]
    const falha = principal
      ? rodar("gh", ["run", "view", String(principal.databaseId), "--repo", REPO, "--log-failed"])
          .saida
      : "(log do CI indisponível)"
    deepseek(
      `${card.id}-ci`,
      `${REGRAS}\n\nO CI falhou depois do seu push. Corrija a causa e commite.\n\n\`\`\`\n${falha.slice(-8000)}\n\`\`\``,
    )
    rodar("git", ["push", "origin", BRANCH])
  }
  if (!ciVerde) {
    registrar(`${card.id}: CI segue vermelho; parando para revisão`)
    break
  }
  cards++
  registrar(`card ${card.id}: commitado, gate e CI verdes (${cards}/${MAX_CARDS})`)
}
registrar("fim do laço")
