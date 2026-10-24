# Lições do lote 4

Todo contrato futuro cola este arquivo no contexto da tarefa. Cada lição tem o
**sintoma** (o que se vê), a **causa** (por que acontece) e o **jeito certo**.
Onde o repositório já tem um exemplo, o caminho aparece em `código`.

O lote 4 gastou a maior parte do retrabalho em erros que o implementador não
podia ver: com quatro frentes em paralelo, ninguém subia banco nem e2e, e o
defeito só aparecia na integração. Duas defesas nasceram disso: o typecheck dos
specs e2e dentro do gate (§ Gate) e a fila de provas `scripts/agents/prova-fila.mjs`
— quem disputa o banco local e a porta 3000 passa por lá e espera a vez.

## Playwright e Material Web

1. **Valor de campo lido no lugar errado.**
   - Sintoma: `toHaveValue` no host do campo (`#campo`) recusa.
   - Causa: o Material Web renderiza o `<input>` dentro do shadow root; o host é só o wrapper.
   - Jeito certo: ler o valor em `#campo input`.
2. **`getByRole("button")` atravessa o shadow DOM.**
   - Sintoma: medir alvo de toque acha um `<button>` menor que o host, e o teste compara com o elemento errado.
   - Causa: a consulta por papel resolve o `<button>` interno do Material, que pode ter caixa menor que o host.
   - Jeito certo: medir o alvo no host (`md-filled-button`). O clique na borda do host funciona — provado no navegador.
   - `código`: `tests/e2e/landing-v8.spec.ts` (locators `md-filled-button`).
3. **Texto de apoio aparece duas vezes no DOM.**
   - Sintoma: o locator casa duas vezes e o modo estrito falha.
   - Causa: há uma cópia oculta em `slot=aria-describedby`.
   - Jeito certo: `.filter({ visible: true })`.

## Playwright e Next

4. **`getByRole("alert")` acha o anunciador de rota do Next.**
   - Sintoma: o alerta casa com `#__next-route-announcer__`, não com a mensagem de erro.
   - Causa: o Next marca o anunciador de rota como `role=alert`.
   - Jeito certo: ler o erro pelo id da área de erro (por exemplo `#en-err`) ou filtrar por texto.
   - `código`: `tests/e2e/ds-029-conformance-probes.spec.ts` (`getByRole("alert").filter({ hasText })`).
5. **Mock de rota com query precisa de `**` no fim.**
   - Sintoma: `**/auth/v1/signup` não intercepta e o pedido vaza para o provedor.
   - Causa: o `signUp` com `emailRedirectTo` manda `redirect_to` na query, e o glob sem `**` final não casa a URL com query.
   - Jeito certo: `**/auth/v1/signup**`.
   - `código`: `tests/e2e/recon-018-entrada.spec.ts` linha 181 — o padrão sem `**` só passa porque ali o pedido nunca chega ao provedor.
6. **Resposta dentro de `<details>` fechado fica oculta.**
   - Sintoma: a asserção da resposta falha mesmo com o texto no DOM.
   - Causa: `<details>` fechado esconde o conteúdo.
   - Jeito certo: abrir a pergunta antes de afirmar a resposta.
   - `código`: `tests/e2e/landing-v8.spec.ts` (lê `#perguntas details` e o atributo `open`).

## Helpers de e2e

7. **`signInAs(context, email)` recebe o `BrowserContext`, não a `Page`.**
   - Sintoma: `context.addCookies is not a function`, e só no navegador.
   - Causa: os cookies de sessão vivem no contexto; a função instala cookies em `context`.
   - Jeito certo: passar o `context` do teste (ou `page.context()`). O `typecheck:e2e` do gate pega isso antes de subir a stack.
   - `código`: `tests/e2e/helpers/session.ts` (`signInAs(context, email)`).

## pgTAP

8. **`select` solto no meio do arquivo vira "teste".**
   - Sintoma: linhas `ok` e números aparecem e o leitor de TAP conta como testes.
   - Causa: toda saída é TAP para o leitor.
   - Jeito certo: chamadas de preparo vão num `do $$ begin perform ...; end $$;`.
   - `código`: `supabase/tests/community-batch-approval.sql`.
9. **`UPDATE` dentro de subconsulta é recusado.**
   - Sintoma: erro de sintaxe/planejamento ao tentar atualizar dentro de um `select`.
   - Causa: não se aninha data-modifying statement em subconsulta.
   - Jeito certo: CTE no nível de cima — `with x as (update ...) select is(...)`.
10. **A pessoa da fixture precisa existir em `auth.users`.**
    - Sintoma: FK/insert falha, ou a RLS nega sem motivo aparente.
    - Causa: a persona ainda não é um usuário de verdade.
    - Jeito certo: inserir em `auth.users` antes de usá-la, com `reset role`.
    - `código`: `supabase/tests/community-join-reason.sql` (`reset role`), fixtures em `supabase/tests/fixtures/`.
11. **Uma exceção desfaz a transação inteira da chamada RPC.**
    - Sintoma: a "tentativa" inserida antes desaparece quando a RPC lança, e o teste não conta.
    - Causa: a exceção faz rollback de tudo o que a chamada tocou.
    - Jeito certo: limite de tentativa devolve status, não lança — padrão de `consume_verification_attempt`.
    - `código`: `supabase/migrations/20260815133000_verification_attempt_limit.sql`.
12. **Teste de limite não insere tentativas direto na tabela.**
    - Sintoma: contar linhas na tabela não reflete o fluxo real.
    - Causa: a contagem é gerida pela função, não pela escrita crua.
    - Jeito certo: chamar a função e contar as linhas que ela devolver.
    - `código`: `supabase/tests/verification-attempt-limit.sql`.

