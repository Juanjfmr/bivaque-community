# Veredito da auditoria visual — telas do trabalho de 15/08 (frentes D/E/F) e onda D1

> Procedimento do `docs/superpowers/plans/README.md` (fim de cada onda) e §9 do
> `docs/agents/VISUAL_GUIDE.md`. Telas tocadas pela sessão de 15/08: `/onboarding`,
> `/onboarding/status`, `/community`, `/communities`, `/communities/[id]`, `/guide`,
> `/guide-queue`, `/reports`, `/admissions`, `/recommendations`.

Capturas: `.visual/2026-08-16T01-24-42-481Z/shots/` (run do
`scripts/visual/loop.mjs` após os commits da sessão).

---

## Achados

- **Total: 6, high-severity: 0.**
- **0 achados introduzidos pela sessão.** As três correções de alvo de toque e
  transição (link "Guia de chegada" no header do `/community`, input de busca e
  link "Ver site" do `/guide`) saíram do relatório após aplicadas.
- Os 6 achados restantes são `heading-structure` (0 h1, medium) em
  `/groups/[id]` e `/events/[id]` — **preexistentes** (telas de ondas
  anteriores, não tocadas por esta sessão; mesmo backlog documentado nos
  vereditos das ondas B e C).
- Nenhum `forbidden-copy` — a regra continua reprovando apenas rótulos de
  asserção ("Patente:", "OM:") em telas de teste, nenhum nesta superfície.

## Limitação de cobertura (registrada, não oculta)

- `/reports`, `/admissions` e `/guide-queue` foram capturadas como redirect para
  `/community`: o usuário do seed não é operador e o `(admin)/layout` redireciona
  quem não tem `is_current_user_operator`. As telas existem e compilam; a
  captura visual delas como operador exige um usuário operador no seed.
- `/onboarding` e `/onboarding/status` também caem em `/community` para o seed
  (o seed é membro verificado; o middleware só mantém o onboarding para
  não-membros). O mesmo vale para `/` (home autenticada redireciona para o
  feed). Comportamento esperado, não achado.

## Nota de execução

O primeiro run do loop (00-31) reportou `This page couldn't load` em `/guide` e
o run seguinte (00-58) capturou contra um dev server órfão (Turbopack com cache
corrompido servindo um chunk do guia com 500). Com a porta 3000 limpa e o
build de produção, `/guide` renderiza sem erro (verificado também por
navegação manual com sessão do seed). Não é defeito de código.

## Status

Sessão fechada para as telas tocadas (veredito escrito, 0 high):

- [x] `db:lint` limpo, pgTAP verde (48 arquivos / 756 testes), gate verde.
- [x] 0 achados visuais introduzidos; 6 medium preexistentes em `groups/[id]` e
      `events/[id]` (backlog já documentado).
- [x] Veredito escrito (este documento).
- A **onda D1** não toca tela nenhuma; a dispensa da auditoria visual está
  registrada no `PRODUCT_STATUS.md` §11 (não se aplica).
