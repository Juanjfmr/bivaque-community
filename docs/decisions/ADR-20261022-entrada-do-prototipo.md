---
id: ADR-20261022-entrada-do-prototipo
status: proposed
risk: R3
owner: Juan
approved_at:
accepted_at:
expires_at:
linked_plan: docs/AUDITORIA_ADERENCIA_2026-10-19.md (seção 6, lote 4)
critic_verdict: pending
critic_review: Redigido em 22/10/2026 a partir do mapeamento protótipo × Next da entrada; aguarda aprovação do dono.
---

# A entrada do Next segue a entrada do protótipo

## Problem

O protótipo é a especificação do Bivaque (opção A, 19/10/2026). Na entrada, o Next diverge dele em sete pontos
(mapeamento de 22/10/2026):

1. O Next pergunta o tipo de vínculo (4 opções) antes do CPF. O protótipo vai direto ao CPF, explicando por quê.
2. O convite de familiar no Next só funciona por link e exige a conta já criada. No protótipo, a pessoa digita o
   código e cria a conta na mesma tela.
3. No Next, cidade e perfil são telas separadas, sem o momento. O protótipo junta numa tela: cidade, momento
   (Chegando, Moro aqui ou Saindo), data e destino.
4. A análise pendente no Next é simples. O protótipo tem linha do tempo, reenvio de documento e "Avise-me quando
   liberar".
5. O Next não tem a tela "Você já começou" para retomar a entrada.
6. O Next não tem a tela "Conta apagada": depois de apagar, volta ao login.
7. A Ajuda do Next só funciona com login; o protótipo tem Ajuda e contato para quem está fora.

Além disso, quem entrava pelo Google não passava pelo aceite e ficava preso. O hotfix do PR #104 resolve isso com o
passo "Aceite", que este ADR confirma.

## Decision

A entrada do Next é portada do protótipo, na pele do ADR-20261022-porte-visual-material-web (Material Web, Noto,
tokens dos dois temas, comparação de captura). Ordem: conta → aceite (só para o Google) → CPF → resultado ou
análise → cidade e momento → boas-vindas.

1. **CPF sem a pergunta de vínculo.**
   - A tela do CPF segue o protótipo: "Confirme seu vínculo." e o bloco "Por que o CPF".
   - O link "É cônjuge ou dependente?" leva ao convite.
   - A categoria (ativa, veterano, pensionista) continua vindo da fonte oficial, não de uma pergunta.
2. **Convite de familiar por código.**
   - O convite ganha um código curto, legível, de uso único, com validade de 7 dias.
   - Na tela do convite, a pessoa digita o código e cria a conta ali mesmo: nome, e-mail do convite só para leitura,
     senha e aceite.
   - O link continua funcionando e já vem com o código.
   - A tentativa de código tem limite por origem e por e-mail contra adivinhação. O código errado, vencido ou já
     usado tem uma única mensagem.
3. **Cidade e momento numa tela.**
   - A tela tem: cidade, momento, data de chegada (Chegando) ou de saída (Saindo), destino (Saindo) e "como quer ser
     chamado".
   - O momento e as datas são guardados e alimentam a Início (plano de chegada ou de saída) e as boas-vindas.
   - Avatar, Força e interesses saem dessa tela e ficam para o perfil, depois.
4. **Análise pendente como no protótipo.**
   - A tela mostra a linha do tempo de 4 passos e permite enviar outro documento.
   - "Avise-me quando liberar" grava a preferência de aviso. A decisão já gera o aviso e o e-mail; a preferência
     escolhe o canal.
5. **Retomar a entrada.** A tela "Você já começou" tem "Continuar de onde parei" e "Começar com outra conta".
   "Começar com outra conta" sai da conta, com confirmação.
6. **Conta apagada.** Depois de apagar a conta, aparece a tela "Conta apagada", pública.
7. **Ajuda pública.**
   - A Ajuda e as páginas legais funcionam sem login.
   - O contato de quem está fora é por e-mail. O chamado registrado continua só para quem tem conta
     (ADR-20261022-fundacao-dados).
   - Os links "Ajuda" e "Fale com a gente" voltam à landing.

**Não muda:**

- verificação pelo Portal;
- documento com análise manual autorizada;
- PDF aceito;
- regras de admissão (ADR-20260816-forma-da-admissao);
- aceite gravado no servidor (ADR-20260907-consentimento-no-cadastro).

## Alternatives considered

- **Manter o fluxo atual do Next e só trocar a pele.** Rejeitada: o protótipo é a especificação, e a pergunta de
  vínculo é atrito sem ganho, porque a fonte oficial já responde.
- **Convite só por link.** Rejeitada: o código digitado funciona quando o link se perde, e o protótipo foi aprovado
  assim.

## Market or reference baseline

Cadastro em etapas com indicador de passo e convite por código de uso único: padrão de apps de família e de
comunidade fechada.

## Proposed divergence from baseline

Nenhuma.

## Evidence and sources

- Protótipo: `prototypes/bivaque-html/src/features/entry/*.js`, `legal/pages.js` e `support/help.js`.
- Mapeamento protótipo × Next de 22/10/2026, registrado no handoff.
- Hotfix do aceite do Google: PR #104.

## Benefits

- A entrada igual à especificação.
- Menos atrito.
- O familiar entra sem depender do link.
- A pessoa sabe o que esperar na análise.

## Risks

- **Convite por código pode ser adivinhado.** O código tem entropia suficiente, uso único, validade e limite de
  tentativas, e há prova pgTAP do limite.
- **O fluxo novo pode quebrar os e2e atuais da entrada.** Eles são reescritos junto, e o CI cobre.

## Reversal cost

Médio: telas novas e uma migration para o momento, as datas, o código do convite e a preferência de aviso.

## Success metric

- Duas contas completam a entrada de verdade: uma por e-mail e uma pelo Google. Um familiar entra por código.
- Comparação de captura com o protótipo em cada tela, nos dois temas.

## Reopen condition

Reabrir se a fonte oficial deixar de informar a categoria, ou se aparecer abuso no código de convite.
