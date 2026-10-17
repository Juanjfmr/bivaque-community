---
id: ADR-20261016-mapa-de-bairros
status: proposed
risk: R3
owner: Juan
approved_at:
expires_at:
linked_plan:
critic_verdict: pending
critic_review:
---

# Mapa de bairros com MapLibre, OpenFreeMap e a malha de bairros do IBGE

## Problem

Quem chega transferido não conhece a cidade. No protótipo (Rodada 31), o mapa de bairros mostra
quantos anúncios há em cada bairro. Para levar isso ao app real, o Bivaque precisa de três coisas
que ainda não tem:

- uma biblioteca de mapa;
- um mapa-base com o Brasil todo;
- a forma e o centro dos bairros de qualquer cidade.

As três são dependências externas. O servidor do mapa-base também recebe o endereço de internet
de quem abre o mapa.

## Decision

Proposta, a aprovar:

1. **Biblioteca:** MapLibre GL JS, de código aberto (BSD), carregada só na tela do mapa.
2. **Mapa-base:** OpenFreeMap no início, com dados do OpenStreetMap, grátis, sem chave, sem
   cadastro e sem cookies, com uso comercial permitido. A troca fica planejada para hospedagem
   própria (PMTiles numa CDN) ou para um fornecedor contratado (MapTiler) quando o mapa virar
   peça crítica. O estilo fica num só ponto do código, para a troca não mexer nas telas.
3. **Bairros:** a malha de bairros do IBGE (Censo 2022), convertida do GeoPackage para GeoJSON
   simplificado por município e servida pelo próprio Bivaque. O ponto exibido é o centro do
   bairro. Endereço exato nunca aparece nem é guardado (AGENTS.md: residential address não é
   persistido).
4. **Busca de endereço (geocodificação):** fora de escopo. Os anúncios trabalham com bairro. Se
   for preciso, entra com Nominatim próprio ou contratado, nunca com o servidor público.
5. **Distância até a unidade militar:** fora de escopo enquanto o ADR-20260811-om-declarada não
   for aprovado. Guardar a organização militar é proibido pelo contrato atual.

## Alternatives considered

- **Mapa desenhado pelo próprio app:** viável para uma cidade, inviável para o Brasil todo.
- **Google Maps ou Mapbox:** custo por uso e chave obrigatória, sem ganho para mostrar bairros.
- **MapTiler desde o início:** o plano grátis não permite uso comercial e tem 5 mil sessões por
  mês; o pago custa cerca de US$ 25 por mês.

## Market or reference baseline

Apps de aluguel e de eventos mostram contagem por região num mapa, com a lista numa folha:
Luma e Rakuten, no Mobbin.

## Proposed divergence from baseline

Contagem por bairro, não por endereço. Os marcadores ficam no centro do bairro, não no imóvel.

## Evidence and sources

- OpenFreeMap: https://openfreemap.org
- MapTiler, planos e termos: https://www.maptiler.com/cloud/plans e
  https://www.maptiler.com/cloud/terms/
- Malha de Bairros do IBGE, Censo 2022:
  https://metadadosgeo.ibge.gov.br/geonetwork_ibge/srv/api/records/c0a902c4-1e02-43b3-ac7b-1318cc733da5
- Política de uso do Nominatim: https://operations.osmfoundation.org/policies/nominatim/
- Protótipo: `prototypes/bivaque-html/src/features/listings/map.js` e
  `prototypes/bivaque-html/docs/ROUND_31.md`.

## Benefits

- Decisão de moradia mais rápida para quem não conhece a cidade.
- Sem custo fixo no início.
- Troca de fornecedor sem reescrever telas.

## Risks

- **Disponibilidade:** o OpenFreeMap é mantido por doações e não tem garantia de serviço.
  Mitigação: a lista e os bairros funcionam sem o mapa, e há plano de troca.
- **Privacidade:** o servidor do mapa-base vê o endereço de internet e a área do mapa que a
  pessoa olha. Mitigação: o mapa só carrega quando a pessoa pede, e a política de privacidade do
  app precisa citar o fornecedor.
- **Precisão:** os bairros do IBGE são ajustados a setores censitários e podem diferir do limite
  legal.

## Reversal cost

Baixo. O mapa é uma visualização opcional; desligá-lo mantém a lista.

## Success metric

Parte das buscas de imóvel que passam pelo mapa e terminam em contato com quem anuncia.

## Reopen condition

Queda ou mudança de termos do OpenFreeMap, volume que justifique hospedagem própria, ou
aprovação do ADR-20260811-om-declarada (distância até a unidade).

## Approval

Pendente.
