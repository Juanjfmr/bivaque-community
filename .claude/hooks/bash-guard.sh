#!/usr/bin/env bash
# PreToolUse firewall — bloqueia comandos destrutivos e acesso a secrets.
# stdin: JSON com {tool_name, tool_input}
# exit 0 = permite | exit 2 = bloqueia (stderr vira o motivo lido pelo modelo)
#
# A decisao vive em bash-guard.mjs. Este arquivo e so o ponto de entrada porque
# o caminho esta fixado em .claude/settings.local.json.
#
# Por que Node e nao bash: a extracao anterior usava
#   grep -o '"command":"[^"]*"'
# que para na primeira aspa escapada do JSON. Comando iniciado por atribuicao
# com aspas (DIR="/tmp/x" && rm -rf /) era lido como `DIR=\` e escapava de todas
# as regras. Ver o comentario de cabecalho do .mjs.

here=$(dirname "$0")

if ! command -v node >/dev/null 2>&1; then
  # Falha FECHADA. Sem o parser nao da para decidir, e liberar por omissao foi o
  # defeito que este arquivo existe para corrigir. Para destravar: instale o Node
  # (o repo exige >= 22) ou remova o hook PreToolUse de .claude/settings.local.json.
  echo "BLOQUEADO: node nao encontrado — guard nao consegue avaliar o comando" >&2
  exit 2
fi

exec node "$here/bash-guard.mjs"
