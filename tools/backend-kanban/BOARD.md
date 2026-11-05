# Bivaque — resumo operacional do MVP

<!-- Gerado por tools/backend-kanban/src/board.mjs. Não editar manualmente. -->

**Snapshot:** 2026-11-05

> docs/LANCAMENTO.md define o lançamento e o que é pronto; os cards LAN-* acompanham cada fase e jornada. O ADR-20261024-front-react-spa governa o app (apps/app) e a troca das telas antigas do apps/web. Documentos de agosto a outubro estão em docs/historico e não orientam trabalho. Código e provas atuais determinam entrega, sem apagar evidências ou criar outra fila.

**Mapa:** 155 frentes · 6 agora · 7 bloqueadas · 71 concluídas · 0 drifts

Para trabalho autônomo, rode `node tools/backend-kanban/src/board.mjs --next` e resolva um card por commit. Drift é evidência temporária; não é fechamento.

Use o ID abaixo com `node tools/backend-kanban/src/board.mjs --card <ID>` antes de planejar ou implementar.

## Agora

- **APP-001** · P1 · SPA nova: onda 1, base e navegação
- **APP-F01-ENTRADA-VISUAL** · P1 · F01: entrada e onboarding no visual aprovado (apps/app)
- **INDICACOES-AVISO** · P1 · Aviso de pedido de indicação: a cidade fica sabendo em minutos
- **INDICACOES-MEMORIA** · P1 · Indicações com memória: pedir começa por procurar, e a resposta que resolveu fica achável
- **RED-003** · P1 · Comunidade: R3 migration e pgTAP da matriz aprovada
- **RUN-130** · P1 · Painel online de prontidão do Bivaque

## Bloqueios

- **BLOCK-LEGAL-AI** · BLOCK · Governança LGPD para IA e terceiros — Revisão jurídica; Decisões do dono
- **BLOCK-LEGAL-ENTRY** · BLOCK · Textos legais da entrada prontos para abertura pública — Abertura pública; Prova E2E/deploy
- **BLOCK-RESEND** · BLOCK · Resend e domínio de e-mail transacional — Criar o projeto de deploy do Bivaque e configurar RESEND_API_KEY e RESEND_FROM_EMAIL; Provar uma entrega real pelo outbox em ambiente implantado
- **BLOCK-MOBILE-RUNTIME** · P1 · Runtime iOS em device real — Android já provado no emulador — cmdline-tools + system-image + AVD ausentes (Android); Apple Developer Program + EAS credentials ausentes (iOS)
- **BLOCK-AFFILIATION** · HOLD · Afiliação militar declarada — Governanca LGPD de terceiros (BLOCK-LEGAL-AI) — portao da EXPOSICAO do campo, agora com o tecnico resolvido
- **BLOCK-ASAAS** · HOLD · Marketplace pago / Asaas — CNPJ; Decisão operacional de cobrança
- **WEB-OG-METADATABASE** · P2 · OG da raiz resolve para localhost sem metadataBase — Dominio canonico de producao nao decidido; apps/web/.env.example nao possui variavel de URL publica

## Drift aberto

Nenhum card.

## Triagem prioritária

- **PROXY-SURFACE-RISK** · P1 · Superfície de escape do gate de rota documentada e reduzida

## Comandos

```sh
node tools/backend-kanban/src/board.mjs --check
node tools/backend-kanban/src/board.mjs --write-summary
node tools/backend-kanban/src/board.mjs --next
node tools/backend-kanban/src/board.mjs --card MVP-02-AUTHZ
node tools/backend-kanban/src/board.mjs --search "service_role"
```
