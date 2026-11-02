# Inventário inicial do HTML original (heurístico)

Arquivo: `Bivaque_Material_Web.html` — 2,760,578 bytes / 2522 linhas.

- Funções identificadas por regex: **207**
- Funções `render*` detectadas: **23**
- Rótulos `case` no arquivo: **116**
- Possíveis ações sem `case` literal correspondente: **26** (**lista potencial**, não diagnóstico definitivo).

## Ações potenciais sem tratamento detectadas automaticamente

`attend-event`, `cap`, `copy-invite`, `copy-share`, `create-event`, `delete-event`, `edit-event`, `guide`, `my-ads`, `new-invite`, `notices`, `open-event`, `open-thread`, `plan`, `plan-check`, `plan-go`, `remove-invite`, `report`, `resume`, `saved`, `send-message`, `share`, `submit-event`, `submit-report`, `thread-menu`, `thread-origin`

## Funções de render detectadas

`render`, `renderAgenda`, `renderBusiness`, `renderBusinesses`, `renderCatalog`, `renderChat`, `renderCommunity`, `renderEvent`, `renderGroup`, `renderGroupsTab`, `renderGuide`, `renderHome`, `renderItem`, `renderMineQuestions`, `renderMyAds`, `renderOnboarding`, `renderPlan`, `renderPost`, `renderProfile`, `renderQuestion`, `renderSaved`, `renderSearch`, `renderThreads`

## Atenção
O arquivo usa templates JavaScript, helpers e dados dinâmicos; regex não conhece o AST nem executa ações. Casos em `switch` não relacionados podem falsear cobertura, e helpers dinâmicos podem ocultar ações. **Auditar por AST e Playwright no Codex antes de publicar relatório definitivo.**

Comando no repositório após instalar:
`python scripts/bivaque-html/audit_html.py --html prototypes/bivaque-html/reference/Bivaque_Material_Web.original.html`
