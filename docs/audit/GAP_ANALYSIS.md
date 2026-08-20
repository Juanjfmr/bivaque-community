# Bivaque Community — gap analysis

> Revisão v2 — 2026-08-19. Esta versão corrige falsos negativos da auditoria inicial: várias capabilities marcadas como pendentes já tinham implementação anterior ao último `PRODUCT_STATUS.md` reconciliado.

## 1. Diagnóstico

O problema agora não é "construir o Bivaque inteiro". É **fechar corretamente uma base já extensa** e só então adicionar as duas áreas realmente novas: Vitrine e a parte ausente de Operação.

Os gaps de maior impacto são:

1. transferência entre localidades ainda não aterrissou;
2. admissão tem infraestrutura forte, mas exceção manual e alguns sad paths não fecham;
3. comunidade/vila já existe, mas D48 e a arquitetura de navegação ainda não estão plenamente refletidas no runtime;
4. eventos/recomendações/grupos têm ciclos incompletos e um problema importante de Server Actions/authz;
5. DM existe, mas conflita com o canon de member↔member adiada e o bloqueio não é bilateral em conversa existente;
6. Vitrine/provider é majoritariamente greenfield;
7. moderação já opera conteúdo e retorna ao denunciante, mas não unifica DM/outros alvos nem suspende pessoas;
8. admissions ainda observa sem decidir;
9. PostHog e Asaas continuam ausentes.

## 2. Gaps que **não** devem mais constar como ausência

Remover dos planos qualquer premissa de que estes itens não existem:

- painel de denúncias do operador;
- ação de ocultar/resolver post, comentário e grupo;
- retorno ao denunciante após resolução;
- inbox de notificações e deep links;
- DM funcional com thread, criação por contexto compartilhado, ordenação de participantes, block UI e report de mensagem;
- comunidades/grupos/feed de comunidade;
- eventos básicos e RSVP;
- recommendation requests, replies e saves;
- `LocalityContext` nacional;
- upload privado de documento com TTL e fila;
- `outbox`, `pg_cron`, `pg_net`, worker e Sentry.

Essas peças são **foundations reutilizáveis**, não Tasks novas.

## 3. Gaps verdadeiros por frente

### 3.1 Preflight de execução autônoma

Não é produto, mas deve ser resolvido antes de um Goal Mode longo:

- BOM/types drift ainda está em PR #24, não em `main`;
- `family-invite-locality.sql` tem falha preexistente exposta pelo CI desbloqueado;
- review automático pode estourar limite de turns mesmo sem achados.

Critério: o executor deve conseguir iniciar numa baseline em que vermelho novo seja atribuível ao próprio diff.

### 3.2 Onda T — transferência

**Estado:** plano pronto, implementação não encontrada em `main`.

Falta:

- membership corrente vs saída;
- data de saída e degradação para read-only;
- declaração atômica de transferência;
- seletor entre localidades;
- reminder/termo;
- autorização que conceda nível municipal do destino sem conceder vila.

Esse continua sendo o maior delta estrutural antes das ondas seguintes.

### 3.3 D2 — fechar a porta

**Não reconstruir:** CPF, pending, attempt limit, upload, consent persistence, email-binding do convite familiar e guards já existem.

Falta confirmar/fechar:

- roteamento integral pelos estados reais de verificação;
- reconciliação de `pending`;
- entrega utilizável do convite familiar;
- sad paths de convite e recuperação;
- expurgo efetivo do documento no TTL;
- decisão manual do documento pelo operador;
- consentimento exibindo os textos corretos/versionados;
- consoles e suas fronteiras finais;
- E2E específico dos ramos ainda não provados.

### 3.4 E — fechar a vila

**Já existe:** communities, memberships, approval básica, `feed_community`, seletor de audiência, guide foundation.

Falta:

- semântica D48 completa: vila é sala; localidade é referência/alcance;
- post de alcance da localidade aparecer corretamente no feed da vila;
- home sem vila virar referência, não feed municipal;
- containers/navegação coerentes;
- seleção explícita quando usuário tem múltiplas comunidades;
- aprovação em lote e delegação;
- convite de membro com escopo;
- perfil de outro membro e histórico correto;
- grupos sugeridos/assuntos conforme plano;
- afiliação continua bloqueada pelo ADR específico enquanto não aprovada.

### 3.5 F — fechar o laço semanal

**Já existe:** grupos, detalhe de evento, RSVP básico, event invite receive/accept, requests/replies/saves e notification inbox.

Falta:

