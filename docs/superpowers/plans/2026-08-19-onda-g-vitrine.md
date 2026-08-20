# Onda G — Vitrine

> **DRAFT R3 — revisão v2 em 2026-08-19**, contra `main@ce918f1` e o código/commits já existentes.
>
> Esta onda não começa do zero: Auth, localidades, communities, recommendations, DM, outbox, notifications e operação básica já existem. O trabalho é criar o domínio de prestador e conectá-lo a essas foundations sem abrir a comunidade civil.
>
> G toca marketplace, dados pessoais, RLS e monetização. Antes de execução precisa de ADR aplicável, `critic_verdict: PASS` e aprovação humana conforme `RISK_MATRIX.md`.

## 0. Decisões vigentes que este plano executa

- D17 — prestador civil tem login apenas para a própria ficha.
- D20 — Vitrine entra no piloto.
- D27/D28 — acesso/ficha local grátis; amplificação é paga.
- D29 — dinheiro nunca ordena confiança/ranking; sem anúncio no feed.
- D36 — conversa membro↔prestador reutiliza a máquina de DM.
- D37 — provider é usuário Auth, sem membership, com dashboard próprio.
- D41 — cobrança da plataforma via Asaas, checkout hospedado.
- D44 — busca: filtro exato + `pg_trgm` no nome.
- D45 — ficha = identidade + catálogo + portfólio.

## 1. O que já existe e deve ser reutilizado

### Auth e shell

O app já tem Auth/Supabase, sessão persistida e shells. Não criar um segundo sistema de identidade.

### Localidade/comunidade

P0 entregou catálogo nacional + `LocalityContext`. E fecha a semântica da vila/localidade. Provider discovery deve usar essa mesma dimensão, nunca constante de Manaus.

### Recommendations

Pedidos/respostas já provam o comportamento de procurar/indicar serviço. A Vitrine pode receber atribuição dessa origem, mas não deve transformar recommendation em cadastro comercial automaticamente.

### DM

Já existe:

- `/messages`;
- thread;
- conversation context;
- ordenação estável de `participant_a/b` no cliente;
- RLS/context tests;
- block/report;
- deep-link.

**Não construir chat novo.** Para G falta contexto `provider` **server-owned** e safety floor H0.

### Moderação

`reports` + fila + hide/resolve + retorno ao denunciante existem para alvos atuais. H0 amplia isso antes de provider DM.

### Infra

`outbox`, worker, pg_cron/pg_net e Sentry existem. Reusar para convite/provider lifecycle e eventos de cobrança.

## 2. Precedência

Obrigatório antes de G1:

```text
T → D2Δ → EΔ → FΔ → H0
```

G1 ficha/discovery pode começar tecnicamente após E, mas **provider DM não abre antes de H0**. Para Goal Mode, manter a ordem serial evita um provider entrar numa superfície privada sem suspensão/report operacional.

G2/Asaas exige ainda CNPJ e governança R3 específica.

---

# G1 — Vitrine Core

## Task G1.1 — account/provider boundary

### Objetivo

Criar o papel de provider sem conceder membership nem acesso ao conteúdo comunitário.

### Antes de codificar

Reconfirmar se `profiles` é identidade comum a todo usuário Auth ou identidade de member. Isso decide onde D38/suspensão se aplica. **Não criar um segundo mecanismo de suspensão.**

### Implementação

A solução precisa garantir:

- provider é `auth.users`;
- provider **não** recebe `locality_memberships`, `community_memberships` nem `group_memberships` por ser provider;
- provider shell permite somente própria ficha/dashboard/caixa de contatos;
- provider não lê feed, perfis de membros, communities ou diretórios;
- member pode encontrar a ficha pelas superfícies autorizadas;
- role/account type é imposto no servidor e protegido por RLS.

Se uma coluna de account type for criada, as policies que dependem dela entram no **mesmo change set**.

### Testes obrigatórios

- provider lê/escreve própria ficha;
- provider não lê feed;
- provider não lê profile de member;
- provider não ingressa em community/group pela ausência de membership;
- member não edita provider alheio;
- anon não lê dados que exigem sessão.

