# Onda H — Operação

> **DRAFT de plano de execução**, escrito em 2026-08-19 contra `main@ce918f1`.
>
> H toca moderação, exclusão de escrita, RLS, admissões e analytics de comportamento. Pela `RISK_MATRIX.md`, é **R3**. Antes da Task 1 precisa existir ADR aprovado, `critic_verdict: PASS` e aprovação humana cobrindo: modelo de report, suspensão, retenção/auditoria e PostHog.
>
> Esta onda é deliberadamente dividida em **H0 — safety floor** e **H1 — operação completa**.

## 0. Por que H0 vem antes de parte da G

O roadmap antigo lista G antes de H. Isso cria uma dependência insegura: G abre conversa privada membro↔prestador, mas hoje a denúncia de DM cai em `dm_reports`, uma tabela que o painel não lê, e o operador não consegue suspender uma pessoa.

Portanto:

```text
... → F → H0 → G1-contact/G2 → H1
```

G pode construir ficha/catálogo/busca em paralelo lógico com H0, mas **não pode habilitar provider DM antes das Tasks 1–4 daqui**.

## 1. O que H entrega

### H0 — safety floor

1. um modelo operacional de denúncia para todos os alvos;
2. DM deixa de ter fila órfã;
3. motivo estruturado + detalhe curto e sanitizado;
4. painel mostra contexto suficiente e age por tipo;
5. suspensão de escrita em pessoa, auditável, aplicada em todas as policies na mesma migration.

### H1 — operação completa

6. retorno ao denunciante;
7. decisão real na fila de admissão;
8. SLA/audit trail e health probes;
9. PostHog com allowlist e privacy gate;
10. fechamento/reconciliação.

## 2. Contexto obrigatório

Leia:

- `docs/BIVAQUE.md` §4.4, §6.4, D12, D24, D25, D38, D40;
- `docs/PRODUCT_STATUS.md` §9 e §11;
- `docs/audit/GAP_ANALYSIS.md` C01, C07 e C08;
- `docs/audit/DEPENDENCY_MAP.md` §§7 e 10;
- `apps/web/app/(admin)/reports/page.tsx`;
- `apps/web/app/(admin)/admissions/page.tsx`;
- `apps/web/app/components/bivaque/chat-thread.tsx`;
- `supabase/migrations/20260815132000_verification_documents.sql`;
- `AGENTS.md` inteiro.

## 3. Hard stops humanos

- política de privacidade não vira “aprovada” por agente;
- código de conduta não vira base de suspensão sem assinatura/aprovação humana;
- PostHog não liga em produção sem base legal/texto coerente;
- nenhuma decisão sobre prazo de retenção novo é inventada nesta onda; usar o canon/ADR.

---

# H0 — Safety floor

## Task 1: um modelo de denúncia, não duas filas

Hoje `reports` cobre parte do produto e `dm_reports` vive fora do painel.

- [ ] **Step 1: inventário antes da migration**

  Liste todos os objetos user-visible/user-generated existentes **no código no dia da execução**. O mínimo esperado depois de F/G inclui:

  - post;
  - comentário;
  - grupo;
  - evento;
  - pedido de indicação;
  - resposta de indicação;
  - mensagem DM;
  - ficha provider;
  - item de catálogo/portfólio se individualmente moderável;
  - perfil de membro, se houver conteúdo reportável na tela.

  Não copie a lista cegamente: E/F/G podem ter alterado entidades.

- [ ] **Step 2: schema unificado**

  Evoluir `reports` para suportar a taxonomia aprovada. Preferir um `target_type` controlado + `target_id` e validação server-side/DB específica por tipo.

  A ausência de FK polimórfica **não** autoriza aceitar UUID arbitrário. Um helper/trigger precisa validar existência e, quando aplicável, que o denunciante podia ver o alvo.

- [ ] **Step 3: motivo estruturado**

  Substituir texto livre como único dado por:

  - `reason_code` de lista curta aprovada;
  - `details` opcional com limite curto;
  - normalização e scrub dos padrões de PII já cobertos pela infraestrutura do repo;
  - aviso de UI para não inserir dado pessoal.

  Não registre payload original separado “para auditoria”; isso recria o vazamento.

- [ ] **Step 4: migrar `dm_reports`**

  Migration de dados preserva reporter, mensagem, razão normalizada possível e timestamps. Só depois de prova de equivalência o caminho antigo é revogado/removido.

