# Fase 2 — validação geográfica e cobertura pública da FAB

**Projeto:** Bivaque — `Juanjfmr/bivaque-community`  
**Branch:** `feat/om-catalog-staging-20261021`  
**Data da atualização:** 2026-10-23  
**Base de referência:** commit `4edd633ce0c64f6aa9c66eb9229d3559a06c00a3`  

## Escopo e preservação

A Fase 1 foi lida a partir dos arquivos consolidados existentes. O CSV original de 267 registros e os 11 arquivos de lote foram preservados. Esta etapa não executou chamadas à Geoapify, não alterou o banco de produção, não publicou coordenadas e não fez merge na `main`.

## Diagnóstico da lacuna FAB

- O arquivo oficial de origem versionado contém 322 registros FAB: 310 classificados no Brasil e 12 no exterior/sem localidade nacional.
- Entre os 310 registros nacionais, **0 têm endereço publicado, CEP ou coordenadas** em `data/om/raw_oms_1416.csv`.
- `scripts/om-catalog/normalize.py` só cria `site_id` quando endereço, município, UF e país BR estão preenchidos. Para FAB nacional, isso resulta em ausência de `site_id` e sinalização `NO_SITE_ADDRESS`.
- `scripts/om-catalog/audit_sites.py` só gera candidatos a geocodificação de sites textuais; por isso o fluxo não consegue incluir esses registros FAB. Não foi encontrada regra explícita de exclusão da FAB.
- A lista da primeira fase tem 259 EB e 8 MB, sem FAB. A causa imediata é falta de endereços na fonte operacional de endereço usada para construir a fila, e não prova de ausência de OMs FAB.

## Cobertura do inventário-fonte FAB por UF

Contagens de registros nacionais presentes no catálogo-fonte (não representam cobertura completa de unidades vigentes nem endereços):

| UF | Registros | UF | Registros |
|---|---:|---|---:|
| AM | 21 | AP | 3 |
| AC | 2 | BA | 5 |
| AL | 1 | CE | 2 |
| DF | 42 | ES | 1 |
| GO | 7 | MA | 3 |
| MG | 9 | MS | 7 |
| MT | 6 | PA | 16 |
| PE | 13 | PR | 6 |
| RJ | 68 | RN | 12 |
| RO | 8 | RR | 4 |
| RS | 24 | SC | 3 |
| SE | 1 | SP | 46 |

O inventário-fonte não tem registros nacionais classificados em PB, PI ou TO. Isso é ausência no recorte da fonte, não evidência de que não existam OM FAB nesses estados. O total de 310 aparece em 24 UFs.

## Frente geográfica dos 116 endereços

Os 116 registros previamente classificados como CORROBORADO foram copiados para `data/om/evidence/geographic_validation_phase2_116.csv`, mantendo o lote de origem, endereço, coordenadas extraídas do link da Geoapify, fonte oficial e preview OSM.

**Progresso após os lotes 01–05:** 116/116 registros foram consultados individualmente em elementos públicos do OpenStreetMap no ponto Geoapify e cotejados com o endereço documental da Fase 1: 15 `PONTO_CORROBORADO`, 74 `PONTO_APROXIMADO`, 0 `PONTO_DIVERGENTE`, 27 `INCONCLUSIVO`. Todos têm justificativa e URL de consulta por registro. `INCONCLUSIVO` representa evidência insuficiente, não ausência da OM. Nenhum ponto foi homologado institucionalmente ou liberado para publicação.

No lote 04, OSM identificou nominalmente o Comando Militar do Sul e o 63º Batalhão de Infantaria. Foram marcados como sítios compartilhados o complexo do Comando Militar do Sul (três registros com mesmo ponto/endereço em pavimentos distintos) e a coordenada comum de duas OM em Santa Maria; uma edificação numerada corresponde ao endereço do 62º BI, mas o rótulo da unidade não foi encontrado.

No lote 05, foram identificados nominalmente o Centro Preparatório de Oficiais da Reserva de São Paulo, a Fortaleza de Itaipu como sítio compatível com endereço do 2º GAAA e a Base Aeronaval de São Pedro da Aldeia. Só o CPOR e a Base Aeronaval ficaram corroborados no nível do sítio; a Fortaleza de Itaipu foi mantida aproximada por não individualizar a OM nem sua edificação.

No lote 03, OSM identificou nominalmente o 6º Batalhão de Engenharia de Construção e o 3º Regimento de Cavalaria de Guarda. Em outros casos foram observados nomes de ruas, objetos sem nome, vizinhanças de outras organizações (como Hospital Municipal Souza Aguiar próximo ao ponto da Policlínica Militar do Rio) e potenciais sítios compartilhados (3º CGCFEx/CPOR de Porto Alegre). Esses elementos e ressalvas estão anotados por linha no CSV.

Nos lotes 01–02, a evidência direta geralmente corresponde a objetos/áreas nomeados no OSM; logradouro, número predial ou contexto urbano sem identificação da OM foi mantido como aproximado ou inconclusivo. Endereços e fontes oficiais confirmam informação textual, não necessariamente a ocupação do ponto. Casos de instalações compartilhadas e pontos Geoapify idênticos foram mantidos sem individualizar unidades. URLs de consulta OSM e justificativas por registro ficam na coluna `osm_evidence_independent_url` e `rationale`; distâncias alternativas ficam vazias quando não havia coordenada independente suficiente.

