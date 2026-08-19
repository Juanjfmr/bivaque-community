# Bivaque Community — master implementation plan

> DRAFT de reconciliação em 2026-08-19. Não substitui os planos de onda já aprovados. Ele organiza a execução a partir do estado atual e adiciona G/H, que ainda não tinham plano.

## 1. Objetivo

Levar o repositório do estado atual a um piloto operacional coerente, sem usar “quantidade de código” como sinal de progresso.

Uma etapa só fecha quando:

1. o ciclo de usuário relevante fecha;
2. gates determinísticos passam;
3. testes positivos e negativos cobrem as fronteiras de acesso;
4. telas tocadas passam auditoria visual;
5. `PRODUCT_STATUS.md` é reconciliado;
6. nenhum bloqueio humano é mascarado como concluído.

## 2. Regra de execução

- uma task por vez;
- um commit por task;
- migration + policy + teste da fronteira no mesmo todo;
- erro baseline precisa reproduzir em clean state antes de ser atribuído ao diff;
- executor não julga o próprio `DONE`;
- nenhum agente decide sozinho R2/R3 fora da matriz de risco.

## 3. Stage S0 — estabilizar o baseline

**Objetivo:** entregar a T um repositório em que vermelho significa regressão real.

### S0.1 — generated types drift

- remover BOM de `supabase/database.generated.ts`;
- rodar a geração no mesmo caminho do CI;
- adicionar guarda contra reincidência se puder ser feito sem engessar o gerador.

### S0.2 — `family-invite-locality.sql`

- corrigir UUID de fixture inválido;
- contar asserts e decidir se falta um sexto teste ou se `plan(6)` está errado;
- não reduzir o plano sem entender o requisito da P0 Task 6;
- provar com `db:reset --no-seed` + `test:db`.

### S0.3 — review check

- distinguir resultado do reviewer de orçamento/infra do reviewer;
- `success + zero findings` não pode virar FAIL apenas por exceder um teto de turns sem mensagem semântica;
- manter teto como observabilidade/custo, não como veredito de código.

### S0.4 — reconciliação pós-P0

Atualizar `PRODUCT_STATUS.md` com:

- P0 visual fechada;
- segunda localidade realmente testada;
- `/api/localities` corrigida para `service_role`;
- linhas stale de waitlist/locality;
- baseline real do pgTAP/CI.

**Gate de saída S0:** gate completo + db + E2E alcançáveis e com falhas conhecidas = 0.

---

## 4. Stage T — transferência

Executar `docs/superpowers/plans/2026-08-16-onda-t-transferencia.md` sem redesenhar.

**Critérios adicionais desta reconciliação:**

- qualquer código futuro de G deve consumir `LocalityContext.current`/equivalente, nunca `profiles.locality_id`;
- vitrine do destino abre no nível municipal durante transferência, mas comunidade/vila não é concedida;
- origem em saída permanece legível conforme o ADR.

**Gate:** plano T + audit/reconciliation da onda.

---

## 5. Stage D2 — fechar a porta

Executar o plano D2 existente, reconfirmando as referências que P0/T reescreverem.

Prioridades de fechamento:

1. gate por estado real;
2. `pending` com reconciliação;
3. consentimento versionado com texto real;
4. convite familiar utilizável;
5. documento com decisão humana;
6. console do fundador;
7. eliminação de dead paths de waitlist.

**Gate:** nenhum usuário elegível volta ao CPF por erro de roteamento; nenhum upload fica sem desfecho operacional; convite familiar não é passe ao portador.

---

## 6. Stage E — a vila

Executar o plano E existente.

Resultado esperado:

- vila é a sala;
- localidade é referência/alcance;
- dono de comunidade tem operação real em lote;
- convite de membro fecha aquisição;
- navegação é container, não proliferação de abas;
- perfil alheio é coerente com privacidade.

**Não desbloquear G antes de E:** a ficha gratuita da vitrine precisa de uma comunidade real como unidade de origem.

---

## 7. Stage F — o laço semanal

Executar F e tratar a Task 1 como gate de segurança.

Resultado esperado:

- server actions sem `service_role` no caminho do usuário;
- resposta de indicação chega ao autor;
- RSVP completo;
- convite de evento com fan-out;
- encontro recorrente;
- ciclo do administrador de grupo;
- targets de recomendação/evento estabilizados para H.

---

## 8. Stage H0 — safety floor

Executar primeiro as Tasks 1–4 do plano H proposto.

**Por que vem antes do contato de G:** hoje DM reporta para `dm_reports` e o operador nunca vê. Não abrir canal comercial privado assim.

Entregáveis:

- reports unificados;
- target registry conhecido;
- razão limitada/sanitizada;
- queue com ações por tipo;
- suspensão de escrita em pessoa;
- teste estrutural que impede policy nova de esquecer suspensão.

**Gate:** qualquer mensagem de provider que possa ser enviada também pode ser denunciada, triada e gerar ação sobre a pessoa.

---

## 9. Stage G1 — Vitrine Core

Executar o plano G proposto até a parte gratuita/core.

### Entrega mínima

- prestador entra por indicação;
- Auth account sem membership;
- só acessa o próprio shell/dashboard;
- ficha: identidade + categoria + catálogo + portfólio;
- storage privado com URLs assinadas;
- ficha publicada visível aos membros do container elegível;
- busca por categoria/container e nome trigram;
- dashboard básico;
- contato membro↔prestador via contexto `provider` depois de H0;
- member↔member continua sem nova criação;
- métrica inicial first-party: contatos/conversas recebidos.

**Gate:** prestador indicado consegue criar/publicar/editar ficha; membro correto encontra e inicia contato; terceiro fora do alcance não vê; provider não lê feed/perfil/grupo.

---

## 10. Stage G2 — Amplificação

**Bloqueios:** CNPJ, ADR/pricing aprovado, credenciais Asaas.

Entregáveis:

- entitlement de alcance separado de ranking;
- checkout hospedado;
- webhook idempotente;
- ativação/cancelamento/expiração;
- visibilidade paga explicitamente indicada;
- ficha de origem continua grátis após cancelamento;
- serviço contratado entre membro/prestador nunca passa pelo Bivaque.

**Gate:** replay de webhook não duplica entitlement; evento inválido não ativa nada; cancelamento não apaga ficha; pagar não melhora ranking dentro do mesmo conjunto elegível.

---

## 11. Stage H1 — operação completa

Completar o plano H:

- retorno ao denunciante;
- decisão de admissão;
- ação auditável e reativação;
- fila completa para providers/recommendations/events/DM;
- PostHog com allowlist e privacy gate;
- RLS health atualizado;
- métricas de 90 dias.

**Gate:** operador fecha report/admission do início ao retorno; suspended user não escreve por nenhum caminho; analytics não recebe conteúdo/PII.

---

## 12. Plano de lançamento

### Launch Gate A — produto comunitário sem monetização

Pode abrir uma vila quando T/D2/E/F + H0 estiverem fechadas e os bloqueios jurídicos de publicação estiverem resolvidos.

G pode estar ausente se o dono conscientemente lançar sem vitrine; isso reduz valor comercial, não cria quebra de confiança.

### Launch Gate B — vitrine gratuita

Exige G1.

### Launch Gate C — monetização

Exige G2 + veículo/CNPJ + Asaas + termos/política compatíveis.

### Launch Gate D — operação mensurável

Exige H1/PostHog.

## 13. Protocolo para DeepSeek Harness / Goal Mode

O master plan **não** deve ser entregue como um único `goal`.

Formato recomendado por execução:

```text
Goal:
Complete <TASK-ID> only.

Read:
- AGENTS.md
- docs/BIVAQUE.md sections referenced by the task
- docs/PRODUCT_STATUS.md relevant section
- plan file and dependency docs

Done only when:
- every acceptance criterion passes;
- deterministic gates pass;
- required positive and negative tests exist;
- docs are reconciled;
- no next task has started.

Stop and report instead of improvising when:
- an R2/R3 decision is missing;
- a human/external blocker is reached;
- baseline failure reproduces clean;
- the plan conflicts with current code.
```

## 14. Reviewer contract

Reviewer recebe:

- task original;
- diff;
- resultados de gate;
- acceptance criteria;
- arquivos afetados.

Saída:

```json
{
  "verdict": "PASS | FAIL",
  "issues": [
    {
      "severity": "critical | major | minor",
      "criterion": "AC-x",
      "evidence": "file:line or test",
      "required_fix": "..."
    }
  ]
}
```

`FAIL` volta para a mesma task. Adjudicador só entra em desacordo, risco alto ou loop repetido.

## 15. Estado final desejado

O Bivaque está pronto para pilotar quando o valor principal não depende de promessa:

- entra quem deve entrar;
- localidade/transferência não vazam escopo;
- vila produz o feed;
- pedir/responder/ser avisado fecha;
- encontro recorrente existe;
- prestador pode ser encontrado e contatado;
- operador consegue agir sobre conteúdo e pessoa;
- qualquer fluxo privado tem denúncia operacional;
- o produto sabe medir o que aconteceu sem exportar conteúdo sensível.