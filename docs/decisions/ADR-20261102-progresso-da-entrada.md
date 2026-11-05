---
id: ADR-20261102-progresso-da-entrada
status: Aceito por delegação — aguarda ratificação
risk: R3
owner: Juan
approved_at: 2026-11-02 (por delegação do dono em 02/11; aguarda ratificação)
expires_at:
linked_plan: docs/LANCAMENTO.md (fase 2, LAN-F01)
critic_verdict: pendente — revisão independente e security-auditor não disponíveis neste executor; listado em RATIFICACAO.md
critic_review:
---

# O rascunho da entrada mora numa tabela própria, com leitura só do dono e escrita só pela rota

## Problem

A entrada nova (ADR-20261101-entrada-unica-por-codigo) tem etapas que ainda não são
fato consumado no banco: a pessoa escolhe cidade e momento antes de a verificação terminar,
marca interesses e grupos antes de o vínculo existir, aceita o combinado e decide os avisos
antes do provisionamento. As tabelas canônicas não representam esse estado intermediário:
`locality_memberships` e `profiles` só nascem no provisionamento, e não há tabela de rascunho.

Sem um lugar no servidor, a retomada ("fechar e reabrir o app volta para a mesma etapa", que
a prévia já demonstra) só funcionaria no aparelho em que a pessoa começou, com estado no
navegador — inaceitável para a entrada que o app de loja e o link de convite precisam retomar
em qualquer aparelho. O ADR de entrada diz explicitamente que "o servidor decide o destino pelo
progresso salvo".

## Decision

- Uma tabela `public.entry_progress`, uma linha por pessoa (`user_id` = `auth.users.id`),
  com `versao` do fluxo, `etapa` atual, `estado` JSONB das escolhas ainda não gravadas e
  `created_at`/`updated_at`.
- O rascunho é **mínimo**: só o que ainda não está no banco canônico. Nome, cidade, momento,
  interesses, grupos e avisos vão para as tabelas que já são donas deles no provisionamento
  (`profiles`, `member_entry_moments`, `user_group_interests`, preferências de notificação).
- **RLS habilitada e forçada.** `authenticated` tem apenas `SELECT`, e a única policy é
  `user_id = auth.uid()`. Não existe grant nem policy de INSERT/UPDATE/DELETE: quem grava é a
  rota `/api/app/entry/progress`, com o cliente do usuário vindo do resolvedor de sessão e
  escrita por `service_role` autorizada no código — nunca a partir de parâmetro do cliente.
- `anon` não lê nem escreve; `service_role` tem a tabela inteira.
- CHECKs garantem no banco a faixa da versão, o formato da etapa e a forma do estado
  (objeto JSON). A lista de etapas do fluxo (`apps/app/src/previa-f01/fluxo.ts`) fica com a
  rota, única escritora, e com o app; o banco não repete a lista literal porque o scanner de
  dado pessoal do repositório (`tests/privacy`) lê nomes de etapa com aparência de PII como
  coluna proibida — e a coluna é `text` livre de formato controlado, não um conjunto de
  valores de negócio.
- **Ciclo de vida:** o rascunho é apagado quando a entrada termina — dentro de
  `provision_member_entry`, na mesma transação do vínculo, do perfil e do momento (emenda de 04/11, SEC-007; antes era a
  rota do app, em outra chamada) — e pela purga da conta
  (`finalize_account_deletion`), porque o GoTrue faz soft delete em `auth.users` e o
  `ON DELETE CASCADE` nunca dispara.
- A versão antiga do rascunho não é migrada: a leitura devolve o progresso inicial quando
  `versao` é diferente da atual (no servidor e no app), o PUT recusa versão diferente da atual
  (`versao-invalida`), e a pessoa recomeça da porta. Isso substitui migração de
  rascunho por uma regra simples e sem perda de dado canônico.

## Alternatives considered

1. **Derivar a etapa só das tabelas canônicas.** Rejeitada: não existe linha para cidade,
   momento, interesses e avisos antes do provisionamento; a etapa "cidade" e a espera da
   verificação ficariam impossíveis de retomar.
2. **Guardar o rascunho em `auth.users.user_metadata`.** Rejeitada: o próprio usuário escreve
   metadata pelo GoTrue, então a etapa viraria dado do cliente — e o servidor prometeu decidir
   o destino. Além disso, o metadata não tem RLS nem CHECK, e a purga teria de reescrever
   `raw_user_meta_data` em vez de apagar uma linha.
