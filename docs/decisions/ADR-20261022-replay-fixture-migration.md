---
id: ADR-20261022-replay-fixture-migration
status: approved
risk: R3
owner: Juan
approved_at: 2026-10-22
critic_verdict: PASS
critic_review: replay_review e replay_security aprovaram o lote integrado em 2026-10-22; runtime e CI permanecem provas separadas.
---

# Exceção pontual: retirar personas fictícias da migration de dados

## Problema e evidência

O replay vazio falha em `20260901124400_member_suspended_seed.sql`, SQLSTATE
23503: a participação referencia a comunidade criada somente por `seed.sql`,
executado depois das migrations. CI do commit `2d24c85c` reproduziu a falha:
https://github.com/Juanjfmr/bivaque-community/actions/runs/39815096581.
O banco local já registra essa versão como aplicada. Uma migration posterior
não é alcançada no replay vazio.

## Decisão

Exceção exclusivamente para `20260901124400_member_suspended_seed.sql`:
preservar arquivo e timestamp, substituindo os INSERTs de contas fictícias
por comentários sem execução. O original continua auditável no Git, commit
`bb6803ff`, blob `5d19cad3ce84c8d6c046d4259848364c8ba2fef6`.

Não alterar `20260901124348_account_suspension.sql`, schema, RLS ou ledger.
Não apagar contas existentes nem executar reset fora da stack local isolada.
O seed mantém sua persona de desenvolvimento `…0099`, sem adicionar `…009a`.
O E2E de negação atual
usa a conta fictícia dono-vila e reverte a suspensão no cleanup.

## Alternativas e referência

1. Migration posterior: preserva o histórico, mas não corrige o replay interrompido.
2. Comunidade fictícia anterior ou seed antecipado: levaria dependência de testes
   ao caminho de produção; recusada.
3. Squash e baseline novos: suportados, mas mudam todo o histórico ativo e exigem
   reconciliar os ledgers; escopo maior que o defeito.
4. Tombstone pontual autorizado: menor mudança; adotada.

Referência: https://supabase.com/docs/guides/deployment/database-migrations
e https://supabase.com/docs/reference/cli/supabase-migration-squash.
Desvio explícito: exceção à imutabilidade de uma única migration de dados de teste;
a regra geral de migrations aplicadas permanece.

## Riscos, reversão e critérios

O replay destravado revelou três falhas preexistentes em 1132 asserts: duas
expectativas exatas de colunas omitem `is_suspended` e uma publicação é aceita
em vínculo somente leitura. As expectativas serão reconciliadas ao schema
aprovado. Uma **nova** migration aditiva restaurará autoria e escopo de escrita
em posts/reações, preservando o veto de suspensão. Esse reparo executa as regras
já aprovadas em ADR-20260816-transferencia-e-pertencimento e
ADR-20260901-account-suspension; não amplia a exceção sobre migrations antigas.

Bancos que já aplicaram o SQL conservam suas contas fictícias; esta decisão não
autoriza removê-las. Restaurar o conteúdo pelo Git reintroduz o defeito no replay.
O timestamp não muda e nenhum ledger é reparado ou marcado como revertido.

Sucesso: startup e reset vazio sem seed, pgTAP, reset com seed, E2E e CI da
revisão entregue. Reabrir se surgir dependência das duas personas antigas ou
diferença de schema/permissões em relação à migration de suspensão aprovada.

## Aprovação

Juan autorizou em 22/10/2026 nesta conversa a pergunta que citava explicitamente
a regra “Never edit an applied migration”, respondeu **“Autorizar a exceção
pontual”** e aceitou manter arquivo/timestamp, retirar somente INSERTs de contas
fictícias e não alterar schema/RLS. O pedido anterior “Vai” não foi usado como
aprovação implícita dessa exceção. Revisão independente permanece obrigatória.
