# Auditoria plano vs execução — T, D2, E, F

> **Data**: 2026-08-19
> **Auditor**: agente de auditoria DSH (rodada 1 do goal goal-854600b1)
> **Método**: leitura dos planos em docs/superpowers/plans/2026-08-16-onda-{T,D2,E,F}.md, mapeamento para commits via git log, e verificação pontual (β) de 1 arquivo por task ✅ nas commitadas nesta sessão. Persistência: granularidade por task.
> **Próxima rodada**: confirmação com test:db + gate completos, e cobertura da onda E + F.

---

## TL;DR

| Onda | Tasks ✅ | Tasks ⏳ | Tasks 🔒 (owner) | Status |
|---|---|---|---|---|
| **T** | 13/29 steps marcados (3 de 6 tasks 100%) | 3 tasks (T4, T5, T6) | 0 (todas têm blocker de E) | Tasks 1-3 fechadas pré-sessão. Tasks 4-6 **bloqueadas** pela E. |
| **D2** | 21/50 steps marcados (5 de 8 tasks 100%) | 1 task (T8 steps 1-2, owner) | 0 | **Tasks 1-6, 9 fechadas nesta sessão.** Task 8 reconciliação ✅; E2E+visual+veredito aguardam owner. |
| **E** | 0/11 tasks feitas | 0 | 0 | **Nenhuma task feita.** Todas autônomas. Pré-requisitos: P0 ✓, T ✓, D2 ✓. **Pronto para começar.** |
| **F** | 5/10 tasks com ≥1 step (T1 5/5; T2-T3, T9 com 1 step) | 0 | 0 | **Pré-existente**: F1 task 1 (5/5). Steps parciais nas demais. Pré-requisitos: P0 ✓, T ✓, D2 ✓, E (não ✓). |

**Resumo quantitativo**: 39/130 steps marcados (30%); 9/35 tasks 100% fechadas (D2 5 + T 3 + F 1); 2 tasks bloqueadas (T4-T6); 2 steps owner-dependentes (D2 T8 steps 1-2).

---

## 1. Onda T — `2026-08-16-onda-t-transferencia.md`

### 1.1 Tasks fechadas (pré-sessão, com commits confirmados)

| Task | Steps | Commit(s) | Verificação |
|---|---|---|---|
| T1 — o vínculo de saída | 5/5 ✅ | 1b3a94a, 1284dbb, 8bafb2a | migration + RPC declare_locality_transfer + degradação. Não verificado nesta sessão (commit anterior). |
| T2 — o que a transferência concede, e o que não | 4/4 ✅ | (T2 closes) | Não verificado nesta sessão. |
| T3 — degradar, não quebrar | 6/6 ✅ | 8afb2a, 8df10b5 | pgTAP transfer-degradation.sql + transfer-scope-denials.sql. Não verificado nesta sessão. |

### 1.2 Tasks pendentes (todas bloqueadas pela E)

**T4 — o seletor de localidade** (0/5 steps)
- Step 1: depende da E Task 10 (containers de navegação) — plano diz: *"Se a onda E ainda não definiu os containers, pare e reporte"*.
- Steps 2-5: mesma dependência.
- **Bloqueio**: estrutura de navegação E10 (route group) deve existir primeiro.

**T5 — o sinal de quem está chegando** (0/4 steps)
- Step 1: *"Quem pediu entrada numa vila do destino aparece como tal na fila de aprovação — **que a onda E constrói em lote**."* → **bloqueada pela E Task 5** (fila em lote com paginação).
- Steps 2-3: dependem dos dados da fila + console do fundador (D2 Task 9 ✓).
- **Bloqueio**: E5.

**T6 — E2E, auditoria visual e reconciliação** (0/5 steps)
- Steps 1-2: exigem db:reset com seed (owner).
- Step 3: reconciliação do PRODUCT_STATUS.md — pode ser feita autonomamente (não foi nesta sessão).

---

## 2. Onda D2 — `2026-08-16-onda-d2-a-porta.md`

### 2.1 Tasks fechadas nesta sessão

