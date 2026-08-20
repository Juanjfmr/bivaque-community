# Onda H — Operação

> **DRAFT R3 — revisão v2 em 2026-08-19**, contra `main@ce918f1` e o runtime já implementado.
>
> Esta onda **não constrói moderação do zero**. O repo já tem operator role, fila de `reports`, hide/resolve, audit fields e notificação ao denunciante. H estende essa máquina para todos os alvos, adiciona ação sobre pessoa e fecha admissões/analytics.
>
> H toca RLS, suspensão, documentos de verificação e analytics comportamental. Antes da execução precisa de ADR aplicável, `critic_verdict: PASS` e aprovação humana.

## 0. Baseline que não deve ser reimplementada

Já existe:

- `reports` para post/comment/group;
- painel do operador em `/admin/reports`;
- autorização via `is_current_user_operator`;
- `hide` dos três tipos atuais;
- `resolve` com `operator_note`, `resolved_by`, `resolved_at`;
- endpoint programático de ação;
- notificação ao reporter quando a denúncia é resolvida (`b9d30df`);
- `dm_reports` separado e UI para reportar mensagem;
- admissions queue com SLA, porém read-only;
- `verification_documents` privado, TTL e review metadata;
- `outbox`/worker;
- Sentry/PII scrub;
- RLS structural tests.

A linha antiga do `PRODUCT_STATUS.md` que diz que não há retorno ao denunciante está vencida.

---

# H0 — Safety floor

> H0 deve fechar antes de G liberar conversa membro↔provider.

## Task H0.1 — contrato único de denúncia

### Problema

A operação principal lê `reports`; mensagem privada grava `dm_reports`. Ter duas filas significa que uma denúncia pode existir sem operador enxergá-la.

### Objetivo

Uma única semântica operacional para todo report, ainda que a migração interna seja gradual.

### Alvos mínimos

- post;
- comment;
- group;
- DM/message;
- recommendation request;
- recommendation reply;
- event quando houver comportamento reportável;
- provider/ficha quando G aterrissar.

### Implementação

Escolher uma estratégia aprovada:

**A — consolidar em `reports`:** migrar `dm_reports` e fazer a UI escrever no contrato comum.

**B — adapter operacional temporário:** fila/RPC une fontes e toda ação escreve audit trail comum, com plano e prazo para remover a tabela paralela.

Não aceitar como estado final duas máquinas de status/resolução independentes.

### Invariantes

- reporter só denuncia alvo que pode legitimamente alcançar/participar;
- alvo não aprende identidade do reporter;
- operador vê contexto suficiente sem ampliar leitura de conteúdo para member comum;
- report resolvido continua disparando o retorno já implementado;
- idempotência: resolver duas vezes não gera dois efeitos.

### Testes

Positivo/negativo para cada classe de alvo, especialmente DM non-participant.

---

## Task H0.2 — reason sanitizado e limitado

### Problema

Reason livre pode virar depósito de CPF, telefone, endereço ou outros dados que o produto deliberadamente evita persistir.

### Contrato

- comprimento mínimo/máximo;
- normalização de whitespace/controle/bidi conforme helpers existentes onde apropriado;
- scrub/rejeição de padrões de PII definidos pelo contrato;
- mensagem genérica segura;
- nunca ecoar payload sensível em log/Sentry.

A regra vale a todos os produtores, não apenas ao formulário da fila principal.

### Testes

unit + DB constraint/trigger quando necessário + privacy tests.

---

## Task H0.3 — suspensão reversível de pessoa

### Decisão vigente

D38: flag + helper na RLS, reversível e auditável.

### Antes de codificar

Reconfirmar o modelo de identidade após T/D2/E/F e a decisão de provider account. Se `profiles` não representar todos os account types que precisam ser suspensos, **parar para ADR**, não criar `provider_suspended` em paralelo.

### Dados mínimos

- estado suspenso;
- motivo interno;
- quem suspendeu;
- quando;
- expiração opcional somente se ADR definir;
- quem reverteu/quando.

Evitar que a razão interna seja exposta a outros members.

### Helper

Um helper único decide `is_suspended(auth.uid())`/equivalente.

### RLS

A mudança crítica:

> helper + policies que bloqueiam escrita entram no mesmo change set.

Auditar toda escrita de:

- posts/comments;
- communities/groups/memberships quando o membro age;
- events/RSVP/invites;
- recommendations/replies/saves;
- DM/messages;
- reports quando apropriado;
- profile edits;
- futuras provider writes se G já estiver no branch.

Não impedir silenciosamente leitura se o ADR só definiu suspensão de escrita.

### Testes

Para cada família de write policy: active passa, suspended nega. Pelo menos um teste prova unsuspend.

---

## Task H0.4 — ação do operador sobre pessoa

Estender a superfície já existente, não criar um segundo console de moderação.

### Ações

- suspender;
- reverter suspensão;
- resolver report sem suspender;
- ocultar alvo quando o tipo permitir.

### Audit trail

A ação sobre pessoa deve ser registrada independentemente do report que a originou. Report é motivo/contexto, não o ledger de estado da conta.

### UX

- confirmação explícita;
- alvo e efeito visíveis antes do submit;
- feedback pós-ação;
- fila reflete estado novo;
- não mostrar UUID cru como único contexto quando houver representação segura melhor.

---

## Task H0.5 — block bilateral na DM

### Estado atual

O teste existente comprova uma assimetria: depois de 009 bloquear 008, 008 não envia, mas 009 — o bloqueador — continua autorizado a enviar.

Para um canal provider isso é inadequado.

### Alvo

Bloqueio encerra envio em **ambas as direções** até unblock do ator que criou o bloqueio, conforme contrato de UX.

