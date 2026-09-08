# Revisão independente — RECON-001 (sidebar do shell web)

> **Veredito: FAIL**, confirmado por **duas** sessões independentes de famílias diferentes.
>
> | Rodada | Modelo | Família | Escopo entregue | Veredito |
> |---|---|---|---|---|
> | 1 | `alibaba-token-plan/qwen3.8-max` | Qwen | diff acumulado da etapa (erro do coordenador) | FAIL |
> | 2 | `alibaba-token-plan/deepseek-v4-pro` | DeepSeek | só os 3 arquivos da unidade | FAIL |
>
> **Implementador:** `alibaba-token-plan/qwen3.8-flash` (composição) + coordenador (encanamento e acabamento).
> **Data:** 08/09/2026 · **Revisão avaliada:** `30ab4eb`.
>
> A segunda rodada existe porque a primeira teve duas limitações de montagem, ambas do
> coordenador. Ela confirmou os achados 1, 2, 6 e 7 de forma independente, acrescentou um achado
> real que ninguém tinha visto (o 4, abaixo), e produziu um falso positivo por falta de contexto
> (o 3). O resultado justifica o custo: **famílias diferentes erram diferente**.

Este documento existe porque o gate **G5** da
[especificação funcional](../superpowers/specs/2026-09-08-reconstrucao-visual-web-design.md)
exige revisor distinto do implementador, e porque o resultado foi **FAIL** — registrar só o que
passa é o defeito que o gate foi criado para impedir.

---

## Limitações, e o que a segunda rodada corrigiu

1. **Independência de família — resolvida na rodada 2.** Na rodada 1 eu havia concluído que só
   `alibaba-token-plan` tinha saldo e que ele só oferecia Qwen. Estava errado: o provedor também
   hospeda `deepseek-v4-pro` (o mesmo modelo do workflow de revisão do repositório), `glm-5.2`,
   `kimi-k2.7-code` e `MiniMax-M2.5`. Eu havia olhado apenas o `opencode-go`, que estava sem
   saldo, e generalizado. A rodada 2 usou DeepSeek — família distinta do implementador.
2. **Escopo do artefato — resolvido na rodada 2.** A rodada 1 recebeu o diff acumulado da etapa
   inteira (achado 3). A rodada 2 recebeu apenas os três arquivos da unidade.
3. **Contexto do revisor — piorou na rodada 2, e produziu um falso positivo.** Ao corrigir o
   excesso da rodada 1, restringi demais: sem `globals.css`, o revisor 2 não podia ver a regra de
   foco global e reportou ausência de foco visível que não existe. Corrigir uma limitação criou
   outra; o equilíbrio é dar a unidade **mais** o que ela depende.
4. **Leitura da defesa do implementador.** Na rodada 1 o revisor foi ler os documentos de
   fechamento por conta própria, o que o G5 não quer. Na rodada 2 a instrução foi explícita e ele
   declarou ter formado o parecer sem eles.
5. **Nenhum dos dois é verificador de runtime.** Ambos se recusaram a rodar o gate, corretamente:
   a árvore tinha trabalho não commitado e o resultado não seria atribuível ao diff. O papel de
   verificação de execução continua distinto e pendente.

---

## Achados

### 1. [HIGH] Baseline falso; a unidade violou o próprio `forbidden`

O contrato listava `apps/web/app/(shell)/layout.tsx` e `apps/web/lib/member-context.tsx` em
`forbidden`, e o `baseline` afirmava que o contexto de dados "já existe e é provido em
`(shell)/layout.tsx`".

`git log --diff-filter=A -- apps/web/lib/member-context.tsx` devolve `6d998a7` — o mesmo commit
que entrega a sidebar. O contrato foi escrito **depois** do encanamento, descrevendo como
pré-existente algo criado na mesma unidade, e cercando como proibidos os arquivos que a unidade
precisava tocar. A task, como escrita, era impossível de cumprir.

O correto era parar e emendar o contrato com o responsável. O que houve foi contrato e violação no
mesmo commit — o que esvazia o contrato como mecanismo de fronteira.

**Ação:** registrado no cabeçalho do próprio `RECON-001.task.yml`, sem reescrever o `baseline`
para parecer correto.

### 2. [HIGH] "Salvos" ausente — redução de escopo silenciosa

O `acceptance` exigia a seção secundária com **Salvos e Notificações**. A entrega traz só
Notificações.

A justificativa no código citava `tests/unit/ui/empty-promises.test.ts`. O revisor leu o teste: ele
reprova apenas as strings literais `"de 3 passos"` e `"Em breve"`. Um stub de `/salvos` sem essas
palavras **não** o falharia. A justificativa era imprecisa.

A razão válida existe — o gate **G1** proíbe destino placeholder — mas a decisão foi tomada dentro
da entrega, **sem card no quadro**. O revisor conferiu: `board.json` não continha "Salvos", e a
lista de dívidas do fechamento de W00 também não. Sem rastro, é redução de escopo silenciosa.

**Ação:** card `SHELL-SALVOS-AUSENTE` criado.

### 3b. [BLOCKER na rodada 2 — **FALSO POSITIVO**] "Foco visível ausente nos itens novos"

O revisor 2 apontou que `SidebarSecondaryItem` e `SidebarCommunityItem` não declaram
`focus-visible:ring-*`, enquanto os controles do cabeçalho declaram, e concluiu que um usuário de
teclado perderia a indicação de foco.

