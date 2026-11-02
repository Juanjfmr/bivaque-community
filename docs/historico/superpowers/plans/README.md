# Execução das ondas — orientação para quem vai implementar

> Escrito em 2026-08-11 para execução no OpenCode. Se você é um agente e acabou de abrir este
> diretório, leia esta página inteira antes de abrir qualquer plano.

## Onde está a verdade

| Pergunta | Documento |
|---|---|
| o que o produto **deve** ser | [`docs/BIVAQUE.md`](../../BIVAQUE.md) |
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

## Duas coisas que o E2E ensinou, e valem para toda onda

Descobertas na execução da onda A, em 2026-08-14. As duas invalidam instrução que estava
escrita nos planos, então leia antes de escrever asserção de negação.

**`notFound()` no Next 16 responde 200, não 404.** Com streaming, o shell é commitado antes
de a página decidir, então o status já saiu quando o `notFound()` acontece. O corpo é a UI de
404 e nenhum conteúdo do objeto aparece — a negação funciona —, mas **asserção sobre status
falha**. Verifique a UI: ausência do conteúdo protegido e presença da página de não
encontrado. A propriedade que importa continua garantida: quem não pode ver não distingue
"não existe" de "não pode", porque as duas respostas são idênticas.

**PostgREST só resolve embed onde existe foreign key.** `select("a, perfil:profiles!inner(x)")`
falha silenciosamente quando não há FK entre as tabelas — e várias tabelas deste schema
referenciam `auth.users` em separado, sem FK entre si. `group_memberships` e `profiles` são o
caso conhecido. Se o código descartar o `error`, a tela renderiza vazia e ninguém percebe:
foi assim que a lista de membros de grupo ficou quebrada em produção sem ninguém notar.
**Leia o `error` de toda consulta** — não só nas que decidem acesso.

## pgTAP roda sem `db:reset` — descoberto em 2026-08-21

A secao seguinte diz que `db:reset` e um portao humano e que por isso o pgTAP fica sem rodar
numa execucao autonoma. A primeira metade continua verdadeira; a segunda **nao**.

Todo arquivo de `supabase/tests/` e SQL puro, abre com `begin` e fecha com `rollback`. Se o
schema local ja esta em dia, da para roda-los direto, um a um, sem resetar nada e sem deixar
rastro:

```sh
docker cp supabase/tests supabase_db_bivaque-community:/tmp/
docker exec -w /tmp/tests supabase_db_bivaque-community   psql -U postgres -X -q -f report-resolution-unified.sql
```

Conte `^ ok ` e `^ not ok ` na saida. No Git Bash, `export MSYS_NO_PATHCONV=1` antes, senao o
`/tmp/...` vira caminho do Windows e o `docker exec` nao acha o arquivo.

**O que isto NAO substitui:** `db:reset` reaplica as migrations a partir dos arquivos. Se voce
escreveu uma migration nova, aplique-a ao banco local antes (`docker cp` + `psql -f`), senao
esta testando um schema que nao e o que o arquivo descreve. E continua valendo que o E2E
precisa do estado oposto, com seed — para ele o portao humano permanece.

Tres suites da onda H foram validadas assim, 27 assercoes, antes de qualquer commit.

## O E2E precisa de um humano, e por quê

Isto não é opinião sobre disciplina: é uma restrição do ambiente que torna o E2E
**inalcançável** para uma execução autônoma, e ela custou uma onda inteira para aparecer.

Todo trabalho de pgTAP exige `db:reset --no-seed`. O E2E exige o oposto, `db:reset` com
seed, porque autentica como usuário semeado. **Os dois estados são mutuamente exclusivos**, e
qualquer onda que mexa em migration apaga o seed ao verificar o próprio pgTAP.

Some a isso que `db:reset` é auto-rejeitado em `opencode run` headless — o guarda pede
aprovação e não há ninguém para dar. Resultado: um executor que percorre as ondas em sequência
faz pgTAP na B, pgTAP na C, pgTAP na D2, e o E2E que deveria fechar a onda A é órfão em todas.

**Consequência prática, e ela vale para toda onda:**

1. Escreva os specs de E2E dentro da onda que os exige, e **commite-os sem executar** se o
   banco estiver sem seed. Registre no `PRODUCT_STATUS.md` como "código feito", que é o
   terceiro estado documentado lá.
2. **Não peça `db:reset` no meio do trabalho.** Peça uma vez, ao dono, quando houver um lote
   de E2E acumulado para rodar.
3. O E2E é a **última** coisa antes de devolver o banco ao estado de pgTAP — não a primeira.

Uma onda pode fechar com o E2E pendente, desde que isso esteja escrito na linha. O que não
pode é a linha dizer que fechou.

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

## A ordem mudou em 2026-08-16, e quatro ADRs mandam agora

Uma sessão de treze decisões reordenou o roadmap e produziu quatro ADRs. **Leia os quatro antes
de abrir qualquer plano** — os planos os executam e não os repetem.

