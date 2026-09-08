# Auditoria visual — G0 (fundação web)

> Run: `.visual/2026-09-08T10-47-53-167Z/` · gate completo verde · captura 375/768/1440
> Escopo desta rodada: **Task 1 (troca de containers de navegação)**. Tasks 2–7 auditadas
> em rodadas seguintes, dentro do grupo.

---

## Task 1 — troca de navegação (Início / Explorar / Comunidades / Perfil)

**Veredito: PASSA.**

### Evidência de runtime

Servidor de produção limpo (gerenciado pelo `scripts/visual/loop.mjs`), sessão autenticada
(`visual@bivaque.example.invalid`, seed com 308 perfis).

| Superfície | Viewport | Observado |
|---|---|---|
| Sidebar desktop (`/community`, `/communities`) | 1440 | Quatro containers renderizam com rótulos e ícones novos: Início (home), Explorar (lupa), Comunidades (grupo), Perfil (círculo). Estado ativo correto: `/communities` → **Comunidades** ativo; `/community` (rota fora dos containers) → **Início** ativo pelo fallback. |
| Bottom-nav mobile (`/community`) | 375 | Mesmos quatro, na ordem de `NAV_ITEMS`, ícones corretos, **Início** ativo pelo fallback. Alvos ≥ 44px (o `min-h-11 min-w-11` do `Tabs.Tab` já existia). |
| Fallback de rota | 1440 / 375 | `/messages` e `/notifications` não foram recapturados com rótulo novo nesta rodada (specs E2E cobrem; execução pendente). Sidebar e bottom-nav mantêm um único item ativo em todas as rotas capturadas — sem estado "nenhum ativo". |

### Auditoria mecânica

- **Zero finding de severidade `high` atribuível à Task 1.** Nenhum finding em rota `(shell)`,
  no bottom-nav ou na sidebar.
- 12 findings `high` no total, **todos em `/consent`** (rota `(preauth)` não tocada pela Task 1):
  4 findings × 3 viewports — `touch-target` no checkbox (`input` 13×13), `missing-accessible-name`
  no mesmo checkbox, `touch-target` em dois links de rodapé (`a.font-medium`, 151×16 e 125×16).
  Pré-existentes; constam do debt ledger (88 abertos). Fora do escopo da Task 1.

### Task 7 da auditoria de telas (julgamento) — nav

1. **Ação primária achável em < 1s?** Sim — os quatro destinos são o primeiro elemento da
   sidebar / a barra inferior inteira.
2. **Ritmo / alinhamento?** `gap-1` entre itens da sidebar, `px-3 py-2`; bottom-nav `justify-around`.
   Sem deriva. Herdado do componente existente, não alterado.
3. **Coeso?** Sim — quatro itens homogêneos, ícone + rótulo.
4. **375 é desenho próprio?** Sim — bottom-nav no mobile, sidebar/rail do md pra cima. Inalterado
   pela Task 1 (só trocou o conteúdo de `NAV_ITEMS`).

**Diferença intencional vs. as pranchas 01/61/60:** a sidebar ainda é a versão enxuta atual
(quatro itens + rodapé "Minha conta"). A sidebar rica das pranchas (Salvos, Notificações com
badge, "Minhas comunidades", rodapé "Carlos Ribeiro ›" / Configurações) é trabalho de uma tarefa
própria do G0 (chrome compartilhado — `app-shell.tsx`), ainda não feita.

### Pendências que esta rodada revelou

- **`scripts/visual/capture.mjs` não captura `/inicio` nem `/explorar`** (lista de rotas estática).
  Adicionar antes da auditoria das Tasks 4–5, senão as telas novas não entram no relatório.
- **O loop nunca sai limpo enquanto `/consent` tiver os 12 `high`.** `scripts/visual/loop.mjs`
  bloqueia em qualquer `high`, independente do ledger. Decisão do responsável necessária: corrigir
  os 12 `high` de `/consent` (a11y Fase 1/2 — não espera onda; correção pequena) para destravar o
  gate visual do resto do G0, ou aceitar o veredito por tela lendo o `report.json` filtrado por rota.
