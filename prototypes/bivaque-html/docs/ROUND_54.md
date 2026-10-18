# Bivaque — Rodada 54: conta e elegibilidade

Data: 18/10/2026. Contrato: `docs/agents/tasks/HTML-054.task.yml` (R3, com o
[ADR-20260816-forma-da-admissao](../../../docs/decisions/ADR-20260816-forma-da-admissao.md)).
Base: `00e6dbac`. Lote Entrada.

**Veredito: PASS.**

## O que mudou

- **Criar conta** (`#entrar/conta`, passo 1 de 3), como no app web:
  - nome, e-mail e senha (ao menos 8 caracteres, com letras e números, com "Mostrar senha");
  - aceite da Política de privacidade e do Código de conduta, desmarcado e obrigatório;
  - "Este e-mail já tem conta" para quem já existe;
  - a senha não é guardada; da conta fica só nome e e-mail, neste dispositivo.
- **Elegibilidade** (`#entrar/cpf`, passo 2 de 3):
  - CPF conferido pelos dígitos ("CPF inválido. Confira os 11 dígitos.");
  - "O que fazemos com o CPF": consulta à fonte oficial, número não guardado, sem posto,
    organização nem endereço;
  - "É cônjuge ou dependente?" leva ao convite;
  - o resultado da consulta é simulado nos controles do protótipo.
- **Resultados distintos:**
  - vínculo confirmado: segue para cidade e momento (até a Rodada 56, no passo do cadastro atual);
  - não localizado: "Enviar um documento" (PDF, JPG ou PNG, até 10 MB; fica só nome, tamanho e
    hora) ou "Conferir o CPF digitado";
  - fonte fora do ar: "Tentar de novo";
  - em análise: linha do tempo (conta, documento, análise da equipe em até 2 dias úteis, cidade),
    "Avise-me quando liberar" e o conteúdo fechado; no modo teste, "Simular aprovação".

## Prova

| Prova | Resultado |
| --- | --- |
| Rodada 54 (6 verificações; 375 e 1440, claro) | PASS, 12/12 |
| Gate (lint, tipos, testes, segredos) | PASS |
