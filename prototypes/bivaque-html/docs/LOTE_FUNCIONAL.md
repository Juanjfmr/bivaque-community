# Bivaque — Lote Funcional (Rodadas 57 a 63)

Origem: [AUDITORIA_FUNCIONAL_2026-10-18](AUDITORIA_FUNCIONAL_2026-10-18.md). Objetivo: fechar no
protótipo os caminhos quebrados e as jornadas essenciais que faltam, antes do back-end real, para
que o back-end saiba o que precisa oferecer. Base: Rodada 56 congelada (`19df283b…`).

Worktree: `.claude/worktrees/funcional`, branch `codex/funcional`. Uma rodada por vez.

| Rodada | Conteúdo |
| --- | --- |
| 57 | Caminhos quebrados simples (itens A1, A2, A3, A7, B12 e E da auditoria) |
| 58 | Privacidade e Código de conduta legíveis; pedido depois da escolha; "Ocultar" pessoal |
| 59 | Editar e excluir o que publicou (perguntas, respostas, publicações, comentários, eventos de grupo) |
| 60 | Bloquear pessoa; denunciar mensagem, resposta, comentário e publicação; consequência no Painel |
| 61 | Encerrar grupo; pausar e excluir página de negócio |
| 62 | Apagar a conta; Ajuda e suporte |
| 63 | Promessas da tela: cumprir ou retirar |

## Regras para quem implementa

**Nunca:** `git push`, merge, deploy, `git stash`, `--no-verify`; editar a base congelada
(`.visual/**/baseline`), `vendor/` ou o HTML original; adicionar arquivos de outras sessões ao commit;
guardar senha, CPF ou documento; inventar dados pessoais reais.

**Código do protótipo** (`prototypes/bivaque-html/src/`):
- O build junta todos os módulos de `src/manifest.json` num único IIFE: funções e `var`/`const` de
  topo são globais de propósito. Novo módulo: acrescente ao `manifest.json`, acrescente a linha em
  `docs/MODULE_MAP.md` e atualize a contagem de fragmentos em `scripts/bivaque-html/test_build.py`
  (`all_N_fragments` e `len(paths), N`).
- Siga o estilo do arquivo que você edita: funções compactas, HTML em template string, texto de
  usuário sempre por `esc()` (ou pelos helpers `field`, `btn`, `iconBtn`, `pill`, `showDialog`, que já
  escapam). Mudança de estado só dentro de `mutate(()=>{...},{redraw:false})`, que devolve `false`
  quando o armazenamento falha (trate isso). Feedback com `notify(texto,ícone)`; confirmação
  destrutiva com `confirm(título,texto,callback)`; diálogos com `showDialog(título,corpo,ações,kind)`.
- Ações de botão: atributo `data-action` + `data-value`, tratadas em `src/app/handlers.js` (switch) ou
  no `*Action(action,value)` da feature, que devolve `true` quando tratou.
- Alguns arquivos usam CRLF: preserve o fim de linha que o arquivo já usa.
- Ícones: só os que existem na fonte embutida. Confira antes com
  `node /c/Users/juana/bivaque-community/.visual/r13/icons.mjs nome1 nome2` (precisa da variável do
  Chromium abaixo). Já sabidos fora da fonte: login, mail, space_dashboard, location_city, more_horiz,
  person_off, celebration, warning, circle, radio_button_unchecked, restart_alt, replay, arrow_forward.
- Texto da interface em português do Brasil, direto e sem tom defensivo. Modo teste é dito uma vez,
  sem alarde. Nunca mostre números pequenos de usuários como prova social.
- Toda ação precisa de efeito visível (estado, navegação, diálogo ou aviso). Nada de botão que não faz
  nada, nem de "em breve".

**Prova de cada rodada:** `scripts/bivaque-html/roundNN-proof.mjs`, no molde de
`round56-proof.mjs` (harness `proof-harness.mjs`: `go`, `snapshot`, `stored`, `reload`, `settle`,
`fill`, `choose`, `confirmOk`, `dialogKind`, `toast`, `routeOf`, `skipPushAsk`, `runProof`). Um
checkpoint por comportamento, com nome em inglês e mensagens em português. Rode:

```bash
export PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH='C:/Users/juana/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe'
python scripts/bivaque-html/build.py
BIVAQUE_HTML_CONTEXTS=375-light,1440-light node scripts/bivaque-html/roundNN-proof.mjs
npx pnpm@11.18.0 exec biome check --write scripts/bivaque-html/roundNN-proof.mjs
npx pnpm@11.18.0 gate
```

Se uma mudança sua quebrar a prova antiga de outra rodada que cobre o mesmo comportamento, adapte essa
prova (com um comentário dizendo por quê) e rode-a também.

**Contrato:** `docs/agents/tasks/HTML-0NN.task.yml`, no molde de `HTML-056.task.yml`; valide com
`node scripts/agents/task-contract.mjs docs/agents/tasks/HTML-0NN.task.yml`. Mexer em dados pessoais
sobe o risco para R2; falar em CPF ou verificação de identidade sobe para R3 e exige
`adr: docs/decisions/ADR-20260816-forma-da-admissao.md`. Valores entre aspas duplas no início quebram
o parser: evite.

**Registro:** `prototypes/bivaque-html/docs/ROUND_NN.md`, no molde de `ROUND_56.md` (o que mudou,
prova, veredito). O scanner de segredos reprova nomes como `*PASSWORD*='...'` e CPFs com dígitos
válidos (use `123.456.789-00`).

**Commit:** só com o gate verde. Adicione explicitamente só os arquivos da rodada. Mensagem em
português, formato `feat: ... (R57)`, sem linhas de atribuição.
