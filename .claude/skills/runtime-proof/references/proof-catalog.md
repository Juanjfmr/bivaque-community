# Catálogo de provas — o que cada comando prova e o que não prova

Todos os comandos assumem `npx pnpm@11.18.0` (o `pnpm` não está no PATH).

## Gate

```sh
npx pnpm@11.18.0 gate         # lint -> typecheck -> test -> secrets
npx pnpm@11.18.0 gate --fast  # lint + typecheck
```

**Prova:** o repositório está consistente e os testes que rodam sem Docker passam.
**Não prova:** nada sobre banco, navegador ou aparência. `--fast` não prova nem teste.

## Unit (vitest)

```sh
npx pnpm@11.18.0 test:unit
```

**Prova:** lógica pura, contrato de módulo, helpers de script.
**Não prova:** integração, permissão, render real.

## Scope (node --test)

```sh
npx pnpm@11.18.0 test:scope
```

**Prova:** os contratos do próprio repositório — workspaces, runtime do Next, biblioteca
de componentes única, seção `[inbucket]`, superfície de comandos, estrutura do harness.
Roda em milissegundos: rode depois de tocar em `scripts/`, config ou `.claude/`.
**Não prova:** comportamento de produto.

## Banco (pgTAP)

```sh
npx pnpm@11.18.0 exec supabase start     # Docker precisa estar de pé
npx pnpm@11.18.0 db:reset --no-seed
npx pnpm@11.18.0 test:db
npx pnpm@11.18.0 db:lint
```

**Prova:** quem vê o quê. RLS, grants, fronteira do schema `private`.
**Exige:** teste **positivo e negativo** por via de permissão. Só o positivo não prova nada.
**Armadilha:** nenhum dev server e nenhuma captura visual entre o `db:reset` e o `test:db`.
**Não prova:** que a tela usa a policy corretamente.

## E2E (Playwright)

```sh
npx pnpm@11.18.0 db:reset      # COM seed — o E2E autentica como usuário semeado
npx pnpm@11.18.0 test:e2e
```

**Prova:** o ciclo do usuário: entrada, ação, feedback, retorno e o caminho triste principal.
**Estado mutuamente exclusivo com o pgTAP.** Credencial vem do ambiente, nunca inline.
**Armadilha:** specs são transpilados para CJS — `import.meta` não existe neles; resolva
caminho a partir de `process.cwd()`, senão a suíte inteira aborta com `0 tests in 0 files`.

## Visual

```sh
node scripts/visual/loop.mjs          # gates -> build -> serve -> screenshot -> auditoria
node scripts/visual/loop.mjs --fast   # só captura, contra servidor já rodando
```

**Prova:** alvo de toque, contraste, overflow, presença de movimento, disciplina de token,
em 375/768/1440. Artefatos em `.visual/<run>/`.
**Não prova:** correção funcional.
**Nunca** dirija o browser por fora deste loop: é o gatilho do perfil fantasma.

## Contrato de tarefa

```sh
node scripts/agents/task-contract.mjs
```

**Prova:** que a tarefa tem contrato completo, com fronteira, prova executável e nível de
risco coerente com o que ela toca.
**Não prova:** que o contrato é uma boa ideia.