- corrigir seis Server Actions que autenticam no cliente de `service_role`;
- impedir `desiredStatus` controlado pelo formulário;
- RSVP `not_going` + notificação adequada;
- envio/fan-out de convite pelo organizador;
- encontro recorrente com RSVP por ocorrência;
- ciclo de resposta: notificar autor/salvadores e oferecer destino correto;
- controles completos de reply;
- fechar administração de grupo;
- escalada de pedido sem resposta, apenas se a hipótese continuar vigente após medição.

### 3.6 H0 — safety floor

H já tem operação de conteúdo. O gap prioritário é a **inconsistência entre superfícies privadas e a operação**.

Falta:

- unificar `dm_reports` com a fila operacional ou criar uma camada única de leitura/ação sem duas verdades;
- incluir alvos de recommendation/provider/event conforme o produto passe a permiti-los;
- sanitizar/limitar motivo de denúncia antes de persistir;
- suspensão reversível de pessoa com motivo e trilha;
- helper de suspensão aplicado às policies de escrita no mesmo change set;
- bloqueio realmente bilateral na DM;
- E2E de pessoa suspensa e de denúncia privada chegando ao operador.

**Retorno ao denunciante não é gap:** já existe.

### 3.7 G1 — Vitrine Core

Aqui sim o produto é majoritariamente novo.

Falta:

- account role/provider boundary;
- caminho de indicação/admissão do provider;
- ficha identidade + catálogo + portfólio;
- taxonomia fechada sem `Outros`;
- escopo de atendimento/localidade/vila;
- dashboard próprio;
- busca exata por categoria/escopo + `pg_trgm` no nome;
- contato membro↔provider reutilizando DM sob contexto `provider` validado pelo servidor;
- métricas first-party úteis ao provider.

### 3.8 G2 — Amplificação/Asaas

Falta tudo no runtime:

- produto/entitlement de alcance;
- checkout hospedado;
- webhook idempotente;
- cancelamento/expiração/reconciliação;
- visibilidade ampliada sem alterar ranking;
- trilha de cobrança.

**Bloqueio externo:** CNPJ e conta/configuração do Asaas.

### 3.9 H1 — Operação completa

Falta:

- decisão de admissões/documentos no console;
- expurgo operacional/verificável de documentos;
- tratamento de SLA e retry da fila;
- visão operacional consolidada;
- PostHog com política de dados explícita;
- eventos de produto necessários às perguntas de 90 dias.

## 4. Conflitos que exigem decisão, não implementação automática

### DM membro↔membro

O canon diz "adiada", mas `/messages` hoje permite iniciar conversa com membro de grupo compartilhado. Há duas saídas legítimas:

1. fechar a affordance/creation para member↔member até reabertura da decisão; ou
2. reabrir formalmente a decisão e aceitar a capability.

Um agente não deve decidir isso silenciosamente.

### Categoria `outros`

O domínio de recommendations possui histórico de categoria `outros`, enquanto a taxonomia da Vitrine proíbe `Outros`. Não reaproveitar enum automaticamente na Vitrine. O provider precisa de contrato próprio ou mapeamento explícito.

### Suspensão e providers

D38 fala em flag em `profiles`, enquanto G define provider como usuário Auth sem membership. Antes de implementar H0+G, confirmar se todo account possui `profiles` ou se é necessário um identity/account record comum. Não criar dois mecanismos de suspensão.

## 5. Prioridade por risco

| Gap | Prioridade | Motivo |
|---|---|---|
| baseline confiável para Goal Mode | P0 execução | sem isso o agente corrige dívida alheia |
| T | P0 produto | altera pertencimento e precede consumidores |
| D2 sad paths/operação | P0 produto | entrada é trust boundary |
| F authz Server Actions | P0 segurança | potencial falha de autenticação/privilégio |
| H0 suspensão/report privado | P0 antes de provider DM | canal privado sem operação suficiente |
| E fechamento D48 | P1 | define experiência principal |
| F ciclos | P1 | tese de retenção semanal/mensal |
| G1 | P1 comercial | primeira grande superfície nova |
| H1 | P1 operação | escala operacional/analytics |
| G2 Asaas | P2 condicionado | depende de CNPJ; não bloquear G1 |

## 6. Critério para considerar o mapa atualizado

Uma linha só é gap se houver evidência contemporânea de que o ciclo não fecha. Documento stale não prova ausência; migration isolada também não prova entrega. O padrão é:

`runtime + policy + teste + caminho do usuário + sad path principal`.
