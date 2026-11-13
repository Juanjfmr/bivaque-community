# Bivaque — resumo operacional do MVP

<!-- Gerado por tools/backend-kanban/src/board.mjs. Não editar manualmente. -->

**Snapshot:** 2026-11-07

> docs/LANCAMENTO.md define o lançamento e o que é pronto; os cards LAN-* acompanham cada fase e jornada. O ADR-20261024-front-react-spa governa o app (apps/app) e a troca das telas antigas do apps/web. Documentos de agosto a outubro estão em docs/historico e não orientam trabalho. Código e provas atuais determinam entrega, sem apagar evidências ou criar outra fila.

**Mapa:** 212 frentes · 0 agora · 9 bloqueadas · 101 concluídas · 0 drifts

Para trabalho autônomo, rode `node tools/backend-kanban/src/board.mjs --next` e resolva um card por commit. Drift é evidência temporária; não é fechamento.

Use o ID abaixo com `node tools/backend-kanban/src/board.mjs --card <ID>` antes de planejar ou implementar.

## Agora

Nenhum card.

## Bloqueios

- **BLOCK-LEGAL-AI** · BLOCK · Governança LGPD para IA e terceiros — Revisão jurídica; Decisões do dono
- **BLOCK-LEGAL-ENTRY** · BLOCK · Textos legais da entrada prontos para abertura pública — Abertura pública; Prova E2E/deploy
- **BLOCK-RESEND** · BLOCK · Resend e domínio de e-mail transacional — Criar o projeto de deploy do Bivaque e configurar RESEND_API_KEY e RESEND_FROM_EMAIL; Provar uma entrega real pelo outbox em ambiente implantado
- **BLOCK-MOBILE-RUNTIME** · P1 · Runtime iOS em device real — Android já provado no emulador — cmdline-tools + system-image + AVD ausentes (Android); Apple Developer Program + EAS credentials ausentes (iOS)
- **BLOCK-AFFILIATION** · HOLD · Afiliação militar declarada — Governanca LGPD de terceiros (BLOCK-LEGAL-AI) — portao da EXPOSICAO do campo, agora com o tecnico resolvido
- **BLOCK-ASAAS** · HOLD · Marketplace pago / Asaas — CNPJ; Decisão operacional de cobrança
- **LOC-CEP-SEM-COORDENADA** · P2 · Localização: CEP conhecido sem coordenada não pode virar 422 — Prova de banco pendente: o Docker Desktop não sobe nesta máquina; rodar prova-fila -- supabase db reset --local --no-seed, test:db e db:lint antes de fechar.; Fechamento em done depende de LOC-IMPL, que segue em next (o validador do quadro recusa done com dependência em trabalho pendente).
- **PIPELINE-REVISAO-E-PREVIEW** · P2 · Parecer automático do PR e preview Vercel legado — Vercel: Root Directory do preview legado e quota dos projetos — ato do dono.; Revisor automático do PR sem parecer — executor e credenciais são do repositório e da máquina do dono.
- **WEB-OG-METADATABASE** · P2 · OG da raiz resolve para localhost sem metadataBase — Dominio canonico de producao nao decidido; apps/web/.env.example nao possui variavel de URL publica

## Drift aberto

Nenhum card.

## Triagem prioritária

- **F09-B3-INSERT-DIRETO-DM** · P1 · Conversas: fechar o INSERT direto em dm_messages
- **F10-FAMILIA** · P1 · F10 família: ligar convite e vínculo familiar ao app
- **F10-R3-SESSION-DERIVED** · P1 · Família: derivar a posse de auth.uid() no banco
- **LAN-PUSH** · P1 · Push no celular: token do aparelho, envio pelo outbox e abertura no destino certo
- **LOC-LIMITE-GEOCODIFICACAO** · P1 · Localização: limitar a geocodificação e dar TTL ao cache
- **PROXY-SURFACE-RISK** · P1 · Superfície de escape do gate de rota documentada e reduzida

## Comandos

```sh
node tools/backend-kanban/src/board.mjs --check
node tools/backend-kanban/src/board.mjs --write-summary
node tools/backend-kanban/src/board.mjs --next
node tools/backend-kanban/src/board.mjs --card MVP-02-AUTHZ
node tools/backend-kanban/src/board.mjs --search "service_role"
```
