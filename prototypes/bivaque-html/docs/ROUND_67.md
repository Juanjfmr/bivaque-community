# Bivaque — Rodada 67: filtro e mapa de bairros em qualquer cidade

Data: 19/10/2026. Contrato: `docs/agents/tasks/HTML-067.task.yml` (R2). Lote Bairros (Rodadas 66 e 67),
quadros 6 e 7 da maquete aprovada (`.visual/bivaque-html-bairros/maquete.html`). Base: a Rodada 66
(`f174d8ff`). Candidato: build `2920155a…`.

**Veredito: PASS** no protótipo.

## O que mudou

### Filtro: distância e bairros (`features/listings/filters.js`, `catalog.js`)

- **Distância de mim:** Qualquer, 1, 3, 5 ou 10 km, medidos do centro do bairro do perfil até o centro do
  bairro do anúncio. O painel mostra o ponto de partida ("A partir do seu bairro, Parque 10.").
  - Só vale na cidade onde a pessoa mora. Quem está conhecendo outra cidade não vê a distância.
  - Sem bairro no perfil, o painel explica: "Informe seu bairro em Configurações para filtrar pela
    distância."
  - Um anúncio com bairro fora da base não entra quando há distância, porque não tem centro.
- **Bairros da cidade** vêm da base, os que têm mais anúncios primeiro, mais os bairros digitados que
  aparecem nos anúncios. Com mais de 8 bairros, "Acrescentar bairro" filtra os chips enquanto a pessoa
  digita; os bairros já marcados ficam sempre à vista.
- **Distância e bairros se somam (E):** "Tirol" com 3 km a partir de Lagoa Nova não mostra nada de Tirol.
- **Pílula:** "Até 3 km", "Tirol", "2 bairros · 3 km" ou "Bairro". Limpar zera os bairros e a distância.
- **Alertas** (`alerts.js`): o rótulo diz "até 3 km do seu bairro". Os alertas salvos antes da distância
  continuam reconhecidos, porque uma distância zerada não entra na comparação. O anúncio de exemplo do
  alerta usa um bairro da cidade do alerta, e não mais Flores fixo.

### Filtro e Mapa em qualquer cidade (`hood-privacy.js`, `map.js`, `hood-panel.js`)

- `cityHasHoods` passa a vir da base de bairros: as quatro cidades têm filtro de bairro e Mapa, cada uma com
  os próprios bairros.
- O mapa usa o centro de cada bairro da base (sai a tabela fixa de Manaus) e abre centralizado na cidade.
  Com um só bairro, abre nele com mais zoom. A lista fixa `HOODS` saiu do código.
- Só Manaus tem anúncios de exemplo. Nas outras cidades, o filtro e o mapa mostram o que for publicado (a
  prova injeta anúncios em Natal).

### Configurações

O texto de apoio de "Seu bairro" agora diz para que ele serve: "Serve para a distância nos filtros."

## Provas

- `round67-proof.mjs`, 3 checkpoints em 375-light e 1440-light: **6/6 PASS**, 0 erros de JS, 0 pedidos
  externos. O MapLibre fica bloqueado na prova, e a lista de bairros do mapa continua valendo sem rede.
  - Contra a base R65 (375-light): **0/3**.
- Prova antiga ajustada, porque o comportamento mudou de propósito: `round63-proof.mjs`, checkpoint
  `hood-filter-and-map-exist-only-for-cities-with-hood-data`.
  - Antes: Brasília e Natal não tinham filtro de bairro nem Mapa.
  - Agora: têm os dois, sem os bairros de Manaus.
  - Resultado: 2/2.
- Vizinhas, em 375-light:
  - filtros (`round23`): 14/14;
  - mapa de Manaus (`round31`): 6/6;
  - alertas (`round25` e `round33`): 8/8 cada.
- `npx pnpm@11.18.0 gate`: **verde** (lint, testes, segredos). O build web pulou, como sempre na worktree.
