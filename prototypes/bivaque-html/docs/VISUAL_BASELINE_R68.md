# Bivaque — base visual congelada no fechamento do Lote Bairros (Rodadas 66 a 68)

Data: 19/10/2026. Aprovada pelo usuário ("Congelar e publicar") depois de:

- três revisões independentes: o agente revisor de código, o Codex/GPT e o OpenCode/DeepSeek V4.1 Flash;
- a rodada de correção (R68);
- a bateria completa.

- **Arquivo:** `.visual/bivaque-html-round68/baseline/round68.html`.
- **SHA-256:** `3d427b0df06e3c4f412a5dd1575a308665887b891d841d96e0d4489ec059dac1`.
- **Código:** o mesmo do commit que adiciona este registro. Sem o arquivo local, a base é
  remontada a partir dele (`scripts/bivaque-html/round13-baseline.mjs`).
- **Substitui** a base da Rodada 65 (`0dce1b06…`) nas comparações estritas.

## O que mudou em relação à base da Rodada 65

Nas telas da comparação estrita, nada visível:

- até 93 pixels diferentes, com no máximo 5 de 255 num canal (decodificação das fotos e zona instável do
  renderizador);
- estrutura da página, geometria e estilos iguais.

O lote mexe em formulários e no filtro, fora das telas capturadas:

- **R66:** bairro em qualquer cidade. O campo de busca acha o bairro pelo nome sem acento, pelo CEP de teste
  ou pela localização. O CEP e as coordenadas nunca são gravados. A base de bairros cobre Manaus, Brasília,
  Natal e Rio.
- **R67:** filtro "Distância de mim" a partir do bairro do perfil. Os bairros vêm da cidade, com busca. Filtro
  e Mapa funcionam em qualquer cidade com base de bairros.
- **R68:** correções das revisões. O CEP não é gravado pelo rascunho, nem junto de texto, nem nos bairros do
  negócio. A empresa recebe o pedido mesmo com o bairro escrito de outro jeito. Os alertas só guardam a
  distância quando ela vale.

Elas são cobertas pelas provas das Rodadas 66 a 68
([ROUND_66](ROUND_66.md), [ROUND_67](ROUND_67.md), [ROUND_68](ROUND_68.md)).

## Bateria do fechamento

- **Rodadas 001 a 67:** PASS, inclusive as provas antigas ajustadas ao campo de bairro novo (R03, R11, R12,
  R22, R27, R57, R58, R63 e R64).
- **R68:** 15/18 na bateria, rodada sobre o build `0d1de785…`. As 3 falhas eram o checkpoint novo, que cobria
  os achados LOW do OpenCode, ainda sem build. Com o build final, R66, R67 e R68 deram 15/15, 9/9 e 18/18
  em 375-light, 768-light e 1440-dark.
- A prova de execução falha só no defeito já registrado do HTML original congelado (jornadas `baseline`).
- **Pendências:** padrão combobox completo no campo de bairro; endereço sem CEP como bairro livre (ver
  ROUND_68). Só Manaus tem anúncios de exemplo.
