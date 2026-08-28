# Bivaque — resumo operacional do MVP

<!-- Gerado por tools/backend-kanban/src/board.mjs. Não editar manualmente. -->

**Snapshot:** 23/08/2026 · snapshot do worktree e GitHub

> Código, migrations, testes e GitHub atual prevalecem. Documentação conflitante é drift temporário: o agente resolve, bloqueia com motivo real ou deixa próximo passo concreto.

**Mapa:** 46 frentes · 2 agora · 6 bloqueadas · 20 concluídas · 2 drifts

Para trabalho autônomo, rode `node tools/backend-kanban/src/board.mjs --next` e resolva um card por commit. Drift é evidência temporária; não é fechamento.

Use o ID abaixo com `node tools/backend-kanban/src/board.mjs --card <ID>` antes de planejar ou implementar.

## Agora

- **MVP-05-TEST-BASELINE** · P1 · Baseline reproduzível de testes e tipos
- **MVP-00-E2E-FUNCTIONAL** · P1 · Reconciliar 65 falhas E2E funcionais (app × spec)

## Bloqueios

- **BLOCK-LEGAL-ENTRY** · BLOCK · Textos legais da entrada prontos para aceite — Revisão jurídica; Aprovação do dono
- **BLOCK-LEGAL-AI** · BLOCK · Governança LGPD para IA e terceiros — Revisão jurídica; Decisões do dono
- **BLOCK-RESEND** · BLOCK · Resend e domínio de e-mail transacional — Criar o projeto de deploy do Bivaque e configurar RESEND_API_KEY e RESEND_FROM_EMAIL; Provar uma entrega real pelo outbox em ambiente implantado
- **BLOCK-WHATSAPP** · BLOCK · Canal WhatsApp do outbox — Chip dedicado; CNPJ para Cloud API futura; Decisão de produto
- **BLOCK-AFFILIATION** · HOLD · Afiliação militar declarada — Decisão R3 humana
- **BLOCK-ASAAS** · HOLD · Marketplace pago / Asaas — CNPJ; Decisão operacional de cobrança

## Drift aberto

- **MVP-05-TEST-BASELINE** · P1 · Baseline reproduzível de testes e tipos — Executar o contrato docs/agents/tasks/HRN-003.task.yml: duas execuções da suíte no mesmo commit comparadas por LISTA NOMINAL de vermelhos (contagem igual com testes diferentes é falha), medindo os workers efetivos e a contaminação entre os três projetos ANTES de atribuir a variação a asserção frágil. O procedimento serial pós-PR #35 que estava escrito aqui está superado: o PR foi mergeado em 2026-08-28T02:30Z e a comparação por contagem não distingue os dois casos.
- **BLOCK-LEGAL-ENTRY** · BLOCK · Textos legais da entrada prontos para aceite — Reconciliar a tabela de operadores de PRIVACIDADE.md com a dos Termos na mesma revisão jurídica, antes de qualquer publicação — dois documentos do mesmo acordo declarando compartilhamentos diferentes é exatamente a contradição que vira sanção.

## Triagem prioritária

- **REPO-SECRETS-ROTATION** · P0 · Rotação de chaves Portal e Resend
- **DRIFT-STATUS-RECONCILIATION** · P1 · Reconciliar documentação com runtime após cada ciclo
- **REPO-REVIEW-CHECK-DEAD** · P1 · Revisor adversarial da CI morto desde 24/08

## Comandos

```sh
node tools/backend-kanban/src/board.mjs --check
node tools/backend-kanban/src/board.mjs --write-summary
node tools/backend-kanban/src/board.mjs --next
node tools/backend-kanban/src/board.mjs --card MVP-02-AUTHZ
node tools/backend-kanban/src/board.mjs --search "service_role"
```
