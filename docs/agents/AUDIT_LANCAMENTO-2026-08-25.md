# Auditoria de prontidão para lançamento — Bivaque Community

**Data:** 2026-08-25 · **Auditor:** Hermes (chief of staff) · **Escopo:** o que impede o
`bivaque-community` sair do ar como produto.

> Lido a partir de `docs/PRODUCT_STATUS.md`, `tools/backend-kanban/BOARD.md`, ADRs,
> `docs/legal/`, board cards (`BLOCK-*`/`MVP-*`), CI/segredos/git e `npx pnpm gate --fast`.
> Não conta o que está "em código": só o que está provado em runtime, assinado por humano,
> ou contratado com terceiro.

## TL;DR — onde o lançamento trava hoje

Cinco bloqueios externos/humanos e três débitos técnicos internos. Nenhum é bug; quase
todos exigem **decisão do dono ou de terceiro**, não código.

| # | Bloqueio | Tipo | Dono da saída |
|---|---|---|---|
| 1 | Textos legais (privacidade + conduta) ainda em rascunho, aceitos no onboarding | BLOCK-LEGAL-ENTRY | Dono + advogado |
| 2 | Resend configurado mas sem projeto Vercel/Supabase de produção implantado | BLOCK-RESEND | Dono (deploy) |
| 3 | WhatsApp não-oficial depende de chip + CNPJ; decisão de manter/suprimir | BLOCK-WHATSAPP | Dono |
| 4 | ADR de afiliação militar declarada (`OM`) parado em `proposed` há 14 dias | BLOCK-AFFILIATION | Dono (R3) |
| 5 | LGPD para IA e terceiros (PostHog, Asaas, IA guia) sem governança | BLOCK-LEGAL-AI | Dono + advogado |
| 6 | E2E: 9 falhas funcionais reais em 8 testes distintos, todas R3/decisão | MVP-00-E2E-FUNCTIONAL | Dono (decisão) |
| 7 | Veículo jurídico (Art. 29 Lei 6.880/80) — quem é o controlador dos dados? | pendente | Advogado |
| 8 | Marketplace/Asaas exige CNPJ — sem CNPJ não há vitrine paga | BLOCK-ASAAS | Dono (CNPJ) |

**Veredito:** o código está pronto (gate verde, pgTAP 1042/1042, E2E majoritariamente
verde). O que falta é, em quase tudo, **assinar, contratar, configurar produção ou
decidir R3** — nenhuma linha de código desbloqueia o lançamento sozinha.

---

## 1. Estado do código (o que está provado)

### Build & qualidade
- `npx pnpm@11.18.0 gate --fast` → **verde** (lint 8s, typecheck 7s).
- `test:unit` + `test:privacy` + `test:scope` + `test:db` rodam: **pgTAP 1042/1042**,
  `db lint` limpo.
- 119 migrations, 88 arquivos pgTAP, 80 unit, 38 E2E specs.
- Next 16, Node ≥22, pnpm 11.18 pinned, Biome 2.5.7 — pinado e reproduzível.

### Funcionalidade coberta (pós-onda E/F/T/H/G Task 1)
- **Entrada:** login/signup sem senha, magic link + Google (UI), consentimento versionado,
  verificação por CPF + Portal, caminho de exceção por documento (TTL 7d), fila do
  operador, recurso de rejeição, reconciliação `pending` a cada 15 min.
- **Convites:** membro (token, escopo de comunidade, aprovação do dono) + familiar
  (e-mail-alvo conferido, sad paths 404/410/409).
- **Comunidade:** feed da vila, fila de aprovação em lote, delegação de moderador,
  convite de comunidade, cidade como **alcance**, não sala (D48).
- **Perfil:** visibilidade única por locality_membership, avatar com fallback, aba de
  publicações e eventos filtrada pelo viewer (RLS no banco, não na UI).
- **Eventos:** criar, RSVP com 3 estados, convite de evento (5/h), encontro recorrente
  (Carnaval testado).
- **Indicações:** pedir, responder, salvar, fechar ciclo, escopo Saúde só em grupo.
- **Moderação:** denúncia unificada (6 alvos), sanitização de CPF no motivo, `resolve_report`,
  suspensão pendente.
- **Mensagens:** inbox com deep-links, preferências honradas; DM **publicada mas não aberta**
  entre membros (decisão).
- **Prestador:** fundação (conta, shell, roteamento) — T1 da onda G fechada; o resto é
  Tasks 3-5 (ficha, dashboard, busca).

### Segurança / RLS
- **MVP-02-AUTHZ fechado** (auditoria 2026-08-22). Nenhum gap crítico no runtime; classe
  inteira de bug `auth.uid() null sob service_role` corrigida com parâmetro explícito
  `p_caller_user_id` nas RPCs sensíveis.