## Migrations

13. **Cada frente paralela usa uma faixa própria de horário no nome.**
    - Sintoma: duas migrations com o mesmo prefixo de timestamp colidem ao juntar as frentes.
    - Causa: faixas de horário sobrepostas no nome do arquivo.
    - Jeito certo: reservar uma faixa por frente (por exemplo `HH:00–HH:29` e `HH:30–HH:59`).
    - `código`: `supabase/migrations/` (nomes timestampados).

## Build do Next

14. **Rotas tipadas: `href` vindo de variável precisa do tipo `Route`.**
    - Sintoma: `tsc -p apps/web` passa, e o `next build` falha no `href`.
    - Causa: o Next valida rotas tipadas no build; o `tsc` sozinho não pega.
    - Jeito certo: `import type { Route } from "next"` e tipar o `href`.
    - `código`: `apps/web/app/(provider)/provider-shell.tsx`.

## Gate

15. **A varredura de segredos recusa constante com nome de senha.**
    - Sintoma: `PASSWORD = "..."` derruba o gate no estágio `secrets`.
    - Causa: a varredura casa pelo nome ligado ao valor (`password`, `secret`, `api_key`, `credential`), não pela forma do valor.
    - Jeito certo: usar nome neutro para a constante.
    - `código`: `tests/secrets-scan.mjs`.
16. **A regra de texto recusa escrever o sistema na tela.**
    - Sintoma: `copy-fala-com-a-pessoa` falha com texto como "o banco guarda só o hash".
    - Causa: texto de tela que explica o sistema em vez de falar com a pessoa.
    - Jeito certo: falar com quem usa; a explicação técnica vai em comentário.
    - `código`: `tests/unit/ui/copy-fala-com-a-pessoa.test.ts`.
17. **Specs e2e não passavam por typecheck.**
    - Sintoma: erro de tipo nos specs (`signInAs(page)` no lugar de `signInAs(context)`) só aparecia dentro do navegador.
    - Causa: `tests/e2e` não é workspace, então `tsc --noEmit` `pnpm -r` não o enxergava.
    - Jeito certo: o estágio `typecheck:e2e` do gate roda `tsc -p tests/e2e/tsconfig.json`.
    - `código`: `scripts/gate.mjs`, `tests/e2e/tsconfig.json`.

## Concorrência e atomicidade, para o desenho

18. **Várias escritas pela Data API não são uma transação.**
    - Sintoma: a primeira escrita entra e a segunda falha, deixando estado pela metade.
    - Causa: cada chamada é sua própria transação.
    - Jeito certo: o que precisa ser junto vai numa função do banco.
    - `código`: `supabase/migrations/20260825181742_provider_invitations.sql`.
19. **Contagem seguida de insert precisa de trava.**
    - Sintoma: dois pedidos simultâneos passam do limite contado.
    - Causa: ler e escrever em passos separados abre corrida.
    - Jeito certo: `pg_advisory_xact_lock`.
    - `código`: `supabase/migrations/20260825181742_provider_invitations.sql`, `supabase/migrations/20260923120000_service_request_open_cap.sql`.
20. **Retomada idempotente depois de recarregar a tela.**
    - Sintoma: quem recarrega no meio do fluxo volta ao começo, ou é movido para outro lugar.
    - Causa: a retomada não tem caminho próprio e reaproveita o início.
    - Jeito certo: um caminho real de retomada, que não move a pessoa de lugar.
## Provas de banco pela fila

O banco local e a porta 3000 são compartilhados entre as frentes. A fila (`scripts/agents/prova-fila.mjs`) trava
**um comando por vez**, então a sequência que precisa do banco num estado conhecido vai num comando só
(`scripts/agents/prova-sequencia.mjs`), dentro da fila:

```
node scripts/agents/prova-fila.mjs -- node scripts/agents/prova-sequencia.mjs banco
node scripts/agents/prova-fila.mjs -- node scripts/agents/prova-sequencia.mjs e2e tests/e2e/<spec>.spec.ts
```

- `banco`: reset sem seed e pgTAP. Nunca rode o reset e o `test:db` como dois comandos separados: entre eles, outra
  frente pode resetar o banco com as migrations dela, e o seu pgTAP roda no esquema errado (aconteceu no lote 5).
- `e2e`: reset com seed e Playwright nos specs dados, com as variáveis do banco local. O build do Next fica fora da
  fila (`npx pnpm@11.18.0 --filter web build`, com `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` de
  `npx supabase status -o env`).
- O `db reset` direto continua pedindo confirmação e, numa execução sem tela, é recusado. Os dois comandos exatos
  de reset pela fila seguem liberados para casos avulsos.

## Execução sem tela (OpenCode `run`)

Nunca rode comando em segundo plano (`&`, `nohup`, `Start-Process`) nem termine a resposta "esperando" um comando: a
execução sem tela acaba ali, o comando fica órfão segurando a fila, e a tarefa fica pela metade (aconteceu na
COM-003, lote 5). Rode as provas em primeiro plano e espere o resultado, mesmo que demore.

## Porta 3000 presa por servidor de outra frente

O Playwright reaproveita um servidor que já esteja na porta 3000 (`reuseExistingServer`). Um `next start` esquecido
por outra frente faz o e2e passar testando o build do outro worktree (visto na COM-003). O
`prova-sequencia.mjs e2e` encerra o que estiver na porta 3000 antes de subir o servidor, porque quem roda segura a
fila. Rode o e2e sempre por ele, nunca com o Playwright direto.
