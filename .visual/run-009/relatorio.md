# RUN-009 — F08 Guia ligado ao banco (05/11/2026)

Branch `feat/f08-guia`, base `main` (`8bba9ed8`). Executor: OpenCode (DeepSeek V4.1 Flash).
Contrato: `docs/agents/tasks/RUN-009.task.yml`. Quadro e `RATIFICACAO.md` não foram tocados.

## O que entrou

**Servidor — `apps/web`**

- `lib/guide/app-guia.ts`: régua única da rota (categorias do enum, termo de busca com a
  sintaxe do PostgREST removida, cursor opaco `nome|id`, corpo da sugestão com limites do banco).
- `app/api/app/guia/route.ts` — `GET` do diretório da cidade do vínculo `current`: busca (`q`),
  categoria, keyset por `(name, id)`, limite 20/50, marca `salvo` lendo `guide_entry_saves`.
- `app/api/app/guia/[id]/route.ts` — `GET` do verbete: entrada aprovada visível, `salvo` e
  `podeSugerir` (artigo publicado).
- `app/api/app/guia/[id]/salvo/route.ts` — `PUT`/`DELETE` do marcador, com o usuário da sessão.
- `app/api/app/guia/[id]/sugestao/route.ts` — `POST` em `guide_correction_requests`; sem artigo
  publicado responde `400 sem-artigo` em vez de gravar linha órfã.
- Todas usam `exigirSessao`/`conferirEscrita`/`opcoesDoApp`, o cliente Supabase **da sessão** e
  importam `ehUuid`/`cidadeDaSessao`/`interpretarErroDoBanco` de `eventos/_comum` (sem editar o F05).
  Erro de banco nunca vira lista vazia; a mensagem do Postgres não é devolvida.

**App — `apps/app`**

- `lib/dados/guia.ts`: porta da jornada pelo cliente único (`ler`/`enviar`), com `AbortSignal`;
  resposta fora do contrato sobe como `FalhaDaApi`, categoria desconhecida não vira chip inventado.
- `src/telas/Guia.tsx`: diretório real com busca (debounce de 300 ms), chips de categoria,
  "Ver mais" por cursor, carregando/vazio honesto/filtro sem resultado/erro com "Tentar de novo"/
  sessão vencida/negado. A folha do verbete abre pelo nome da referência.
- `src/guia/Verbete.tsx`: leitura do verbete, salvar/remover mostrando o estado gravado e
  sugestão de atualização; falha mantém o estado anterior com a frase do motivo.
- `src/guia/comum.ts`: rótulo/ícone das categorias, limites da sugestão e frases de falha.

**Provas**

- `tests/unit/app-api/guia/rotas.test.ts` (31 casos): 401 sem sessão, 403 de origem/cabeçalho,
  400 de corpo/parâmetro, 404 de inexistente, `23505` como sucesso, 403 de RLS sem eco, 503.
- `tests/unit/app-api/guia/app-guia.test.ts` (9 casos): sanitização do termo, cursor, sugestão.
- `apps/app/tests/guia-dados.test.ts` (11 casos): caminhos, métodos, corpo e contrato da resposta.
- `tests/scope/app-porta-de-dados.test.mjs` (+4): telas do guia não usam `dadosDoApp`; rotas do guia
  sem `clienteDeServicoOuNulo`; toda escrita com `conferirEscrita`; cidade/id reusados de `_comum`.
- `tests/e2e/f08-guia-real.spec.ts` (5 cenários × 375/768/1440): diretório/busca/categoria/verbete,
  marcador que sobrevive ao reload (lido de volta do PostgREST), "sem artigo" declarado,
  servidor fora com "Tentar de novo", e membro de outra cidade (lista vazia + save 403 + 401 sem sessão).

## Commits

| commit | conteúdo |
|---|---|
| `3c9e9331` | `feat(guia): rotas do app para o diretório, o marcador e a sugestão` |
| `da42282b` | `feat(guia): tela do guia lendo o diretório real e guardando o marcador` |
| `fb4cc4f0` | `test(guia): jornada real em 375/768/1440 com gravação e negação` |
| `ecda4d43` | `fix(guia): folha do verbete abre pelo nome, sem sobreposição duplicada` |

## Números (rodados nesta sessão)

