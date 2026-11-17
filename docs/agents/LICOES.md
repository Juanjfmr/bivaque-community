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
21. **Posse derivada da sessão não é parâmetro — e o teto viaja com ela.**
    - Sintoma: a função privilegiada recebe `p_user_id` e cria em nome de quem chamou; a rota resolve a sessão e o banco não. Quando a função ganha `execute` para `authenticated`, o parâmetro vira escolha de qualquer chamador. E o limitador externo devolve "pode passar" quando falta configuração.
    - Causa: a autoridade ficou no chamador (rota), não no banco; e a janela do Upstash era a única barreira de um caminho que passou a ser alcançável pela Data API.
    - Jeito certo: `auth.uid()` com `28000` sem sessão na função pública; contagem e insert sob `pg_advisory_xact_lock` por titular; limitador ausente é 503, nunca livre; e as assinaturas antigas com id de titular saem com `drop function`, senão o buraco volta pelo grant esquecido.
    - `código`: `supabase/migrations/20261116221048_family_invite_session_ownership.sql`, `supabase/tests/family-invite-session-ownership.sql`.
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

## CI em dois tempos: fast por ciclo, completo no fechamento (RUN-147, 14/11)

Cada push em PR roda só o job `Fast checks` (install, lint, typecheck, typecheck:e2e, `pnpm test`,
varredura de credenciais) — ~1.5 min medido. O job completo ("Install, test, and build", com Supabase,
build, pgTAP, E2E) e os visuais (App mobile-first, HTML R72) só rodam com a label `ci:full` no PR,
push na main ou workflow_dispatch; `types: labeled` faz a aplicação da label disparar o run.

- **Rito de fechamento:** o coordenador aplica `ci:full`, confirma que os runs apareceram (label
  inexistente falha silenciosamente — a label já existe no repo), espera o completo verde no MESMO
  SHA que será mergeado, registra run-id/SHA no cartão, e só então mergeia. PR sem label é ciclo em
  andamento, não está apto a merge. Não há branch protection: a trava é o rito (ADR-20261114,
  alternativa 4; o quadro envia direto para main e a protection bloquearia esse caminho).
- **Flaky conhecido:** se o completo cair só no `group-admin-cycle.spec.ts:120` (@stateful) com a
  assinatura Kong↔PostgREST (502, testemunha RUN-145 no kong-errors.log), é o
  CI-E2E-UPSTREAM-INSTAVEL: confira a testemunha, registre a ocorrência no cartão e aplique
  `gh run rerun <id> --failed` (contorno sancionado pelo dono em 13/11). Não blame o diff antes de
  conferir a causa — o rerun mantém o mesmo SHA.
- Decisão, alternativas e riscos: ADR-20261114 (R3 por delegação, instrução direta do dono de 14/11).

## Fechamento de lote: prova local antes do ci:full (14/11)

Antes de aplicar a label `ci:full`, rode local no HEAD final: `pnpm test` (suíte raiz COMPLETA,
nunca um subconjunto), `pnpm --filter web exec next typegen` seguido de `pnpm --filter web typecheck`
(typed routes do Next: o typecheck da raiz usa `.next/types` velho e não pega href que saiu do
union), e `gate --fast`. Só então aplique a label e empurre o commit condicionado ao gate verde.
O completo no CI é a prova final, não a primeira linha de defesa: cada tentativa gasta ~20 min
(lição do LT-007: 3 tentativas por link para tela morta, unitário esquecido e typed routes).

## Troca de lista: inventário de links na mesma unidade (14/11)

Toda troca de rota de lista (LAN-TROCA) inclui, na mesma unidade de trabalho:

1. Inventário EXAUSTIVO de quem linka a rota na web — grep sem truncar resultado, todos os
   padrões: `href="`, `href:`, `action="`, `router.push`, templates com query. Os links da lista
   migram DIRETO para o app (molde LT-005); o 307 fica para URLs externas/bookmarks. Proibir a
   migração do link é manter um link para tela morta (erro do contrato LT-007, emendado).