- Guarda-rails estruturais em `tests/scope/rls-structure.test.mjs` rodam em ms.
- `pii-scrub` no Sentry e na redação de motivo de denúncia.
- `AUTHZ-AUTHUID-GAPS`: 5 funções residuais com `auth.uid()` interno + grant service_role —
  nenhum usado em runtime hoje, mas são regressão-por-mudança-de-caller.

---

## 2. Bloqueios de lançamento (por categoria)

### A. Governança externa / humana — sem código que resolva

**A1. Textos legais em rascunho, aceitos pelo membro.** `BLOCK-LEGAL-ENTRY`.
- `docs/legal/CODIGO_DE_CONDUTA.md` (74 linhas) e `PRIVACIDADE.md` (108 linhas) abrem
  com "rascunho, precisa de revisão jurídica".
- O `/consent` já renderiza ambos como texto a aceitar, com versão `1.0` registrada.
- O dossiê `docs/legal/REVISAO_LANCAMENTO.md` lista 8 pendências humanas abertas
  (controlador, canal oficial, encarregado, terceiros ativos, direitos do titular,
  incidente, fluxo de revisão, regra "uso contínuo = aceite").
- **Saída:** advogado revisa bases legais + dono assina conduta + define controlador
  (depende do veículo jurídico — ver A4). Nenhuma migration fecha isso.

**A2. Afiliação militar declarada — ADR parado.** `BLOCK-AFFILIATION` (HOLD).
- `ADR-20260811-om-declarada` está `proposed` há 14 dias.
- Cinco requisitos antes de aprovar: threat model de enumeração, proteção além de rate
  limit, tela de consentimento, tratamento de perfis `hidden`, governança LGPD publicada.
- Enquanto proposto, `AGENTS.md:205` proíbe persistir OM. `PRODUCT_STATUS.md §3` marca
  "afiliação declarada: não existe".
- **Saída:** o dono fecha o ADR (aceitar/rejeitar). Enquanto `proposed`, a coluna
  "busca de prestador por OM" da G não pode abrir, e a Task 6 da onda C (rubrica visual)
  segue adiada.

**A3. LGPD para IA e terceiros.** `BLOCK-LEGAL-AI`.
- PostHog (métrica de produto), Asaas (cobrança), IA de curadoria do guia (D49) e
  Resend/WhatsApp são terceiros que recebem dado.
- `BIVAQUE.md §4.4` é explícito: "Nenhum dos dois está pronto para publicar... É
  pré-requisito do ADR da OM e do lançamento, não item de backlog."
- **Saída:** dono publica governança (base legal de cada saída, opt-out, prazo de
  retenção, lista de sub-processadores) — exige decisão, não código.

**A4. Veículo jurídico (Art. 29 da Lei 6.880/80).** `BIVAQUE.md §7.6`.
- "O fundador não é a cabeça do Bivaque." Militar da ativa tem restrição legal a
  comerciar/gerir sociedade.
- Decidido o princípio: quem consta decide de fato. **Não decidido o arranjo.**
- Pendura A1 (controlador) e A8 (CNPJ para Asaas).
- **Saída:** parecer profissional. Não tem prazo no board, mas é pré-requisito do
  "quem responde pelos dados" da política de privacidade.

### B. Infra externa — produção não existe

**B1. Resend: conta existe, domínio `stoqio.com.br` verificado, DKIM/SPF/MX publicados,
secret no GitHub desde 17/08. Mas:** `BLOCK-RESEND` ainda exige "criar o projeto de
deploy do Bivaque" e "provar uma entrega real pelo outbox em ambiente implantado".
- `Vercel` mostra apenas o repo "novo, ainda não importado"; **não existe projeto do
  Bivaque para configurar runtime.**
- Convites e decisão de documento já enfileiram no outbox, mas o adaptador Resend
  não tem provisão de produção ativa.
- **Saída:** importar o repo na Vercel, configurar envs de produção, rodar uma entrega
  ponta a ponta. Sem isso, o membro entra, mas o convite e a aprovação por documento
  ficam silenciosos — quebra o ciclo de convite familiar.

