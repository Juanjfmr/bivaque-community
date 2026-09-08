# Revisão independente — RECON-001 (sidebar do shell web)

> **Veredito: FAIL.**
> **Revisor:** sessão separada via `opencode run`, modelo `alibaba-token-plan/qwen3.8-max`.
> **Implementador:** `alibaba-token-plan/qwen3.8-flash` (composição) + coordenador (encanamento e acabamento).
> **Data:** 08/09/2026 · **Revisão avaliada:** `30ab4eb`.

Este documento existe porque o gate **G5** da
[especificação funcional](../superpowers/specs/2026-09-08-reconstrucao-visual-web-design.md)
exige revisor distinto do implementador, e porque o resultado foi **FAIL** — registrar só o que
passa é o defeito que o gate foi criado para impedir.

---

## Limitações desta revisão, declaradas antes dos achados

1. **Não é plenamente independente no sentido do G5.** O revisor leu, por iniciativa própria, os
   documentos de fechamento da etapa — que contêm a justificativa do implementador. O G5 pede o
   primeiro parecer formado sem essa defesa. O que lhe foi *entregue* foram apenas contrato,
   prancha e diff; o resto ele foi buscar.
2. **Implementador e revisor são da mesma família de modelo.** `opencode-go` e `deepseek` estavam
   sem saldo no momento (o primeiro hospeda o `deepseek-v4-pro`, mesmo modelo do workflow de
   revisão do repositório). Sobrou `alibaba-token-plan`: `qwen3.8-flash` implementou,
   `qwen3.8-max` revisou. Sessões separadas e modelos diferentes, mas erro correlacionado é mais
   provável dentro da mesma família.
3. **O artefato entregue ao revisor estava errado** — ver achado 3. Erro do coordenador ao montar
   a revisão, não do revisor.
4. **O revisor não é verificador de runtime.** Ele não rodou o gate, deliberadamente: a árvore
   tinha trabalho não commitado e um resultado ali não seria atribuível ao diff. O papel de
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

### 3. [MEDIUM] O artefato revisado não era a unidade do contrato

O coordenador entregou o diff acumulado de toda a etapa W00 (≥6 unidades, contratos distintos)
como se fosse a entrega do RECON-001. Lido assim, viola `allowed_paths` em ~20 arquivos que
pertencem a outras unidades. Os achados 1 e 2 não dependem disso — ambos vivem dentro de `6d998a7`.

**Ação:** revisões seguintes recebem um diff por contrato.

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
