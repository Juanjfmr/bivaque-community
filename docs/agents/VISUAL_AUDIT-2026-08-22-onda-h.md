# Auditoria visual — Onda H (operação)

**Data:** 2026-08-22
**Run:** `.visual/2026-08-22T04-16-55-721Z/`
**Telas no escopo:** `/reports`, `/admissions`
**Captura:** autenticada como `operador@bivaque.example.invalid`, 375 / 768 / 1440

## Veredito

**REPROVADA — KEEP ITERATING.** 255 achados de alta severidade, 45 itens no ledger.

A onda H **não fecha** e, pela regra do `AGENTS.md`, não libera a onda seguinte.

| Tela | no-transition | touch-target | missing-accessible-name | nav-active |
|---|---|---|---|---|
| `/reports` | 102 | **180** | **45** | 3 |
| `/admissions` | 12 | — | — | 3 |

`/admissions` passa no que é alta severidade. Todo o peso está em `/reports`, que é
justamente a tela que as Tasks 3 e 4 reconstruíram.

## As três causas

Os 225 achados de alta severidade de `/reports` vêm de **três controles**, multiplicados pelas
15 denúncias abertas do seed e pelos 3 viewports.

| Seletor | Medido | Exigido | Origem |
|---|---|---|---|
| `a.underline` — "abrir o alvo" | 60×16 | 44×44 | **Task 4** desta onda |
| `button.w-full` — "Ocultar conteúdo" / "Resolver" | 293×38 | 44×44 | anterior à onda |
| `input.min-w-0` — "Nota (opcional)" | sem nome acessível | label, texto ou title | anterior à onda |

Os botões usam `px-4 py-2`, que dá 38px de altura. O `§0` do `VISUAL_GUIDE` é explícito:
**toda ação ≥44px (`min-h-11 min-w-11`)**. O input tem `placeholder` e nada mais —
`placeholder` não é nome acessível.

Dois dos três são dívida anterior que a onda herdou ao mexer na tela. O terceiro é meu: o link
"abrir o alvo" que a Task 4 acrescentou nasceu com 16px de altura.

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

## Para fechar a onda

- [ ] `min-h-11` nos dois botões de ação do card de denúncia
- [ ] nome acessível no input de nota (`aria-label`, já que o rótulo visível não existe)
- [ ] alvo de 44px no link "abrir o alvo"
- [ ] re-rodar `node scripts/visual/loop.mjs` com credencial de operador no ambiente
- [ ] os `no-transition` (102 em `/reports`) são severidade média e vão para o ledger, não
      bloqueiam

## Reprodução

```sh
BIVAQUE_VISUAL_EMAIL='operador@bivaque.example.invalid' \
BIVAQUE_VISUAL_PASSWORD='<senha do seed>' \
node scripts/visual/loop.mjs
```

A porta 3000 precisa estar livre — o loop se recusa a capturar contra servidor pré-existente,
e o resíduo da rodada anterior é a causa mais comum de `capture: FAIL`. A captura insere o
perfil fantasma no banco local: **rode o reset do banco antes do próximo `test:db`.**
