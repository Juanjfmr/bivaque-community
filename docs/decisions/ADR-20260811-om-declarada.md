---
id: ADR-20260811-om-declarada
status: proposed
risk: R3
owner: Juan
approved_at:
expires_at:
linked_plan:
critic_verdict: pending
critic_review:
---

# Afiliação militar declarada pelo membro, com OM

## Problem

Todo concorrente da categoria usa unidade militar como eixo principal de descoberta —
RallyPoint mapeia cerca de 20 mil unidades, e o Military App exibe regimento e datas de
serviço. É o laço de afinidade mais forte que existe nesse público.

O Bivaque hoje não tem nenhum eixo de afinidade além da geografia, que é o mais fraco. O
contrato vigente em `AGENTS.md:205` proíbe persistir organização militar e posto, e o
projeto-mãe reforça com a regra anti-mosaico: nenhuma consulta expõe agregado de militares
por unidade.

A pergunta é se essa proibição vale para **o que o Estado afirma** sobre a pessoa ou também
para **o que a pessoa escolhe dizer** sobre si.

## Decision

Permitir que o membro declare, opcionalmente, força, situação, OM e turma no próprio
perfil, e permitir busca e filtro por esses campos dentro da localidade.

**O que muda:** `AGENTS.md:205` deixa de proibir organização militar e posto de forma
absoluta, e passa a proibir a persistência do que vem do **payload do Portal**. Campos
declarados pelo membro passam a ser permitidos.

**O que não muda:** CPF em claro, payload do Portal, endereço residencial, documento além
do TTL e selo público de verificação continuam proibidos. Nada declarado é exibido como
verificado pelo sistema.

## Alternatives considered

1. **Manter a proibição absoluta.** Preserva o contrato atual sem custo de implementação, e
   abre mão do eixo de afinidade mais forte da categoria. Sobra geografia.
2. **Permitir apenas força e situação, sem OM.** É o que o projeto-mãe já fazia: exibia
   `military_branch` e `military_status` entre pares verificados e protegia `om_id` por
   anti-mosaico. Reduz o risco de enumeração e entrega pouca afinidade — "Exército" não
   aproxima ninguém de ninguém numa cidade com milhares de militares.
3. **Permitir tudo, inclusive lotação atual.** Máxima afinidade, e cria dado de interesse
   operacional: nome, cidade e unidade atual de militar da ativa, num produto sem perfil
   oculto.
4. **Permitir declaração histórica e turma, sem lotação atual** — variante intermediária da
   3, discutida e não escolhida pelo dono, que optou pela 3 ao revogar a regra anti-mosaico.

## Market or reference baseline

- **RallyPoint** (EUA): grafo de ~20 mil unidades; o membro se alinha às unidades em que
  serviu, e a descoberta por unidade é o mecanismo central.
- **The Military App** (Reino Unido): exibe cap-badge, regimentos antecedentes, datas de
  serviço e lotações.
- **Projeto-mãe Bivaque**: expunha força e situação entre pares verificados e protegia a OM
  por anti-mosaico.

Fontes em [`BIVAQUE.md`](../BIVAQUE.md) §2.

## Proposed divergence from baseline

Divergimos do projeto-mãe, que protegia `om_id`. Convergimos com RallyPoint e Military App,
que expõem unidade. A justificativa do dono é o precedente: forças armadas maiores aceitam
expor unidade em suas plataformas.

A divergência que **permanece** em relação a RallyPoint e Military App: a OM aqui é
declaração do membro, nunca asserção do sistema, e nunca vem do Portal.

## Evidence and sources

- Contrato vigente: `AGENTS.md:205`.
- Regra anti-mosaico do projeto-mãe: `Juanjfmr/Bivaque`, `docs/DECISIONS.md`, D-05.
- Perfil oculto removido por decisão de 2026-08-11 — ver `BIVAQUE.md` §9, D09.
- Enum de visibilidade ainda com `hidden`:
  `supabase/migrations/20260802000100_locality_profile_foundation.sql:8`;
  UI em `apps/web/app/(shell)/profile/page.tsx:193,372,384`.

## Benefits

Descoberta por afinidade real, que é o que faz alguém abrir o produto uma segunda vez.
Alimenta o diretório, a formação de grupos e o convite dirigido. Custo de implementação
baixo: são campos opcionais de perfil mais um filtro de busca.

## Risks

- **Enumeração e mosaico.** Num piloto municipal, "todos da OM X" devolve lista quase
  completa. A mesma consulta no RallyPoint devolve amostra de milhões. Escala pequena torna
  o mosaico mais perigoso, não menos.
- **Scraping.** Conta verificada e autenticada percorrendo o diretório reconstrói efetivo
  por unidade.
- **Ausência de perfil oculto.** Com a D09, o membro perde o único controle de visibilidade
  que tinha. Declarar OM passa a expor a todos os verificados de Manaus, sem exceção.
- **Consentimento.** Campo opcional não é consentimento informado se a tela não disser para
  quem aquilo fica visível.
- **Perfis existentes com `hidden`.** Se houver perfil real com essa escolha, a migração da
  D09 inverte uma decisão de privacidade que a pessoa tomou.

## Reversal cost

Alto depois de publicado. Remover o campo apaga dado que o membro declarou; manter o campo
e esconder da busca não desfaz o que já foi coletado por quem olhou. Custo real: migration
de remoção, comunicação a quem declarou, e nenhuma garantia sobre cópias já feitas.

## Requisitos antes de aprovar

Esta decisão **não pode ser implementada** enquanto os cinco itens abaixo não existirem:

1. **Threat model escrito** para enumeração e scraping do diretório, com o orçamento de
   requisições que um atacante autenticado precisaria e o custo dele.
2. **Proteção além de paginação e rate limit** — a decisão anterior citava as duas como
   suficientes e não são contra conta autenticada paciente. Definir o mecanismo.
3. **Tela de consentimento** no momento da declaração, dizendo para quem o campo fica
   visível, com opção de não declarar e de remover depois.
4. **Tratamento dos perfis `hidden` existentes**: consultar se há perfil não-seed com
   `visibility = 'hidden'` antes de qualquer migration; havendo, avisar a pessoa e não
   converter em silêncio.
5. **Seção de governança LGPD** publicada — controlador, finalidade, base legal, retenção,
   eliminação, direitos do titular, canal de contato e resposta a incidente.

`AGENTS.md:205` **não muda antes disso.** Enquanto este ADR estiver `proposed`, o contrato
vigente é a proibição.

## Success metric

Percentual de membros que declaram ao menos um campo de afiliação nos primeiros 90 dias, e
percentual de sessões de busca que usam filtro de OM ou turma. Se a declaração ficar abaixo
de um terço dos membros, o eixo não se sustenta e o risco não se justifica.

## Reopen condition

Qualquer evidência de scraping do diretório, qualquer incidente envolvendo dado declarado,
ou mudança de orientação da ANPD sobre dado de agente público em base comunitária.

## Approval

Pendente. Requer aprovação humana explícita registrada aqui, com data, após os cinco
requisitos acima.