### Done

Boundary provada por pgTAP positivo/negativo e shell sem rota lateral para comunidade.

---

## Task G1.2 — indicação e ativação do prestador

O canon diz que um prestador civil entra por indicação de membro verificado. Implementar sem fazer do link um passe de acesso comunitário.

### Contrato

- member elegível indica provider;
- convite carrega attribution e escopo inicial;
- e-mail/token é limitado, expira e não concede membership;
- provider cria/associa conta Auth;
- após ativação cai diretamente no provider shell;
- indicação duplicada converge para a mesma entidade, não duplica ficha.

### Reuso

Usar padrões de token digest/expiry já existentes em family/member invites onde forem adequados; não compartilhar semântica de autorização.

### Testes

- token válido ativa o provider esperado;
- token encaminhado para identidade errada não toma conta da ficha;
- expirado/usado/revogado têm sad paths;
- provider ativado continua sem membership.

---

## Task G1.3 — domínio da ficha

### Ficha mínima D45

**Identidade**

- nome comercial / nome exibido;
- categoria primária;
- descrição curta;
- canais de contato autorizados;
- escopo onde atende.

**Catálogo**

Item mínimo:

- título;
- descrição;
- preço opcional/faixa quando aplicável;
- imagem opcional;
- estado ativo/inativo;
- ordenação manual dentro da própria ficha.

**Portfólio**

- imagens/itens de trabalho;
- legenda;
- ordenação.

### Taxonomia

Usar a lista fechada de 12 categorias do canon. **Não reutilizar automaticamente `recommendation_category`**, porque o histórico ali contém `outros` e a Vitrine proíbe `Outros`.

### Privacidade

- não persistir endereço residencial;
- escopo de atendimento é localidade/comunidade autorizada, não endereço;
- uploads privados durante processamento; somente assets destinados à ficha tornam-se publicáveis conforme contrato.

### Testes

RLS own-write, member-read, provider-other-write denied, category contract, file constraints e soft-disable.

---

## Task G1.4 — discovery e busca

### Objetivo

Encontrar prestador sem transformar o Bivaque em diretório de pessoas.

### Query contract

- filtro exato por categoria;
- filtro exato pelo escopo visível ao member;
- nome com `pg_trgm`;
- apenas fichas ativas;
- provider sem entitlement pago aparece onde tem alcance orgânico;
- nenhuma dimensão de patente/OM/pessoa entra na busca.

### Ranking

Ordenar por relevância/reputação definida pelo produto, **nunca por pagamento**.

Paid reach altera o conjunto de lugares onde a ficha é elegível para aparecer; não altera score dentro desse conjunto.

### UX

- estado vazio honesto por categoria/localidade;
- filtros persistem durante navegação;
- card leva à ficha;
- nenhum feed ad.

### Testes

- escopo correto;
- outra localidade não vaza sem entitlement;
- filtro e trigram;
- inativo não aparece;
- paid flag, quando existir, não muda ordering function.

---

## Task G1.5 — dashboard do provider

### Superfícies

- editar identidade;
- gerir catálogo;
- gerir portfólio;
- ver contatos/solicitações;
- status da ficha;
- alcance atual;
- métrica simples first-party.

### Métrica inicial

Não depender de PostHog para uma métrica que é contrato comercial. Começar com dados first-party derivados do banco, por exemplo:

- contatos iniciados a partir da ficha;
- conversas provider abertas no período.

Definir exatamente o evento que conta; não chamar page view de lead.

### Testes

provider vê somente seus próprios números e não consegue inferir identidade/atividade de membros fora das conversas legítimas.

---

## Task G1.6 — contexto `provider` na DM

### Pré-requisito duro

H0 concluída: unified reporting, block bilateral e suspensão aplicável.

### Não fazer

- não abrir busca de pessoas;
- não usar o picker member↔member existente para providers;
- não confiar em `context_type/context_id` enviados pelo browser como prova de autorização;
- não permitir que provider inicie conversa arbitrária com members.

### Fluxo

