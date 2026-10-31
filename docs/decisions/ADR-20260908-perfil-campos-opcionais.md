---
id: ADR-20260908-perfil-campos-opcionais
status: approved
risk: R3
owner: Juan
approved_at: 2026-09-08
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

### D1 — Onde a visibilidade mora — APROVADO

**Colunas booleanas em `profiles`, ao lado do valor.** Cada campo opcional ganha
o seu par na mesma linha: o valor e um booleano `not null default false`.

Motivo de preferir isto à tabela separada que este ADR propunha antes: valor e
visibilidade não podem dessincronizar quando vivem na mesma linha; o padrão
seguro é estrutural (`default false`), não convenção; não há join na leitura de
perfil, e a RPC de visibilidade que já existe só precisa anular o campo quando
o booleano é falso; e o nome da coluna aparece nos tipos gerados, então o
typecheck pega erro de nome — exatamente a classe de bug que derrubou toda rota
autenticada nesta reconstrução quando uma consulta usou `profiles.id`.

Custo aceito: cada campo novo exige migration. **A coluna e a policy que a lê
entram na mesma migration** — regra que este repositório já tem e que virou
defeito quatro vezes quando alguém adiou a policy.

### D2 — Quais campos entram agora — APROVADO

**Somente Força Armada e Organização Militar**, os dois que a correção de
07/09 nomeia. Força Armada como enum fechado (Marinha, Exército, Aeronáutica);
OM como texto livre curto, porque a lista real muda e não cabe em enum.

O escopo maior do [`ADR-20260811-om-declarada`](ADR-20260811-om-declarada.md) —
situação e turma — **não** entra. Aquele ADR está `proposed` e nunca foi
aprovado, e situação em especial se aproxima do que a verificação estatal
afirma; o produto precisa manter separado o que o Estado diz do que a pessoa
declara.

Continua proibido persistir: CPF cru, payload do Portal, OM **inferida** pela
verificação, posto, patente e endereço residencial. Nenhum selo de verificação
sobre dado autodeclarado.

**OM é texto livre, e texto livre é superfície.** A entrega precisa impedir que
o campo vire depósito de endereço, patente ou dado de terceiro: limite de
tamanho, e a mesma varredura de conteúdo proibido que o repositório já aplica a
texto de membro.

### D3 — Como o dado some — APROVADO COM RESSALVA DE INTERFACE

**Desligar a visibilidade não apaga o valor.** O booleano vai a falso e o valor
permanece na linha, para que religar não exija redigitar.

O responsável escolheu isto sabendo do custo, que fica registrado: o dado
continua existindo no banco, alcançável por consulta com `service_role`, por
backup e por dump. Desligar **esconde**, não apaga.

**Consequência obrigatória de interface, e é o que impede a tela de mentir.**
A correção de 07/09 diz que os campos são "alteráveis e *removíveis* depois".
Como o controle só oculta, ele **não pode se chamar "remover"**. São duas
afordâncias distintas, cada uma dizendo o que faz:

- **"Exibir no perfil"** — alterna visibilidade. Rótulo de ocultar/mostrar,
  nunca de remover.
- **Apagar de verdade** — limpar o campo: selecionar vazio na Força Armada,
  esvaziar o texto da OM. Isso grava `null` no valor e falso na visibilidade,
  e é o caminho que cumpre a palavra "removível" da correção.

Sem essa separação, a pessoa desliga o controle acreditando ter removido, e o
dado fica. Uma tela que promete apagar sem apagar é pior que uma tela que não
oferece apagar.

**Prova exigida:** pgTAP mostrando que, com o valor limpo, a leitura por
terceiro para de retornar porque não há o que retornar — não porque um filtro
escondeu.

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

`approved` em 08/09/2026 pelo responsável, decisão a decisão. D1 e D2 conforme
recomendado; D3 decidido contra a recomendação do coordenador, que propunha
apagar em vez de esconder — a ressalva de interface acima é a condição que
torna a escolha honesta para quem usa a tela.

`RECON-005` (tela `/profile`, prancha 51) fica **destravado** e pode ser
escrito. Os pré-requisitos de modelo de ameaça, texto de consentimento e
governança LGPD seguem valendo antes de a tela ir a público.
