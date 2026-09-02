#!/usr/bin/env bash
# run-contracts.sh — executa contratos de tarefa em sequência pelo Codex, com gate
# independente entre cada um.
#
# Isto NÃO é um loop que empurra as quatro tarefas até o fim. Cada contrato aqui é R2,
# declara `reviewer_must_differ_from_executor: true` e `requires_runtime_evidence: true`.
# O runner executa, mede e PARA — quem adjudica é outro agente, ou você.
#
#   bash scripts/agents/run-contracts.sh              # os quatro, parando para revisão entre cada
#   bash scripts/agents/run-contracts.sh --auto       # encadeia, mas para no primeiro gate vermelho
#   bash scripts/agents/run-contracts.sh DS-002       # um contrato só
#   bash scripts/agents/run-contracts.sh --full DS-002  # inclui test:e2e no gate independente
#
# O gate independente roda lint, typecheck, testes e varredura de segredos. A auditoria
# visual fica FORA de propósito: `scripts/visual/loop.mjs` insere um perfil no banco local
# e quebra seis asserts de pgTAP se rodar na hora errada. Rode-a você, no momento certo.

set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ROOT_WIN="$(cd "$ROOT" && pwd -W 2>/dev/null || echo "$ROOT")"
RUN_ID="$(date +%Y%m%d-%H%M%S)"
EVIDENCE="$ROOT/.omo/evidence/bivaque-community-pilot/design-system-$RUN_ID"

MODE="step"
FULL=0
CONTRACTS=()

for arg in "$@"; do
  case "$arg" in
    --auto) MODE="auto" ;;
    --step) MODE="step" ;;
    --full) FULL=1 ;;
    DS-*|RUN-*|EXP-*|HRN-*|SEC-*|MOB-*) CONTRACTS+=("$arg") ;;
    *) echo "argumento não reconhecido: $arg" >&2; exit 2 ;;
  esac
done

