# HANDOFF — auditoria multiagente de telas (loop crítico anti-slop)

> Para uma **sessão local** do Claude Code neste repo. Tudo que a sessão precisa está
> aqui e nos arquivos citados. Não é preciso reler a conversa que originou isto.

## O que é

Auditoria conduzida por subagentes, em rodadas, contra rubrica congelada,
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

## Os cinco agentes (já definidos em `.claude/agents/`)

Nem todos entram em toda run — a composição depende da entrada. Ver a triagem da run.

| Agente | Camada | Papel |
|---|---|---|
| `audit-medidor` | determinística | Mede as 6 regras mecânicas. Não opina |
| `audit-conformidade` | contrato | Rubrica §9 + tokens + regra de privacidade |
| `audit-carrasco` | ofício | Checklist anti-slop congelada + A/B contra refs. Dá nota |
| `audit-produto` | estratégia | Os 14 itens do CRITIQUE_BRIEF contra BIVAQUE.md. Autonomia para propor incluir, excluir e fundir telas |
| `audit-arbitro` | processo | Compara rodada N vs N−1. Único que propõe convergência |

**Eles não conversam entre si.** Não existe canal agente↔agente: a sessão orquestradora é o
barramento. Por isso o estado da rodada vive **em disco**, não na cabeça dos agentes — é o
que torna a "conversa" auditável e retomável se a sessão cair.

**Os cinco são read-only, de propósito, e quem grava é a sessão orquestradora.** Nenhum tem
`Write` ou `Edit`: um juiz que pode editar o que julga não é juiz. Cada agente devolve o
conteúdo no relatório final, e a sessão o persiste em `.audit/<run>/` com o nome que a
etapa pede — antes de disparar a etapa seguinte, porque o Árbitro lê os arquivos, não a
memória da conversa.

## Preparação