3. **Só `localStorage` no app.** Rejeitada: não retoma em outro aparelho, some ao limpar o
   navegador e não serve ao app de loja depois de reinstalar.
4. **Colunas novas em `profiles`.** Rejeitada pelo mesmo motivo de `member_entry_moments`:
   `profiles` tem grant de UPDATE pelo dono e leitura pública com recorte; um rascunho ali
   entraria no grant e na leitura pública, e a privacidade teria de ser conferida coluna a
   coluna contra a API pública.

## Market or reference baseline

Apps com onboarding multi-etapa guardam o progresso no servidor (Slack, Notion e LinkedIn
retomam o cadastro em qualquer aparelho). No Postgres com RLS, o padrão equivalente é uma
tabela do dono com leitura própria e escrita por função/rota privilegiada — o mesmo padrão de
`member_entry_moments` já aprovado neste repositório.

## Proposed divergence from baseline

Nenhuma em relação ao padrão; a diferença é o rascunho ser apagado no fim da entrada, em vez de
manter histórico.

## Evidence and sources

- `docs/decisions/ADR-20261101-entrada-unica-por-codigo.md` (§1, "o servidor decide o destino
  pelo progresso salvo"; §3, etapa de aceite).
- `apps/app/src/previa-f01/fluxo.ts` e `servidor-simulado.ts`: a forma do `Progresso` e a
  promessa de retomada que a prévia demonstra.
- `supabase/migrations/20261023110000_member_entry_moments.sql`: o padrão de tabela do dono
  com RLS forçada, leitura própria e escrita por rota, e a purga que copia a função vigente.
- `supabase/tests/entry-progresso.sql`: prova da decisão (RLS, grants, CHECKs e purga).

## Benefits

- A retomada funciona em qualquer aparelho e depois de reinstalar o app de loja.
- O rascunho não vira superfície de escrita do cliente: o pior caso de um cliente adulterado é
  ver o próprio rascunho errado, nunca escrever o de outra pessoa.
- Poucos campos: a maior parte do progresso já vive nas tabelas canônicas no provisionamento.
- Apagar o rascunho ao terminar e na purga mantém o dado pessoal com prazo explícito.

## Risks

- **Dado pessoal temporário.** Nome, cidade e escolhas ficam em JSON até o fim da entrada.
  Mitigação: apagar ao provisionar e na purga; nada de leitura por terceiros.
- **Rascunho de versão antiga.** Vira progresso inicial; a pessoa recomeça. Aceito porque nada
  canônico é perdido.
- **JSONB sem forma fechada.** Os CHECKs garantem objeto, etapa e versão; o conteúdo é validado
  na rota (única escritora), e um estado fora da forma é recusado antes de gravar.
- **Dois caminhos para o mesmo dado** (rascunho e canônico) durante a entrada. Mitigação: o
  rascunho só guarda o que o canônico ainda não tem; no provisionamento, o canônico vence e a
  linha é apagada.

## Consequences — emenda de 04/11/2026 (SEC-007, lote A do F01)

- **O rascunho sai dentro do provisionamento.** `provision_member_entry` é o ponto comum dos três caminhos de conclusão
  (rota do app, `/api/onboarding` da web e convite familiar). Apagar a linha ali fecha o defeito de a web e o convite
  deixarem nome e cidade parados no banco, e de a limpeza da rota do app falhar só com log. Uma falha do provisionamento
  desfaz também a remoção do rascunho (pgTAP em `entry-provision-atomic.sql`).
- **O destino vem do estado canônico.** O GET devolve a etapa final (`inicio`) a quem já tem vínculo com a cidade, lido
  pelo cliente do usuário sob RLS; um rascunho que sobrou não manda a pessoa de volta à porta.
- **A versão é regra do validador**, não só da leitura: `validarProgresso` recusa versão diferente de `VERSAO_DO_FLUXO`, e
  o app confere a versão de novo ao montar o progresso.
- **Sobrenome vazio é aceito** no rascunho (quem tem um nome só avança); o nome continua obrigatório.

## Consequences — emenda de 04/11/2026 (lote B: o combinado)

O lote B liga a tela aprovada ao servidor real e precisa decidir onde mora o registro do "combinado" — a etapa que mostra
as quatro regras de convivência em linguagem simples depois da prévia da cidade, com a versão do Código de Conduta na tela.
O ADR de entrada §3 diz que ele **não é um segundo aceite jurídico**; por isso não reusa `consent_acceptances` (que é o
aceite) nem uma coluna em `profiles` (que é lida por outros membros sob as regras de visibilidade e não deve ganhar um dado
novo de graça).

- **Tabela própria, fechada por padrão.** `public.entry_commitments` (`user_id` chave primária com cascade de
  `auth.users`, `versao` inteira de 1 a 1000, `aceito_em`) tem RLS habilitada e forçada; `authenticated` só faz `SELECT` da
  própria linha; `anon` não tem privilégio; a escrita é só do `service_role`, pela rota `POST /api/app/entry/combinado`, que
  aceita apenas a versão atual do contrato (`CODE_OF_CONDUCT_VERSION`, hoje 2) com o id da sessão.
- **Some junto com a conta.** A purga (`finalize_account_deletion`, copiada na migration `20261104215006_entry_commitments`
  com o delete novo) apaga a linha; o rascunho da entrada continua sendo apagado dentro do provisionamento e a purga cobre o
  caso de a conta ser apagada com o combinado já gravado.
- **Prova.** `supabase/tests/entry-commitments.sql` com 14 asserções (RLS forçada, leitura só do dono, outro membro zero,
  `anon` e escrita de `authenticated` recusados com 42501, CHECK de versão, purga); `db reset --local --no-seed` +
  `test:db` PASS 161 arquivos / 2549 asserções. A revisão independente desta emenda continua pendente e está em
  [RATIFICACAO.md](RATIFICACAO.md).

## Consequences — emenda de 05/11/2026 (RUN-004: retomada e prazo)

A revisão do PR #128 mediu que apagar o rascunho dentro do provisionamento (emenda do SEC-007) deixava
o GET sem saber em que etapa do fim da entrada a pessoa estava: quem recarregava logo depois de
provisionar ia direto ao Início, pulando interesses, o combinado e os avisos. A correção sem voltar a
aceitar escrita do cliente:

- **O provisionamento troca o rascunho por um marcador.** `provision_member_entry` grava
  `etapa = 'previa-cidade'`, `estado = '{}'` (upsert) na mesma transação. A tela não escreve mais o
  rascunho a partir daí: o PUT responde 409 `entrada-concluida` a quem já tem vínculo. O convite
  familiar grava o marcador `interesses`, porque o caminho dele pula a cidade e a prévia.
- **O marcador some no fim.** A rota dos avisos (última etapa) apaga a linha da sessão; a purga da
  conta continua cobrindo o caso de abandono. Ao final da entrada, `entry_progress` não tem linha da
  pessoa.
- **Rascunho abandonado expira em 30 dias.** O prazo é aplicado no servidor, na leitura do GET: linha
  com `updated_at` mais velho que 30 dias é apagada e tratada como ausente. Sem cron novo e sem
  confiar no relógio do cliente.
- **A leitura decide pelo rascunho quando ele existe.** Com vínculo e marcador, a etapa devolvida é a
  do marcador; sem marcador, quem tem vínculo terminou (Início). Membro antigo, sem rascunho, também
  cai no Início — o marcador só existe para quem passou pela entrada nova.
- **Prova.** `entry-provision-atomic.sql` passa a exigir o marcador em vez da ausência da linha;
  `entry-progress-route.test.ts` cobre o 409 e a retomada pelo marcador. A prova de "sem linha no fim"
  é a rota dos avisos apagando (teste unitário) mais a consulta no E2E.

## Reversal cost

Baixo: apagar a tabela e a rota de progresso; o app volta ao estado em memória. Nenhuma outra
tabela referencia `entry_progress`.

## Success metric

- Retomar a entrada em outro aparelho abre na etapa em que a pessoa parou (E2E do F01).
- Nenhum caminho do cliente escreve o rascunho: os testes negativos de INSERT, UPDATE e DELETE
  recusam com `42501`, e a leitura de outra pessoa devolve zero linhas.
- A purga da conta zera a tabela para o titular.

## Reopen condition

Um requisito de histórico da entrada, ou a decisão de manter o rascunho por mais de uma sessão
de onboarding com dado adicional — nesse caso o ciclo de vida volta à mesa.

## Approval

Decisão de implementação da entrada ligada ao banco (LAN-F01). Tomada por delegação do dono em
02/11/2026 ("Você pode tomar decisões R3, apenas me traga no final do trabalho para que eu
ratifique"). A revisão independente e o parecer do `security-auditor` não puderam ser produzidos
neste executor (não há outro modelo disponível); ficam pendentes e listados em
[RATIFICACAO.md](RATIFICACAO.md) para a ratificação do dono.