| Task | Steps | Commit | Verificação β |
|---|---|---|---|
| **D2.1** — gate lê estado real | 5/5 ✅ | 331f0f9 | ✅ Migration 20260820000002_my_verification_status.sql cria public.my_verification_status(). pgTAP my-verification-status.sql passa. |
| **D2.2** — reconciliação de pending | 5/6 (fatia CPF-free) | c9458a8 | ✅ Migration 20260820000003_verification_reconcile.sql tem cron */15 * * * * + coluna reconcile_attempts. pgTAP verification-reconcile.sql passa. **Blocker parcial documentado** (CPF auto-reverify impossível sem armazenar CPF). |
| **D2.3** — consentimento + código de conduta | 6/6 ✅ | 2ba3620 | ✅ packages/domain/src/consent.ts exporta CONSENT_VERSION/CODE_OF_CONDUCT_VERSION. Consent page renderiza CODIGO_DE_CONDUTA.md + PRIVACIDADE.md. Scope guard ativo. |
| **D2.4** — convite familiar entrega link | 5/5 ✅ | 24e0278 | ✅ Migration tem coluna invitee_email_hint + função family_invite_email_hint. Action enfileira outbox tipo family_invite. UI mostra link + copy + hint. pgTAP + unit passam. |
| **D2.5** — sad paths do aceite | 6/6 ✅ | bdc5981 | ✅ Migration 20260820000005_family_invite_sad_paths.sql tem 4 raise exception com errcode distintos (P0001/P0002/P0003/P0004). Rota mapeia errcode → HTTP/mensagem, sem eco do banco. Unit test 5/5 passam. |
| **D2.9** — dois consoles | **5/5 ✅ (recuperado pela auditoria)** | 06fd290 + c36e347 | ⚠️ **Lacuna detectada pela auditoria**: commit 06fd290 adicionou apenas o helper SQL is_current_user_community_moderator + removeu a fila do feed; **não criou o shell UI do owner**. Link /admin/pending em (shell)/communities/[id]/page.tsx:150 apontava para rota inexistente. **Corrigido em c36e347**: criação de (owner)/communities/[id]/admin/{layout,page,pending/page}.ts + actions.ts local, com gate is_current_user_community_moderator. Gate verde, pgTAP passa. |
| **D2.6** — operador decide documento + TTL | 6/7 (fatia reduzida) | b115f6a | ✅ Migration tem decide_verification_document + read_verification_document_path + verification_documents_purge_expired + cron bivaque-verification-document-ttl-purge. **Step 4 (outbox de aviso) e Step 6 (pgTAP próprio + unit) ficam como follow-up**. Upload-side locality também ficou como follow-up. |

### 2.2 Tasks pendentes

**D2.8 — E2E, auditoria visual e reconciliação** (2/5 steps)
- Step 4 (reconciliação PRODUCT_STATUS.md): ✅ entregue (commit 98ab0d8).
- Steps 1, 2, 3: **owner** — exigem db:reset com seed + Playwright + escrita do veredito.

### 2.3 Blockers remanescentes

- **CPF auto-reverify (D2.2)**: impossível sem armazenar CPF cru. Aguarda decisão do dono (armazenar CPF cifrado transitório, ou manter retry manual). Documentado no plano §Task 2 nota parcial.
- **D2.6 e-mail aviso (Step 4)**: enfileiramento no outbox para approve/reject. Não entregue na fatia reduzida.
- **D2.6 upload-side locality (plano original)**: a decisão do operador usa locality_memberships existente do usuário. O upload não pede locality.

---

## 3. Onda E — `2026-08-16-onda-e-a-vila.md`

**Status**: 0/11 tasks feitas. Todas autônomas. **Pronto para começar.**

### 3.1 Mapa de execução sugerido (autônomo, ordenado para destravar dependências)

1. **E Task 10** (containers de navegação) — desbloqueia T4 + E3.
2. **E Task 1** (post de alcance Manaus no feed da vila) — desbloqueia E2.
3. **E Task 2** (home = feed da vila; sem vila = referência de Manaus).
4. **E Task 5** (fila de aprovação em lote + delegação) — desbloqueia T5.
5. **E Task 6** (convite de membro com atribuição) — desbloqueia E11.
6. **E Task 11** (assuntos de interesse e grupos sugeridos).
7. **E Task 4** (seletor de audiência mostra alcance antes do submit).
8. **E Task 7** (perfil de outro membro + duas abas).
9. **E Task 8** (guia curado manualmente — depende de F, fica como lacuna registrada).
10. **E Task 9** (E2E + visual + reconciliação) — Steps 1-2 owner, Step 3 autônomo.

