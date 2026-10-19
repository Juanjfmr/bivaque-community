---
id: ADR-20261019-correcoes-de-seguranca-pre-lancamento
status: accepted
risk: R3
owner: Juan
approved_at: 2026-10-19
expires_at:
linked_plan: docs/agents/LOTE-SEGURANCA-2026-10-19.md
critic_verdict: PASS
critic_review: Os defeitos vêm da auditoria de aderência independente (Codex gpt-6.1-sol, docs/AUDITORIA_ADERENCIA_2026-10-19.md). H1, H2 e H3 foram reconferidos no código por outra sessão (Claude Opus). Este ADR não cria fronteira nova; restaura a que os ADRs e as telas já prometem.
---

# Correções de segurança antes de abrir o Bivaque

## Problem

A auditoria de aderência de 19/10/2026 encontrou cinco defeitos em que o banco ou o servidor deixam passar
o que o produto já promete não deixar:

- **H1:** publicação e comentário removidos pela moderação continuam legíveis por consulta direta.
- **H2:** o telefone da ficha do prestador com `contact_is_public = false` é legível por quem alcança a
  ficha.
- **H3:** a purga da conta pode terminar deixando arquivos pessoais no Storage.
- **H4/M1:** foto enviada pode guardar a localização do aparelho (EXIF/GPS), e o envio de foto de evento usa
  a service role sem reconferir o vínculo da pessoa.
- **M2:** o outbox envia aviso quando a consulta de preferência ou de opt-out falha.

## Decision

O dono autorizou em 19/10/2026 o lote de correções. As cinco regras a seguir valem e precisam ter teste
negativo:

1. **Conteúdo removido não é legível por ninguém além de quem a moderação permitir**, nem pela API direta.
   Isso vale para publicação, comentário e comentário de publicação removida.
2. **O telefone da ficha só é legível quando `contact_is_public` é verdadeiro**, ou pelo próprio dono e pela
   operação autorizada. A proteção fica no banco: grant por coluna, view ou RPC; a interface sozinha não basta.
3. **Purga sem resíduo:** a exclusão da conta só termina depois de confirmar que não sobrou objeto pessoal
   nos buckets.
4. **Nenhuma foto é gravada com metadados de localização.** A limpeza acontece no servidor, e a do aparelho é
   só cortesia. Ação privilegiada reconfere a mesma autorização que a policy do Storage exigiria.
5. **Na dúvida, não envia:** se não der para saber a preferência ou o opt-out, o aviso fica na fila com
   erro e não sai.

Fora deste ADR: a exposição da afiliação (Força e OM, `BLOCK-AFFILIATION`), que é uma decisão de produto e
jurídica pendente com o dono.

## Alternatives considered

- **Corrigir só na interface.** Rejeitada: a API direta continuaria expondo os dados (H1 e H2).
- **Abrir o app e corrigir depois.** Rejeitada: os cinco casos são de privacidade, e a percepção de vazamento
  numa comunidade em que todos se conhecem não se desfaz.

## Market or reference baseline

Supabase recomenda proteger colunas sensíveis com grant por coluna ou view, e não com filtro no cliente
(guia de RLS e de privilégios por coluna). Remover EXIF no servidor é prática comum de plataformas de
classificados.

## Proposed divergence from baseline

Nenhuma.

## Evidence and sources

`docs/AUDITORIA_ADERENCIA_2026-10-19.md`, seção 5, itens H1, H2, H3, H4, M1 e M2, com as linhas de código e
as migrations citadas ali.

## Benefits

O app abre sem os cinco vazamentos conhecidos, e cada regra passa a ter teste que falha se alguém a desfizer.

## Risks

Uma mudança de grant ou policy pode quebrar uma tela que hoje lê a coluna. Por isso o lote exige rodar pgTAP,
os testes unitários e o E2E das telas afetadas.

## Reversal cost

Baixo: são migrations novas e testes. Nenhum dado é apagado pelas correções, exceto os resíduos da purga, que
já deveriam ter sido apagados.

## Success metric

Os cinco testes negativos novos falham na `main` de `6c6947c1` e passam depois. O CI do PR fica verde
(pgTAP, unitários e E2E).

## Reopen condition

Se uma regra impedir uma jornada aprovada, a jornada é revista com o dono, e a regra não é afrouxada sem novo
ADR.