- [ ] **Step 5: RLS**

  - usuário insere report apenas de alvo legitimamente visível/reportável;
  - usuário não lê reports de terceiros;
  - operator lê fila por helper;
  - provider denuncia apenas DM em que participa e, se o produto permitir, alvos da própria ficha — nunca conteúdo de membro que não pode ler.

- [ ] **Step 6: testes**

  Um positivo e um negativo por target class. Caso obrigatório: terceiro que conhece UUID de uma DM não consegue reportá-la.

- [ ] **Step 7: gate e commit**

  `feat(moderation): unify reports across every reportable target`.

---

## Task 2: toda superfície reportável fecha o ciclo de envio

- [ ] **Step 1: componente/pattern único**

  Criar wrapper de denúncia reutilizável com `targetType`, `targetId`, reason code e detalhe.

  Não duplicar formulários com regras de tamanho diferentes.

- [ ] **Step 2: inserir em cada alvo**

  Aplicar somente onde o usuário realmente vê o alvo. Não criar “Denunciar” em item próprio se o canon decidir que auto-report não faz sentido.

- [ ] **Step 3: feedback**

  Após submit:

  - confirmação clara;
  - report duplicado recente não cria spam operacional;
  - erro não expõe existência de alvo proibido.

- [ ] **Step 4: DM**

  `chat-thread.tsx` deixa de inserir `dm_reports`. Usa o caminho unificado.

- [ ] **Step 5: testes/E2E**

  E2E pelo menos em post, recommendation e DM. Negativo: report por UUID sem acesso retorna comportamento indistinguível de alvo inexistente.

- [ ] **Step 6: visual + commit**

  `feat(moderation): one reporting flow across product surfaces`.

---

## Task 3: fila do operador mostra contexto e age por tipo

A fila atual mostra `target_type`, reason e UUID cru. Isso é suficiente para provar infraestrutura; não é operação.

- [ ] **Step 1: leitura autorizada**

  Manter o gate de operador antes de qualquer uso de `service_role`. O service client nunca decide sozinho se o caller é operador.

- [ ] **Step 2: preview por target**

  Resolver contexto mínimo sem vazar mais do que o operador precisa:

  - tipo;
  - trecho/identificador humano seguro;
  - autor/alvo quando necessário para ação;
  - idade;
  - reason code/details scrubbed.

  Preview de DM não precisa despejar conversa inteira; mostrar a mensagem reportada + contexto estritamente necessário.

- [ ] **Step 3: action registry**

  `softDeleteTarget` hoje é `if post/comment/group`. Substituir por registry/dispatch explícito por target conhecido.

  Cada target declara ações permitidas: esconder, resolver sem ação, eventualmente restaurar se o domínio suportar.

- [ ] **Step 4: auditoria de ação**

  Não depender só de `operator_note` mutável para histórico de múltiplas ações. Criar registro append-only de moderação (nome conforme ADR), com:

  - report/case;
  - operador;
  - action type;
  - target;
  - motivo estruturado;
  - timestamp.

- [ ] **Step 5: testes**

  - não-operador não lê/não age;
  - operator esconde target suportado;
  - target type desconhecido falha fechado;
  - ação cria audit row;
  - resolver duas vezes não duplica ação.

- [ ] **Step 6: visual + commit**

  `feat(admin): actionable moderation queue with audited target dispatch`.

---

## Task 4: suspensão de pessoa bloqueia toda escrita na mesma migration

D38 é o contrato: flag/estado no perfil + helper na RLS, reversível e auditável.

- [ ] **Step 1: estado mínimo**

  Implementar o estado aprovado no ADR em `profiles`/entidade de conta apropriada. Deve suportar suspensão temporária e, se aprovado, indefinida sem string mágica.

  O motivo completo fica no audit log, não num campo público do perfil.

- [ ] **Step 2: helper único**

  Criar `private.is_account_write_allowed(user_id)` ou equivalente. Ele considera suspensão/vigência sem expor razão.

- [ ] **Step 3: TODAS as policies de escrita**

  Na **mesma migration**, incorporar o helper em toda policy INSERT/UPDATE/DELETE executável por usuário/member/provider.

  Isso inclui pelo menos conteúdo, grupos, eventos, recommendations, DM, provider surfaces e qualquer nova tabela criada por E/F/G.

  Não tocar SELECT por padrão: D38 define suspensão de escrita. Se o ADR quiser bloquear leitura, pare e reconcilie o plano.

