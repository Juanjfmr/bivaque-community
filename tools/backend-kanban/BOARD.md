# Bivaque — resumo operacional do MVP

<!-- Gerado por tools/backend-kanban/src/board.mjs. Não editar manualmente. -->

**Snapshot:** 2026-10-07

> Figma atual niuOHiHkyc9eGaIQBY9hq4 e decisoes posteriores governam visual/experiencia web. Cobertura: docs/agents/FIGMA-ATUAL-COBERTURA.md, coordenada no card RECON-PRANCHAS-RESTANTES. Contagens abaixo incluem infraestrutura, Mobile e historico; cards done antigos nao sao percentual de fidelidade atual. W00 superado preservado frozen/history; nao reiniciar. Codigo e provas atuais determinam entrega, sem apagar evidencias ou criar outra fila. Reconciliado com origin/main: todos os IDs remotos preservados; snapshots locais antigos nao substituem entregas de outros agentes.

**Mapa:** 118 frentes · 10 agora · 8 bloqueadas · 58 concluídas · 0 drifts

Para trabalho autônomo, rode `node tools/backend-kanban/src/board.mjs --next` e resolva um card por commit. Drift é evidência temporária; não é fechamento.

Use o ID abaixo com `node tools/backend-kanban/src/board.mjs --card <ID>` antes de planejar ou implementar.

## Agora

- **MOB-001-SESSION** · P0 · Mobile: contrato R3 de sessão (PKCE + secure-store + revogação)
- **S6-MOBILE-RUNTIME** · P0 · Mobile: RUNTIME PROOF real no emulador + tipos Foto/Link/Enquete + realtime
- **FIGMA-WEB-ATUAL** · P1 · Figma atual: reconstruir e comprovar todos os ciclos web
- **G-TASK-3** · P1 · Ficha de prestador (T3)
- **INDICACOES-AVISO** · P1 · Aviso de pedido de indicação: a cidade fica sabendo em minutos
- **INDICACOES-MEMORIA** · P1 · Indicações com memória: pedir começa por procurar, e a resposta que resolveu fica achável
- **MVP-05-TEST-BASELINE** · P1 · Baseline reproduzível de testes e tipos
- **RECON-029-EVENTO-PERGUNTA** · P1 · Evento: pergunta ao organizador (prancha 67) e rotas de criar/editar
- **RECON-034** · P1 · RECON-034: imagem de comunidade — faixa e miniatura (pranchas 42/43)
- **TEST-MASSA-JORNADAS** · P1 · Campanha de teste em massa: seed de jornada e execução completa na linha viva

## Bloqueios

- **BLOCK-LEGAL-AI** · BLOCK · Governança LGPD para IA e terceiros — Revisão jurídica; Decisões do dono
- **BLOCK-LEGAL-ENTRY** · BLOCK · Textos legais da entrada prontos para abertura pública — Abertura pública; Prova E2E/deploy
- **BLOCK-RESEND** · BLOCK · Resend e domínio de e-mail transacional — Criar o projeto de deploy do Bivaque e configurar RESEND_API_KEY e RESEND_FROM_EMAIL; Provar uma entrega real pelo outbox em ambiente implantado
- **BLOCK-MOBILE-RUNTIME** · P1 · Runtime iOS em device real — Android já provado no emulador — cmdline-tools + system-image + AVD ausentes (Android); Apple Developer Program + EAS credentials ausentes (iOS)
- **S4-MOBILE-COMPOSER** · P1 · Mobile: composer + reações + comentários (S4 do mobile, read-only parcial do S3) — MOB-001-SESSION esta em now: o contrato R3 de sessao do mobile (PKCE, secure-store, revogacao) nao existe. Sem ele o composer escreve sem sessao provada, entao o done era sobre a UI, nao sobre o fluxo.
- **BLOCK-AFFILIATION** · HOLD · Afiliação militar declarada — Governanca LGPD de terceiros (BLOCK-LEGAL-AI) — portao da EXPOSICAO do campo, agora com o tecnico resolvido
- **BLOCK-ASAAS** · HOLD · Marketplace pago / Asaas — CNPJ; Decisão operacional de cobrança
- **WEB-OG-METADATABASE** · P2 · OG da raiz resolve para localhost sem metadataBase — Dominio canonico de producao nao decidido; apps/web/.env.example nao possui variavel de URL publica

## Drift aberto

Nenhum card.

## Triagem prioritária

- **REPO-SECRETS-ROTATION** · P0 · Rotação de chaves Portal e Resend
- **AUDIT-NAV-ATIVO-ANCORA** · P1 · Auditoria: nav-active exige item atual em nav de ancora e de links legais
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
