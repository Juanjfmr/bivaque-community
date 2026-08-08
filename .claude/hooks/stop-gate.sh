#!/usr/bin/env bash
# Stop hook — completion gate: lembra de rodar testes antes de declarar pronto.
# stdin: JSON {stop_hook_active, ...}
# exit 0 sempre (nao-bloqueante). Se stop_hook_active=true (ja em loop de
# hook), nao repete o aviso — previne loop infinito.

input=$(cat)
active=$(printf '%s' "$input" | grep -o '"stop_hook_active":[a-z]*' | cut -d':' -f2)

# flag anti-loop: se o turno ja esta sendo continuado por hook, saia
if [ "$active" = "true" ]; then
  exit 0
fi

# aviso apenas se houver mudancas nao verificadas e o repo tiver gate
cd "C:/Users/juana/bivaque-community" 2>/dev/null || exit 0
dirty=$(git status --porcelain 2>/dev/null | head -c 400)

if [ -n "$dirty" ]; then
  # additionalContext (stdout) e injetado no modelo no proximo turno
  echo "Lembrete: ha mudancas nao commitadas. Antes de declarar pronto, rode o gate:"
  echo "  npx pnpm@11.18.0 gate"
  echo "(ver skill gate-before-done: rode, leia a saida, classifique a falha)"
fi

exit 0
