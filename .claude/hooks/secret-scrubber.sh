#!/usr/bin/env bash
# UserPromptSubmit — secret scrubber: rejeita (exit 2) prompts que contenham
# credenciais, antes que cheguem ao modelo. Espelha o secrets scan do repo.
# stdin: JSON {prompt, ...}

input=$(cat)
prompt=$(printf '%s' "$input" | grep -o '"prompt":"[^"]*"' | cut -d'"' -f4)

# Padroes de secret (sem ecoar valores — so detecta)
if printf '%s' "$prompt" | grep -qE '(ghp_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{20,}|sk-[A-Za-z0-9-]{20,}|AIza[0-9A-Za-z_-]{30,}|xox[baprs]-[A-Za-z0-9-]{10,})'; then
  echo "BLOQUEADO: o prompt contem o que parece ser uma credencial (token de API/GitHub/Slack)." >&2
  echo "Nao cole credenciais no prompt. Use variaveis de ambiente ou secrets do CI." >&2
  exit 2
fi

exit 0