if [ ${#CONTRACTS[@]} -eq 0 ]; then
  CONTRACTS=(DS-002 DS-003 DS-004 DS-005)
fi

mkdir -p "$EVIDENCE"
echo "Evidência desta corrida: $EVIDENCE"
[ "$FULL" -eq 1 ] && MODE_LABEL="$MODE + e2e" || MODE_LABEL="$MODE"
echo "Modo: $MODE_LABEL"
echo

# O protocolo é o mesmo para todo contrato. O que muda por tarefa vive no próprio
# contrato, em execution_notes — por isso o prompt manda lê-las e não as repete.
core_prompt() {
  cat <<'PROMPT'
Você vai executar UM contrato de tarefa deste repositório, do início ao fim.

ANTES DE TOCAR EM QUALQUER ARQUIVO:
1. Leia AGENTS.md inteiro — é a fonte de verdade do repositório.
2. Leia o contrato inteiro, execution_notes incluídas: elas carregam as medições já
   feitas e as decisões de projeto que você não precisa redescobrir. Em pelo menos um
   destes contratos o enunciado óbvio da tarefa está errado, e é a nota que diz por quê.
3. Reproduza o baseline. O contrato declara FAIL-EVIDENCED com evidência; confirme que
   a falha ainda existe antes de corrigir. Se não reproduzir, pare e reporte.

REGRAS DE EXECUÇÃO:
- allowed_paths é a fronteira de escrita: não escreva fora dela por motivo nenhum.
  forbidden é cerca dura, mesmo quando a correção parecer óbvia.
- Implementação e prova são a mesma unidade. Nenhum item de acceptance fecha sem o
  comando de proof correspondente executado e a saída lida.
- Use npx pnpm@11.18.0 — pnpm e corepack não estão no PATH.
- retry_budget é 3 por item. Esgotado nunca vira PASS: vira FAIL, BLOCKED ou
  HUMAN_DECISION.
- Se um item for impossível dentro da fronteira, pare nele, termine todos os outros e
  reporte o que ficou aberto e por quê. Não amplie o escopo para fazer um item fechar.
- Não revise o próprio trabalho nem declare PASS: a revisão é de outro agente.
- A árvore de trabalho já tem alterações não commitadas de tarefa anterior. Não as
  desfaça, não as commite e não as inclua no seu relatório como suas.

ARMADILHAS DESTE REPOSITÓRIO, confira antes de culpar seu diff:
- A captura visual insere um perfil no banco local. Não rode servidor de desenvolvimento
  nem captura entre db:reset e test:db, senão seis asserts de pgTAP quebram parecendo
  regressão real.
- dev-server.pid e dev-server.log podem ficar velhos: apague e tente de novo antes de
  atribuir a falha ao código.

AO TERMINAR, reporte: o que fechou e com qual prova (o comando e o que a saída disse),
o que não fechou e por quê, e a lista de arquivos que VOCÊ tocou.
PROMPT
}

run_gate() {
  local id="$1" log="$EVIDENCE/$id-gate.log" failed=0
  echo "  → validador de contratos"
  node "$ROOT/scripts/agents/task-contract.mjs" >>"$log" 2>&1 || failed=1
  echo "  → tokens gerados em dia"
  node "$ROOT/scripts/tokens/generate.mjs" --check >>"$log" 2>&1 || failed=1
  echo "  → gate (lint, typecheck, testes, segredos)"
  (cd "$ROOT" && npx pnpm@11.18.0 gate) >>"$log" 2>&1 || failed=1
  if [ "$FULL" -eq 1 ]; then
    echo "  → test:e2e"
    (cd "$ROOT" && npx pnpm@11.18.0 test:e2e) >>"$log" 2>&1 || failed=1
  fi
  return $failed
}

for id in "${CONTRACTS[@]}"; do
  contract="docs/agents/tasks/$id.task.yml"
  echo "════ $id ════"

  if [ ! -f "$ROOT/$contract" ]; then
    echo "  contrato inexistente: $contract" >&2
    exit 1
  fi

  if ! node "$ROOT/scripts/agents/task-contract.mjs" "$ROOT/$contract" >/dev/null 2>&1; then
    echo "  contrato inválido — não vai para execução" >&2
    node "$ROOT/scripts/agents/task-contract.mjs" "$ROOT/$contract" >&2
    exit 1
  fi

  git -C "$ROOT" status --porcelain >"$EVIDENCE/$id-tree-antes.txt"

  echo "  → codex exec"
  { core_prompt; echo; echo "CONTRATO: $contract"; } \
    | codex exec \
        -C "$ROOT_WIN" \
        -s workspace-write \
        -o "$EVIDENCE/$id-relatorio.md" \
        - 2>&1 | tee "$EVIDENCE/$id-codex.log"
  codex_status=${PIPESTATUS[1]}

  git -C "$ROOT" status --porcelain >"$EVIDENCE/$id-tree-depois.txt"
  diff "$EVIDENCE/$id-tree-antes.txt" "$EVIDENCE/$id-tree-depois.txt" \
    >"$EVIDENCE/$id-arquivos-mudados.txt" || true

  if [ "$codex_status" -ne 0 ]; then
    echo "  codex saiu com status $codex_status — parando aqui" >&2
    echo "  evidência: $EVIDENCE" >&2
    exit 1
  fi

  echo "  → gate independente"
  if ! run_gate "$id"; then
    echo
    echo "  GATE VERMELHO em $id. Nada segue adiante." >&2
    echo "  log: $EVIDENCE/$id-gate.log" >&2
    echo "  Leia a saída e classifique a falha ANTES de atribuí-la ao diff." >&2
    exit 1
  fi

  echo "  gate verde. Isto NÃO fecha o contrato."
  echo
  echo "  Falta, e não é o runner que faz:"
  echo "   · auditoria visual em 375/768/1440 — node scripts/visual/loop.mjs"
  echo "   · revisão independente do diff, por quem não executou"
  echo "   · adjudicar acceptance item a item contra a evidência de runtime"
  echo "  relatório do executor: $EVIDENCE/$id-relatorio.md"
  echo "  arquivos tocados:      $EVIDENCE/$id-arquivos-mudados.txt"
  echo

  if [ "$MODE" = "step" ]; then
    echo "  Parada de revisão. Para seguir: bash scripts/agents/run-contracts.sh <próximo ID>"
    exit 0
  fi
done

echo "Fim da sequência. Nenhum contrato está fechado até a revisão independente e a"
echo "evidência de runtime dizerem que está. Evidência: $EVIDENCE"
