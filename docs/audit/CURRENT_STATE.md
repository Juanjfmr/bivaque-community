# Bivaque Community — mapa do estado atual

> Revisão v2 — 2026-08-19. Baseline GitHub visível: `main@ce918f12c1493b8dc6c95202f559856581c9832d`.
>
> Regra desta revisão: **código, migrations, testes e commits prevalecem sobre `PRODUCT_STATUS.md` para afirmar o que já existe**. O status documental foi reconciliado pela última vez em 2026-08-15 e ficou atrasado em alguns pontos. `docs/BIVAQUE.md` continua sendo a fonte de verdade para o alvo do produto.

## 1. Resumo executivo

O Bivaque Community está **mais adiantado do que a primeira versão desta auditoria registrou**. O projeto não é um MVP vazio esperando T/D2/E/F: há uma base funcional extensa de autenticação, onboarding, comunidades, grupos, eventos, recomendações, notificações, DM, moderação e infraestrutura.

A leitura correta é:

- **P0 — localidades nacionais:** implementada e auditada.
- **T — transferência:** planejada e desbloqueada, mas não há evidência em `main` de que a onda tenha sido executada.
- **D2 — a porta:** grande parte da infraestrutura e dos happy paths já existe; o trabalho restante é principalmente **fechamento de ciclo e operação**.
- **E — a vila:** a camada de comunidade já existe; a onda é uma **reorganização/fechamento da experiência**, não construção do zero.
- **F — laço semanal:** grupos, eventos, recomendações, saves, notificações e DM já têm muito código; a onda fecha ciclos e corrige autorização.
- **G — vitrine:** continua sendo a maior superfície realmente nova.
- **H — operação:** também não começa do zero; fila de denúncias, ocultar/resolver e retorno ao denunciante já existem. Faltam unificação de alvos, suspensão, decisão de admissões e analytics.

## 2. Estado por capability

Legenda:

- `DONE` — ciclo substancial implementado e com evidência suficiente para esta auditoria.
- `PARTIAL` — existe produto real, mas falta uma parte relevante do ciclo/negação/operação.
- `PLANNED` — plano existe, runtime correspondente não foi encontrado em `main`.
- `ABSENT` — superfície-alvo ainda não existe.
- `CONFLICT` — runtime existente contradiz o canon atual e precisa de decisão/restrição.

| Capability | Estado | Evidência / leitura atual |
|---|---|---|
| Login magic link + Google | DONE | fluxo e shell autenticado existem; callback real de magic link continua fora do E2E local |
| Consentimento versionado | PARTIAL | `consent_acceptances` e gate server-side existem; publicação jurídica final continua dependência humana |
| Verificação CPF | PARTIAL | validação, Portal, anti-enumeração, 3/h, pending e circuit breaker existem; operação manual de exceção ainda não fecha |
| Upload de documento | PARTIAL | bucket privado, TTL 7 dias, metadata e fila existem; decisão do operador/expurgo é lacuna |
| Localidades nacionais | DONE | catálogo nacional, onboarding pós-elegibilidade, `LocalityContext`, shell sem `PILOT_LOCALITY_ID` e E2E multi-localidade foram implementados na P0 |
| Transferência origem↔destino | PLANNED | Onda T existe; `ce918f1` registra P0 fechada e T desbloqueada, não T concluída |
| Comunidades/vilas | PARTIAL | descoberta, pedido de entrada, aprovação básica, `feed_community` e membership existem; D48/home/container, lote/delegação e convites ainda fecham na E |
| Grupos | PARTIAL | criação, público/privado, membership, moderação e transferência de propriedade existem; ciclo administrativo e seis Server Actions ainda têm trabalho da F |
| Feed + audiência | PARTIAL | compositor já grava alcance de comunidade/localidade; falta concluir a semântica D48 na home/feed da vila |
| Guia de chegada | PARTIAL | `/guide`, fila de operador, parser/adaptador e curadoria já existem; fechamento da experiência/automação segue nas ondas planejadas |
| Eventos | PARTIAL | criação, detalhe, RSVP `interested/going`, invite receive/accept e notificações existem; `not_going`, envio pelo organizador e recorrência faltam |
| Recomendações | PARTIAL | pedidos com escopo, respostas, save e controles de autor têm implementação; notificação/fechamento do ciclo e alguns destinos ficam na F |
| Inbox de notificações | DONE/PARTIAL | inbox, deep links e múltiplos produtores existem; novos eventos das ondas seguintes ainda precisam entrar no mesmo mecanismo |
| DM membro↔membro | CONFLICT | a superfície existe e cria conversas por contexto compartilhado; o canon atual diz que DM entre membros está adiada. Não tratar como capability ausente |
| Bloqueio em DM | PARTIAL | criação é negada para par bloqueado e usuário bloqueado não envia; **o bloqueador ainda consegue enviar na conversa existente**, portanto não é bloqueio bilateral |
| Denúncia de post/comentário/grupo | DONE | `reports`, painel de operador, ocultar e resolver estão implementados |
| Retorno ao denunciante | DONE | commit `b9d30df` implementou notificação quando denúncia é resolvida; a linha antiga do `PRODUCT_STATUS.md` está stale |
| Denúncia de DM | PARTIAL | `dm_reports` existe e a UI de mensagem grava nela, mas a fila principal de operação não a consome |
| Suspensão de pessoa | ABSENT | canon D38 existe; não foi encontrada implementação equivalente no runtime atual |
| Fila de admissões | PARTIAL | painel com fila/SLA existe; observa, mas não decide a exceção/documento |
| Upstash limits + Portal breaker | PARTIAL | CPF/global já ligados; outros limites planejados ainda precisam ser reconciliados por fluxo |
| `outbox` + pg_cron + `pg_net` | DONE no código | worker, endpoint e adaptadores existem; provedores reais dependem de configuração/contas externas |
| Sentry + scrub de PII | DONE no código | instrumentação e scrub existem; DSN de produção é configuração externa |
| Deploy de migrations | DONE no código / PARTIAL operação | workflow existe; secrets/configuração de produção continuam externos |
| PostHog | ABSENT | decisão existe, implementação não encontrada |
| Conta/ficha de prestador | ABSENT | não há domínio de provider/vitrine implementado |
| Busca de prestador | ABSENT | decisão D44 existe, runtime não |
| Conversa membro↔prestador | ABSENT sobre base existente | DM é reutilizável, mas contexto `provider` e fronteira de provider não existem |
| Asaas / alcance pago | ABSENT | decisão D41 existe; exige CNPJ e ADR R3 antes da execução |

