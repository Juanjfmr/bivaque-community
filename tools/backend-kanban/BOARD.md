# Bivaque — resumo operacional do MVP

<!-- Gerado por tools/backend-kanban/src/board.mjs. Não editar manualmente. -->

**Snapshot:** 2026-10-31

> O ADR-20261024-front-react-spa governa o app: React de página única no apps/app (shadcn/ui), o Next como servidor e landing, o app de loja em Capacitor depois da web. O protótipo HTML é a especificação até cada onda ser aprovada pelo dono no app novo; as referências por fluxo estão em docs/design/fluxos-2026-10-30. Figma de setembro/outubro, pranchas e W00 são histórico preservado como frozen; não reiniciar. Contagens abaixo incluem infraestrutura, Mobile e histórico; cards done antigos não são percentual de fidelidade atual. Código e provas atuais determinam entrega, sem apagar evidências ou criar outra fila. Reconciliado com origin/main: todos os IDs remotos preservados; snapshots locais antigos não substituem entregas de outros agentes.

**Mapa:** 133 frentes · 8 agora · 7 bloqueadas · 67 concluídas · 0 drifts

Para trabalho autônomo, rode `node tools/backend-kanban/src/board.mjs --next` e resolva um card por commit. Drift é evidência temporária; não é fechamento.

Use o ID abaixo com `node tools/backend-kanban/src/board.mjs --card <ID>` antes de planejar ou implementar.

## Agora

- **APP-001** · P1 · SPA nova: onda 1, base e navegação
- **APP-F01-ENTRADA-VISUAL** · P1 · F01: entrada e onboarding no visual aprovado (apps/app)
- **G-TASK-3** · P1 · Ficha de prestador (T3)
- **INDICACOES-AVISO** · P1 · Aviso de pedido de indicação: a cidade fica sabendo em minutos
- **INDICACOES-MEMORIA** · P1 · Indicações com memória: pedir começa por procurar, e a resposta que resolveu fica achável
- **MVP-05-TEST-BASELINE** · P1 · Baseline reproduzível de testes e tipos
- **RED-003** · P1 · Comunidade: R3 migration e pgTAP da matriz aprovada
- **TEST-MASSA-JORNADAS** · P1 · Campanha de teste em massa: seed de jornada e execução completa na linha viva

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
