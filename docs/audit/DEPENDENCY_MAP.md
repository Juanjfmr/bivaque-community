# Bivaque Community — mapa de dependências

> Derivado do estado real em 2026-08-19 e do canon vigente. Este arquivo descreve **ordem técnica**, não prioridade comercial isolada.

## 1. Grafo principal

```text
S0 — baseline confiável
│
├─ corrigir types drift/BOM
├─ corrigir family-invite-locality pgTAP
├─ tornar review check não-ambíguo
└─ reconciliar PRODUCT_STATUS pós-P0
│
▼
T — transferência
│
▼
D2 — a porta
│
▼
E — a vila
│
▼
F — o laço semanal
│
├───────────────┐
│               │
▼               ▼
H0              G1
safety floor    vitrine core sem DM
│               │
└───────┬───────┘
        ▼
G1-contact
membro ↔ prestador
        │
        ▼
G2 — amplificação / Asaas
        │
        ▼
H1 — operação completa + analytics
```

A única quebra deliberada da ordem antiga “G → H” é H0. Ela existe porque a superfície privada de G não pode abrir enquanto denúncia de DM cai numa fila órfã e não existe suspensão de pessoa.

## 2. S0 — baseline confiável

**Depende de:** nada.

**Destrava:** tudo.

Entregáveis:

- `main` sem BOM no types file;
- pgTAP completo com fixtures válidas;
- diferença clara entre falha de reviewer e falha do workflow do reviewer;
- gate completo reproduzível;
- `PRODUCT_STATUS.md` reconciliado com P0.

## 3. T — transferência

**Depende de:** P0 fechada + S0.

**Destrava:** D2/E/G com o modelo correto de localidade corrente + origem de saída.

O que G deve assumir após T:

- um membro pode estar legitimamente visível em duas localidades municipais durante a transferência;
- isso não concede automaticamente comunidade/vila no destino;
- busca de prestador por localidade deve respeitar o container corrente escolhido, não “localidade do perfil”.

## 4. D2 — a porta

**Depende de:** T e partes de D1 (`outbox`/worker; adaptadores podem continuar externos).

**Destrava:** entrada confiável, provider/member role split sem conflitar com gates e consoles.

Saídas relevantes para G/H:

- gate derivado do estado real;
- console do fundador;
- decisão manual de documento preparada para operação;
- consentimento/código de conduta versionados;
- convite familiar fechado;
- fluxos `pending/rejected` coerentes.

## 5. E — a vila

**Depende de:** D2.

**Destrava:** o container comercial gratuito da G.

G não deve inventar uma unidade de alcance própria. A unidade grátis nasce da comunidade/vila que já existe depois de E.

Saídas relevantes:

- home de vila;
- referência de localidade;
- navegação por container;
- dono/moderador de comunidade;
- convite de membro;
- perfil alheio;
- audiência explícita.

## 6. F — o laço semanal

**Depende de:** E.

**Destrava:** prova social futura, referrals úteis para provider acquisition, e base de eventos/requests consistente.

Saídas relevantes para G/H:

- authz de server actions saneada;
- pedidos/respostas com ciclo fechado;
- RSVP/eventos mais completos;
- targets adicionais que H precisa saber denunciar/moderar.

## 7. H0 — safety floor

**Depende de:** F.

**Pode rodar em paralelo com:** G1 sem DM, desde que não toquem a mesma migration/superfície e o banco local seja coordenado conforme `plans/README.md`.

Entregáveis mínimos antes de abrir conversa provider:

1. `reports` unificado ou adapter único que inclua `dm_message`;
2. `dm_reports` não pode mais ser fila órfã;
3. motivo com tamanho/normalização e PII-safe handling;
4. ação do operador sobre todos os targets já expostos;
5. suspensão de escrita em pessoa, com helper presente em todas as policies de escrita na mesma migration;
6. teste positivo + negativo para cada fronteira.

## 8. G1 — vitrine core

### G1a — pode começar após F

- convite/admissão de prestador;
- provider account sem membership;
- ficha draft/published;
- categoria canônica;
- catálogo;
- portfólio;
- busca por categoria/container/nome;
- dashboard próprio sem analytics de terceiro.

### G1b — só depois de H0

- criação de conversa membro↔prestador;
- provider inbox;
- denúncia dentro da conversa;
- métrica first-party de contatos/conversas.

## 9. G2 — amplificação

**Depende de:** G1 + CNPJ + ADR/pricing aprovado + integração Asaas disponível.

**Não depende de:** PostHog.

Modelo esperado:

```text
provider_profile
  │
  ├── home_community_id  ── alcance grátis
  │
  └── provider_reach_entitlements
         ├── community:<id>
         └── locality:<id>
```

Billing altera entitlement; **não altera score de ranking**.

Webhook Asaas precisa ser idempotente. Expiração/cancelamento remove o entitlement no cálculo de visibilidade, não a ficha gratuita de origem.

## 10. H1 — operação completa

**Depende de:** G porque precisa incluir provider/profile/catalog/DM nos alvos reais.

Entregáveis:

- fila unificada completa;
- feedback ao denunciante;
- decisões de admissão;
- suspensão/reativação auditáveis;
- PostHog com allowlist sem conteúdo/PII;
- health probe/RLS expandido;
- SLA operacional e reconciliação documental.

## 11. Dependências externas

```text
Resend account + DNS ───────────────► entrega e-mail real
CNPJ ─────┬─────────────────────────► Asaas / G2
          └─────────────────────────► WhatsApp Cloud API futuro
número WhatsApp dedicado ───────────► canal não-oficial atual
revisão jurídica ───────────────────► política de privacidade publicável
assinatura do dono ─────────────────► código de conduta publicável
pricing aprovado ───────────────────► produtos/entitlements G2
```

Nenhuma dessas deve ser simulada como “DONE” por agente.

## 12. Dependências de revisão

Para execução agentic:

```text
executor
  ↓
gate determinístico
  ↓
reviewer independente
  ↓
PASS ──► próxima task
FAIL ──► rework da mesma task
```

O reviewer não substitui pgTAP/E2E/visual audit. Ele revisa contra acceptance criteria e diff; os gates provam propriedades executáveis.

## 13. Ordem recomendada final

1. **S0** — estabilização do baseline.
2. **T** — executar plano existente.
3. **D2** — executar plano existente.
4. **E** — executar plano existente.
5. **F** — executar plano existente.
6. **H0** — executar Tasks 1–4 do plano H proposto.
7. **G1** — vitrine core e contato seguro.
8. **G2** — amplificação paga quando os bloqueios humanos fecharem.
9. **H1** — admissões, feedback, analytics e operação final.

A abertura ao público pode ocorrer antes de G2 se a decisão do dono for lançar sem monetização; **não** deve ocorrer com H0 ausente se DM provider estiver habilitada.