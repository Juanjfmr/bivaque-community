# Bivaque — Kit de Especialistas para Codex (18 agentes)

**Objetivo:** concluir visualmente e funcionalmente (modo demonstração) o arquivo HTML já aprovado, sem aproveitar a UI do Next.js e sem construir outro backend.

**Conteúdo:**
- `CODEX_PROMPT_INICIAL.md`: prompt completo para colar no Codex;
- `prototype/reference/Bivaque_Material_Web.original.html`: cópia exata do HTML original;
- `.codex/agents/bivaque-*.toml`: 18 especialistas configurados para Codex;
- `docs/AGENT_RULES.md`, `docs/ROADMAP.md`, `docs/UI_UX.md`, `docs/ACCEPTANCE.md`, `docs/ARCHITECTURE.md` e `docs/INITIAL_INVENTORY.md`;
- `tasks/ROUND_00.md`, `templates/TASK_TEMPLATE.md`;
- `scripts/install.py`, `scripts/audit_html.py`, `scripts/verify_reference.py`;
- `config/CODEX_CONFIG_SNIPPET.toml`: configuração opcional, NÃO substituir o config do usuário.

## Como instalar no repositório

1. Faça checkout/abra `Juanjfmr/bivaque-community` no computador com Codex.
2. Descompacte este ZIP numa pasta qualquer **fora da raiz do repositório**, de preferência `bivaque_codex_kit_v1/`.
3. A partir da pasta extraída, execute `python scripts/install.py --repo /CAMINHO/DO/bivaque-community` (Windows: `py scripts/install.py --repo C:\caminho\bivaque-community`). O instalador **não sobrescreve arquivos existentes**.
4. No repositório, execute `python scripts/bivaque-html/verify_reference.py` e `python scripts/bivaque-html/audit_html.py --html prototypes/bivaque-html/reference/Bivaque_Material_Web.original.html`.
5. Abra a raiz do repositório no Codex e cole `docs/bivaque-html-kit/CODEX_PROMPT_INICIAL.md` (arquivo instalado).
6. Confirme no Codex se os agentes de projeto `.codex/agents/` são reconhecidos. Versões e interfaces do Codex variam; as instruções dos agentes continuam reutilizáveis se o spawn automático não estiver disponível.

O instalador cria **somente** arquivos novos; não toca `AGENTS.md`, `package.json`, `supabase/` ou `.codex/config.toml` existentes. Leia primeiro o README do repositório, `AGENTS.md` e seus contratos de tarefa. O primeiro sprint não faz merge automático.

## Escopo zero
- Não implantar produção, não abrir banco real, não usar CPFs reais, não configurar cobrança, não importar UI do Next.js ou Figma.
- Sem alterar aprovação de membro ou verificação real com flags no cliente.

## Baseline congelada
`Bivaque_Material_Web.original.html` — **SHA-256 `29a402c4e717ab2826c2e2aa0c3da6bac7f7b2b390090ed22c5ff1f2cbb385a4`** (2,760,578 bytes).

## Fontes de engenharia
- Repositório: https://github.com/Juanjfmr/bivaque-community
- Contratos existentes: `docs/agents/AGENT_ARCHITECTURE.md` e `docs/agents/TASK_CONTRACT.md`
- Documentação pública de configuração Codex: https://developers.openai.com/codex/ (validar conforme versão instalada).