A fila conserva a partição de origem em lotes 01–11 (máximo de 25 registros por lote). Não registrar acesso controlado, perímetro interno ou infraestrutura sensível.

## Catálogo suplementar FAB — progresso até o lote de pesquisa 03

`data/om/evidence/fab_public_address_catalog_phase2.csv` contém 310 linhas nacionais derivadas do catálogo-fonte, preservando IDs, nomes e localidades originais. Os lotes de pesquisa 01–04 cobrem 97 registros; os lotes 01, 02 e 04 têm 25 registros cada e o lote 03 tem 22. Restam 213 registros na fila marcada `PENDENTE`. A pesquisa não altera nem completa silenciosamente as linhas restantes.

Situação dos 310 registros na atualização de 2026-10-23:

| Situação documental | Registros |
|---|---:|
| Endereço público, institucional ou publicado confirmado textualmente | 67 |
| Endereço oficial/publicado incompleto | 7 |
| Ambiguidade entre endereços ou vínculo pendente | 7 |
| Divergência histórica de endereço/CEP | 3 |
| Sem endereço individualmente confirmado | 224 |
| Identidade/Força pendente | 1 |
| Denominação divergente pendente | 1 |

Os 54 endereços confirmados são endereço textual publicado, não validação cartográfica da instalação. O lote 03 registrou fontes oficiais para CINDACTA II e III, CBNB, COMAER, COMAE, COMPREP, COMGAP, COMGEP, VI e VII COMAR, COPAC, COMARA, CDA, CISCEA, COJAER, DCTA, DECEA e DESTAE-CV/FN/MQ/MS. Permanecem anotadas divergências ou ressalvas: III COMAR (logradouro atual versus referência anterior), VII COMAR (endereços de Manaus distintos), COMARA (CEP conflitante), COMDCIBER (comando conjunto; Força não atribuída), DESTAE-MQ (catálogo atual usa DTCEA-MQ) e estruturas compartilhadas em Brasília, Rio, Guarulhos, São José dos Campos e outras guarnições. Os detalhes, evidências e URLs são mantidos por linha no CSV.

A tabela registra endereços confirmados separadamente dos incompletos, ambíguos e inconclusivos. As 238 linhas ainda marcadas `PENDENTE` aguardam pesquisa individual. Ausência de endereço na fonte-base não é evidência de inexistência ou desativação. A situação institucional do diretório-fonte não demonstra, por si só, atividade atual.

O lote 04 (registros FAB-CAT-20261020-084 a -108) pesquisou 25 DTCEA/DASG. Fontes oficiais permitiram registrar endereço para unidades de Barbacena (incompleto), Guaratinguetá, Marte, Santa Cruz, Santa Maria, Santos (divergência de CEP), São Félix do Araguaia, São Paulo (ambiguidade de CEP), Sinop, Galeão (incompleto), Afonsos, DTCEATM-RJ, Anápolis, Aracaju, Barra do Garças, Belém e Boa Vista (redação ambígua), além de Bom Jesus da Lapa. Para DASG, DTCEA-BI, DTCEA-BR, DTCEA-CC, DTCEA-CG e DTCEA-CO a pesquisa ainda não confirmou endereço individual; Cerro das Tropas tem apenas localidade geral. Endereços vinculados a aeroportos ou guarnições compartilhadas foram registrados como correspondência institucional/publicada, sem inferir ponto físico.

Nenhuma chamada paga à Geoapify foi realizada. Nenhuma coordenada foi atribuída ao catálogo suplementar FAB nem publicada no aplicativo.
 
## Pendências prioritárias

1. Resolver individualmente a camada cartográfica dos 116 corroborados, começando pelos registros com pontos repetidos, resultados Geoapify do tipo `street`, endereço sem número e instalações compartilhadas já sinalizadas na Fase 1.
2. Continuar o catálogo FAB em lotes de até 25 registros por vez, priorizando páginas de contato e diretórios das organizações, publicações administrativas recentes e órgãos com compartilhamento de sede.
3. Revisar vigência institucional e denominação das 310 linhas nacionais; a fonte do diretório não documenta atividade atual por si só.
4. Depois da pesquisa de endereços FAB, preparar uma fila de geocodificação paga para revisão, sem submetê-la até autorização explícita.
5. Cruzar nomes/siglas/localidades FAB com o catálogo Bivaque, distinguindo identidade da OM de endereços de instalações compartilhadas.

## Arquivos

- `data/om/evidence/geographic_validation_phase2_116.csv` — triagem geográfica dos 116, todos inconclusivos até validação independente.
- `data/om/evidence/fab_public_address_catalog_phase2.csv` — base suplementar nacional FAB; proveniência preservada e campos de endereço em branco onde não foram comprovados.
- `docs/data/geographic-validation-phase2-progress.md` — este registro de método e progresso.

**Limite do trabalho desta atualização:** a validação cartográfica dos 116 candidatos foi concluída nos cinco lotes. Os 15 pontos corroborados representam evidência cartográfica pública para o sítio associado, sem homologação institucional da coordenada. A pesquisa da FAB documentou 97/310 registros em quatro lotes; permanecem 213 na fila de pesquisa, além de casos incompletos ou pendentes de resolução. O cruzamento identifica 304 correspondências exatas com o catálogo Bivaque e seis casos sem correspondência exata para revisão. A base suplementar ainda não é uma cobertura nacional completa de endereços.