1. member abre ficha;
2. CTA `Conversar` chama uma Server Action/RPC;
3. servidor valida que a ficha é visível e provider está ativo/não suspenso;
4. servidor cria ou encontra conversation `provider` para aquele member + provider;
5. deep-link abre `/messages?conversation=...` ou shell equivalente;
6. provider vê a conversa no próprio dashboard/inbox.

### Reuso

A thread, mensagens, previews e deep link existentes continuam. Adicionar `CONTEXT_LABELS.provider` e apenas o mínimo de UI específico.

### Safety

- bilateral block;
- report chega à fila única;
- suspensão impede novos envios;
- expirar alcance pago não apaga conversa legítima já criada;
- expulsão/suspensão não deixa authorization congelada em contexto stale.

### Testes

- member↔provider válido cria;
- provider↔member arbitrário nega;
- member não vê provider fora do escopo;
- bloqueio em qualquer lado impede ambos;
- suspended não envia;
- report DM chega ao operador.

---

## Task G1.7 — visual/E2E/reconciliação

Rotas mínimas a auditar:

- discovery Vitrine;
- ficha;
- provider activation;
- provider dashboard;
- catálogo edit;
- provider conversation entry.

E2E mínimo:

1. member encontra provider da própria área;
2. abre ficha;
3. inicia contato;
4. provider recebe e responde;
5. member bloqueia/reporta;
6. operador recebe o caso.

Atualizar `PRODUCT_STATUS.md` somente com ciclos efetivamente provados.

---

# G2 — Amplificação / Asaas

> G2 é separada para que CNPJ/billing não bloqueie a ficha gratuita.

## Task G2.1 — entitlement de alcance

Modelar o que é comprado, não o pagamento:

- provider/ficha;
- origem/orgânico;
- destinos adicionais autorizados;
- início/fim;
- status;
- origem da concessão (billing/admin quando aplicável).

Discovery consulta entitlement; não consulta Asaas diretamente.

**Ranking permanece independente de dinheiro.**

## Task G2.2 — produto/checkout Asaas

Após CNPJ/conta:

- produto/plano mapeado internamente;
- checkout hospedado;
- cartão nunca toca Bivaque;
- Pix/boleto conforme decisão;
- retorno humano da UI não ativa entitlement por si só.

## Task G2.3 — webhook idempotente

- validar autenticidade conforme contrato vigente do Asaas no momento da implementação;
- idempotency/event ledger;
- pagamento confirmado ativa;
- cancelamento/overdue/chargeback seguem regra explicitamente aprovada;
- replay não duplica efeito;
- payload sensível não é logado sem necessidade.

## Task G2.4 — reconciliação

Job para comparar billing state ↔ entitlement e corrigir drift. Falha do Asaas não derruba ficha orgânica.

## Task G2.5 — UX paid reach

Provider vê claramente:

- alcance gratuito atual;
- o que a amplificação adiciona;
- período/status;
- link para checkout/gestão.

Member vê sinalização de alcance patrocinado quando necessário, sem transformar indicação/reputação em publicidade disfarçada.

## Task G2.6 — testes

- webhook replay;
- evento fora de ordem;
- pagamento pendente não ativa;
- cancelamento expira corretamente;
- entitlement muda visibilidade, não ranking;
- serviço member↔provider nunca passa pelo Bivaque.

---

## Gate de cada Task

Seguir `AGENTS.md` e `docs/superpowers/plans/README.md` vigentes no momento da execução. Em qualquer task com migration:

- scope/RLS positivos e negativos;
- `gate`;
- `test:db` quando aplicável;
- E2E quando o ciclo fecha;
- audit visual para tela tocada;
- um commit por task.

## Stop conditions

Parar, não improvisar, se:

- account/provider boundary exigir decisão não coberta pelo ADR;
- suspension model conflitar com a identidade real de provider;
- a taxonomia vigente tiver mudado;
- Asaas/CNPJ não estiver disponível para G2;
- implementação exigir intermediar a transação do serviço;
- dinheiro começar a afetar ranking/confiança.