## 3. O que a primeira auditoria subestimou

### 3.1 Moderação já é produto, não apenas schema

O repo já possui:

- fila de denúncias do operador;
- autorização de operador;
- `hide` de post/comentário/grupo;
- `resolve` com nota, autor e timestamp;
- endpoint programático equivalente;
- notificação ao denunciante quando o caso é resolvido.

Portanto H não deve reconstruir isso. H deve **estender a máquina existente** para todos os alvos e adicionar ação sobre pessoa.

### 3.2 DM já é uma superfície funcional

`/messages` já contém:

- listagem de conversas;
- deep link por `?conversation=`;
- criação via contatos de grupos compartilhados;
- ordenação estável dos UUIDs antes do insert;
- thread e envio;
- bloqueio/desbloqueio;
- denúncia de mensagem;
- testes de RLS/contexto.

A lacuna para G não é "construir chat". É **restringir/reusar corretamente essa máquina** com contexto `provider`, criação server-owned e safety floor coerente.

### 3.3 D2 já recebeu a maior parte da infraestrutura difícil

Já existem:

- aceite versionado no banco;
- validação de CPF cliente+servidor;
- tentativa máxima em janela rolante;
- `pending` real;
- upload privado e TTL;
- vínculo do convite familiar ao e-mail;
- throttle/circuit breaker;
- E2E amplo do fluxo de admissão via sessão injetada.

O que resta em D2 é predominantemente **fechar o que acontece depois do erro/exceção**, entrega de convite, decisão manual, consent copy e consolidação dos consoles.

### 3.4 E/F trabalham sobre produto existente

Comunidades, grupos, feed, eventos, recomendações e notificações não são épicos greenfield. Os planos E/F devem ser tratados como **delta plans**: confirmar o baseline em cada Task e executar apenas o que ainda falta.

## 4. Pendências de baseline antes de um Goal Mode longo

Isso não é uma nova onda de produto. É um **preflight de execução autônoma**:

1. PR #24 remove o BOM de `supabase/database.generated.ts`, que fazia o types-drift falhar antes do restante do CI.
2. Ao desbloquear o pipeline, apareceu falha preexistente em `supabase/tests/family-invite-locality.sql`: UUID de fixture incorreto e contagem de `plan()` inconsistente.
3. O check automático de review pode terminar sem achados e ainda falhar por exceder o teto de turns.

Para desenvolvimento manual isso é dívida de CI. Para MiniMax M3 em Goal Mode, é crítico: um executor precisa distinguir **regressão própria** de **baseline vermelho**.

## 5. Estado real do roadmap

```text
P0  DONE
 │
 ▼
T   PLANNED / próxima mudança estrutural
 │
 ▼
D2  PARTIAL — fechar ciclos, não reconstruir
 │
 ▼
E   PARTIAL — reorganizar/fechar a vila
 │
 ▼
F   PARTIAL — fechar ciclos + authz
 │
 ├───────────────┐
 ▼               ▼
H0 safety        G core ainda ausente
floor            (depende de H0 para provider DM)
 │               │
 └───────┬───────┘
         ▼
       G1 core
         │
         ├──► G2 paid reach / Asaas (CNPJ)
         ▼
       H1 operação/analytics pode avançar em paralelo onde não depender de G
```

## 6. Regra para os próximos planos

Antes de qualquer Task:

1. reconfirmar o arquivo/runtime citado;
2. procurar commit que já entregou a capability;
3. executar apenas o delta entre **estado real** e **critério de aceite**;
4. não usar `PRODUCT_STATUS.md` sozinho como prova de ausência;
5. atualizar `PRODUCT_STATUS.md` ao fechar a onda para evitar nova divergência.
