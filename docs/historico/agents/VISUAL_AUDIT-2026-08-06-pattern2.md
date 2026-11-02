# Veredito da auditoria visual — Onda 4 (padrão 2 restante) — 2026-08-06

> Procedimento §10.2 do `docs/journeys/MAP.md`. Telas auditadas nesta
> onda: `/profile` (cards de foto, preferências de notificação,
> convite familiar — este último da Onda 3) e `/events` (tab
> "Convidado").

Capturas: `.visual/2026-08-06T17-24-33-238Z/shots/` (run do
`scripts/visual/loop.mjs`). **Esta run é a primeira da sessão a
completar o gate inteiro**: lint, typecheck, test, build, capture
todos pass, high-severity visual findings = 0.

Isso foi destravado pela migration `20260806172145_rename_invite_helpers.sql`:
o privacy test (`tests/privacy/final-scope-and-pii.test.ts`) falhava
porque o nome `list_pending_family_invitations` continha o substring
`family_invitations`, que vazava para `database.generated.ts` e
derrubava o gate test do loop — abortando a captura. Com o rename
para `list_pending_invites`, o test passa e a captura roda.

---

## `/profile` (modificada — 3 cards novos)

A página já era client component. A Onda 4 adicionou 3 Server
Components aninhados (mesmo pattern das Ondas 1 e 3), todos
renderizados via render direto dentro do TabPanel de "Configurações":

- **`AvatarSection`** (`avatar-section.tsx`) — form com label
  estilizado + `<input type="file">` oculto (HeroUI não tem file
  input) + botão Enviar. O preview usa `MemberAvatar` com `src`
  (estendido na Task 4 para aceitar imagem via `Avatar.Image`).
  Texto de ajuda: "PNG, JPEG ou WebP até 5MB. A foto é privada por
  padrão."
- **`NotificationPreferencesSection`** — 4 `Checkbox` do HeroUI v3
  (Mensagens, Comentários, Eventos, Menções) + botão Salvar,
  bound ao `updateNotificationPreferencesAction`.
- **`FamilyInviteSection`** (da Onda 3, revalidado nesta run) —
  form de email + lista de convites pendentes com botão Revogar.

| Item §9 | resultado |
|---|---|
| **Hierarquia** | passa |
| **Ritmo** | passa |
| **Densidade** | passa |
| **Responsivo** | passa |

## `/events` (modificada — tab "Convidado")

O placeholder "Convites em breve" virou `EventInvitesSection`
(Task 5): lista de convites recebidos com os cards (título, data,
local, organizador) e botões Aceitar/Recusar para pendentes;
estados Confirmado/Recusado para respondidos; zero-state com a
ilustração de eventos e mensagem real.

| Item §9 | resultado |
|---|---|
| **Hierarquia** | passa |
| **Ritmo** | passa |
| **Densidade** | passa |
| **Responsivo** | passa |

## Itens do design system usados

Todos os cards usam o mesmo `rounded-xl border border-border
bg-[var(--surface)] p-4` dos cards existentes de `/profile`
(visibilidade, notificações). Botões: `Button size="sm"
variant="primary"` / `variant="tertiary"`. Checkboxes: `Checkbox`
do HeroUI v3 (react-aria CheckboxField — `isSelected` +
`onChange`). Inputs: `Input` do HeroUI. Sem cores cruas, sem
tamanhos fora da escala tipográfica, sem classes utilitárias
inventadas.

## Achados mecânicos

**0 HIGH, 0 MEDIUM, 0 LOW** em toda a run (todas as 15 rotas × 3
viewports). O `report.json` da run lista `high: 0, total: 0` — a
auditoria determinística não encontrou nenhuma violação
(touch-target, contrast, font, overflow, transições) em nenhuma
tela, incluindo as que a Onda 4 tocou.

## Status do gate §10.2

A Onda 4 está **fechada**:

- ✓ `/profile` auditada nos 3 viewports: 4/4 da rubrica §9, 0
  achados mecânicos.
- ✓ `/events` auditada nos 3 viewports: 4/4 da rubrica §9, 0
  achados mecânicos.
- ✓ **Loop completo** (lint + typecheck + test + build + capture +
  high=0) — a primeira run da sessão com o gate inteiro verde.
- ✓ Veredito escrito (este documento).

O frame segue por onda: `VISUAL_AUDIT-2026-08-06.md` (Onda 2),
`-moderation.md` (Onda 1), `-navigation.md` (Onda 5),
`-family-invite.md` (Onda 3), `-preauth.md` (Onda 6), este
arquivo (Onda 4).