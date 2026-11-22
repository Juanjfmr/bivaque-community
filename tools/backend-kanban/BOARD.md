# Bivaque — resumo operacional do MVP

<!-- Gerado por tools/backend-kanban/src/board.mjs. Não editar manualmente. -->

**Snapshot:** 2026-11-07

> docs/LANCAMENTO.md define o lançamento e o que é pronto; os cards LAN-* acompanham cada fase e jornada. O ADR-20261024-front-react-spa governa o app (apps/app) e a troca das telas antigas do apps/web. Documentos de agosto a outubro estão em docs/historico e não orientam trabalho. Código e provas atuais determinam entrega, sem apagar evidências ou criar outra fila.

**Mapa:** 317 frentes · 0 agora · 10 bloqueadas · 175 concluídas · 0 drifts

Para trabalho autônomo, rode `node tools/backend-kanban/src/board.mjs --next` e resolva um card por commit. Drift é evidência temporária; não é fechamento.

Use o ID abaixo com `node tools/backend-kanban/src/board.mjs --card <ID>` antes de planejar ou implementar.

## Agora

Nenhum card.

## Bloqueios

- **BLOCK-LEGAL-AI** · BLOCK · Governança LGPD para IA e terceiros — Revisão jurídica; Decisões do dono
- **BLOCK-LEGAL-ENTRY** · BLOCK · Textos legais da entrada prontos para abertura pública — Abertura pública; Prova E2E/deploy
- **BLOCK-RESEND** · BLOCK · Resend e domínio de e-mail transacional — Criar o projeto de deploy do Bivaque e configurar RESEND_API_KEY e RESEND_FROM_EMAIL; Provar uma entrega real pelo outbox em ambiente implantado
- **BLOCK-MOBILE-RUNTIME** · P1 · Runtime iOS em device real — Android já provado no emulador — cmdline-tools + system-image + AVD ausentes (Android); Apple Developer Program + EAS credentials ausentes (iOS)
- **INFRA-CLI-SUPABASE-PC** · P1 · CLI do Supabase falha com EPERM no PC do dono e o banco local está fora de sincronia — O CLI do Supabase 2.107.0 (binário Bun) falha com EPERM ao abrir ou criar qualquer arquivo ou pasta: C:/Users/juana/.supabase/telemetry.json.tmp.* e também uma pasta pessoal temporária (HOME/USERPROFILE trocados), inclusive fora do sandbox. Quebra test:db, db:lint, migration list/up e status no PC do dono.; 22/11: decisão do coordenador (opção B): a prova de banco segue no CI com ci:full; nenhum binário baixado no PC e nenhuma mudança no Docker. Próximo passo concreto para desbloquear (opção A): com aval do dono para o download, apontar SUPABASE_CLI_BINARY_OVERRIDE para o supabase.exe Go oficial da última release 2.x anterior ao binário Bun, fora da pasta do repositório (sem o rótulo Low), repetir status e depois fazer o reset local exclusivo sem seed e o test:db.
- **OUTBOX-INVITE-RECIPIENTS** · P1 · Convites de comunidade e de evento enfileiram destinatário inválido — BLOCK-RESEND: entrega real de e-mail depende do provedor e das chaves (ato do dono); próximo passo: dono cria a conta/chave do Resend e o coordenador roda a prova de entrega.
- **BLOCK-AFFILIATION** · HOLD · Afiliação militar declarada — Governanca LGPD de terceiros (BLOCK-LEGAL-AI) — portao da EXPOSICAO do campo, agora com o tecnico resolvido
- **BLOCK-ASAAS** · HOLD · Marketplace pago / Asaas — CNPJ; Decisão operacional de cobrança
- **PIPELINE-REVISAO-E-PREVIEW** · P2 · Parecer automático do PR e preview Vercel legado — Vercel: Root Directory do preview legado e quota dos projetos — ato do dono.; Revisor automático do PR sem parecer — executor e credenciais são do repositório e da máquina do dono.
- **WEB-OG-METADATABASE** · P2 · OG da raiz resolve para localhost sem metadataBase — Dominio canonico de producao nao decidido; apps/web/.env.example nao possui variavel de URL publica

## Drift aberto

Nenhum card.

## Triagem prioritária

- **ENDURECE-B** · P1 · Endurecimento web B (R3): cabeçalhos de segurança, CSP com nonce e Clear-Site-Data na saída
- **F09-B3-INSERT-DIRETO-DM** · P1 · Conversas: fechar o INSERT direto em dm_messages
- **LAN-PUSH** · P1 · Push no celular: token do aparelho, envio pelo outbox e abertura no destino certo
- **LOJA-DEF-ENTRADA-MEMBRO** · P1 · Membro que entra por código fica na entrada em vez de ir ao Início
- **LOJA-DEF-IOS-TELA-BRANCA** · P1 · App iOS abre em branco: o roteador nunca desenha a primeira tela
- **PROXY-SURFACE-RISK** · P1 · Superfície de escape do gate de rota documentada e reduzida

## Comandos

```sh
node tools/backend-kanban/src/board.mjs --check
node tools/backend-kanban/src/board.mjs --write-summary
node tools/backend-kanban/src/board.mjs --next
node tools/backend-kanban/src/board.mjs --card MVP-02-AUTHZ
node tools/backend-kanban/src/board.mjs --search "service_role"
```
