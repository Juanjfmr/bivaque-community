---
name: plan-execution
description: >
  Execute a plan from docs/superpowers/plans/ todo by todo, gating between each
  one, with a stop rule when a todo is wrong or impossible. Use when running a
  wave, when the user points at a plan file, or when asked to "seguir o plano".
---

# plan-execution

O plano é **contrato**, não sugestão. Ele foi escrito com contexto que você não tem.

**Antes de executar qualquer onda, leia `docs/superpowers/plans/README.md` inteiro.**
Ele carrega a ordem, por que as ondas são seriais, as paradas obrigatórias e o que fecha
uma onda. Sessão que pula esse arquivo já procurou orientação no lugar errado.

## O laço

Para cada todo, nesta ordem:

1. Leia o todo inteiro antes de tocar em qualquer arquivo.
2. **Implementação e teste são um todo só.** Nada fecha sem prova na mesma unidade.
3. Gate entre cada todo, não só no fim (skill `gate-before-done`). Vermelho **para** a execução.
4. Um commit por todo, convencional (`feat/fix/chore(escopo): …`), com o escopo que o plano indica.

## Pare e diga — não improvise

- O todo está errado, ambíguo ou impossível → **pare**. Plano errado é informação.
- O todo pede sair da fronteira de confiança (RLS, dado pessoal, migration destrutiva)
  sem ADR aprovado → pare.
- O baseline do todo não reproduz → pare: o plano descreve outro estado do mundo.

Improvisar em fronteira de confiança é como este repositório produziu quatro vazamentos.

## Serial, uma onda por vez

Ondas são independentes em código e **seriais na execução**, por dois motivos que não estão
no código: banco local único (cada onda precisa de `db:reset` exclusivo) e loop visual único
(a captura insere perfil no banco e quebra o pgTAP de outra onda). Termine, feche, comece a próxima.

## O que fecha uma onda

A auditoria visual das telas que ela tocou (`docs/superpowers/plans/2026-08-05-auditoria-telas.md`).
Não existe rodada de auditoria "no fim". Nenhum trabalho seguinte começa antes disso — exceto
acessibilidade e segurança, que não esperam onda nenhuma.

## Onde a verdade mora

- O que o produto **deve** ser: `docs/BIVAQUE.md`.
- O que o código **faz** hoje: `docs/PRODUCT_STATUS.md`.
- Nunca infira um do outro. Ler decisão como feature entregue é o erro que produziu o mapa
  que esses dois substituíram.
- Uma linha só sai do `PRODUCT_STATUS.md` quando o usuário **fecha o ciclo** — entrada,
  ação, feedback, retorno e o caminho triste principal. Capacidade no banco não fecha linha.