| ADR | Risco | O que decide |
|---|---|---|
| [`national-localities`](../../decisions/ADR-20260816-national-localities.md) | R3 | o Bivaque é nacional desde o cadastro; Manaus é piloto operacional |
| [`forma-da-admissao`](../../decisions/ADR-20260816-forma-da-admissao.md) | R3 | admissão em duas fases; nome sugerido pelo Portal e confirmado; waitlist geográfica sai |
| [`transferencia-e-pertencimento`](../../decisions/ADR-20260816-transferencia-e-pertencimento.md) | R3 | o militar transferido acessa origem e destino; um perfil por pessoa |
| [`shells-e-navegacao`](../../decisions/ADR-20260816-shells-e-navegacao.md) | R2 | papéis são shells; navegação é container; dois consoles de administração |

**A ordem passou a ser: P0 → T → D2 → E → F.**

Dois motivos, e nenhum é preferência. `PILOT_LOCALITY_ID` aparece **15 vezes em 8 arquivos de
runtime**, e 6 desses 8 são editados por D2, E e F — rodar as ondas antes é fazer o mesmo
trabalho duas vezes. E a **Task 3 da P0 muda duas chaves primárias**, que é a única parte
irreversível depois de existir usuário real, num projeto sem staging (D42): tem que acontecer
antes do primeiro membro.

**Um portão humano antes de começar:** os quatro ADRs estão `critic_verdict: pending`, três são
R3, e a `RISK_MATRIX.md` bloqueia a implementação até `PASS`. A aprovação humana já consta nos
quatro. O merge do `origin` foi feito em 2026-08-16 e os ADRs existem localmente.

## G e H ganharam plano em 2026-08-20

Esta seção dizia que G e H não tinham plano. Agora têm, e as duas abrem com um **portão humano
que nenhum agente atravessa**:

- **G (vitrine)** está dividida em dois blocos dentro do mesmo arquivo, como esta seção previa:
  **G1** (Tasks 1-6) é a vitrine sem dinheiro e não depende de CNPJ; **G2** (Tasks 7-8) é o
  alcance pago e depende. Se dezembro apertar, o corte é entre as duas. O apêndice da P0 já
  deixa avaliado o que a BrasilAPI oferece de CNPJ — inclusive a armadilha de privacidade do
  campo `qsa`.
- **H (operação)** trava a suspensão em duas coisas que só o dono fecha: a **assinatura do
  código de conduta**, que a D12 chama de base contratual da suspensão, e a revisão jurídica de
  `legal/PRIVACIDADE.md`, que o PostHog exige. As Tasks 1 a 4 e 6 correm sem nenhuma das duas.

**As duas ondas são R3, e os três ADRs que faltavam foram escritos e aprovados em
2026-08-20.** D20, D28, D37, D38, D40, D41, D44 e D45 vivem na tabela do §9 do `BIVAQUE.md`,
que é onde moram as decisões **não-R3**; a `RISK_MATRIX.md` exige ADR aprovado,
`critic_verdict: PASS` e aprovação humana para tudo que toca RLS, dado pessoal, pagamento ou
monetização.

| ADR | Status | O que ainda trava depois dele |
|---|---|---|
| [`ADR-20260820-conta-de-prestador`](../../decisions/ADR-20260820-conta-de-prestador.md) | `accepted` | nada — G Tasks 1 a 6 liberadas |
| [`ADR-20260820-alcance-pago`](../../decisions/ADR-20260820-alcance-pago.md) | `accepted` | **CNPJ**, para o bloco G2 |
| [`ADR-20260820-suspensao-de-conta`](../../decisions/ADR-20260820-suspensao-de-conta.md) | `accepted` | **código de conduta assinado**, para a H Task 5 |

Cada plano lista, no topo, as decisões do ADR que ele executa — se você discordar de alguma
durante a execução, a discordância vai para o ADR, não para o código.

**Leia o `critic_review` dos três antes de confiar neles.** O crítico foi quem escreveu os
ADRs, e isso está registrado lá em vez de omitido. A revisão adversarial que precedeu a
aprovação achou seis defeitos de implementabilidade nos planos — helper inalcançável por
policy, leitura de `display_name` negada pela RLS, `sync_paid_reach` contradizendo a tolerância
de 7 dias, recurso sem tabela, revogação de ficha sem task, e uma citação errada de migration
sobre exclusão de conta —, todos corrigidos antes da aprovação. Nenhum atingiu as decisões em
si, mas o número diz o que esperar: **reconfira, não confie**.

As duas continuam fora do mínimo de dezembro (§10.2 do `BIVAQUE.md`) — mas o §10.2 também diz
qual das duas não deveria escorregar, e é a **H**: sem ela abre-se para centenas de militares
identificáveis com denúncia de DM e de indicação sem destino e sem suspensão nenhuma.

D2, E e F foram escritas em **2026-08-16**, a pedido do dono, para fechar o caminho crítico de
dezembro. Elas carregam o custo que esta seção antes previa e que continua real: a D2 foi
escrita contra evidência de um dia de idade e é confiável; **E e F citam linhas de arquivos que
a onda anterior pode reescrever.** Cada uma abre com um aviso dizendo exatamente quais arquivos
reconferir antes de editar. Reconfira — não é formalidade.

