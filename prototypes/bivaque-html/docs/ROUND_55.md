# Bivaque — Rodada 55: entrar, recuperar a senha, Google e convite familiar

Data: 18/10/2026. Contrato: `docs/agents/tasks/HTML-055.task.yml` (R3, com o
[ADR-20260816-forma-da-admissao](../../../docs/decisions/ADR-20260816-forma-da-admissao.md)).
Base: `7a345b2e`. Lote Entrada.

**Veredito: PASS.**

## O que mudou

- **Entrar** (`#entrar/login`): e-mail e senha, "Esqueci minha senha" e "Criar conta".
  - E-mail ou senha errados recebem a mesma mensagem ("E-mail ou senha incorretos."), como no app
    web, para não revelar quem tem conta.
  - Quem está no meio da entrada volta ao passo em que parou (ex.: em análise).
  - Modo teste: o perfil de exemplo entra com `rafael@exemplo.com` e qualquer senha válida.
- **Recuperar a senha** (`#entrar/senha`): a mesma resposta para qualquer e-mail válido ("Se ...
  puder entrar no Bivaque, o link ... já está a caminho"); nenhum e-mail sai do protótipo.
- **Google:** em "Criar conta" e em "Entrar". Na conta nova, o aceite da privacidade e do código de
  conduta vem num passo próprio antes do CPF. No app web, esse caminho pulava o aceite e esbarrava
  num erro cru depois; o protótipo mostra o caminho certo.
- **Convite familiar** (`#entrar/convite`, também por "É cônjuge ou dependente?" no passo do CPF):
  - código criado em Você → Família convidada;
  - código errado ou usado: "Este convite não existe ou já foi usado";
  - "Rafael Souza convidou você · Você não precisa de CPF", com o nome do convite preenchido;
  - conta com aceite; segue direto para cidade e momento, e o código fica usado.

## Prova

| Prova | Resultado |
| --- | --- |
| Rodada 55 (5 verificações; 375 e 1440, claro) | PASS, 10/10 |
| Rodadas 53 e 54 | PASS, 8/8 e 12/12 |
| Gate (lint, tipos, testes, segredos) | PASS |
