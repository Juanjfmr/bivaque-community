# Bivaque — resumo operacional do MVP

<!-- Gerado por tools/backend-kanban/src/board.mjs. Não editar manualmente. -->

**Snapshot:** 29/08/2026 · identidade oficial aprovada e preparada para integração

> Código, migrations, testes e GitHub atual prevalecem. Documentação conflitante é drift temporário: o agente resolve, bloqueia com motivo real ou deixa próximo passo concreto.

**Mapa:** 46 frentes · 2 agora · 6 bloqueadas · 21 concluídas · 7 drifts

Para trabalho autônomo, rode `node tools/backend-kanban/src/board.mjs --next` e resolva um card por commit. Drift é evidência temporária; não é fechamento.

Use o ID abaixo com `node tools/backend-kanban/src/board.mjs --card <ID>` antes de planejar ou implementar.

## Agora

- **MVP-05-TEST-BASELINE** · P1 · Baseline reproduzível de testes e tipos
- **MVP-00-E2E-FUNCTIONAL** · P1 · Reconciliar falhas E2E funcionais (app × spec)

## Bloqueios

- **BLOCK-LEGAL-ENTRY** · BLOCK · Textos legais da entrada prontos para aceite — Revisão jurídica; Aprovação do dono
- **BLOCK-LEGAL-AI** · BLOCK · Governança LGPD para IA e terceiros — Revisão jurídica; Decisões do dono
- **BLOCK-RESEND** · BLOCK · Resend e domínio de e-mail transacional — Criar o projeto de deploy do Bivaque e configurar RESEND_API_KEY e RESEND_FROM_EMAIL; Provar uma entrega real pelo outbox em ambiente implantado
- **BLOCK-WHATSAPP** · BLOCK · Canal WhatsApp do outbox — Chip dedicado; CNPJ para Cloud API futura; Decisão de produto
- **BLOCK-AFFILIATION** · HOLD · Afiliação militar declarada — Decisão R3 humana
- **BLOCK-ASAAS** · HOLD · Marketplace pago / Asaas — CNPJ; Decisão operacional de cobrança

## Drift aberto

- **MVP-05-TEST-BASELINE** · P1 · Baseline reproduzível de testes e tipos — Após o merge do PR #35, rodar test:e2e serial duas vezes seguidas no mesmo commit e comparar: se as falhas mudarem de teste outra vez, há mais asserção sem repetição a varrer antes de chamar o baseline de reproduzível.
- **G-TASK-2** · P1 · Convite de prestador (T2) — Rodar a auditoria visual da onda G e registrar o veredito; só então o card fecha. O backend segue provado e sem pendência.
- **G-TASK-3** · P1 · Ficha de prestador (T3) — Rodar a auditoria visual da vitrine e registrá-la; só então o card fecha. Nenhuma implementação de backend pendente.
- **G-TASK-4** · P1 · Painel do prestador (T4) — Rodar a auditoria visual da vitrine e registrá-la; só então o card fecha. Nenhuma implementação de backend pendente.
- **G-TASK-5** · P1 · Busca por categoria e nome (T5) — Rodar a auditoria visual da onda G e registrar o veredito; só então o card fecha. O backend segue provado e sem pendência.
- **G-TASK-6** · P1 · Conversa membro ↔ prestador (T6) — Fechar G-TASK-3 pela auditoria visual — o que fecha este junto —, ou o dono decide remover a aresta por ela apontar para o backend do G-TASK-3, que já está provado.
- **BLOCK-LEGAL-ENTRY** · BLOCK · Textos legais da entrada prontos para aceite — Reconciliar a tabela de operadores de PRIVACIDADE.md com a dos Termos na mesma revisão jurídica, antes de qualquer publicação — dois documentos do mesmo acordo declarando compartilhamentos diferentes é exatamente a contradição que vira sanção.

## Triagem prioritária

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
