# Bivaque — resumo operacional do MVP

<!-- Gerado por tools/backend-kanban/src/board.mjs. Não editar manualmente. -->

**Snapshot:** 31/08/2026 · card mobile autorizado; snapshot do worktree

> Código, migrations, testes e GitHub atual prevalecem. Documentação conflitante é drift temporário: o agente resolve, bloqueia com motivo real ou deixa próximo passo concreto.

**Mapa:** 55 frentes · 3 agora · 7 bloqueadas · 27 concluídas · 0 drifts

Para trabalho autônomo, rode `node tools/backend-kanban/src/board.mjs --next` e resolva um card por commit. Drift é evidência temporária; não é fechamento.

Use o ID abaixo com `node tools/backend-kanban/src/board.mjs --card <ID>` antes de planejar ou implementar.

## Agora

- **S6-MOBILE-RUNTIME** · P0 · Mobile: RUNTIME PROOF real no emulador + tipos Foto/Link/Enquete + realtime
- **DS-001-DESIGN-SYSTEM** · P1 · Sistema de design canônico Casa comum
- **MVP-05-TEST-BASELINE** · P1 · Baseline reproduzível de testes e tipos

## Bloqueios

- **BLOCK-LEGAL-AI** · BLOCK · Governança LGPD para IA e terceiros — Revisão jurídica; Decisões do dono
- **BLOCK-LEGAL-ENTRY** · BLOCK · Textos legais da entrada prontos para abertura pública — Abertura pública; Prova E2E/deploy
- **BLOCK-RESEND** · BLOCK · Resend e domínio de e-mail transacional — Criar o projeto de deploy do Bivaque e configurar RESEND_API_KEY e RESEND_FROM_EMAIL; Provar uma entrega real pelo outbox em ambiente implantado
- **BLOCK-WHATSAPP** · BLOCK · Canal WhatsApp do outbox — Chip dedicado; CNPJ para Cloud API futura; Decisão de produto
- **BLOCK-MOBILE-RUNTIME** · P1 · Runtime Android/iOS em device real — bootstrap ausente — cmdline-tools + system-image + AVD ausentes (Android); Apple Developer Program + EAS credentials ausentes (iOS)
- **BLOCK-AFFILIATION** · HOLD · Afiliação militar declarada — Decisão R3 humana
- **BLOCK-ASAAS** · HOLD · Marketplace pago / Asaas — CNPJ; Decisão operacional de cobrança

## Drift aberto

Nenhum card.

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