- [ ] **Step 4: scope guard**

  Adicionar teste estrutural que falha se uma policy de escrita user-facing nova nascer sem o helper/contrato de suspensão. O objetivo é impedir regressão futura, não contar strings frágeis se houver mecanismo melhor.

- [ ] **Step 5: UI**

  Shell do usuário suspenso mostra estado somente-leitura e caminho de suporte/recurso definido no código de conduta. Affordances de criação somem ou ficam disabled com explicação; RLS continua sendo a autoridade.

- [ ] **Step 6: operator action**

  Suspender/reativar exige motivo e gera audit row. A action não aceita `user_id` arbitrário sem operator gate.

- [ ] **Step 7: testes**

  Matriz negativa com usuário suspenso tentando:

  - post/comment;
  - RSVP/event mutation;
  - recommendation;
  - DM send;
  - provider edit, se provider suspenso;
  - qualquer caminho de escrita que use RPC.

  Positivo: leitura permitida conforme D38; reativação devolve escrita.

- [ ] **Step 8: gate e commit**

  `feat(moderation): suspend account writes across every RLS boundary`.

**H0 termina aqui.** Só agora a G pode habilitar provider DM.

---

# H1 — Operação completa

## Task 5: retorno ao denunciante fecha o ciclo

- [ ] **Step 1: evento de resolução**

  Ao resolver report/case, criar notificação interna ao denunciante e, se a preferência/canal permitir, linha no `outbox`.

- [ ] **Step 2: conteúdo da mensagem**

  Informar que a denúncia foi analisada/concluída. Não revelar sanção, razão interna, identidade adicional nem estado disciplinar do denunciado.

- [ ] **Step 3: idempotência**

  Resolver/reprocessar não envia múltiplos retornos.

- [ ] **Step 4: testes**

  - resolução gera 1 notificação;
  - preferência desligada não gera canal externo;
  - terceiro nunca recebe retorno;
  - detalhes de suspensão não aparecem no payload.

- [ ] **Step 5: commit**

  `feat(moderation): close the loop with reporter feedback`.

---

## Task 6: a fila de admissão passa a decidir

Hoje `/admissions` observa `list_verification_queue`; o upload documental já cria `private.verification_documents`, mas ninguém decide.

- [ ] **Step 1: duas filas, uma operação**

  O console precisa distinguir:

  - `pending` automático/reconciliação do Portal;
  - documento pendente de revisão humana.

  Não misture “Portal instável” com “documento rejeitado” no mesmo CTA.

- [ ] **Step 2: leitura do documento**

  Operator autenticado recebe URL assinada curta para o object path **somente após operator gate**. O path bruto não vai para lista pública/client state permanente.

- [ ] **Step 3: aprovar documento**

  Transação/RPC autorizada:

  - marca `verification_documents.review_status = approved`;
  - grava reviewer/timestamp;
  - atualiza `verification_outcomes` para elegível/verified;
  - **não cria membership de localidade** se D2/P0 mantém admissão em duas fases;
  - enfileira retorno para o usuário seguir ao passo de localidade.

- [ ] **Step 4: rejeitar documento**

  Marca rejeitado + audit reason interno. Usuário recebe estado/copy genéricos compatíveis com anti-enumeração e caminho de recurso definido.

- [ ] **Step 5: expurgo TTL**

  Garantir job que remove storage object expirado e mantém apenas metadata/audit permitidos pelo prazo canônico. Não deixe documento aprovado virar storage permanente.

- [ ] **Step 6: concorrência/idempotência**

  Dois operadores não decidem o mesmo documento duas vezes. Update condicionado a `pending` e retorno claro.

- [ ] **Step 7: testes/E2E**

  - não-operador não assina URL;
  - approve muda outcome uma vez;
  - reject não cria membership;
  - expirado não é revisável;
  - decisão concorrente tem um vencedor;
  - E2E do status do usuário após decisão.

- [ ] **Step 8: visual + commit**

  `feat(admissions): operator decision for pending verification documents`.

---

## Task 7: SLA, fila e histórico operacional

- [ ] **Step 1: estados de caso**

  Se o ADR aprovar, distinguir `open`/`in_review`/`resolved` sem criar workflow maior que a operação solo precisa.

- [ ] **Step 2: SLA**

  Usar o SLA já definido no repo para sinalizar idade. Não inventar promessa pública diferente no painel e no texto de conduta.

