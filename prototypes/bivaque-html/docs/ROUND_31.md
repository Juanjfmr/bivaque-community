# Bivaque — Rodada 31: mapa de bairros

Data: 16/10/2026. Contrato: `docs/agents/tasks/HTML-031.task.yml` (R2). Base: `d46f35d8`.
Terceiro item do lote C. Dependências escolhidas pelo usuário depois da pesquisa: MapLibre GL JS e
o mapa-base do OpenFreeMap. Referências do Mobbin: Luma (mapa com lista em folha) e Rakuten
(contagem por área).

**Veredito: PASS.**

## O que mudou

- **Lista ou Mapa:** a barra de resultados de Imóveis e Desapegos ganhou "Lista | Mapa". No
  celular, a contagem fica curta e os botões só com ícone.
- **Mapa:**
  - o MapLibre 4.7.1 (unpkg) e o estilo do OpenFreeMap só são pedidos quando a pessoa abre o
    mapa; o resto do protótipo continua sem rede;
  - um marcador por bairro, no centro aproximado (consulta única ao Nominatim, com os pontos
    fixos no código), com a contagem dos anúncios que passam nos filtros; o leitor de tela ouve
    "Ponta Negra: 1 imóvel";
  - nomes do mapa em português quando o OpenStreetMap os tem ("Rio Negro");
  - aviso de posição aproximada e o crédito do OpenStreetMap e do OpenFreeMap.
- **Bairro:** tocar abre uma folha com os anúncios dele, e "Ver só este bairro na lista" aplica o
  filtro de bairro.
- **Sem internet:** aviso, e os bairros em chips continuam abrindo a folha.

## O que ficou de fora, e por quê

- **Distância até a unidade militar:** o AGENTS.md proíbe guardar a organização militar, e o
  ADR-20260811-om-declarada ainda está como proposta.
- **App real:** depende do `docs/decisions/ADR-20261016-mapa-de-bairros.md` (proposto, R3), que
  prevê a malha de bairros do IBGE, o OpenFreeMap no início com plano de troca e o aviso de
  privacidade sobre o fornecedor.

## Defeitos achados na rodada

- O MapLibre troca o rótulo do marcador por "Map marker". O rótulo do bairro agora é reposto
  depois de adicionar o marcador.
- No celular, a barra de resultados quebrava em duas linhas. Ficou numa linha só.

## Prova

| Prova | Resultado |
| --- | --- |
| Rodada 31, com MapLibre substituído localmente (5 verificações; 375 e 1440, claro) | PASS, 10/10 |
| Captura com rede real (unpkg.com e tiles.openfreemap.org) | mapa carregado nas duas larguras |
| Gate completo | PASS |

O harness ganhou `allowExternal`: só os prefixos que a prova intercepta e responde localmente
deixam de contar como externos.
