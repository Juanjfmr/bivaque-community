# Execução das ondas — orientação para quem vai implementar

> Escrito em 2026-08-11 para execução no OpenCode. Se você é um agente e acabou de abrir este
> diretório, leia esta página inteira antes de abrir qualquer plano.

## Onde está a verdade

| Pergunta | Documento |
|---|---|
| o que o produto **deve** ser | [`docs/BIVAQUE.md`](../../BIVAQUE.md) |
| o que precisa **ser verdade** no sistema, com requisito numerado | [`SPEC.md`](../../../SPEC.md) |
| o que o código **faz** hoje | [`docs/PRODUCT_STATUS.md`](../../PRODUCT_STATUS.md) |
| comandos, armadilhas, contratos de teste | [`AGENTS.md`](../../../AGENTS.md) |
| decisões R3 e a régua de risco | [`docs/decisions/`](../../decisions/) |
| evidência dos 151 achados | [`docs/red-team/`](../../red-team/) |

**Nunca infira um do outro.** O `BIVAQUE.md` descreve decisões, muitas ainda não construídas.
O `PRODUCT_STATUS.md` descreve realidade. Ler decisão como feature entregue é o erro que
produziu o mapa que esses dois substituíram.

`docs/journeys/MAP.md` é histórico. Não use.

## A ordem, e por que é serial

```
A (portas e vazamentos)  →  B (subtração)  →  C (devolver a fala)  →  D1 (infraestrutura)
```

Em dependência de código as quatro são independentes. **A execução é serial mesmo assim**,
por dois motivos que não estão no código:

1. **Banco local único.** As ondas B, C e D1 têm migration própria e todas precisam de
   `db:reset` exclusivo para testar.
2. **Loop visual único.** A captura em `.visual/` insere um perfil no banco. Se ela rodar
   entre `db:reset` e `test:db` de outra onda, **seis asserts de pgTAP quebram parecendo
   regressão real**.

Uma onda por vez. Termine, feche, comece a próxima.

## O protocolo

- **`/run-plan docs/superpowers/plans/<arquivo>.md`** executa todo a todo.
- **Gate entre cada todo**, não só no fim: `npx pnpm@11.18.0 gate`. Vermelho para a execução.
- **Um commit por task**, conventional, com o escopo que o plano indica.
- **Implementação e teste são um todo só.** Nada fecha sem teste na mesma unidade.
- **Todo caminho de permissão tem teste positivo e negativo.** Só o positivo não prova nada.
- **Se o todo estiver errado ou impossível, pare e diga.** Não improvise em fronteira de
  confiança. Um plano errado é informação, não obstáculo.

O protocolo completo está nas skills `plan-execution` e `gate-before-done`, em
`~/.claude/skills/`, lidas pelos dois harnesses. Planos que citarem `superpowers:*` ou
`anthropic-skills:*` estão citando plugin do Claude Code, que **não existe no OpenCode** —
use as skills acima.

## Armadilhas conhecidas — cheque antes de culpar seu diff

- **O perfil fantasma "Visual Capture".** Descrito acima. Sintoma: `locality-profile-access`,
  `authz-*-matrix` e `full-regression` falham juntos. Correção: `db:reset` de novo, sem dev
  server e sem captura rodando, depois `test:db`.
- **`dev-server.pid` velho.** Faz o loop visual conectar num servidor que não existe. Apague
  e tente de novo.
- **`pnpm` não está no PATH.** Sempre `npx pnpm@11.18.0`.
- **Este não é o Next que você conhece.** É o Next 16, com mudanças de API em relação ao seu
  treino. Leia o guia em `node_modules/next/dist/docs/`, resolvido a partir de `apps/web`,
  antes de escrever código de rota ou Server Component. Ver `apps/web/AGENTS.md`.
- **Migration aplicada não se edita.** Sempre timestamped, via
  `npx pnpm@11.18.0 exec supabase migration new <nome>`.
- **`--linked` e produção não são para agente.** Comando destrutivo aponta para local.

## Paradas obrigatórias

Três coisas que **você não faz**, mesmo que pareçam a correção certa:

1. **Não altere `AGENTS.md:205`** — a proibição de persistir organização militar e posto.
   Existe um ADR propondo mudança
   ([`ADR-20260811-om-declarada`](../../decisions/ADR-20260811-om-declarada.md)), com status
   `proposed` e cinco pré-requisitos abertos. Enquanto isso, a proibição é o contrato, e
   **afiliação declarada não se implementa**.
2. **Não flipe perfil `hidden` em silêncio.** A Task 6 da onda B manda consultar se existe
   perfil real com esse estado **antes** da migration. Havendo, pare e reporte.
3. **Não commite `apps/web/next-env.d.ts` solto.** É artefato do dev server. E
   `bivaque-sign-in.tsx` tem modificação pendente que pertence à Task 1 da onda B — incorpore
   lá, não commite separado.

## Fim de cada onda

1. **Auditoria visual** sobre as telas tocadas: `node scripts/visual/loop.mjs`. Ela
   **bloqueia** a onda seguinte. Exceção: a D1 não toca tela nenhuma e está dispensada — o
   próprio plano diz isso e manda registrar a dispensa.
2. **Veredito escrito** em `docs/agents/VISUAL_AUDIT-<data>-<onda>.md`, no formato dos que já
   existem ali.
3. **Reconciliar o `PRODUCT_STATUS.md`.** Uma linha só sai quando o ciclo do usuário fecha —
   entrada, ação, feedback, acompanhamento e o sad path principal. Capacidade no banco não
   fecha linha. Trocar a confiança `[A]` por `[V]` no que você reconferiu.

## Antes da D1: três bloqueios humanos

Nenhum agente resolve, e sem eles a D1 para no meio:

- conta no Resend e domínio verificado, com DKIM e SPF no DNS;
- chip dedicado e descartável para o WhatsApp, que não seja o do fundador nem o de
  administrador de vila;
- CNPJ, que depende do veículo jurídico do §7.6 do `BIVAQUE.md`.

As tasks 1, 2, 3 e 6 da D1 não dependem de nenhum deles e podem correr enquanto a espera
acontece.

## O que ainda não tem plano

D2 (a porta), E (a vila), F (o laço semanal), G (vitrine — provavelmente dividida em duas) e
H (operação). Elas serão escritas quando a anterior fechar, contra o código no estado real —
plano detalhado escrito hoje para código que quatro ondas vão reescrever nasce com evidência
vencida.

## Os planos

| Onda | Arquivo | Tamanho | Bloqueio |
|---|---|---|---|
| A | [`2026-08-11-onda-a-portas-e-vazamentos.md`](2026-08-11-onda-a-portas-e-vazamentos.md) | 6 tasks | nenhum |
| B | [`2026-08-11-onda-b-coerencia-por-subtracao.md`](2026-08-11-onda-b-coerencia-por-subtracao.md) | 8 tasks | nenhum |
| C | [`2026-08-11-onda-c-devolver-a-fala.md`](2026-08-11-onda-c-devolver-a-fala.md) | 7 tasks | nenhum |
| D1 | [`2026-08-11-onda-d1-infraestrutura.md`](2026-08-11-onda-d1-infraestrutura.md) | 7 tasks | três humanos, acima |

Os planos anteriores neste diretório, de agosto de 2026, são das ondas 0 a 8 já executadas.
Servem de registro do que foi feito e por quê — não de fila de trabalho.