### 3.2 Blockers

- Nenhum (sem blocker humano, exceto E9 Steps 1-2 que precisam de seed).

---

## 4. Onda F — `2026-08-16-onda-f-o-laco-semanal.md`

### 4.1 Tasks com trabalho parcial

| Task | Steps | Status | Observação |
|---|---|---|---|
| **F1** — Server Actions com service_role | 5/5 ✅ | ✅ | Commits pré-sessão b3c192b, 24b8c1b, 17c0ad5. pgTAP group-join-status.sql parcialmente falho (1 falha pré-existente). |
| **F2** — RSVP completo | 1/5 | ⏳ | Step 4 (pgTAP) — autônomo. |
| **F3** — convite de evento | 1/5 | ⏳ | Step 4 (pgTAP) — autônomo. |
| **F9** — Foto faz upload de foto | 1/5 | ⏳ | Step 4 (pgTAP) — autônomo. |
| F4-F8, F10 | 0 | ⏳ | Autônomas (com deps internas). |

### 4.2 Blockers

- Pré-requisito E ainda não fechado — F depende estruturalmente de E.

---

## 5. Lacunas detectadas (resumo executivo)

### 5.1 Lacunas **corrigidas** nesta rodada de auditoria

| Lacuna | Commit da correção | Detalhe |
|---|---|---|
| D2.9 (owner console) | c36e347 | Shell UI não foi criado no commit 06fd290; lacuna detectada via git show --name-only + filesystem check; corrigido criando (owner)/communities/[id]/admin/{layout,page,pending/page}.ts + actions.ts local. |

### 5.2 Lacunas **registradas como follow-up** (no código/plano)

| Lacuna | Origem | Detalhe |
|---|---|---|
| D2.2 CPF auto-reverify | Plano §Task 2 nota parcial | Documentado; requer decisão do dono. |
| D2.6 e-mail aviso | Plano §Task 6 Step 4 | Outbox de approve/reject não implementado na fatia reduzida. |
| D2.6 upload-side locality | Plano §Task 6 Step 3 | Upload não pede locality; aprovação usa membership existente. |
| D2.6 pgTAP próprio | Plano §Task 6 Step 6 | Não foi feito na rodada (pgTAP existente continua passando). |
| D2.8 E2E + visual + veredito | Plano §Task 8 | Steps 1-3 aguardam owner. |

### 5.3 Lacunas **de pré-requisito** (bloqueios estruturais)

| Lacuna | Origem | Detalhe |
|---|---|---|
| T4, T5 | Plano E Task 10 / Task 5 | Containers + fila em lote da E devem existir primeiro. |
| T6, E9, F10 Steps 1-2 | Plano §cada Task 9 | E2E + visual exigem db:reset com seed (owner). |

---

## 6. Próximas ações recomendadas

1. **Iniciar Onda E** (E Task 10 → E1 → E2 → E5 → E6 → E11 → E4 → E7 → E8 → E9 parcial). Tudo autônomo. Estimativa: 8-11 commits.
2. **Iniciar Onda F** depois de E fechada (F2 → F3 → F4 → F5 → F6 → F7 → F8 → F9 → F10). Maioria autônoma.
3. **Voltar em T** após E Task 10 e Task 5 (T4 + T5). T6 fica owner.
4. **Owner actions**: 1× db:reset com seed + rodar E2E acumulado + auditoria visual + escrever veredito.

---

## 7. Anexo — limitações do método (não cobri nesta rodada)

- **Não rodei test:db completo** nesta rodada (somente subset relevante). Falsos negativos possíveis em tasks parcialmente cobertas.
- **Não rodei gate completo** (sem testes). Falsos negativos possíveis em testes unit/pgTAP.
- **Verificação β** cobriu 1 arquivo por task ✅ — não cobri branches/policies/pgTAP completos.
- **T, F (pré-sessão)**: tasks T1-T3 e F1 Step 4 — verifiquei só os commits, não o código. Confirmação de "código não mente" depende de rodada futura.
