#!/usr/bin/env bash
# PreToolUse firewall — bloqueia comandos destrutivos e acesso a secrets.
# stdin: JSON com {tool_name, tool_input}
# exit 0 = permite | exit 2 = bloqueia (stderr vira o motivo lido pelo modelo)

input=$(cat)
tool=$(printf '%s' "$input" | grep -o '"tool_name":"[^"]*"' | cut -d'"' -f4)
cmd=$(printf '%s' "$input" | grep -o '"command":"[^"]*"' | cut -d'"' -f4)

block() {
  echo "BLOQUEADO: $1" >&2
  exit 2
}

# Proteção de arquivos sensíveis em Edit/Write
if [ "$tool" = "Edit" ] || [ "$tool" = "Write" ]; then
  file=$(printf '%s' "$input" | grep -o '"file_path":"[^"]*"' | cut -d'"' -f4)
  case "$file" in
    *.env|*.env.*|*.env.example) [ "$file" = "*.env.example" ] || block "arquivo .env nao pode ser escrito/alterado" ;;
    *.key|*.pem|*.p12) block "arquivo de chave/segredo nao pode ser alterado" ;;
  esac
fi

# Firewall de comandos Bash destrutivos
if [ "$tool" = "Bash" ]; then
  case "$cmd" in
    *"rm -rf"*) block "rm -rf e proibido — use remocao cirurgica com confirmacao" ;;
    *"rm -fr"*) block "rm -fr e proibido — use remocao cirurgica com confirmacao" ;;
    *"git push"*"--force"*) block "git push --force e proibido sem aprovacao" ;;
    *"git push"*"-f"*) block "git push -f e proibido sem aprovacao" ;;
    *"--linked"*) block "supabase --linked aponta para producao — proibido" ;;
    *"db:reset"*|*"db reset"*) block "db:reset requer aprovacao explicita — use --yes apenas com confirmacao" ;;
    *".env"*) block "comando referenciando .env — nao manipule arquivos .env" ;;
  esac
fi

exit 0
