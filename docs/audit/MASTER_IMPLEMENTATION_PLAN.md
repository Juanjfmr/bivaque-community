# Bivaque Community — master implementation plan

> Revisão v2 — 2026-08-19. Este plano organiza **somente o delta ainda necessário**. Ele não autoriza reimplementar capabilities já existentes.

## 1. Objetivo

Levar o Bivaque Community do estado real atual até o produto definido no canon, preservando as foundations já construídas e produzindo unidades apropriadas para execução agentic com reviewer independente.

Princípio:

> **Antes de executar uma task, provar que ela ainda é necessária.**

`PRODUCT_STATUS.md` é registro útil, mas está defasado em pontos concretos. O executor deve confrontar plano ↔ runtime ↔ migrations ↔ testes ↔ commits.

## 2. Sequência

```text
PREFLIGHT técnico
  ↓
T — transferência
  ↓
D2Δ — fechamento da porta
  ↓
EΔ — fechamento da vila
  ↓
FΔ — authz + fechamento dos ciclos
  ↓
H0 — safety floor
  ↓
G1 — Vitrine Core
  ├─────────────► G2 — paid reach / Asaas
  └─────────────► H1 pode avançar em paralelo após H0
```

O símbolo `Δ` é deliberado: D2/E/F não são mais tratados como construção greenfield.

## 3. PREFLIGHT — baseline confiável para Goal Mode

**Não é onda de produto.** Serve para que um agente autônomo saiba atribuir falhas.

### P-1 — types drift

- integrar ou reproduzir a correção do BOM de `supabase/database.generated.ts` do PR #24;
- provar que o passo de generated-types chega ao fim sem diff espúrio.

### P-2 — pgTAP baseline

- corrigir `family-invite-locality.sql` com prova em `test:db`;
- resolver tanto o UUID inválido de fixture quanto a divergência `plan()`/asserts sem adivinhar qual assertion deveria existir;
- baseline de DB precisa terminar em estado conhecido.

### P-3 — reviewer CI

- revisar o teto de turns/configuração do review automático;
- sucesso do reviewer sem achados não pode ser reportado como falha exclusivamente por bookkeeping de turns sem sinal explícito.

**Done:** baseline vermelho restante, se houver, está documentado e não se confunde com regressão do executor.

---

## 4. T — transferência

Executar o plano existente `2026-08-16-onda-t-transferencia.md`, após revalidar referências.

Não reduzir a onda a "segunda localidade": a P0 já entregou multi-localidade da plataforma. T entrega **pertencimento temporal bilateral**.

Critérios principais:

- destino vira corrente imediatamente;
- origem vira saída com prazo;
- no máximo uma corrente + uma saída;
- origem degrada, não desaparece silenciosamente;
- destino concede nível municipal, não vila;
- UI troca contexto sem misturar dados;
- pgTAP + E2E positivo/negativo.

---

## 5. D2Δ — fechamento da porta

### Reusar

CPF, pending, attempt limit, upload, consent persistence, email-binding familiar, Upstash/breaker e duas fases de localidade já têm implementação.

### Executar apenas o restante

#### D2Δ-1 — gate/status

Reconfirmar middleware após P0/T e fechar todos os estados:

- não verificado;
- pending;
- rejected/retry;
- elegível sem membership;
- member.

#### D2Δ-2 — reconciliação pending

Job/RPC que transforma resultado assíncrono em estado final sem pedir CPF novamente e sem retry em laço contra Portal.

#### D2Δ-3 — consent UI

Exibir versões efetivamente aceitas dos textos; não inventar dados jurídicos ainda pendentes do dono/revisão.

#### D2Δ-4 — convite familiar utilizável

A binding ao e-mail já existe. Fechar:

- entrega/link copiável ou enfileirado;
- expirado/usado/revogado/inválido com UX distinta;
- identificação do destinatário de forma segura;
- E2E de encaminhamento negado.

#### D2Δ-5 — decisão de documento

O upload e a fila existem. Acrescentar ação auditada do operador:

- signed access somente após authz;
- approve/reject;
- `reviewed_by/at` consistente;
- transição da verificação;
- expurgo físico no TTL;
- negações testadas.

#### D2Δ-6 — consoles

Consolidar as superfícies de founder/community owner previstas no ADR, sem duplicar `/admin` já funcional onde ele pode ser movido/encapsulado.

**Done:** membro e operador fecham happy + principal sad path de admissão.

---

## 6. EΔ — fechamento da vila

### Reusar

`communities`, memberships, basic approval, `feed_community`, audience selector, guide foundation e LocalityContext.

### Tasks

#### EΔ-1 — D48 no feed

Post de alcance da localidade chega às vilas corretas sem vazar para outra localidade/grupo.

#### EΔ-2 — home

- com vila: feed da vila;
- sem vila: referência da localidade, não feed municipal genérico;
- múltiplas comunidades: escolha determinística/visível.

#### EΔ-3 — containers/nav

Implementar a arquitetura do ADR de shells e navegação; localidade é container, não nova aba fixa por cidade.

#### EΔ-4 — community governance

