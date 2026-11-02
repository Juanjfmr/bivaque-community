# Lote 1 — Findings-âncora validadas (Fase 1)

Validadas em 2026-08-10 contra o código atual, com evidência
`arquivo:linha`. Severidade segue o MAP §2.2. Balde A = correção
inequívoca; Balde B = decisão do dono do produto.

Correções ao briefing original: ver README, registro X1–X3.

---

## RT-01 — Login

### F1 · "Manter conectado" é checkbox inerte — P2 · REMOVE · Balde A

- **Promessa:** o usuário controla a persistência da sessão.
- **Comportamento:** o checkbox não tem estado, `onChange` nem leitura em
  nenhum lugar; a persistência é fixa (`maxAge: 400 dias`).
- **Evidência:** `app/(preauth)/login/components/bivaque-sign-in.tsx:251-252`;
  `lib/supabase/client.ts:12-17,37-41`.
- **Veredicto:** REMOVE. Implementar de verdade exigiria reduzir `maxAge`
  quando desmarcado — para o piloto, remover é mais honesto.

### F2 · "Esqueci minha senha" aponta para nada — P1 · REMOVE · Balde A

- **Promessa:** existe recuperação de senha.
- **Comportamento:** botão com `onClick={onResetPassword}`, mas a página não
  passa o prop — clicar não faz nada. Não existe auth por senha, logo não
  existe nada a recuperar.
- **Evidência:** `bivaque-sign-in.tsx:253-259`; `login/page.tsx:3-6`.
- **Veredicto:** REMOVE. Nota: recuperação de **conta** (quem perdeu o
  e-mail/Google) é lacuna real e separada — Área 11 do MAP, Ausente, P1.

### F3 · Hero "Convite restrito" contradiz o modelo de entrada — P1 · MODIFY · Balde B

- **Promessa:** "Convite restrito, presença confirmada."
- **Comportamento:** a entrada é aberta ao público elegível; o gate é
  verificação via Portal, não convite. Convite familiar existe mas é via
  secundária.