- `npx pnpm@11.18.0 gate --fast` → **verde** (lint, typecheck, typecheck:e2e).
- `npx pnpm@11.18.0 --filter @bivaque/app build` e `app:export` → verde.
- `npx pnpm@11.18.0 exec vitest run tests/unit/app-api/guia` → **35 passed**.
- `npx pnpm@11.18.0 test:unit` (suíte completa de unidade) → **2139 passed / 213 files**.
- `npx pnpm@11.18.0 --filter @bivaque/app test` → **245 passed / 24 files**.
- `npx pnpm@11.18.0 --filter web test` → **19 passed**.
- `npx pnpm@11.18.0 test:scope` → **194 passed / 0 fail** (4 são as provas novas do guia).
- E2E `tests/e2e/f08-guia-real.spec.ts` → **15 passed** (5 cenários × mobile-375, tablet-768,
  desktop-1440), capturas em `.visual/run-009/*.png` (claro e escuro).

## O que não rodou, e por quê

1. **`node scripts/agents/prova-fila.mjs -- node scripts/agents/prova-sequencia.mjs e2e
   tests/e2e/f08-guia-real.spec.ts` — bloqueado antes do reset.** O `npx supabase db reset --local`
   falha nesta máquina:

   ```
   failed to inspect container health: error during connect:
   open //./pipe/dockerDesktopLinuxEngine: Access is denied.
   ```

   (o CLI do Supabase, compilado em Bun, não abre o named pipe do Docker Desktop; `docker ps` e o
   `psql` dentro do contêiner funcionam). Tentativas com `DOCKER_HOST=npipe:////./pipe/...` e com
   `USERPROFILE`/`DO_NOT_TRACK` não mudaram o resultado.)

   Para não entregar sem prova de runtime, o E2E rodou **direto**: o stack local já estava com o
   seed aplicado (`arrival_guide_entries` = 6, `auth.users` = 875, `guide_articles` = 0), e as
   variáveis vieram do `docker inspect`/`psql` (API em `127.0.0.1:55321`). Comando:

   ```
   npx pnpm@11.18.0 app:export
   NEXT_PUBLIC_SUPABASE_URL=… NEXT_PUBLIC_SUPABASE_ANON_KEY=… USER_PASSWORD=… \
     npx pnpm@11.18.0 exec playwright test tests/e2e/f08-guia-real.spec.ts --workers=1
   ```

   Consequência: o E2E provou o caminho contra o seed existente, **não** contra um reset limpo desta
   revisão. O reset continua sendo prova devida no lote do coordenador.
2. **Banco (`db reset --no-seed`, `test:db`, `db:lint`) não rodou** — nenhuma migration foi criada
   ou alterada neste contrato, e o reset está bloqueado pelo mesmo erro acima.
3. **Revisão independente não rodou.** Os subagentes de revisão falharam por configuração de modelo
   (`variant unavailable … .flash: max`) e depois por saldo (`Insufficient Balance`). O veredito
   abaixo é do próprio executor, não vale como revisão.
4. **Sugestão com gravação real (201) não teve prova de runtime**: o seed não tem `guide_articles`
   (`0` linhas), então o E2E só prova o estado honesto "sem ficha publicada" (`400 sem-artigo`).
   O caminho 201/403/503 está coberto por unidade; a prova viva precisa de um artigo publicado no
   seed ou de um passo de curadoria no teste.
5. **`Salvos.tsx` não foi tocado.** A aba "Guia" de Salvos não está no aceite do contrato; ficou de
   fora para não virar escopo novo.
6. **Telas antigas de `apps/web/app/(shell)/guide` não foram retiradas.** É critério de fechamento
   do card (item 6), fora do aceite desta execução; nenhum redirecionamento foi alterado.

## Observações para o coordenador

- **Política real do banco:** `arrival_guide_entries` hoje tem leitura nacional
  (`private.is_locality_member(...) OR private.has_current_locality()`), diferente do texto antigo do
  AGENTS. Por isso o verbete de outra cidade abre (200), mas salvar/sugerir é da cidade (403 da RLS).
  O diretório continua recortado pela cidade do vínculo `current`, como o F05. Os testes de unidade e
  o E2E refletem esse estado — se a intenção for leitura só da cidade, é mudança de policy, não de rota.
- **Voltar não fecha a folha do verbete:** a sobreposição foi aberta por estado local, como o
  formulário de encontro do F05, porque o id de história `folha` é desenhado pela casca
  (`src/casca/Sobreposicoes.tsx`) e abriria uma segunda folha vazia. Igualar o F05 foi a escolha;
  fechar o diálogo com o Voltar do sistema exige um id de sobreposição próprio em
  `lib/navegacao/entrada.ts` e `Sobreposicoes.tsx`, fora dos caminhos permitidos deste contrato.
- **Custo:** 4 arquivos de rota + 2 módulos + 2 telas + 5 arquivos de prova. Sem migration, sem
  dependência nova, sem alteração em quadro, `.env` ou `apps/web/lib/app-api`.
