# Bivaque — resumo operacional do MVP

<!-- Gerado por tools/backend-kanban/src/board.mjs. Não editar manualmente. -->

**Snapshot:** 22/08/2026 · snapshot do worktree e GitHub

> Código, migrations, testes e GitHub atual prevalecem. Documentação conflitante é drift temporário: o agente resolve, bloqueia com motivo real ou deixa próximo passo concreto.

**Mapa:** 33 frentes · 6 agora · 5 bloqueadas · 6 concluídas · 4 drifts

Para trabalho autônomo, rode `node tools/backend-kanban/src/board.mjs --next` e resolva um card por commit. Drift é evidência temporária; não é fechamento.

Use o ID abaixo com `node tools/backend-kanban/src/board.mjs --card <ID>` antes de planejar ou implementar.

## Agora

- **MVP-01-ADMISSION** · P0 · Admissão, localidade e convites: fechar ciclos pendentes
- **AUTHZ-AUTHUID-GAPS** · P1 · Gaps auth.uid() em RPCs SECURITY DEFINER chamadas via service_role
- **MVP-04-PROVIDER-FOUNDATION** · P1 · Vitrine G1: fundação da conta de prestador
- **MVP-00-E2E-UUID-REALIGN** · P1 · Realinhar E2E specs contra seed real
- **MVP-03-COMMUNITY** · P1 · Fechamento Community Graph e ciclos sociais
- **MVP-05-TEST-BASELINE** · P1 · Baseline reproduzível de testes e tipos

## Bloqueios

- **BLOCK-LEGAL-AI** · BLOCK · Governança LGPD para IA e terceiros — Revisão jurídica; Decisões do dono
- **BLOCK-RESEND** · BLOCK · Resend e domínio de e-mail transacional — Conta Resend; Domínio e DNS; Decisão do dono
- **BLOCK-WHATSAPP** · BLOCK · Canal WhatsApp do outbox — Chip dedicado; CNPJ para Cloud API futura; Decisão de produto
- **BLOCK-AFFILIATION** · HOLD · Afiliação militar declarada — Decisão R3 humana
- **BLOCK-ASAAS** · HOLD · Marketplace pago / Asaas — CNPJ; Decisão operacional de cobrança

## Drift aberto

- **AUTHZ-AUTHUID-GAPS** · P1 · Gaps auth.uid() em RPCs SECURITY DEFINER chamadas via service_role — Atualizar comentários nos arquivos afetados ou criar migration com parâmetro explicito. Registrar como débito técnico.
- **MVP-04-PROVIDER-FOUNDATION** · P1 · Vitrine G1: fundação da conta de prestador — STATUS reconciliado 2026-08-22: linha 'Conta de prestador' movida para primeiro lugar na tabela Vitrine, marcando fundação implementada; ficha/dashboard/busca permanecem como não-implementados.
- **REPO-ISSUE-20** · P0 · Issue #20 — multi-localidade — Reescrever a issue para a lacuna residual ou encerrá-la com links de prova.
- **REPO-PR-18** · P1 · PR #18 — SPEC.md como contrato normativo — Triar o PR antes de citar SPEC.md como fonte no Kanban ou README.

## Triagem prioritária

- **REPO-ISSUE-20** · P0 · Issue #20 — multi-localidade
- **REPO-SECRETS-ROTATION** · P0 · Rotação de chaves Portal e Resend
- **REPO-PR-18** · P1 · PR #18 — SPEC.md como contrato normativo
- **DRIFT-STATUS-RECONCILIATION** · P1 · Reconciliar documentação com runtime após cada ciclo
- **REPO-PR-24** · P1 · PR #24 — BOM em database.generated.ts
- **REPO-PR-25** · P1 · PR #25 — master plan G/H
- **REPO-PR-28** · P1 · PR #28 — Agent Harness

## Comandos

```sh
node tools/backend-kanban/src/board.mjs --check
node tools/backend-kanban/src/board.mjs --write-summary
node tools/backend-kanban/src/board.mjs --next
node tools/backend-kanban/src/board.mjs --card MVP-02-AUTHZ
node tools/backend-kanban/src/board.mjs --search "service_role"
```