2. O rastreador de links NÃO conhece 307 de página removida: a lista `redirecionadas` do
   `buildPatterns` só reclassifica páginas que ainda existem. Link web para tela morta vira
   "rota inexistente" no link-crawl (aconteceu com o Salvos → /guide?q= no LT-007).
3. Unitários que assertam o href migram junto, e a prova é a suíte raiz completa — não o arquivo
   que se lembrou de rodar (city-reference.test.tsx ficou para trás na 1ª rodada do LT-007).
4. `next build` roda typecheck com typed routes: href novo fora do union (ex.: `/app/guia`, que é
   rewrite do SPA) exige `as Route` (padrão do repo). Verifique com `next typegen` + typecheck da
   web, não com o typecheck da raiz. Desde 14/11 o `next typegen` roda DENTRO do script typecheck
   da web — o fast CI pega essa classe em ~1.5 min, não no build de 20 min.
5. As subrotas que FICAM na web perdem a porta da lista que saiu (ex.: `/guide/[id]` e
   `/guide/sugerir` eram linkados pela lista `/guide`). Declare-as em `PORTAS_FORA_DO_LINK`
   (`dependeDeDados:true` se o alcance depende de dado/fluxo; sem o flag se é dívida pura), senão
   o `semPorta` do link-crawl derruba o completo. Lição da 4ª tentativa do LT-007.

## Processo enxuto: onde o rigor paga e onde é cerimônia (14/11)

O retrabalho do LT-007 (3 tentativas de completo) veio de prova local incompleta e contrato com
lacuna, não do rigor. O completo no fechamento PEGOU a regressão do link-crawl — cortá-lo trocaria
tempo por defeito embarcado. A rede fica; a cerimônia sai:

- Lote R0 mecânico (sem comportamento de produto, sem fronteira de confiança: pin de runner,
  fiação de workflow, script de 1 linha) dispensa revisão por outro modelo — a matriz já permite.
  Verificação do coordenador + CI bastam. Não classificar infra como R2 por hábito (RUN-146 era R0).
- R3 de verdade (RLS, dado pessoal, auth, migração destrutiva) mantém revisão + security-auditor.
  Elevação por palavra-chave incidental (ex.: "secrets" no nome de um step) não cria decisão nova:
  citar o ADR existente, não escrever outro (ADR-20261105 já diz isso).
- Evidência no quadro: 1-2 linhas (o que rodou, SHA, resultado). Um push de quadro por fechamento,
  não por evento. Contratos e pareceres no tamanho que os campos exigem, sem ensaio.
- Não re-rodar local o que o CI já provou no mesmo SHA.

## CI rápida: o que ficou medido (14/11)

Fechamento do lote: ~45 min -> ~11 min (4x), alvo 8-12 atingido.
- Fast por ciclo: ~1.5 min (RUN-147; completo só no fechamento pela label ci:full).
- Visual do app: 32 -> 7.8 min, sharding por arquivo `--shard=N/7` em runners isolados,
  sem Supabase (RUN-149). **workers>1 NÃO funciona**: o scaffold modo-de-prova compartilha
  estado entre specs (o spec de paginação colidiu). Sharding por arquivo respeita o guard
  app-suite-ci; `--project` não (o guard proíbe recorte).
- Full: 17-21 -> 11 min, stateful por viewport em 3 runners com bancos Supabase
  independentes (RUN-150). Serial dentro do viewport preserva a separação das mesmas
  linhas; bancos separados eliminam a colisão cross-viewport.
- Gargalo restante: ci-core ~11 min (setup da stack ~5 min + E2E comuns). Próxima alavanca
  seria shardar os comuns ou reduzir setup — retorno decrescente, só se o dono pedir.
- Piso por runner: o setup da stack (~5 min) não some; paralelizar troca minutos de runner
  por wall time. ECR rate-limita com muitos pulls concorrentes (backoff + Docker Hub fallback).

## Jornadas em paralelo: o que o lote de 15/11 ensinou

- Lote que mexe em spec Playwright exige E2E real no CI antes de declarar pronto: `typecheck:e2e`
  não pega quebra de runtime. F04 (etiqueta Resolvida), F08 (nome do verbete no h1, reduced-motion
  da folha que virou rota) e F04-6 (locator Fechar ambíguo) só apareceram no E2E do CI. Ler o spec
  e alinhar à estrutura real ajuda, mas a prova é o navegador.