### Implementação

- creation: já há negação para blocked pair; preservar;
- existing conversation: mensagem é negada se existir block em qualquer direção;
- UI explica estado sem revelar informação além do necessário;
- unblock restaura somente o que o contexto ainda autoriza.

### Testes

- blocked→blocker nega;
- blocker→blocked nega;
- após unblock, contexto válido volta a permitir;
- se contexto deixou de ser válido, unblock não recria authorization.

---

## Task H0.6 — hide por tipo e preview operacional

Reusar `softDeleteTarget`/equivalente existente e estender somente aos alvos que realmente possuem semântica de ocultação.

Não fingir que toda entidade deve ter `is_deleted`.

Exemplos:

- DM message: pode exigir hidden/moderated state distinto de deletar conversa;
- provider listing: desativar ficha pode ser ação diferente de apagar provider;
- recommendation reply: ocultar conteúdo sem destruir audit trail.

Cada tipo ganha policy/teste próprio, não um `switch` permissivo sem enforcement no banco.

---

## Task H0.7 — E2E safety

Cenário mínimo:

1. member recebe conteúdo/mensagem reportável;
2. reporta;
3. operador vê o report na fila única;
4. operador resolve/oculta/suspende conforme caso;
5. reporter recebe retorno;
6. suspended tenta escrever e é negado;
7. não-operador tenta agir e é negado;
8. block em qualquer lado impede os dois lados de enviar.

Auditoria visual obrigatória nas superfícies alteradas.

---

# H1 — Admissions + operação + analytics

## Task H1.1 — decisão operacional de documento

> Se D2Δ já tiver fechado integralmente esta capability, esta Task vira **VERIFY/DELETE**, não reimplementação.

O upload já existe. A fila deve permitir ao operador:

- abrir documento por URL assinada curta após authz;
- approve/reject;
- gravar `reviewed_by/at`;
- atualizar verification state em transação segura;
- impedir dupla decisão;
- não deixar path/storage metadata escapar para browser não autorizado.

### Sad paths

- documento expirou antes da revisão;
- usuário já ficou verified por outro caminho;
- operador perde permissão;
- storage object ausente;
- duplicate submit.

---

## Task H1.2 — expurgo verificável de documentos

TTL em metadata não basta se o objeto continua no storage.

- job versionado;
- remove objeto expirado;
- preserva somente audit metadata permitida pela política;
- retry idempotente;
- métrica/alerta de falha de expurgo sem registrar conteúdo do documento.

Teste o estado do storage, não apenas `expires_at`.

---

## Task H1.3 — fila operacional/SLA

A admissions page já calcula SLA. Transformar isso em operação:

- filtros por tipo/status/idade;
- prioridade sem scoring opaco;
- ação disponível onde contrato permitir;
- owner/operator boundaries;
- nenhuma decisão automática por IA.

Para reports:

- aberto/resolvido;
- idade;
- target type;
- suspension state relevante.

Sem construir um ERP administrativo.

---

## Task H1.4 — health operacional

Aproveitar probes existentes e criar uma visão mínima para o que pode paralisar o piloto:

- Portal breaker aberto/fechado sem expor token;
- outbox backlog/failures;
- documento expirado não apagado;
- report/admission acima do SLA;
- migration/CI health quando útil.

Nada de secrets/payloads em tela.

---

## Task H1.5 — PostHog boundary

### Pré-condição

Base legal/política de privacidade precisa cobrir analytics comportamental e configuração externa estar disponível.

### Dados

Enviar o mínimo necessário. Proibidos nos eventos:

- CPF;
- payload Portal;
- documento;
- endereço;
- conteúdo de DM;
- report reason;
- texto de post/comment/recommendation;
- OM/patente enquanto o contrato vigente proibir.

Usar identificador pseudônimo/estável apenas se necessário às métricas aprovadas.

### Eventos mínimos

Instrumentar perguntas, não cliques aleatórios. Exemplo de conjunto inicial:

- onboarding_started / eligibility_completed / membership_completed;
- community_join_requested / approved;
- recommendation_requested / replied / resolved;
- event_rsvp;
- provider_profile_viewed / provider_contact_started quando G existir.

Cada evento deve responder uma pergunta explícita de produto.

---

## Task H1.6 — métricas de 90 dias

Documentar as consultas/dashboards que decidem se o produto funciona, por exemplo:

- ativação após elegibilidade;
- % de membros que entram numa vila;
- requests com resposta em 48h;
- tempo até primeira resposta;
- RSVP/encontro;
- reports por 100 membros e SLA;
- provider contact rate quando G existir.

Não criar vanity dashboard.

---

## Task H1.7 — reconciliação e runbook

Atualizar:

- `PRODUCT_STATUS.md`;
- runbook de operador;
- privacy/legal versions se aplicável;
- incident path;
- quais ações exigem humano.

O produto precisa sobreviver à ausência do fundador sem transformar o console em autoridade irrestrita.

---

## Gate por Task

Além do `gate` padrão:

- RLS changes: pgTAP positivo + negativo;
- suspensão: matriz de writes;
- storage TTL: teste real de expurgo;
- UI: visual audit;
- analytics: privacy tests que falham se payload proibido entrar;
- nenhum `service_role` em client/browser;
- reviewer independente antes de avançar.

## Stop conditions

Parar se:

- suspensão exigir uma nova decisão sobre leitura vs escrita;
- provider identity não couber no modelo de suspensão vigente;
- unificar reports exigir perda de audit trail;
- PostHog não estiver coberto pela política publicada;
- qualquer action precisar revelar report reason/report reporter ao alvo;
- um modelo de IA estiver prestes a decidir suspensão/admissão automaticamente sem decisão explícita.
