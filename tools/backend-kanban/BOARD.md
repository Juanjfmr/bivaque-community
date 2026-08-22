# Bivaque — resumo operacional do MVP

<!-- Gerado por tools/backend-kanban/src/board.mjs. Não editar manualmente. -->

**Snapshot:** 22/08/2026 · snapshot do worktree e GitHub

> Código, migrations, testes e GitHub atual prevalecem. Documentação conflitante é drift até reconciliação explícita.

**Mapa:** 31 frentes · 6 agora · 5 bloqueadas · 4 concluídas · 3 drifts

Use o ID abaixo para consultar o card completo em `public/board.json` antes de planejar ou implementar.

## Agora

- **MVP-00-REBASELINE** · P0 · Rebaseline técnico e contrato de lançamento
- **MVP-01-ADMISSION** · P0 · Admissão, localidade e convites: fechar ciclos pendentes
- **MVP-02-AUTHZ** · P0 · Authorization / RLS hardening com caller real
- **MVP-03-COMMUNITY** · P1 · Fechamento Community Graph e ciclos sociais
- **MVP-04-PROVIDER-FOUNDATION** · P1 · Vitrine G1: fundação da conta de prestador
- **MVP-05-TEST-BASELINE** · P1 · Baseline reproduzível de testes e tipos

## Bloqueios

- **BLOCK-LEGAL-AI** · BLOCK · Governança LGPD para IA e terceiros — Revisão jurídica; Decisões do dono
- **BLOCK-RESEND** · BLOCK · Resend e domínio de e-mail transacional — Conta Resend; Domínio e DNS; Decisão do dono
- **BLOCK-WHATSAPP** · BLOCK · Canal WhatsApp do outbox — Chip dedicado; CNPJ para Cloud API futura; Decisão de produto
- **BLOCK-AFFILIATION** · HOLD · Afiliação militar declarada — Decisão R3 humana
- **BLOCK-ASAAS** · HOLD · Marketplace pago / Asaas — CNPJ; Decisão operacional de cobrança

## Drift aberto

- **REPO-ISSUE-20** · P0 · Issue #20 — multi-localidade — Reescrever a issue para a lacuna residual ou encerrá-la com links de prova.
- **MVP-04-PROVIDER-FOUNDATION** · P1 · Vitrine G1: fundação da conta de prestador — Atualizar status para distinguir fundação implementada de perfil/listings ainda abertos após validar reset e testes.
- **REPO-PR-18** · P1 · PR #18 — SPEC.md como contrato normativo — Triar o PR antes de citar SPEC.md como fonte no Kanban ou README.

## Triagem prioritária

- **REPO-ISSUE-20** · P0 · Issue #20 — multi-localidade
- **REPO-SECRETS-ROTATION** · P0 · Rotação de chaves Portal e Resend
- **DRIFT-STATUS-RECONCILIATION** · P1 · Reconciliar documentação com runtime após cada ciclo
- **REPO-PR-18** · P1 · PR #18 — SPEC.md como contrato normativo
- **REPO-PR-24** · P1 · PR #24 — BOM em database.generated.ts
- **REPO-PR-25** · P1 · PR #25 — master plan G/H
- **REPO-PR-28** · P1 · PR #28 — Agent Harness

## Comandos

```sh
node tools/backend-kanban/src/board.mjs --check
node tools/backend-kanban/src/board.mjs --write-summary
```
