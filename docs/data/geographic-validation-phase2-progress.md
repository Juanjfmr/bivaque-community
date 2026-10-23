# Fase 2 — validação geográfica e cobertura pública da FAB

**Projeto:** Bivaque — `Juanjfmr/bivaque-community`  
**Branch:** `feat/om-catalog-staging-20261021`  
**Data da consulta:** 2026-10-22  
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

## Catálogo suplementar FAB — lote de pesquisa 01

`data/om/evidence/fab_public_address_catalog_phase2.csv` contém 310 linhas nacionais derivadas do catálogo-fonte e preserva os IDs, nomes e localidades originais. O lote 01 abrange os primeiros 25 registros domésticos do inventário. Após os lotes de pesquisa 01 e 02 (50/310 registros), 37 endereços estão classificados como confirmados/publicados; quatro como publicados incompletos; três com ambiguidade entre fontes; um com divergência histórica de número; 265 ainda estão sem endereço individual confirmado. O lote 02 incluiu endereços oficiais para CEAP, CAE, CCA-BR, CCA-SJ, CCA-RJ, CECOMSAER, CENCIAR, CEPE, CGNA, CIAAR, CIAER, CENIPA, CEMAL, CPORAER-SJ, CIMAER, CELOG, CTLA, CGABEG e CINDACTA I. Foram marcados conflitos ou incompletudes para CPBV (localidade-fonte Brasília vs. instalação no Pará), CECAT (vínculo de endereços contraditório), CENDOC (nº atual 1.200 vs. publicação anterior nº 1.000), CLBI e CLA (referência territorial sem endereço viário completo) e CINDACTA IV (documentos com endereços diferentes). Fontes e limites estão individualizados na tabela. Nenhuma recebeu coordenadas nem validação cartográfica. Os outros 260 registros nacionais ainda estão pendentes de pesquisa.

Endereços de contato ou de atendimento não foram convertidos em coordenadas de entrada. A página da AFA voltada a visitantes é tratada como fonte de endereço público, mas ainda não confere precisão métrica. Para as demais unidades, endereço de atendimento não significa que a instalação, portão ou acesso esteja exatamente no ponto associado.

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

**Limite do trabalho desta atualização:** a validação cartográfica dos 116 candidatos foi concluída em cinco lotes. Os 15 pontos corroborados representam evidência cartográfica pública para o sítio associado, sem homologação institucional da coordenada. A cobertura da FAB permanece incompleta: 18 endereços institucionais/publicados confirmados em nível documental, um endereço oficial incompleto, uma divergência entre fontes e 290 registros sem endereço individualmente confirmado. O arquivo identifica os 304 cruzamentos exatos com o catálogo Bivaque e mantém seis casos sem correspondência exata para revisão.
