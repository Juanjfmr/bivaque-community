#!/usr/bin/env bash
# PostToolUse — formata com Biome arquivos Edit|Write (faz o gate de estilo
# do repo ser cumprido na hora, nao na CI).
# stdin: JSON {tool_name, tool_input}
# exit 0 sempre (nao-bloqueante); erros de format nao param o fluxo.

input=$(cat)
tool=$(printf '%s' "$input" | grep -o '"tool_name":"[^"]*"' | cut -d'"' -f4)

if [ "$tool" = "Edit" ] || [ "$tool" = "Write" ]; then
  file=$(printf '%s' "$input" | grep -o '"file_path":"[^"]*"' | cut -d'"' -f4)
  case "$file" in
    *.ts|*.tsx|*.js|*.jsx|*.json|*.md)
      # so formata dentro do workspace e fora de node_modules
      case "$file" in
        */node_modules/*|*/dist/*|*/build/*|*/.next/*|*/playwright-report/*) exit 0 ;;
      esac
      cd "C:/Users/juana/bivaque-community" 2>/dev/null || exit 0
      npx --no-install biome check --write "$file" >/dev/null 2>&1 || \
      npx --yes pnpm@11.18.0 exec biome check --write "$file" >/dev/null 2>&1
      ;;
  esac
fi

exit 0
