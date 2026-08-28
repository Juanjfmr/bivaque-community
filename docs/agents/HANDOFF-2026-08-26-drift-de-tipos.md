# Handoff — drift de tipos gerados (contrato `RUN-001`)

**Para:** quem executar na máquina do dono do repositório (Docker + Supabase de pé).
**Contrato:** [`docs/agents/tasks/RUN-001.task.yml`](tasks/RUN-001.task.yml).
**Data do diagnóstico:** 26/08/2026, sobre a execução de CI de 24/08.

## O que está quebrado

O passo `Check generated types drift` do `pull-request-ci.yml` faz duas coisas:

```yaml
- name: Check generated types drift
  run: |
    pnpm generate:types
    git diff --exit-code -- supabase/database.generated.ts
```

Regenera o arquivo a partir do banco local e falha se o resultado diferir do que está
versionado. Hoje difere. O passo sai com `exit 1` e **os seis passos seguintes são
pulados** — `db:reset`, `test:db`, `db:lint`, instalação do Chromium, o segundo reset e
o `test:e2e`. Nada disso chega a rodar.

Isto está no `main`. Não é falha de PR nenhum: todo PR aberto herda o vermelho.

## A evidência

Run [`32741062495`](https://github.com/Juanjfmr/bivaque-community/actions/runs/32741062495),
job `97475371836`, passo 14, 24/08 às 14:53Z. Head `f946b935` — PR do dependabot, base
`main`. O passo imprimiu o diff do próprio gerador:

```diff
--- a/supabase/database.generated.ts
+++ b/supabase/database.generated.ts
@@ -1370,7 +1370,10 @@ export type Database = {
-      complete_event: { Args: { p_event_id: string }; Returns: undefined }
+      complete_event: {
+        Args: { p_caller_user_id?: string; p_event_id: string }
+        Returns: undefined
+      }
@@ -1430,7 +1433,12 @@ export type Database = {
       decide_verification_document: {
-        Args: { p_decision: string; p_document_id: string; p_reason: string }
+        Args: {
+          p_decision: string
+          p_document_id: string
+          p_operator_user_id: string
+          p_reason: string
+        }
         Returns: undefined
       }
```

As duas migrations que produziram a diferença já estão no `main`:

| Função | Migration | O que mudou |
|---|---|---|
| `complete_event` | `20260822015000_fix_complete_event_caller.sql` | ganhou `p_caller_user_id uuid default auth.uid()` |
| `decide_verification_document` | `20260821000040_decide_verification_document_fix.sql` | ganhou `p_operator_user_id uuid` |

Conferido também no arquivo versionado: em `origin/main`, a linha 1373 de
`supabase/database.generated.ts` ainda diz
`complete_event: { Args: { p_event_id: string }; Returns: undefined }`.

## Duas coisas que este diagnóstico corrige no registro anterior

1. **O rate limit do registry não é mais o bloqueio.** A CLI do Supabase tenta de novo
   sozinha — no log de 24/08 ela levou `toomanyrequests: Rate exceeded` puxando o
   `studio`, repetiu depois de 4s e o pull passou. O `postgres-meta` baixou inteiro.
   O relato anterior, de que a CI estava parada por rate limit, ficou obsoleto.
2. **A falha de 22/08 e a de 24/08 são passos diferentes com a mesma aparência.** Em
   22/08 o `generate:types` morreu no pull da imagem (`exit 125`). Em 24/08 ele rodou
   até o fim e o que falhou foi o `git diff --exit-code`. Só a segunda é determinística,
   e é a que importa.

## Como executar

O gerador precisa de um banco com **todas** as migrations aplicadas — senão ele produz
um arquivo que reflete um schema parcial, e o drift troca de forma em vez de sumir.

```sh
git checkout main && git pull origin main
npx pnpm@11.18.0 exec supabase start
npx pnpm@11.18.0 db:reset
npx pnpm@11.18.0 generate:types
git diff -- supabase/database.generated.ts     # olhe antes de commitar
npx pnpm@11.18.0 gate
```

O `git diff` deve mostrar as duas entradas acima. Se mostrar mais, isso é informação,
não obstáculo: outras migrations entraram no `main` desde 24/08 e o gerador está certo.
Se mostrar **menos** — ou nada —, o banco não tem todas as migrations aplicadas; refaça
o `db:reset` antes de concluir qualquer coisa.

Commit sugerido:

```
fix(types): regenerar database.generated.ts — complete_event e decide_verification_document
```

## O que o contrato proíbe, e por quê

- **Editar o arquivo à mão.** Ele é saída de gerador. Um arquivo que "parece certo" mas
  não é o que o gerador produz falha o `git diff --exit-code` do mesmo jeito, e aí o
  próximo executor perde o dia procurando um bug que é de digitação.
- **Gerar schema além de `public`.** O script já restringe; a regra existe para que
  ninguém "melhore" o comando.
- **Mexer em migration aplicada** para fazer a assinatura casar com o arquivo velho.
  Isso inverte a fonte da verdade — o schema manda, o arquivo obedece.
- **Relaxar o passo de drift no workflow.** Foi ele que encontrou o problema.

## Depois que isto entrar

O PR #29 (`claude/bivaque-agent-architecture-ajcj7i`) está quinze commits atrás do
`main` e continua vermelho enquanto o `main` estiver. Passos, nesta ordem:

1. `RUN-001` mergeado no `main`.
2. `git merge origin/main` no branch do #29 e push — é assim que ele pega a correção.
3. A CI então alcança o `test:e2e` pela primeira vez desde 22/08, e aí se vê o que
   sobrou das dezoito falhas da triagem `E2E-001`. O kanban já marca `:64`, `:68` e
   `:92` como fechadas, então a contagem esperada mudou — **não** presuma 18.

O passo 2 é merge, não rebase: o branch é compartilhado e reescrever histórico dele
invalida qualquer checkout que exista por aí.