- Branches paralelos que mexem no `TOTAL_DE_ROTAS` (`apps/web/lib/security/api-surface.ts`)
  precisam re-sync após merges: o CI do PR roda no merge com a main, então a contagem inclui rotas
  de outros lotes já mergeados. F08 precisou bumpar 86→87 depois que a main ganhou a rota
  `resolucao` do F04. Merge da main + reconferir a contagem antes do push final.
- Executores DeepSeek em worktree novo param depois de escrever o código, antes de validar (o
  `pnpm install` demora e o turno encerra). Retomar com um executor de conclusão no mesmo worktree
  (lê `git status`/`diff`, roda a validação, commite). Não reescrever o código do zero.
- Locators: `getByRole` name é substring por padrão — "Fechar" casa a alça "Arrastar para fechar"
  também (strict mode violation); usar `exact:true`. E `getByText` com `exact:true` falha quando o
  elemento carrega o ícone como ligadura no textContent ("check_circleResolvida").
- Ressalva de revisão não é fato até confrontar o código: a nota "RPC não limpa resolved_reply_id"
  do RUN-153 não se confirmou — a migration vigente já limpa. Registrar resíduo sem verificar
  criaria card falso.
- E2E real que falha: baixe o trace do CI (`gh run download … -n playwright-artifacts-stateful-…`)
  e leia a sequência de rede antes de culpar a implementação. No RUN-157 o trace provou que o
  sign-out funcionava (200, cookie Max-Age=0, porta renderizada); o defeito era a ÚLTIMA asserção
  do teste, que escolheu a rota errada.
- Para provar "sem sessão, rota protegida devolve à entrada", use rota AINDA gateada na web
  (/community), não rota trocada: /configuracoes/familia tem redirect de troca para /app/voce
  (público, next.config.ts:128), que carrega sem sessão. Redirect de troca é incondicional; a
  prova de portão exige rota não-trocada.
- board.json: as chaves do card vêm em ordem não-padrão (proof pode estar ANTES do id). Leia o
  objeto INTEIRO antes de acrescentar campo — proof duplicado passou pelo board.mjs (JSON.parse
  fica com o último valor e descartou o histórico) mas o biome noDuplicateObjectKeys pegou, e
  derruba o gate de todos os PRs. Rode biome check no board.json antes de todo push de quadro —
  inclusive quando o card é escrito por script em lote (JSON.stringify ≠ formato biome; 16/11,
  o próprio autor da lição violou no batch de fechamento e todos os PRs seguintes falharam fast).
- E2E com sobreposição (folha/modal): o app RESTAURA o estado da sobreposição no reload. Se o teste
  deixa a folha aberta e dá reload, ela reabre restaurada e o Radix põe aria-hidden no fundo — o
  heading da tela some do getByRole e a asserção estoura por timeout. Feche a folha e espere o
  DialogContent desmontar ANTES do reload; e limpe o estado gravado (ex.: interesses) no afterEach,
  senão vaza para o retry. E o botão Fechar da folha exige exact:true (a alça Arrastar para fechar
  casa por substring). RUN-160, reincidência de lições já pagas — executor escreve E2E sem rodar.
- Campo aditivo de contrato (ex.: autorId) que torna o parser do cliente estrito: o campo precisa
  entrar em TODOS os caminhos que devolvem o objeto parseado — inclusive POST/PATCH de escrita, não
  só o GET. No RUN-161 o POST do comentário não devolvia autorId, o parser lançava foraDoContrato e
  o comentário não aparecia no fio (f04-grupos vermelho, consistente em 2 runs). Ao adicionar campo
  a um parser, varra as rotas de escrita que devolvem aquele objeto; teste de mutação prova o furo.