## Os planos

| Onda | Arquivo | Tamanho | Bloqueio |
|---|---|---|---|
| **P0** | [`2026-08-16-p0-localidades-nacionais.md`](2026-08-16-p0-localidades-nacionais.md) | 10 tasks | `critic_verdict: PASS` nos quatro ADRs |
| **T** | [`2026-08-16-onda-t-transferencia.md`](2026-08-16-onda-t-transferencia.md) | 6 tasks | Task 3 da P0 (as duas chaves primárias) |
| A | [`2026-08-11-onda-a-portas-e-vazamentos.md`](2026-08-11-onda-a-portas-e-vazamentos.md) | 6 tasks | nenhum |
| B | [`2026-08-11-onda-b-coerencia-por-subtracao.md`](2026-08-11-onda-b-coerencia-por-subtracao.md) | 8 tasks | nenhum |
| C | [`2026-08-11-onda-c-devolver-a-fala.md`](2026-08-11-onda-c-devolver-a-fala.md) | 7 tasks | nenhum |
| D1 | [`2026-08-11-onda-d1-infraestrutura.md`](2026-08-11-onda-d1-infraestrutura.md) | 7 tasks | três humanos, acima |
| D2 | [`2026-08-16-onda-d2-a-porta.md`](2026-08-16-onda-d2-a-porta.md) | 8 tasks (7 superada, 9 nova) | `outbox` + Resend da D1 (Tasks 4 e 5) |
| E | [`2026-08-16-onda-e-a-vila.md`](2026-08-16-onda-e-a-vila.md) | 11 tasks | cota de convite da D1 (Task 6); afiliação bloqueada pelo ADR da OM |
| F | [`2026-08-16-onda-f-o-laco-semanal.md`](2026-08-16-onda-f-o-laco-semanal.md) | 10 tasks | Task 1 é pré-requisito interno das Tasks 2, 3 e 8 |
| G | [`2026-08-20-onda-g-vitrine.md`](2026-08-20-onda-g-vitrine.md) | 9 tasks (G1: 1-6, G2: 7-8) | **Tasks 1-6 liberadas.** G2 espera o CNPJ |
| H | [`2026-08-20-onda-h-operacao.md`](2026-08-20-onda-h-operacao.md) | 8 tasks | **Tasks 1-4 e 6 liberadas.** Task 5 espera o código de conduta assinado; Task 7, a LGPD publicada |

Três mudanças de escopo que a sessão de decisões produziu, e que não estão visíveis pelo nome dos
arquivos:

- **A Task 7 da D2 foi superada** pela Task 8 da P0 — ela polia a waitlist geográfica que o ADR
  elimina. Riscada no arquivo, com o motivo, em vez de apagada.
- **A D2 ganhou a Task 9:** os dois consoles de administração, como shells separados. Ela vem
  **antes** da Task 6, que passa a viver dentro do console do fundador.
- **A E ganhou as Tasks 10 e 11:** os containers de navegação e os assuntos de interesse. A
  **Task 10 vem antes da Task 3**, porque é ela que define onde a camada da cidade aterrissa.

Cinco coisas que os planos novos assumem e que valem ser lidas antes de executá-los:

- **A Task 3 da P0 é a mais perigosa do roadmap.** Ela muda as chaves primárias de
  `locality_memberships` e `profiles`, e os seis asserts de `locality-profile-access.sql` mudam
  junto — **os mesmos seis que o perfil fantasma "Visual Capture" quebra.** Durante essa task vai
  ser difícil distinguir regressão real de armadilha conhecida. `db:reset` limpo antes de
  atribuir qualquer falha ao diff.

- **A BrasilAPI entra como dependência de geração, nunca de runtime.** O catálogo de municípios
  (IBGE) e os feriados nacionais viram artefato SQL versionado no repositório, produzido por um
  script que roda quando alguém decide rodar. Não é só arquitetura: o README da BrasilAPI pede
  que o volume "tenha a natureza de uma pessoa real requisitando um determinado dado", e o
  Portal da Transparência já ocupa a vaga de terceiro no caminho crítico da admissão.


- **A D2 é menor do que o `BIVAQUE.md` §10 sugere.** Cinco migrations de 2026-08-15 já
  entregaram verificação, TTL, consentimento em banco e o vínculo do convite familiar ao e-mail.
  O plano abre com a tabela do que já existe. Não reimplemente.
- **Na onda E, a Task 1 vem antes da Task 2, e a ordem não é estética.** A home municipal é hoje
  o único lugar que exibe post de alcance Manaus; removê-la antes de `feed_community` passar a
  incluir esses posts tira conteúdo de circulação entre um commit e o outro.
- **Na onda F, a Task 1 é medição antes de correção.** Seis Server Actions autenticam no cliente
  `service_role`; o `PRODUCT_STATUS.md` registra dois desfechos possíveis e pede a medida. As
  Tasks 2, 3 e 8 escrevem sobre esse mesmo caminho.

Os planos anteriores neste diretório, de agosto de 2026, são das ondas 0 a 8 já executadas.
Servem de registro do que foi feito e por quê — não de fila de trabalho.
