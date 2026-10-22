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

**Resultado desta triagem de evidência:** 0 PONTO_CORROBORADO, 0 PONTO_APROXIMADO, 0 PONTO_DIVERGENTE e 116 INCONCLUSIVO. Isso não é validação individual concluída: a base de Fase 1 não contém captura/URL de objeto OSM independente, ortofoto ou coordenada alternativa; os links OSM derivam diretamente do ponto Geoapify. A classificação INCONCLUSIVO impede que o preview seja tratado como comprovação. Campos para evidência independente, coordenadas alternativas e distância permanecem vazios.

A fila conserva a partição de origem em lotes 01–11 (máximo de 25 registros por lote) e status pendente. Para homologar um ponto, cada item precisa de evidência cartográfica independente associada à instalação e de fonte pública/oficial compatível. Não registrar acesso controlado, perímetro interno ou infraestrutura sensível.

## Catálogo suplementar FAB — lote de pesquisa 01

`data/om/evidence/fab_public_address_catalog_phase2.csv` contém 310 linhas nacionais derivadas do catálogo-fonte e preserva os IDs, nomes e localidades originais. O lote 01 abrange os primeiros 25 registros domésticos do inventário; foram localizados endereços institucionais publicados para AFA, BAAN, BABV, BACG, BAFL, BAFZ, BANT e BASV. Eles estão marcados como endereço publicado/institucional, sem coordenadas e sem validação cartográfica. Para as outras linhas, o status permanece INCONCLUSIVO e os campos de endereço ficam vazios.

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

**Limite do trabalho desta atualização:** a cobertura FAB ainda não está concluída e nenhum dos 116 pontos foi homologado. Os arquivos distinguem claramente achados documentais de pendências de precisão geográfica.