- Parser do task-contract (subconjunto deliberado de YAML): item de lista quebrado em duas linhas
  engole o resto do arquivo — os campos somem com erros "campo obrigatório ausente" sem apontar a
  linha; e aspas duplas em linha de comentário de cabeçalho viram conteúdo e estouram "esperava
  chave: valor". Cada `- ` em uma linha; comentários sem aspas. Paga 3× em 16/11 (CIDADE, RUN-169,
  RUN-170).
- Search do roteador: valores numéricos viajam como números. O serializador padrão do TanStack
  entre aspas em strings que parecem número (preserva o round-trip de tipo), e o link do alerta
  virou `quartos=%222%22` — invisível no app (o parser aceitou os dois formatos), visível no CI
  @stateful que assertou o endereço cru. Nunca pré-String() um número destinado ao search; o
  inverso (leitura tolerante a string e número) continua obrigatório. RUN-171, 42f80426.
- Item de menu que abre sobreposição: NÃO abrir a nova folha no mesmo clique que fecha o menu —
  o fechamento do Radix Menu é um history.back() da entrada, que popa a sobreposição recém-aberta
  (o gesto de bloquear nunca abria a confirmação; trace do CI: click sem after, 180 s pendurado).
  Troque a sobreposição da entrada (menu-de-linha → confirmacao) em vez de empilhar. RUN-165.
- E2E @stateful em persona semeada não pode assertar tela VAZIA quando o seed já dá linhas àquela
  persona: "Ninguém bloqueado" após desbloquear era mentira por construção — seed.sql:1758 já
  bloqueia alguém para o membro do teste. Asserte a SUA linha sumindo (contagem antes/depois) e o
  efeito no servidor (POST 201), nunca a vacuidade da tela. RUN-165.

## Falhas que fingem ser de viewport (16/11, RUN-178)

- Teste que quebra SÓ em desktop-1440 não é layout até provar. No f04-grupos-real a causa era
  `PGRST201` (embed ambíguo): `recommendation_requests` aponta duas vezes para
  `recommendation_replies` (respostas + `last_resolved_reply_id`), então `recommendation_replies(count)`
  sem dica de FK devolve 300/503. Por que "só desktop": o reload do cache de schema do PostgREST
  depois do reset decide quando a segunda FK passa a ser vista — ordem dos projetos na fila do CI,
  não viewport. Jeito certo: qualificar o embed pela FK (`recommendation_replies!recommendation_replies_request_id_fkey(count)`),
  e reproduzir local em outro project antes de culpar o breakpoint.
- Reset local como `postgres` mascarou grants que o CI NÃO tem: as *default privileges* do schema
  public deram DELETE ao `service_role` em `recommendation_requests`, e a limpeza do E2E por REST
  passou local / quebrou no CI (42501). O estado de grants do CI é o que as migrations concedem
  (20260821000033:32-38: service_role só SELECT/UPDATE(is_deleted)). Regra: limpeza de fixture de
  E2E usa a SESSÃO DA PESSOA AUTORA sob RLS (molde `apiForSession` + `recommendations_requests_delete_own`),
  nunca `service_role`; e antes de confiar em prova local de permissão, confirme que o banco local
  foi reconstruído pelo mesmo caminho do CI. RUN-178, corrida 43869129000.
- PgTAP LEGADO que contradiz regra nova é drift de prova, não cobertúra a preservar: o teste 10 de
  `recommendations-scope-denials.sql` exigia 23514 para origem dupla — exatamente o que o
  ADR-20261024 §1 passou a PERMITIR. Reescreva para o que a regra nova veta (os mesmos casos pela
  policy, 42501) e mantenha "nenhuma origem" 23514 como defesa em profundidade; nada de apagar o
  teste para o verde. RUN-178.
