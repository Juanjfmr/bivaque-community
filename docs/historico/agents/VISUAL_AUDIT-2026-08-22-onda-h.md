# Auditoria visual — Onda H (operação)

**Data:** 2026-08-22
**Runs:** `.visual/2026-08-22T04-16-55-721Z/` (reprovada) → `.visual/2026-08-22T04-26-12-921Z/` (aprovada)
**Telas no escopo:** `/reports`, `/admissions`
**Captura:** autenticada como `operador@bivaque.example.invalid`, 375 / 768 / 1440

## Veredito

**APROVADA.** As duas telas que a onda tocou passam com **zero achados de alta severidade**.

| Tela | capturas | alta severidade | média/baixa | landedOn |
|---|---|---|---|---|
| `/reports` | 3 | **0** | 105 | `/reports` |
| `/admissions` | 3 | **0** | 15 | `/admissions` |

A regra do `AGENTS.md` é sobre **as telas que a onda tocou**, e elas estão limpas. A onda H
fecha e libera a seguinte.

O loop continua devolvendo `KEEP ITERATING` porque conta achados do repositório inteiro: os
30 restantes são de `/guide-queue` (21 touch-target, 6 sem nome acessível) e `/communities`
(3 touch-target) — **telas que esta onda não tocou**. São dívida anterior, vão para o ledger,
e não bloqueiam esta onda.

## O que a primeira rodada acusou, e o que foi corrigido

A rodada `04-16` reprovou com **255 achados de alta severidade**, todos em `/reports`:

| Seletor | Medido | Exigido | Origem | Correção |
|---|---|---|---|---|
| `a.underline` — "abrir o alvo" | 60×16 | 44×44 | **Task 4** desta onda | `inline-flex min-h-11 items-center` |
| `button.w-full` — "Ocultar conteúdo" | 293×38 | 44×44 | anterior à onda | `min-h-11` |
| `button` — "Resolver" | 38px de altura | 44×44 | anterior à onda | `min-h-11 min-w-11` |
| `input.min-w-0` — "Nota (opcional)" | sem nome acessível | label, texto ou title | anterior à onda | `aria-label` |

Três controles, multiplicados pelas 15 denúncias abertas do seed e pelos 3 viewports: 255.
Os botões usavam `px-4 py-2`, que dá 38px de altura — o `§0` do `VISUAL_GUIDE` exige
**toda ação ≥44px (`min-h-11 min-w-11`)**. O input tinha `placeholder` e nada mais, e
`placeholder` não é nome acessível: some ao digitar e nem todo leitor de tela o anuncia.

Dois dos três eram dívida anterior que a onda herdou ao mexer na tela; o link era desta onda.

## O que esta auditoria revelou antes de conseguir rodar

Ela precisou de três tentativas, e as duas primeiras são o achado mais importante do dia.

**Tentativa 1 e 2:** veredito `ITERATION COMPLETE`, **0 achados de alta severidade**. Falso.
De 23 rotas capturadas, **21 produziram o mesmo arquivo byte a byte** — todas renderizaram
`/onboarding/locality`. Zero achados num formulário de cadastro, fotografado 21 vezes.

A causa era um bug de produção introduzido na Onda G Task 1 (`4151452`), em
`apps/web/middleware.ts`:

```js
const kind = (kindRows?.[0]?.my_account_kind ?? null)   // errado
```

`my_account_kind()` é `returns text`; o PostgREST devolve o escalar `"member"`, não uma lista
de linhas. Em `"member"`, `[0]` indexa a string (`"m"`) e a propriedade sai `undefined` —
`kind` era **sempre** `null`. Todo membro autenticado, com localidade, vila e perfil, caía no
ramo do estado desconhecido e era despejado no onboarding. O produto inteiro ficava atrás do
formulário de cadastro.

Medido contra o servidor local:

```
PostgREST devolve: "member"   (tipo: string, Array? false)
kindRows?.[0]?.my_account_kind -> null
(kindRows ?? null)             -> "member"
```

Corrigido para a forma escalar. **A tentativa 3, com o middleware consertado, é a que este
veredito descreve.**

## Duas correções de processo que isto exige

1. **O loop visual aprova o vazio.** Ele conta achados de alta severidade e declara
   `ITERATION COMPLETE` quando não encontra nenhum — inclusive quando não encontrou nada
   porque não havia nada para encontrar. Um veredito assim poderia ter destravado a onda
   seguinte. **Proposta:** falhar a captura quando N rotas distintas produzem screenshots
   idênticos. É barato e teria transformado este bug num vermelho automático.

2. **Nenhum teste cobre o middleware.** É o arquivo que decide o acesso de todo mundo e não
   tem uma asserção. Nem tipo nem lint pegam o formato que o PostgREST devolve em runtime —
   só um teste que chame a RPC e confira a forma.

## Fechamento

- [x] `min-h-11` nos dois botões de ação do card de denúncia
- [x] nome acessível no input de nota (`aria-label`, já que o rótulo visível não existe)
- [x] alvo de 44px no link "abrir o alvo"
- [x] re-rodado com credencial de operador no ambiente — `04-26`, zero achados altos nas duas telas
- [ ] os `no-transition` (105 em `/reports`) são severidade média e vão para o ledger

**Fica para outra onda**, porque não é escopo desta: `/guide-queue` com 21 touch-target e 6
sem nome acessível, e `/communities` com 3 touch-target. São exatamente o mesmo defeito
corrigido aqui — botão com `py-2` e input só com `placeholder` — o que sugere que o padrão
está repetido em telas que ninguém auditou ainda.

## Reprodução

```sh
BIVAQUE_VISUAL_EMAIL='operador@bivaque.example.invalid' \
BIVAQUE_VISUAL_PASSWORD='<senha do seed>' \
node scripts/visual/loop.mjs
```

A porta 3000 precisa estar livre — o loop se recusa a capturar contra servidor pré-existente,
e o resíduo da rodada anterior é a causa mais comum de `capture: FAIL`. A captura insere o
perfil fantasma no banco local: **rode o reset do banco antes do próximo `test:db`.**