**B2. WhatsApp não-oficial.** `BLOCK-WHATSAPP`. Chip dedicado + CNPJ (Cloud API).
- Decisão recente: WhatsApp saiu da fila automática do MVP. Se ficar só como suporte
  manual, a política de privacidade não deve descrevê-lo como canal normal de notificação
  (red flag #5 do dossiê).
- **Saída:** decidir manter/suprimir antes da revisão legal; sem decisão, a LGPD
  promete um canal que não existe.

**B3. Staging.** `PRODUCT_STATUS.md §11`: **não existe e não vai existir.** Risco D42
aceito — erro de migração sobre dado real vai direto à produção. É uma decisão; só
vale a pena revisitar se aparecer a primeira vez que isso queima.

### C. Débitos técnicos internos — não bloqueiam, mas pesam

**C1. E2E — 9 falhas funcionais reais.** `MVP-00-E2E-FUNCTIONAL` (P1, status `now`).
- Já caiu de 65 para ~9 falhas. As 9 restantes exigem decisão R3, não fix de código:
  - `admissions :157/:174` — RPCs `list_verification_queue/documents` com grant só
    service_role: **decidir** se operador autenticado recebe EXECUTE ou spec muda
    para fluxo via UI.
  - `community-invitations :72` — investigar runtime (provável drift de seed).
  - `group-admin-cycle :103` — **RLS esconde a própria pendência** do requerente em
    grupo privado: bug RLS, exige decisão de política.
  - `reports-member-flow :98` — `ReportButton` sem `reporter_user_id`: bug app,
    política exige `reporter_user_id = auth.uid()`.
  - `synthetic-people :167` — `notification_preferences.comments=false` suprime
    notify_comment: decidir o default.
  - `empty-locality :129 (×4)` — seed sem 2ª UF de baixa densidade: bloqueado em seed.
- **Saída:** o dono (você) decide cada item; o que virar `accepted` vai pra fila da
  engenharia, o que virar `rejected` fecha o spec.

**C2. Cinco funções com `auth.uid()` interno + grant service_role.** `AUTHZ-AUTHUID-GAPS`.
- Não usadas em runtime hoje. São bomba-relógio se um caller mudar.
- **Saída:** varredura pra adicionar parâmetro explícito (mesmo padrão das outras 13
  já migradas). ~1-2 horas.

**C3. Linhas obsoletas sem remoção.** `PRODUCT_STATUS.md §"Linhas obsoletas"`.
- `public.waitlist`, RPC `add_to_waitlist`, migration `20260802000600`, pgTAP
  `onboarding-consent-waitlist.sql`. UI já removeu (P0 Task 8); schema segue de pé.
- **Saída:** migration `202608XXXX_drop_waitlist` antes da próxima onda T.

**C4. Dívida técnica menor.**
- Bucket `event-photos` mal nomeado (é upload de post, não de evento) — rename.
- 4 telas com `<Checkbox>` do HeroUI em estrutura simples (não clicável) — sinalizadas,
  não corrigidas. Quebra UX silenciosa.
- Sem verificação server-side do EXIF em upload de foto (confia no reencode do cliente).
- `events/[id]/page.tsx:132-133` e `event-invites-actions.ts` têm comentários
  service_role obsoletos.

### D. Higiene do repositório

- **Working tree sujo** com 13 artefatos não-commitados: `e2e-*.log` (logs de execução),
  `playwright-install.log`, `supabase-env.txt`, `supabase-start.err/log`,
  `docs/legal/REVISAO_LANCAMENTO.md` (unstaged). Os logs são descartáveis; o
  `REVISAO_LANCAMENTO.md` precisa ser commitado junto com seu uso.
- `next` build de produção estava quebrado até 2026-08-20; corrigido na sessão de
  fechamento de T/F. **Hoje passa.**
- Secrets em `apps/web/.env.local` (gitignored, formato correto: Resend `re_XXXXX`,
  Portal hex 32 chars). Recomenda-se **rotação** porque transcripts de sessão podem
  ter vazado (board card `REPO-SECRETS-ROTATION`, P0).
- Sem `LICENSE`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md` na raiz (privado, OK).
- Sem `SECURITY.md` na raiz? **Existe** — 2648 bytes, política real.
- `playwright-install.log` mostra download do Chromium gerenciado não completou na
  última tentativa (rede). `--headed` funciona; `--trace on` trava.

### E. GitHub

- Repo `Juanjfmr/bivaque-community`: branch `main`, 25 commits recentes, todos
  coerentes (commits `feat/fix/test/chore/docs/authz`).
- **1 issue aberta** (#20, P0 multi-localidade). Runtime fecha quase tudo; residual =
  E2E two-localities. Mantida aberta até o E2E rodar, conforme comentário.
- **PRs:** 1 dependabot production aberto (atualizações de prod, 24/08); 1 dependabot
  development aberto; 5 PRs DRAFT de auditoria/agents/harness; resto mergeado.
- CI: `deploy-migrations.yml` (gate + push em merge), `pull-request-ci.yml`,
  `claude-review.yml`. Workflow exige secrets `SUPABASE_*` que precisam ser
  configurados no repo para deploy de produção.

---

## 3. Caminho crítico para abrir o piloto

Sequência mínima viável (cada item destrava o próximo):

1. **Você decide os 8 R3 do E2E** (item C1) — sem isso, "0 falhas E2E" não fecha e o
   gate não autoriza "pronto".
2. **Você fecha o ADR de afiliação declarada** (`BLOCK-AFFILIATION`) — destrava a
   rubrica visual da onda C e remove ambiguidade do contrato `AGENTS.md:205`.
3. **Advogado revisa os textos** (`BLOCK-LEGAL-ENTRY`) + **você define o veículo
   jurídico** (A4) — produz a versão publicável de privacidade/conduta, com
   controlador, canal, encarregado declarados.
4. **Você publica a governança LGPD de terceiros** (`BLOCK-LEGAL-AI`) — base legal
   para PostHog, Resend, WhatsApp (se mantido), Asaas (se mantido).
5. **Deploy de produção** (`BLOCK-RESEND`):
   - Importar repo na Vercel (variáveis de runtime do Supabase + Resend + Sentry).
   - Configurar secrets `SUPABASE_*` no GitHub Actions (deploy-migrations.yml).
   - Rodar `pnpm db push` na primeira vez.
   - Provar uma entrega real pelo outbox em ambiente implantado.
6. **Rotação das chaves Portal + Resend** (`REPO-SECRETS-ROTATION`) — antes de qualquer
   envio real de e-mail contendo dado pessoal.
7. **Remoção de linhas obsoletas** (`waitlist`) — trabalho de uma migration, 30 min.
8. **Limpeza do working tree** (commit dos artefatos que valem a pena; descarte do
   resto).

Após isso, **a versão atual do código já é o MVP de Manaus**: feed da vila, cidade
como alcance, eventos com recorrência, indicações com fechamento de ciclo, moderação
unificada, convite de membro e familiar, prestador apenas com fundação de conta
(vitrine/cobrança continuam ondas G pós-lançamento).

### O que NÃO fecha com código só
- Decisão sobre OM declarada (R3).
- Quem é o controlador dos dados (advogado + veículo jurídico).
- Se WhatsApp entra ou não (decisão de produto + chip + CNPJ).
- Publicação da governança LGPD para terceiros.
- Deploy real (Vercel + secrets + Supabase prod).
- Se marketplace/Asaas entra no MVP ou fica pós-lançamento (CNPJ).

### O que fecha com código sozinho, em sequência
- Os 9 E2E remanescentes (C1).
- AUTHZ-AUTHUID-GAPS (C2).
- `drop_waitlist` (C3).
- Dívidas técnicas menores (C4) — nice to have, não bloqueiam.

---

## 4. Posição no ciclo

O projeto-mãe (`Juanjfmr/Bivaque`, 74 decisões, 19 features, regime formal de ADR)
**parou de lançar exatamente por isto**: governança demais, decisão nenhuma. O fork
`bivaque-community` foi cortado para ser a menor fatia viável — e a fatia está
pronta no código. **O que falta é a mesma classe de coisa que travou o pai, mas
reduzida a 8 decisões e 1 deploy.**

A frase do próprio `BIVAQUE.md §1.5` continua verdadeira: *"Essa governança é o que
impediu o lançamento."* A diferença é que aqui a governança está consolidada em
**um documento** (`REVISAO_LANCAMENTO.md`) com 8 saídas esperadas — não em 74
decisões soberanas.

---

## 5. Anexos para acompanhar

- `tools/backend-kanban/BOARD.md` — 4 cards `now`, 6 `blocked`, 17 `done`, 1 drift.
- `docs/PRODUCT_STATUS.md` — fonte de verdade do estado implementado (343 linhas).
- `docs/legal/REVISAO_LANCAMENTO.md` — dossiê interno, 8 decisões humanas abertas.
- `docs/decisions/RISK_MATRIX.md` — régua que classifica cada decisão.
- Cards no board: `MVP-01-ADMISSION` (P0, now), `MVP-00-E2E-FUNCTIONAL` (P1, now),
  `MVP-03-COMMUNITY` (P1), `MVP-05-TEST-BASELINE` (P1), `BLOCK-LEGAL-ENTRY`,
  `BLOCK-LEGAL-AI`, `BLOCK-RESEND`, `BLOCK-WHATSAPP`, `BLOCK-AFFILIATION`,
  `BLOCK-ASAAS`, `REPO-ISSUE-20`, `REPO-SECRETS-ROTATION`, `AUTHZ-AUTHUID-GAPS`.

---
*Auditoria não inclui alterações. Os débitos técnicos podem ser abertos como cards
de engineering quando você quiser; os bloqueios externos precisam de decisão ou
contratação de terceiro antes de qualquer merge.*
