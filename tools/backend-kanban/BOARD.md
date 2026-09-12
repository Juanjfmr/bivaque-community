# Bivaque — resumo operacional do MVP

<!-- Gerado por tools/backend-kanban/src/board.mjs. Não editar manualmente. -->

**Snapshot:** 2026-09-12

> Código, migrations, testes e GitHub atual prevalecem. Documentação conflitante é drift temporário: o agente resolve, bloqueia com motivo real ou deixa próximo passo concreto.

**Mapa:** 79 frentes · 12 agora · 11 bloqueadas · 28 concluídas · 1 drifts

Para trabalho autônomo, rode `node tools/backend-kanban/src/board.mjs --next` e resolva um card por commit. Drift é evidência temporária; não é fechamento.

Use o ID abaixo com `node tools/backend-kanban/src/board.mjs --card <ID>` antes de planejar ou implementar.

## Agora

- **MOB-001-SESSION** · P0 · Mobile: contrato R3 de sessão (PKCE + secure-store + revogação)
- **S6-MOBILE-RUNTIME** · P0 · Mobile: RUNTIME PROOF real no emulador + tipos Foto/Link/Enquete + realtime
- **RECON-031-CONFIGURACOES** · P1 · Web: configuracoes e confianca (pranchas 52 e 56) com a matriz de canais
- **DS-001-DESIGN-SYSTEM** · P1 · Sistema de design canônico Casa comum
- **MVP-05-TEST-BASELINE** · P1 · Baseline reproduzível de testes e tipos
- **RECON-029-EVENTO-PERGUNTA** · P1 · Evento: pergunta ao organizador (prancha 67) e rotas de criar/editar
- **RECON-032** · P1 · RECON-032: Salvos, denuncia do membro, conversa por URL e ajuda com canal real
- **RECON-034** · P1 · RECON-034: imagem de comunidade — faixa e miniatura (pranchas 42/43)
- **RECON-AUTH-ENTRADA-WEB** · P1 · Web: entrada fiel à prancha 36-web-auth-entrada sem tocar o mecanismo
- **RECON-PRANCHAS-RESTANTES** · P1 · Pranchas web restantes: 17 lotes com o backend junto das telas
- **RECON-W00-FUNDACAO** · P1 · W00: baseline, contratos e fundação da reconstrução web
- **RECON-W00-TELAS** · P1 · Quatro telas da reconstrucao web saem do placeholder

## Bloqueios

- **BLOCK-LEGAL-AI** · BLOCK · Governança LGPD para IA e terceiros — Revisão jurídica; Decisões do dono
- **BLOCK-LEGAL-ENTRY** · BLOCK · Textos legais da entrada prontos para abertura pública — Abertura pública; Prova E2E/deploy
- **BLOCK-RESEND** · BLOCK · Resend e domínio de e-mail transacional — Criar o projeto de deploy do Bivaque e configurar RESEND_API_KEY e RESEND_FROM_EMAIL; Provar uma entrega real pelo outbox em ambiente implantado
- **BLOCK-SUSPENSION-EXPOSURE** · BLOCK · Status de suspensão vaza pela coluna em profiles (na main) — Decisão R3 do responsável sobre onde a coluna passa a viver e o que a UI lê no lugar
- **BLOCK-WHATSAPP** · BLOCK · Canal WhatsApp do outbox — Chip dedicado; CNPJ para Cloud API futura; Decisão de produto
- **BLOCK-MOBILE-RUNTIME** · P1 · Runtime Android/iOS em device real — bootstrap ausente — cmdline-tools + system-image + AVD ausentes (Android); Apple Developer Program + EAS credentials ausentes (iOS)
- **RECON-005-BLOQUEADO** · P1 · Tela /profile bloqueada por decisao R3 de visibilidade de campo — Aprovacao humana do ADR-20260908-perfil-campos-opcionais; Modelo de ameaca e texto de consentimento; Governanca LGPD (BLOCK-LEGAL-AI)
- **RECON-038** · P1 · RECON-038: fidelidade do shell — cabeçalho, lateral ativa e elementos do Início — migration 20260911093140_community_images.sql (RECON-034) nao aplicada no banco compartilhado: communities.thumbnail_path ausente; reset/migration proibidos neste contrato; decisao de produto sobre a entrada de Indicacoes em <lg antes de remover o icone de lampada (#4); seed sem event_rsvps e sem notificacoes: #8 e #10 nao observaveis nesta captura; abas Guia/Mercado/Imoveis de /salvos dependem de RECON-030/025/027
- **S4-MOBILE-COMPOSER** · P1 · Mobile: composer + reações + comentários (S4 do mobile, read-only parcial do S3) — MOB-001-SESSION esta em now: o contrato R3 de sessao do mobile (PKCE, secure-store, revogacao) nao existe. Sem ele o composer escreve sem sessao provada, entao o done era sobre a UI, nao sobre o fluxo.
- **BLOCK-AFFILIATION** · HOLD · Afiliação militar declarada — Reconciliar ADR técnico com autorização de produto de 07/09; concluir threat model, leitura por campo, remoção e testes positivos/negativos
- **BLOCK-ASAAS** · HOLD · Marketplace pago / Asaas — CNPJ; Decisão operacional de cobrança

## Drift aberto

- **RECON-031-CONFIGURACOES** · P1 · Web: configuracoes e confianca (pranchas 52 e 56) com a matriz de canais — Reconciliar a citacao - trazer o handoff do branch de fidelidade para este branch ou trocar as referencias por PRANCHAS-WEB-RESTANTES.md; ate la, a autoridade usada foram o PNG da prancha e a leitura versionada

## Triagem prioritária

- **REPO-SECRETS-ROTATION** · P0 · Rotação de chaves Portal e Resend
- **DOC-20260906-RECONSTRUCAO** · P1 · Publicar e ampliar guia visual e autoridade de construção
- **DRIFT-STATUS-RECONCILIATION** · P1 · Reconciliar documentação com runtime após cada ciclo
- **PROXY-SURFACE-RISK** · P1 · Superfície de escape do gate de rota documentada e reduzida

## Comandos

```sh
node tools/backend-kanban/src/board.mjs --check
node tools/backend-kanban/src/board.mjs --write-summary
node tools/backend-kanban/src/board.mjs --next
node tools/backend-kanban/src/board.mjs --card MVP-02-AUTHZ
node tools/backend-kanban/src/board.mjs --search "service_role"
```