- aprovação em lote;
- delegação;
- remoção/rejeição/cancelamento onde faltar;
- afiliação **não** entra enquanto seu ADR não estiver aprovado.

#### EΔ-5 — member invite

Convite carrega attribution + community scope; nunca pula verificação.

#### EΔ-6 — member profile

Perfil de outro membro + histórico filtrado pelo titular, avatar consistente e privacy contract.

#### EΔ-7 — interests/groups suggested

Executar o delta do plano E após validar densidade e o comportamento de nova localidade.

**Done:** a vila funciona como a sala definida por D48 e a camada municipal fica acessível como referência.

---

## 7. FΔ — authz e laço semanal

Separar em duas passagens para não esconder segurança dentro de feature work.

### F0 — authz primeiro

#### F0-1

Medir e corrigir as seis Server Actions de grupo/evento que autenticam no client de `service_role`.

#### F0-2

`desiredStatus` nunca vem como autoridade do formulário. Status de entrada em grupo é derivado server-side e imposto pela policy/RPC.

#### F0-3

Testes positivos e negativos para join, leave, ownership, RSVP e complete.

### F1 — eventos

- `not_going`;
- notificar organizador sem flood;
- organizer invite + fan-out;
- recorrência;
- RSVP por ocorrência;
- feriado como warning, não correção silenciosa.

### F2 — recommendations

- resposta notifica autor;
- salvadores recebem evento se o canon mantiver essa regra;
- editar/excluir própria reply na UI;
- links para destino correto;
- request unresolved escalation somente depois de validar a hipótese.

### F3 — group admin

Fechar reject/remove/delete/ownership e sad paths que ainda não fecharam.

**Done:** ciclo pedir→responder→retorno e ciclo encontro→RSVP→recorrência funcionam ponta a ponta.

---

## 8. H0 — safety floor

H0 é executado antes de liberar provider DM.

### H0-1 — report contract único

A fila de `reports` já opera post/comment/group e já notifica reporter ao resolver. Não reconstruir.

Adicionar uma estratégia única para:

- DM;
- recommendation request/reply;
- provider/ficha quando existir;
- outros alvos reportáveis aprovados.

Migrar/absorver `dm_reports` ou criar adapter de leitura/transição com plano explícito para eliminar a segunda verdade.

### H0-2 — report reason

Limite, normalização e scrub de PII antes de persistir. Erro seguro para o usuário.

### H0-3 — suspensão

- modelo reversível;
- motivo, operador, timestamps e trilha;
- helper único de `is_suspended`;
- aplicar a **todas as policies de escrita afetadas no mesmo change set**;
- leitura permitida/bloqueada conforme ADR, sem inventar regra durante execução.

### H0-4 — block bilateral

O teste atual prova assimetria: o bloqueador pode enviar depois do block. Corrigir criação e envio para bloquear ambas as direções.

### H0-5 — operator UI

Estender a fila existente com ações e preview suficiente; manter retorno ao denunciante já existente.

### H0-6 — E2E

- denúncia DM chega ao operador;
- suspended não escreve;
- unsuspend restaura conforme contrato;
- não-operador não age;
- block é bilateral.

---

## 9. G1 — Vitrine Core

Plano detalhado em `2026-08-19-onda-g-vitrine.md`.

Blocos:

1. account/provider boundary;
2. indication/onboarding de provider;
3. ficha identidade + catálogo + portfólio;
4. discovery/search;
5. dashboard;
6. provider DM sobre H0;
7. E2E/visual.

Não depender de Asaas para lançar a ficha gratuita.

---

## 10. G2 — Amplificação

Somente após G1 e bloqueios R3/CNPJ.

- entitlement de alcance;
- checkout hospedado Asaas;
- webhook idempotente;
- reconciliação/cancelamento/expiração;
- dinheiro altera alcance, **nunca ranking**;
- nenhum pagamento do serviço prestado passa pelo Bivaque.

---

## 11. H1 — Operação e analytics

Plano detalhado em `2026-08-19-onda-h-operacao.md`.

Após H0, fechar:

- decisões de admissão/documento se não tiverem fechado em D2Δ;
- SLA/fila operacional;
- health/probes úteis;
- PostHog com base legal e eventos mínimos;
- métricas de 90 dias.

Evitar duplicação D2/H: **D2 constrói o ciclo; H operacionaliza escala e observabilidade.**

---

## 12. Contrato de execução para Harness / Goal Mode

Cada run recebe no máximo um bloco acima.

Entrada obrigatória:

- objetivo;
- arquivos/contratos a reconfirmar;
- acceptance criteria;
- negações obrigatórias;
- comandos de gate;
- `DO NOT` explícitos;
- parada em decisão R2/R3 não coberta.

Saída:

```text
implementation
→ gate determinístico
→ diff
→ reviewer independente
→ PASS | REWORK
```

O executor nunca redefine o critério de DONE durante a run.

## 13. Critério global de DONE

Uma capability só fecha quando houver:

1. entrada alcançável;
2. ação;
3. feedback;
4. acompanhamento/estado posterior;
5. sad path principal;
6. authz/RLS positiva e negativa;
7. gate verde;
8. auditoria visual quando toca tela;
9. `PRODUCT_STATUS.md` reconciliado.