```sh
# Antes do merge deste HANDOFF: use a branch que o traz.
# Depois do merge: main já basta.
git checkout main && git pull origin main

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

A sessão grava o relatório de cada etapa antes de disparar a próxima — os agentes não
escrevem.

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

Commit convencional numa branch própria da run — a auditoria é recorrente, e cada run rende
seu próprio veredito datado em `docs/agents/`. Rode
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

---

# Run 1 — pacote `bivaque_redesign_10_10_claude_critique1` (triagem já feita)

Triagem executada em 2026-08-19 sobre o zip entregue. **Leia antes de rodar** — ela muda
quais agentes entram e já registra achados que bloqueiam.

## O que veio

16 PNG + `README.md` + `CRITIQUE_BRIEF.md` + `manifest.json`. **Nenhum HTML, nenhum `.tsx`.**

| Consequência | Detalhe |
|---|---|
| `audit-medidor` **inativo** | Contraste, touch target, overflow, transição e cor crua não se medem em pixel. Não estime; registre `NÃO MEDIDO` |
| §9 item 6 inauditável | Resoluções são 460×1084, 420×714, 1040×780 — não são os viewports 375/768/1440 |
| Julgamento tipográfico fino **suspenso** | As imagens são geradas e o texto está corrompido em várias ("1.245 mommbros", "4l2 membros", "1.24S", "30S"). Julgar ritmo e tipografia aí é auditar o gerador, não o design |
| `audit-produto` **entra** | O `CRITIQUE_BRIEF` tem 14 itens, e a maioria é estratégia. Os quatro agentes visuais cobrem só os itens 8, 9 e 10 |

Composição desta run: `audit-produto` + `audit-conformidade` + `audit-carrasco` + `audit-arbitro`.

## P0 já encontrados na triagem — bloqueiam antes da rodada 1

Violam a regra de privacidade do `AGENTS.md` (§Supabase): patente, OM, endereço, documento
e **badge público de verificação** são proibidos. Quatro vazamentos de privacidade já
saíram dessa regra sendo ignorada.

| # | Tela | Achado | Regra |
|---|---|---|---|
| P0-1 | `01_agora.png` | Saudação **"Bom dia, Capitão!"** — patente na primeira linha da tela principal | `SLOP-16` · patente |
| P0-2 | `12_perfil.png` | Nome exibido como **"Capitão João Silva"** — patente no identificador | `SLOP-16` · patente |
| P0-3 | `12_perfil.png` | Selo **"✓ Membro verificado"** | `SLOP-16` · badge público de verificação |
| P0-4 | `12_perfil.png` | Avatar **fardado, com insígnia legível** — divulga patente e força por imagem | `SLOP-16` · o próprio `README.md` do pacote proíbe ("sem camuflagem, brasões, patente") |

Enquanto estiverem em pé, nenhuma tela passa de **C**. Não gaste rodada de Carrasco antes
de resolver: leve ao responsável primeiro.

## P0-5 — a vitrine sumiu, e ela é a única onda com receita

O pacote não tem vitrine. Nenhuma das 16 telas cobre ficha de prestador, conta de
prestador, dashboard, busca de prestador ou alcance pago. A remoção **não é declarada** em
lugar nenhum do `README.md`.

O que a vitrine é, segundo o contrato vigente:

| Fonte | O que diz |
|---|---|
| `BIVAQUE.md` §10, onda **G** | Ficha com identidade, catálogo e portfólio; conta e dashboard de prestador; conversa membro↔prestador; Asaas com alcance pago; busca de prestador |
| `BIVAQUE.md` :716 | *"Sem **G**, falta a vitrine, que é o comportamento que o grupo de 630 pessoas já demonstra hoje — e é a **única onda com receita**."* |
| `D20` **vigente** | Vitrine entra no piloto |
| `D45` **vigente** | Ficha de vitrine = identidade + catálogo + portfólio |
| `D41` / `D44` **vigentes** | Alcance pago por Asaas com webhook; busca por categoria e vila com `pg_trgm` |
| `D48` **vigente** | *"A vila é a sala; Manaus não é. O nível municipal é alcance de post, eventos, **vitrine** e guia de chegada — **nunca um feed**."* |
| `BIVAQUE.md` :54 | **Prestador civil** é um dos papéis do produto. Sua superfície inteira é a própria ficha de vitrine |
| `D27` **vigente** | Acesso grátis, amplificação paga. *"Militar nunca paga"* criaria vitrine de duas classes |

Três consequências, e todas são decisão de produto, não de design:

1. **O pacote remove a receita.** E o `CRITIQUE_BRIEF` item 7 pergunta qual seria a primeira
   vertical monetizável entre Serviços, Benefícios, Moradia e Marketplace — quatro verticais
   novas e não decididas — enquanto `D20` já respondeu isso, com provedor de pagamento e
   modelo de cobrança definidos.
2. **O pacote remove um papel.** Prestador civil deixa de ter superfície. Nenhuma tela do
   pacote é a ficha dele.
3. **O pacote inverte `D48` nas duas metades.** `D48` diz que o nível municipal é alcance,
   eventos, vitrine e guia — **nunca feed**. "Agora" é uma superfície municipal com cara de
   feed, e a vitrine, que `D48` nomeia explicitamente, não está lá.

Marketplace e Serviços podem ser a vitrine reinventada com outro nome — mas sem o papel de
prestador, sem `D45` e sem o modelo de cobrança de `D27`. Se for essa a intenção, precisa
ser dita, e as decisões precisam ser revogadas com data, não contornadas por renomeação.

**Este é o achado que valida a autonomia do `audit-produto`.** Nenhuma rubrica visual pegaria
uma tela que não está lá. Auditar só o que foi desenhado é auditar o recorte de quem desenhou.

## Colisões com o contrato — para o `audit-produto`

Nenhuma seria pega por rubrica visual. Todas precisam de decisão, não de polimento.

- **Teal e canvas quente não existem no sistema.** O `DESIGN_SPEC` trava Navy Professional:
  `--accent #1E3A8A`, `--secondary-accent #3B82F6`, `--background #F8FAFC` (frio). O pacote
  propõe teal como cor de contexto e canvas "levemente quente" — hue nova e temperatura
  invertida. É mudança de spec datada, ou é violação.
- **É substituição de arquitetura de informação, não redesenho.** Agora / Descobrir / Criar /
  Agenda / Inbox no lugar de `/community`, `/groups`, `/events`, `/recommendations`,
  `/messages`, `/notifications`. As telas **não correspondem a nenhuma rota existente**, então
  não há "antes" contra o qual auditar.
- **"Sem feed infinito"** contradiz o `DESIGN_SPEC`, cujo produto de referência é o Nextdoor
  justamente pela densidade de feed e anatomia de card.
- **Reexpansão de escopo.** Moradia, Serviços, Benefícios, Marketplace, Talentos, Pergunte ao
  Bivaque. Este fork existe por ser "the smallest slice that can launch", depois que 19
  features e o regime de ADR travaram o pai. Pergunta obrigatória ao pacote: **o que sai
  para isso entrar?**

## Ordem sugerida

1. Levar os cinco P0 ao responsável. São decisão de produto e privacidade, não de design.
2. `audit-produto` sobre o `CRITIQUE_BRIEF` — é o que o pacote está pedindo de verdade.
3. `audit-conformidade` e `audit-carrasco` **só depois**, e restritos ao que sobreviver:
   arquitetura de interação, hierarquia, densidade, paleta. Sem julgamento tipográfico fino.
4. `audit-arbitro` fecha a rodada e propõe. A assinatura de AAA continua sendo humana.

**A auditoria tem autonomia sobre o conjunto de telas** — pode propor inclusão, exclusão,
fusão e renomeação, não só criticar o que foi desenhado. O ônus da prova está em
`.claude/agents/audit-produto.md`. Excluir decisão `vigente` exige nomear o `Dxx` e propor
revogação datada; sumiço não declarado, como o da vitrine, é P0.