- [ ] **Step 3: histórico**

  Operator consegue ver ações anteriores do case/report sem editar histórico.

- [ ] **Step 4: filtros mínimos**

  Tipo, idade/SLA e estado. Não construir BI dentro do console.

- [ ] **Step 5: testes + commit**

  `feat(admin): moderation SLA and immutable case history`.

---

## Task 8: PostHog com allowlist e sem conteúdo

> **HARD STOP de produção:** política/base legal aprovadas.

D40 escolhe PostHog para métrica de produto. Isso não autoriza autocapture de tudo.

- [ ] **Step 1: wrapper único de analytics**

  Nenhum componente chama SDK diretamente. Criar módulo que aceita apenas nomes/propriedades tipados/allowlisted.

- [ ] **Step 2: defaults de privacidade**

  Desabilitar recursos que capturam conteúdo de tela/form automaticamente se não forem necessários. Não enviar:

  - texto de post/comentário/recommendation;
  - DM;
  - termo de busca;
  - reason/details de denúncia;
  - nome/e-mail/telefone;
  - CPF/Portal;
  - OM/patente/endereço;
  - documento/path de storage;
  - conteúdo do catálogo quando ele puder identificar pessoa.

- [ ] **Step 3: identidade pseudônima mínima**

  Usar o identificador mínimo aprovado pelo ADR/política. Não anexar profile completo como properties.

- [ ] **Step 4: eventos que respondem perguntas reais**

  Começar pequeno, por exemplo:

  - onboarding iniciado/concluído por caminho;
  - pedido de indicação criado/respondido/resolvido;
  - evento RSVP/encontro recorrente;
  - provider card opened;
  - provider contact started;
  - report submitted/resolved;
  - locality/community activation metrics necessárias ao piloto.

  Eventos não carregam texto do objeto.

- [ ] **Step 5: feature/env gate**

  Sem chave/config ou sem aprovação de produção, analytics é no-op. App não quebra.

- [ ] **Step 6: privacy tests**

  Teste unitário do wrapper rejeita propriedades não allowlisted e passa todos os payloads pelo scrub já usado pelo repo onde aplicável.

  Adicionar scan/teste que prova ausência dos campos proibidos nos eventos declarados.

- [ ] **Step 7: dashboards mínimos**

  Instrumentar as perguntas de 90 dias definidas no canon/ADR. Não criar tracking “porque pode ser útil”.

- [ ] **Step 8: commit**

  `feat(analytics): explicit PostHog events behind a privacy allowlist`.

---

## Task 9: health probe e regressão de autorização

- [ ] **Step 1: expandir RLS health**

  Incluir as novas tabelas/helpers de report, suspension, provider e admissions.

- [ ] **Step 2: probe não substitui pgTAP**

  Health endpoint mede invariantes operacionais; pgTAP continua provando policies.

- [ ] **Step 3: casos de falso verde**

  O probe deve falhar se:

  - provider consegue ler member content;
  - suspended user consegue escrever por uma policy esquecida;
  - report de DM não aparece para operador;
  - operator roster fica público;
  - analytics wrapper aceita campo proibido.

- [ ] **Step 4: commit**

  `test(authz): extend operational health to moderation and provider boundaries`.

---

## Task 10: fechamento da onda H

- [ ] gate completo;
- [ ] pgTAP + db lint em banco sem seed;
- [ ] E2E com seed em série local e paralelo CI;
- [ ] auditoria visual em reports, admissions, suspended state e superfícies de report tocadas;
- [ ] revisar signed URL de documento e TTL;
- [ ] revisar logs/Sentry/PostHog para conteúdo/PII;
- [ ] reconciliar `PRODUCT_STATUS.md` §9 e §11;
- [ ] registrar bloqueios externos de produção sem mascará-los;
- [ ] só marcar H `DONE` quando denúncia → ação → retorno e admissão → decisão → retorno fecharem.

## Critério final de H0

Uma mensagem privada reportada chega ao operador, ele vê contexto mínimo, consegue agir sobre conteúdo/pessoa, e a pessoa suspensa não consegue escrever por nenhum caminho relevante.

## Critério final de H1

Operador fecha denúncia e admissão do início ao retorno; ações ficam auditáveis; analytics responde perguntas do piloto sem exportar conteúdo sensível ou depender de autocapture indiscriminado.