**Verificado no código: não procede.** `apps/web/app/globals.css:142-145` aplica
`outline: 2px solid var(--semantic-focus-outer); outline-offset: 2px` a
`:where(a, button, input, select, textarea, [role="button"], [role="checkbox"]):focus-visible`.
Os itens novos são âncoras e recebem foco por essa regra, exatamente como os itens primários da
navegação, que também não declaram anel próprio. O "anel duplo" de `globals.css:150-159` é
específico de botões sólidos primary/danger, e é pré-existente. O revisor 1, que explorou o
repositório, chegou à conclusão correta.

A causa do falso positivo é a limitação 3 acima: entreguei só os três arquivos da unidade, sem o
`globals.css` de que eles dependem. Registrado aqui e **não corrigido** — adicionar classes de anel
redundantes divergiria do padrão do próprio arquivo para links de navegação.

### 3. [MEDIUM] O artefato revisado não era a unidade do contrato

O coordenador entregou o diff acumulado de toda a etapa W00 (≥6 unidades, contratos distintos)
como se fosse a entrega do RECON-001. Lido assim, viola `allowed_paths` em ~20 arquivos que
pertencem a outras unidades. Os achados 1 e 2 não dependem disso — ambos vivem dentro de `6d998a7`.

**Ação:** revisões seguintes recebem um diff por contrato.

### 4b. [HIGH, rodada 2] `throw` no layout do shell derrubava toda rota autenticada — **corrigido**

Achado novo, que a rodada 1 não pegou — ela chegou a **elogiar** o mesmo código ("erros lidos e
lançados nas três consultas, não vira lista vazia falsa").

Eu havia acrescentado três `throw new Error(...)` em `(shell)/layout.tsx` para as consultas de
perfil, comunidades e não-lidas. Esse layout embrulha **toda rota autenticada**: um soluço
transitório na contagem de não-lidas produzia 500 em todas as páginas do membro, com o stack do
Postgres chegando ao navegador — o oposto de "erro interno nunca chega ao membro"
(`DESIGN_SYSTEM.md` §6.1).

Ler o erro é a regra da casa; **lançar** é a resposta errada quando o dado é conteúdo de sidebar.
A consulta de localidade continua lançando, porque sem ela não há shell a renderizar — essa é
estrutural. As três da sidebar passaram a registrar o erro e degradar para um padrão seguro: a
sidebar mostra menos, o aplicativo não cai.

Os dois revisores discordaram e o segundo estava certo. O primeiro julgou a regra ("leu o erro?"),
o segundo julgou a consequência ("qual o raio de explosão?").

### 4. [MEDIUM] Badge de não-lidas some no rail

Em 768px a sidebar vira rail e o badge deixa de renderizar; o sino do cabeçalho é controle morto
(`SHELL-BELL-DEAD`). O tablet fica sem nenhuma afordância de não-lidas. O contrato não exigia badge
no rail, mas o par deixa um viewport inteiro sem o sinal.

**Ação:** anexado ao card `SHELL-BELL-DEAD`, que já cobre a outra metade do problema.

### 5. [LOW] "Configurações" aponta para `/profile`

Já registrado em `SHELL-SETTINGS-LABEL` antes da revisão — escalada correta, ao contrário do
achado 2.

### 6. [LOW] Nome vazio degradava sem fallback — **corrigido**

`displayName` caía para `""`, o avatar renderizava inicial vazia e o rodapé ficava sem identidade.
Agora usa rótulo neutro quando não há linha de perfil, com o comentário explicando que a ausência é
anomalia e não estado normal.

### 7. [LOW] `requireOperatorId` descartava o `error` do RPC — **corrigido**

A versão anterior mandava `p_user_id: ""` sem sessão e ignorava o erro resultante. Falhava fechado,
mas por acidente, violando a regra da casa de ler o erro de toda consulta. Agora retorna cedo sem
caller, e um erro do RPC é registrado e nega explicitamente — indisponibilidade do banco não vira
decisão de autorização silenciosa.

### 8. [LOW] Custo por render

`getUser` + três consultas sequenciais em toda rota autenticada, sem deduplicação. Correto e caro.
Não corrigido; anotado.

---

## O que o revisor confirmou como correto

Ordem das seções da sidebar; seção de comunidades some inteira com lista vazia, separador junto;
badge só com contagem positiva; rail espelhando os primários com ícone, `sr-only` e Tooltip; nada
chumbado; sem cor crua, imagem inventada ou biblioteca nova; alvos ≥ 44px. Colunas e PKs conferidas
contra as migrations (`profiles.user_id`, `community_memberships.user_id/status`,
`notifications.recipient_user_id/read_at`); erros lidos e lançados nas três consultas; RLS sem
vazamento; `canOperateAdmissions` com positivo e negativo.

---

## Consequência

A unidade **não fecha** com este parecer. Achados 6 e 7 foram corrigidos; 2, 3, 4 e 8 viraram
registro; o achado 1 é falha de processo e fica documentado onde aconteceu.

O caminho mínimo para fechar, segundo o revisor: reconciliar o contrato com a realidade via emenda
aprovada pelo responsável, decidir "Salvos" com humano, e re-submeter um diff por task. Some-se a
isso o que o próprio revisor não podia dar: **prova de runtime** — o `closure` do contrato exige
`requires_runtime_evidence: true`, e o papel de verificador de execução é distinto do de revisor.
