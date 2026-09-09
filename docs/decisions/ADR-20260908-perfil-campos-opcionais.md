---
id: ADR-20260908-perfil-campos-opcionais
status: proposed
risk: R3
owner: Juan
approved_at:
expires_at:
linked_plan: docs/superpowers/specs/2026-09-08-reconstrucao-visual-web-design.md
critic_verdict:
critic_review:
---

# Perfil: campos opcionais com visibilidade por campo

## Problem

A prancha 51-web-perfil e a [correção 6 do responsável](../design/visual-guide-2026-09-06/DECISOES-2026-09-07.md)
autorizam campos autodeclarados e opcionais no perfil, cada um com um controle
**"Exibir no perfil" desligado por padrão**, alterável e removível depois.

A autorização de **produto** existe desde 07/09. O **contrato técnico** não. Sem
ele, a tela não pode ser construída: `RECON-005` foi recusado pelo validador de
contrato, que elevou a tarefa para R3 automaticamente por tocar visibilidade de
dado pessoal — corretamente, porque decidir onde o dado mora, quem lê e como
some não é escolha de agente.

Enquanto isso, a tela `/profile` segue com a composição antiga, e o controle de
visibilidade não existe em lugar nenhum do produto.

## Decision

Este ADR pede autorização para **três** decisões técnicas separadas. Elas podem
ser aprovadas em conjunto ou uma a uma; nenhuma delas é implementável antes da
aprovação.

### D1 — Onde a visibilidade mora

A visibilidade é **por campo**, não por perfil. Uma coluna de visibilidade
global não expressa "mostro minha Força Armada mas não minha OM".

Proposta: uma tabela `profile_field_visibility` com `(user_id, field, visible)`,
RLS que só permite ao dono ler e escrever a própria linha, e leitura pelos
outros mediada pela mesma RPC que já filtra o perfil por viewer
(`profile_is_visible_to_viewer`). O padrão de toda linha ausente é **invisível**
— ausência nunca significa "pode mostrar".

**A coluna e a política que a lê entram na mesma migration.** Esta regra já
custou quatro vazamentos de privacidade a este repositório.

### D2 — Quais campos entram agora

Somente **Força Armada** (Marinha, Exército, Aeronáutica) e **Organização
Militar**, que são os dois que a correção de 07/09 autoriza explicitamente.

O [`ADR-20260811-om-declarada`](ADR-20260811-om-declarada.md) propunha um
conjunto maior — status, turma e outros. Esse escopo **não** é aprovado por
tabela: a correção do responsável nomeia dois campos, e ampliar por conta
própria seria inventar produto.

Continua proibido persistir: CPF cru, payload do Portal, OM **inferida** pela
verificação, posto, patente e endereço residencial. O que a pessoa declara é
categoricamente diferente do que o Estado afirma, e o produto não pode
confundir os dois nem exibir selo de verificação sobre um dado autodeclarado.

### D3 — Como o dado some

Remover o campo apaga a linha, não a esconde. Um campo removido não deixa
resíduo legível por ninguém — nem por operador, nem em log, nem em notificação
já enviada. O teste de remoção é parte da mesma entrega, com prova de que a
leitura por terceiro deixa de retornar o valor.

## Consequences

- `RECON-005` (tela `/profile`, prancha 51) fica **bloqueado** até D1–D3 serem
  aprovados. A tela pode ser construída depois sem retrabalho, porque a
  composição visual não depende do contrato de dados — só os campos dependem.
- `BLOCK-AFFILIATION` deixa de ser um bloqueio sem saída e passa a ter um
  caminho nomeado.
- Nada aqui autoriza processamento novo enquanto o status for `proposed`.

## Prerequisites

1. Aprovação humana explícita do responsável, campo a campo.
2. Modelo de ameaça: o que um membro mal-intencionado faz sabendo a OM de outro.
3. Texto de consentimento na tela de edição, dizendo o que muda ao ligar o
   controle — quem passa a ver, e que desligar não desfaz o que já foi visto.
4. Governança LGPD (`BLOCK-LEGAL-AI` cobre a parte de terceiros).
5. pgTAP com positivo e negativo por campo: dono lê, terceiro autorizado lê
   quando visível, terceiro não lê quando invisível, remoção apaga.

## Status

`proposed`. Escrito em 08/09/2026 pelo coordenador da reconstrução web, ao
encontrar o bloqueio na prática: o validador de contrato recusou `RECON-005`
por elevação automática a R3, e a recusa estava certa.
