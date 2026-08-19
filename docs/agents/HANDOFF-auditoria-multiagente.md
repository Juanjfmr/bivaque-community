# HANDOFF — auditoria multiagente de telas (loop crítico anti-slop)

> Para uma **sessão local** do Claude Code neste repo. Tudo que a sessão precisa está
> aqui e nos arquivos citados. Não é preciso reler a conversa que originou isto.

## O que é

Auditoria de telas conduzida por quatro subagentes, em rodadas, contra rubrica congelada,
até convergir ou estourar o teto. Inspirada no padrão "fan-out + crítico duro + loop", com
três correções sem as quais o padrão não converge (§ *Por que não é só soltar um crítico*).

## Decisões já tomadas — não reabrir

| Questão | Decisão |
|---|---|
| Entrada | **Mista**: imagens + plano de redesenho + código, num zip |
| Saída | **Só o veredito auditado.** Nenhum código de app tocado nesta run |
| Modo do loop | **Híbrido**: autônomo dentro da rodada, para no veredito de cada rodada |
| Autoridade do AAA | O Árbitro **propõe**. AAA só existe com **assinatura humana** |
| Teto | **5 rodadas.** Estourou, entrega o estado real + backlog |

## Os quatro agentes (já definidos em `.claude/agents/`)

| Agente | Camada | Papel |
|---|---|---|
| `audit-medidor` | determinística | Mede as 6 regras mecânicas. Não opina |
| `audit-conformidade` | contrato | Rubrica §9 + tokens + regra de privacidade |
| `audit-carrasco` | ofício | Checklist anti-slop congelada + A/B contra refs. Dá nota |
| `audit-arbitro` | processo | Compara rodada N vs N−1. Único que propõe convergência |

**Eles não conversam entre si.** Não existe canal agente↔agente: a sessão orquestradora é o
barramento. Por isso o estado da rodada vive **em disco**, não na cabeça dos agentes — é o
que torna a "conversa" auditável e retomável se a sessão cair.

## Preparação

```sh
git fetch origin claude/subagentes-invocacao-b9fe0u
git checkout claude/subagentes-invocacao-b9fe0u

RUN=$(date -u +%Y-%m-%dT%H-%M-%SZ)
mkdir -p .audit/$RUN/entrada
unzip ~/caminho/para/telas.zip -d .audit/$RUN/entrada/
cp docs/agents/ANTI-SLOP.md .audit/$RUN/RUBRICA.md   # congela a cópia da run
: > .audit/$RUN/BACKLOG.md
```

`.audit/` é gitignored, como `.visual/`. Só o veredito final vai para `docs/agents/`.

**Triagem da entrada mista** — antes da R1, classifique cada peça e anote em
`.audit/$RUN/ENTRADA.md`:

- **renderizável** (HTML/CSS, rota servível) → medição real
- **código** (`.tsx`, CSS) → medição estática (token, raio, sombra)
- **imagem** (PNG/JPG) → **não mensurável** para contraste e touch target; vira julgamento
- **plano de redesenho** → é o alvo declarado, entra como contexto para todos os agentes

Diga isso no veredito. Uma tela auditada só por imagem tem menos garantia que uma medida —
esconder essa diferença é o mesmo defeito que este repo já cometeu uma vez.

## Ambiente

- **Docker precisa estar rodando** para telas autenticadas: `npx pnpm@11.18.0 exec supabase start`
  antes de qualquer captura. Sem stack, rota autenticada cai em `/login` e a medição é inválida.
- Chromium: se o bundle gerenciado não estiver instalado, exporte
  `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`.
- **Nunca** rode dev server ou captura visual entre `db:reset` e `test:db` — o perfil fantasma
  "Visual Capture" derruba 6 asserts de pgTAP com cara de regressão real.

## A rodada (repetir até convergir, teto 5)

```
Etapa 1  audit-medidor      →  R<N>-medicao.json      ┐ podem rodar em paralelo
Etapa 2  audit-conformidade →  R<N>-conformidade.md   ┘
Etapa 3  audit-carrasco     →  R<N>-carrasco.md         (recebe 1 e 2 como entrada)
Etapa 4  audit-arbitro      →  R<N>-veredito.md         (lê tudo, decide)
         ── PARA. Mostra o veredito. Espera destravar. ──
```

Da R2 em diante, use `SendMessage` para continuar o **mesmo** agente em vez de abrir um
novo — ele mantém o contexto da rodada anterior e não recomeça frio.

Se o Árbitro devolver `RODADA INVÁLIDA`, a rodada **não conta** para o teto: corrija a
causa (deriva de gol, capitulação, veredito por entusiasmo) e refaça a Etapa 3.

## Convergência — todas precisam valer

- Medidor: zero P0, zero P1
- Conformidade: 8/8 na §9 em toda tela, zero falha dura de privacidade
- Carrasco: nota ≥ A em toda tela, zero SLOP acionado, A/B declarado presente
- Árbitro: zero deriva de gol, zero regressão, zero capitulação

**Ausência de slop é AA, não AAA.** AAA exige acerto de ofício nomeado por tela — uma decisão
de hierarquia, densidade ou copy que só faz sentido para esta comunidade. Ver a escala em
`docs/agents/ANTI-SLOP.md`.

## Entrega

`docs/agents/VISUAL_AUDIT-<data>-<escopo>.md`, no formato que o repo já usa (ver
`VISUAL_AUDIT-2026-08-17-p0-localidades.md`): veredito por tela, evidência, e o que ficou
pendente. Mais `BACKLOG.md` do que não entrou no gate.

Commit convencional na branch `claude/subagentes-invocacao-b9fe0u`. Rode
`npx pnpm@11.18.0 gate` antes de declarar pronto — mesmo sendo run só de documento.

## Por que não é só soltar um crítico duro no loop

Três modos de falha, e a defesa de cada um. Estão codificados nos agentes; não os remova.

**Deriva de gol.** Crítico inventa critério novo a cada rodada e o loop nunca fecha.
→ Rubrica congelada antes da R1; critério novo vai para backlog, não para o gate; o Árbitro
verifica isso toda rodada.

**Capitulação mútua.** O crítico amolece, a nota sobe sem que nada tenha mudado, e sai um
AAA falso. É o desfecho mais comum, porque agentes tendem a concordar.
→ O Árbitro compara nota contra mudança real; nota subindo sem mudança é rodada inválida.

**Slop avaliando slop.** Agente julgando contra a ideia abstrata de "bom design" produz
achado genérico — "melhorar a hierarquia" — que *é* o slop.
→ Todo achado prescreve valor (token, px, peso); A/B declarado contra `nextdoor-refs/`.

E uma armadilha de alvo: **"wow" é o critério errado aqui.** Otimizar para
impressionante-em-demo empurra para espetáculo, que é o habitat do slop. O `DESIGN_SPEC`
pede sóbrio e institucional. Uma tela que ficou divertida falhou, ainda que fique bonita.

Nada disso é hipotético para este repo: a rubrica §9, o `capture.mjs` e a regra de
privacidade existem porque a alternativa já falhou aqui — inclusive com quatro vazamentos
de privacidade.