- Endpoint de merge do GitHub (GraphQL e REST) pode devolver 502 por minutos enquanto leituras
  funcionam. O laço `gh api -X PUT /pulls/N/merge -f sha=…` com retry venceu onde `gh pr merge`
  desistiu (#253, tentativa 5/8). Nunca assuma que o merge falhou porque o comando falhou: confira
  `state`/`mergeCommit` antes de repetir.

## Ícones Material Symbols no app (16/11, RUN-173)

- `bookmark_border` NÃO é glifo separado no Material Symbols moderno: é LIGADURA que resolve para o
  glifo `bookmark`; o "cheio" é o eixo variável `FILL` (0..1), que o subset já traz (gvar). Trocar o
  nome do ícone não muda um pixel — o consumidor precisa acionar o eixo (classe
  `.bv-icone-preenchido` / `font-variation-settings: "FILL" 1`, via `aria-pressed` nos botões
  compartilhados). Antes de "regenerar a fonte", meça com fontTools na fonte oficial e no subset: a
  woff2 pode estar certa e o bug no consumidor. Risco registrado: se alguém "otimizar" a woff2 para
  instância estática, o spec de pixels (salvar-glyph.spec.ts) é quem grita.
- Se a correção mora no componente compartilhado (`components/bivaque/`), o contrato precisa listar
  esse path — emenda ANTES de escrever (ressalva de revisão #256: divergência aceita, registrada no
  PR e no card; regra da casa: ícone cheio só quando ligado, vale para todo toggle com estado).

## Quadro: escrita só pelo `board.mjs --apply` (16/11, HRN-001)

`--apply <patch.json>` cria, atualiza, move, anota e marca checklist; valida com as regras do
`--check`, grava no formato do biome e regenera o BOARD.md numa passada atômica. Script avulso para
editar o board.json é proibido — foi de onde saíram 39 scripts descartáveis e 58 de 161 commits.

## "Deixa para o CI" tem fronteira (16/11, RUN-177 round 2)

- Interface NOVA não se prova no CI. A lane F07 escreveu telas + stubs + bloco @stateful sem rodar
  navegador (portas emprestadas), declarou "provado no CI, precedente #254" e o CI devolveu 8 specs
  vermelhos × 3 projects: CTA que virou `<a>` (spec buscava button), `minLength` nativo barrando o
  submit ANTES da validação que dá a frase, duplo fechamento de AlertDialog (duas voltas no
  histórico, a tela saía antes do aviso) e token `--on-primary` INEXISTENTE com contraste 1:1
  — três eram bug de tela que unit nenhum pega. O precedente #254 valia para mecanismo de teste,
  não para UI nova. Jeito certo: sem stack/portas, a lane NÃO empurra UI nova para o CI como
  primeira execução; espera a janela, prova nas 3 larguras, e só então push.
- "Zero importador vivo" mede-se contra os SPECS E2E ATIVOS, não só contra imports de produto: o
  /explorar/servicos do F07 tinha importador vivo (busca global web + atalho do Início + 24 e2E)
  que o grep do lote não olhou; o CI achou. Antes de matar rota, roda o spec que a exerce (ou
  declara por que ele morreria junto).
- Reset com seed NÃO viaja entre branches: a lane que devolve "banco com seed" semeou o schema do
  PRÓPRIO branch; a lane seguinte herdou um banco sem a migration dela e interpretou 503 como
  defeito alheio. Estado = branch + seed + migrations daquele branch; cada lane de banco dá o seu
  reset, sem exceção, mesmo quando "acabaram de devolver limpo".
- O grant por coluna virou prova ele mesmo: `select=*` de authenticated em `listings` passa a
  responder 42501, e helper de E2E que fazia `select=*` quebrou primeiro que qualquer asserção —
  ao revogar leitura por coluna, varre os HELPERS de teste (e aproveita: a tentativa vira o
  negativo do contrato, como em f03-criar-real).

## Merge só pelo `merge-seguro.mjs` (16/11, HRN-005)

- **Faça o merge sempre por `node scripts/agents/merge-seguro.mjs <numero-do-PR>`**, nunca à mão
  com `gh pr merge`: o script confere pela API que o SHA do head tem o PR CI completo (job
  `ci-core`) e o Visual Smoke verdes — ou o Visual pulado por paths, quando o PR não toca
  `apps/app` — e só então mergeia por squash amarrado ao SHA completo. O rito do ADR-20261114
  segue valendo (aplicar `ci:full`), mas a conferência deixou de ser memória: os 4 merges com
  Visual vermelho da janela de 16/11 (#240, #241, #244, #245) passaram justamente onde havia só
  rito.
