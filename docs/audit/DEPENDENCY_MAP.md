# Bivaque Community — mapa de dependências

> Revisão v2 — 2026-08-19. O grafo abaixo representa **deltas ainda necessários**, não epics completos. Muitas foundations já existem.

## 1. Grafo principal

```text
PRE-FLIGHT CI (não é onda de produto)
        │
        ▼
T — transferência
        │
        ▼
D2 — fechar admissão
        │
        ▼
E — fechar vila / D48
        │
        ▼
F — fechar laço + authz
        │
        ▼
H0 — safety floor
   ┌────┴──────────────┐
   ▼                   ▼
G1 — Vitrine Core     H1 — Operação/analytics
   │
   ▼
G2 — Amplificação/Asaas
```

H1 pode avançar em paralelo a G1 depois de H0 onde não depender de providers. G2 não bloqueia G1.

## 2. O que já é foundation e não entra novamente no grafo

Estas peças são pré-existentes e devem ser reutilizadas:

- Auth + sessão + shell;
- verificação CPF, `pending`, attempt limit e circuit breaker;
- catálogo nacional de localidades + `LocalityContext`;
- upload privado de documento;
- consent acceptance;
- communities/groups/memberships/feeds básicos;
- events + RSVP básico + event invite receiver;
- recommendations + replies + saves;
- notification inbox + deep links;
- DM UI, thread, context RLS, block/report foundation;
- operator role + reports queue + hide/resolve + reporter notification;
- admissions queue read-only;
- `outbox` + worker + `pg_cron`/`pg_net`;
- Sentry + PII scrub;
- deployment workflow.

Planejar essas foundations como Tasks novas cria reimplementação e regressão.

## 3. Dependências duras

### T → D2/E/F

T muda a semântica de `locality_memberships`: corrente vs saída. D2/E/F leem localidade e pertencimento. Executá-las antes de T pode obrigar retrabalho em authorization, shell e queries.

### D2 → H1 admissions

H1 só consegue decidir/adjudicar admissão corretamente depois que os estados e contratos finais da porta estiverem estáveis.

### E → G1

Vitrine precisa saber onde o prestador atende e onde a ficha aparece. A semântica de localidade/comunidade e a navegação precisam estar fechadas antes de desenhar discovery provider sobre elas.

### F → H0

F corrige Server Actions e fecha ciclos que geram novos alvos/notifications. H0 deve consolidar moderation sobre a superfície já estabilizada, não sobre contratos em movimento.

### H0 → provider DM em G1

Provider DM não abre antes de:

- report privado chegar ao operador;
- bloqueio bilateral;
- suspensão existir e bloquear writes;
- contexto `provider` ser validado server-side.

A UI/infra de DM já existe. A dependência é safety, não chat.

### G1 → G2

Cobrança compra **amplificação de uma ficha existente**. Não há produto de billing sem ficha, escopo e entitlement de alcance.

### CNPJ → G2

Asaas é bloqueio externo. Não bloquear ficha gratuita, discovery, dashboard nem contato por causa dele.

## 4. Dependências que **não são duras**

### PostHog → dashboard provider

Não é dependência. Métrica inicial do prestador pode ser first-party: contatos/conversas originadas da ficha e outros contadores derivados do banco. PostHog é analytics de produto, não ledger do provider.

### H1 inteiro → G1 inteiro

Também não. Apenas H0 é safety floor obrigatório. Admissions/PostHog/visão operacional ampliada podem avançar em paralelo depois.

### WhatsApp → ciclos de produto

`outbox` abstrai canal. O critério das features é enfileirar corretamente; adaptador externo pode degradar para e-mail. Não transformar bloqueio de conta/chip em bloqueio de domínio.

## 5. Dependências internas de G

```text
G-ADR / account boundary
       │
       ▼
provider identity + role
       │
       ├──► ficha/catalog/portfolio
       │          │
       │          ▼
       │       discovery/search
       │          │
       │          ▼
       │       member contact
       │          │
       │          ▼
       │       provider dashboard
       │
       └──► entitlement model
                    │
                    ▼
                  Asaas
```

`member contact` exige H0 antes de ser liberado em produção.

## 6. Dependências internas de H

```text
report contract único
      │
      ├──► todos os alvos chegam à fila
      │
      └──► reason sanitizado

account suspension model
      │
      ▼
RLS write helper aplicado globalmente
      │
      ▼
operator suspend/unsuspend + audit
      │
      ▼
E2E de suspensão

D2 final
  │
  ▼
admission decision

base legal/config
  │
  ▼
PostHog
```

## 7. Portões humanos/R3

Pela `RISK_MATRIX.md`, estes pontos não são delegáveis a um Goal Mode sem governança prévia:

- mudança de RLS/permissions;
- suspensão/exclusão de escrita;
- provider account boundary;
- marketplace/monetização;
- Asaas/webhooks/entitlements;
- PostHog e saída de dado comportamental;
- tratamento de documentos/decisão de admissão.

G/H permanecem drafts até ADR aplicável + critic `PASS` + aprovação humana.

## 8. Ordem recomendada para MiniMax M3 / Goal Mode

Nunca entregue o grafo inteiro como um único goal. Use uma onda/delta por execução:

1. preflight técnico;
2. T;
3. D2 restante;
4. E restante;
5. F — primeiro authz, depois ciclos;
6. H0;
7. G1 em blocos: account → ficha → discovery → contact/dashboard;
8. H1 e G2 conforme dependências externas.

Cada bloco encerra em gate determinístico + reviewer independente antes do seguinte.