- **Evidência:** `bivaque-sign-in.tsx:87-90` ("Comunidade privada e
  verificada… Convite restrito, presença confirmada."); fluxo de onboarding
  aberto em `(preauth)/onboarding/page.tsx`.
- **Decisão (você):** a copy vende exclusividade de marca ou descreve o
  mecanismo? Se marca: manter sabendo que é posicionamento. Se descrição:
  trocar para "entrada por verificação de elegibilidade".

---

## RT-03 — Consentimento

### F4 · Consentimento: gate de UX sem trilha auditável e sem recusa — P1 · MODIFY · Balde B

- **Comportamento:** aceite grava cookie client-side
  `bivaque-consent-version=1`; middleware devolve ao `/consent` quem não tem
  o cookie; o servidor só registra consentimento
  (`profiles.consent_version/consented_at`) **quando a provisionação
  conclui**. Quem aceita e abandona o CPF não deixa registro server-side.
  Não existe caminho de recusa — só "aceitar".
- **Evidência:** `consent/page.tsx:9-20` (cookie); `middleware.ts:84-95`
  (gate); `api/onboarding/route.ts:50-64`; `lib/onboarding/verifyAndProvision.ts:27-31,66-73,133-140`.
- **Veredicto:** exatamente o previsto no briefing: cookie é suficiente como
  gate de UX, mas não deve ser chamado de registro auditável.
- **Decisões (você):** (a) investir em trilha auditável server-side no
  momento do aceite (tabela própria) ou aceitar o gate de UX como está?
  (b) o que significa **recusar** — voltar ao login e sair do produto?

---

## RT-04 — CPF / verificação

### F5 · CPF em `sessionStorage` contradiz promessa de não armazenamento — P0 · MODIFY · Balde A

- **Promessa:** "Nenhum dado pessoal sensível (CPF, patente, endereço) será
  armazenado ou exibido publicamente." — feita em `/consent`, o gate
  imediatamente anterior ao passo do CPF.
- **Comportamento:** em sessão expirada e em `temporary_error`, o CPF é
  escrito em `sessionStorage` (chave `onboarding:cpf`) e reidratado no
  retorno. Foi mudança deliberada da Onda 2 (MAP linha 1e).
- **Evidência:** promessa em `consent/page.tsx:47-49`; escrita em
  `onboarding/page.tsx:154-162` (sessão expirada) e `:194-200`
  (temporary_error); leitura em `:92-97`. Sem escrita em `localStorage`;
  CPF não é logado (`lib/logger.ts` redige).
- **Por que P0:** contradição direta de promessa de privacidade sobre dado
  sensível — pelo critério do MAP §2.2, exige decisão antes de operar com
  membros não-técnicos. Exposição técnica é limitada (tab-scoped, sem
  persistência em banco/logs), o que torna o fix barato.
- **Recomendação:** remover a persistência do CPF (usuário redigita na
  re-tentativa; custo de UX baixo perto da quebra de promessa). Alternativa
  mais fraca: manter e reescrever a copy para declarar armazenamento
  temporário local — isso sim seria decisão sua (Balde B).

---

## Shell

### F6 · Sino de notificações é botão morto — P1 · IMPLEMENT · Balde A

- **Comportamento:** `<button aria-label="Notificações">` sem `onClick`,
  `href` ou `onPress` — presente em todas as telas do shell.
- **Evidência:** `components/bivaque/app-shell.tsx:107-113`.
- **Veredicto:** IMPLEMENT — o destino existe e funciona (`/notifications`,
  MAP linha 8a). Vira `<a href="/notifications">`.

### F7 · "Manaus, AM" com chevron sugere seletor inexistente — P2 · REMOVE (chevron) · Balde A

- **Comportamento:** label estática com `ChevronDown`, sem handler nem
  seletor. Piloto é localidade única — não há o que selecionar.
- **Evidência:** `app-shell.tsx:88-93`.
- **Veredicto:** remover o chevron (manter o label). Quando multi-localidade
  existir, reimplementar com função — aí sim, decisão de produto.

### F8 · Avatar do shell é a letra "C" hardcoded — P1 · IMPLEMENT · Balde A

- **Comportamento:** header e footer da sidebar renderizam literalmente `C`;
  não é inicial do usuário nem imagem. O componente `MemberAvatar` (com
  imagem real + fallback por inicial) já existe e é usado no feed.
- **Evidência:** `app-shell.tsx:115-123` (header), `:216-224` (sidebar).
- **Veredicto:** IMPLEMENT — trocar por `MemberAvatar` com o usuário real.

### F9 · Navegação força "Comunidade" ativo fora do menu principal — P2 · MODIFY · Balde A

- **Comportamento:** em rotas fora do menu principal (ex.: `/messages`,
  `/notifications`), sidebar e bottom-nav marcam "Comunidade" como ativo.
  Estado ativo mentiroso desorienta.
- **Evidência:** `app-shell.tsx:163-175` (`!inPrimaryNav && item.id ===
  "community"`); `bottom-nav.tsx:109-112` (fallback `?? "community"`).
- **Veredicto:** MODIFY — nenhum item ativo quando a rota não pertence ao
  menu (ou dar status ativo próprio a mensagens/notificações).

---

## RT-24/30 — Eventos: convites

### F10 · Aba "Convidado": backend existe, caminho de envio não — P1 · Balde B

- **Comportamento:** a tabela `event_invites` + RLS + UI de
  receber/responder existem (migration `20260806171204`;
  `event-invites-section.tsx:26-120`). Mas **não há UI para o organizador
  enviar convite** (nem no form de criação `events/page.tsx:544-594`, nem no
  detalhe `events/[id]/page.tsx:138-238`, nem existe rota de edição) e **não
  há fan-out de notificação** (comentário explícito na migration `:9-11`).
  Resultado prático: a aba sempre mostrará "Nenhum convite".
- **Correção X2:** o claim original ("nenhum mecanismo existe") vinha do
  comentário desatualizado em `events/page.tsx:334`; o mecanismo de receber
  existe. O que está morto é o caminho de envio.
- **Decisão (você):** (a) implementar envio + notificação (feature completa)
  ou (b) REMOVE a aba até o mecanismo existir. Padrão 3 do MAP (capacidade
  no banco, gestão não).

---

## RT-31 — Mensagens

### F11 · UI expõe 1 dos 4 contextos de DM que o banco permite — P2 · Balde B

- **Comportamento:** o banco permite iniciar conversa por `shared_group`,
  `shared_event`, `recommendation_thread`, `accepted_family`
  (`20260802001500:10-15,101-159`). A UI só oferece contatos de grupo
  compartilhado (`messages/page.tsx:320-428`), e quem não tem grupo vê
  "Entre em um grupo ou evento para poder iniciar conversas" — copy que
  menciona evento, embora evento não gere contato na UI.
- **Decisão (você):** expor os outros 3 contextos (capacidade já existe) ou
  manter DM restrito a grupo como decisão de produto? A copy atual promete
  evento sem entregar.

---

## RT-38 — Notificações

### F12 · Categorização heurística + tipos sem origem — P2 · Balde B

- **Comportamento:** a aba classifica por `switch(notification.type)` no
  frontend (`notifications/page.tsx:40-64`); não há coluna `category`
  (Camada 0, C9). Tipo novo não mapeado cai fora das abas silenciosamente.
  Além disso: **não existe trigger de notificação para DM nem para convite
  de evento** — os dois fluxos prometem comunicação que nunca chega.
- **Decisão (você):** persistir categoria (arquitetura) ou manter heurística
  com teste de cobertura de tipos? Notificar DM/convite é decisão de produto
  (custo de fan-out vs. valor).

---

## RT-43 — Indicações

### F13 · "Indicações" mistura três produtos numa aba — P2 · Balde B

- **Comportamento:** a página contém descoberta de grupos, descoberta de
  eventos, formulário de pedido de recomendação e itens salvos
  (`recommendations/page.tsx:429-760`), com copy "não um marketplace".
- **Decisão (você):** é um produto coerente ou três produtos agrupados por
  necessidade de aba? Candidato a MERGE/SPLIT na arquitetura final.

---

## Camada 0 (direto da régua)

### F14 · Perfil "hidden" é visível a co-membros de comunidade — P1 · Balde B

- **Promessa (UI):** "Seu perfil fica oculto para outros membros."
- **Comportamento (policy):** `profiles_select_community_comember` expõe o
  perfil — inclusive `hidden` — a qualquer co-membro aprovado de comunidade;
  a cláusula `USING` não filtra por `visibility`.
- **Evidência:** `20260805214709_community_scope.sql:531-551` (Camada 0, C3).
- **Decisão (você):** reabrir a semântica de "oculto". Opções: (a) policy
  passa a respeitar `hidden` mesmo em comunidade; (b) copy muda para
  "oculto para quem não compartilha comunidade com você"; (c) aceitar a
  exposição e remover o valor `hidden` como conceito absoluto. Copy, policy
  e modelo mental precisam convergir — hoje divergem nos três.

---

## Placar do lote

| Balde | Findings | Ação |
|---|---|---|
| A — correção inequívoca | F1, F2, F5, F6, F7, F8, F9 (7) | Execução direta, sem decisão de produto |
| B — decisão do dono | F3, F4, F10, F11, F12, F13, F14 (7) | Recomendação dada; decisão sua |
