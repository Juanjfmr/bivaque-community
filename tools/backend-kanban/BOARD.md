# Bivaque — resumo operacional do MVP

<!-- Gerado por tools/backend-kanban/src/board.mjs. Não editar manualmente. -->

**Snapshot:** 23/08/2026 · snapshot do worktree e GitHub

> Código, migrations, testes e GitHub atual prevalecem. Documentação conflitante é drift temporário: o agente resolve, bloqueia com motivo real ou deixa próximo passo concreto.

**Mapa:** 44 frentes · 4 agora · 6 bloqueadas · 17 concluídas · 1 drifts

Para trabalho autônomo, rode `node tools/backend-kanban/src/board.mjs --next` e resolva um card por commit. Drift é evidência temporária; não é fechamento.

Use o ID abaixo com `node tools/backend-kanban/src/board.mjs --card <ID>` antes de planejar ou implementar.

## Agora

- **MVP-01-ADMISSION** · P0 · Admissão, localidade e convites: fechar ciclos pendentes
- **MVP-00-E2E-FUNCTIONAL** · P1 · Reconciliar 65 falhas E2E funcionais (app × spec)
- **MVP-03-COMMUNITY** · P1 · Fechamento Community Graph e ciclos sociais
- **MVP-05-TEST-BASELINE** · P1 · Baseline reproduzível de testes e tipos

## Bloqueios

- **BLOCK-LEGAL-AI** · BLOCK · Governança LGPD para IA e terceiros — Revisão jurídica; Decisões do dono
- **BLOCK-LEGAL-ENTRY** · BLOCK · Textos legais da entrada prontos para aceite — Revisão jurídica; Aprovação do dono
- **BLOCK-RESEND** · BLOCK · Resend e domínio de e-mail transacional — Conta Resend; Domínio e DNS; Decisão do dono
- **BLOCK-WHATSAPP** · BLOCK · Canal WhatsApp do outbox — Chip dedicado; CNPJ para Cloud API futura; Decisão de produto
- **BLOCK-AFFILIATION** · HOLD · Afiliação militar declarada — Decisão R3 humana
- **BLOCK-ASAAS** · HOLD · Marketplace pago / Asaas — CNPJ; Decisão operacional de cobrança

## Drift aberto

- **REPO-ISSUE-20** · P0 · Issue #20 — multi-localidade — Reavaliado 2026-08-22: runtime fecha quase tudo; residual = E2E two-localities (bloqueado por build do web). Issue mantida aberta até o E2E rodar, conforme recomendação no comentário.

## Triagem prioritária

- **REPO-ISSUE-20** · P0 · Issue #20 — multi-localidade
- **REPO-SECRETS-ROTATION** · P0 · Rotação de chaves Portal e Resend
- **DRIFT-STATUS-RECONCILIATION** · P1 · Reconciliar documentação com runtime após cada ciclo

## Comandos

```sh
node tools/backend-kanban/src/board.mjs --check
node tools/backend-kanban/src/board.mjs --write-summary
node tools/backend-kanban/src/board.mjs --next
node tools/backend-kanban/src/board.mjs --card MVP-02-AUTHZ
node tools/backend-kanban/src/board.mjs --search "service_role"
```
