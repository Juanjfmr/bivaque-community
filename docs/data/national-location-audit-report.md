# Relatório consolidado — auditoria nacional de endereços candidatos de OMs

**Projeto:** Bivaque — `Juanjfmr/bivaque-community`  
**Branch de trabalho:** `feat/om-catalog-staging-20261021`  
**Execução de referência:** https://github.com/Juanjfmr/bivaque-community/actions/runs/39773256170  
**Data da consulta e consolidação:** 22/10/2026  
**Escopo:** 267 candidatos, sendo 259 do Exército Brasileiro (EB) e 8 da Marinha do Brasil (MB).

## Resultado

Foram consolidados 267 registros únicos, sem lacunas de identificador. A classificação é da **evidência de endereço**, não uma homologação da localização militar.

| Situação | Registros |
|---|---:|
| CORROBORADO | 116 |
| DIVERGENTE | 37 |
| ENDEREÇO DESATUALIZADO | 1 |
| INCONCLUSIVO | 113 |
| **Total** | **267** |

## Cobertura por Força

| Força | Total revisado | CORROBORADO | DIVERGENTE | ENDEREÇO DESATUALIZADO | INCONCLUSIVO |
|---|---:|---:|---:|---:|---:|
| EB | 259 | 109 | 36 | 1 | 113 |
| MB | 8 | 7 | 1 | 0 | 0 |
| FAB | 0 | 0 | 0 | 0 | 0 |

A fila e a execução de referência não contêm candidatos identificados como FAB; portanto, cobertura FAB não se aplica a este conjunto de 267, e não representa auditoria de todas as OMs da Força Aérea.

## Resultado por lote

| Lote | Registros | Classificação |
|---|---:|---|
| 01 | 25 | CORROBORADO: 4; DIVERGENTE: 2; ENDEREÇO DESATUALIZADO: 1; INCONCLUSIVO: 18 |
| 02 | 25 | CORROBORADO: 6; DIVERGENTE: 2; ENDEREÇO DESATUALIZADO: 0; INCONCLUSIVO: 17 |
| 03 | 25 | CORROBORADO: 7; DIVERGENTE: 2; ENDEREÇO DESATUALIZADO: 0; INCONCLUSIVO: 16 |
| 04 | 25 | CORROBORADO: 12; DIVERGENTE: 5; ENDEREÇO DESATUALIZADO: 0; INCONCLUSIVO: 8 |
| 05 | 25 | CORROBORADO: 13; DIVERGENTE: 4; ENDEREÇO DESATUALIZADO: 0; INCONCLUSIVO: 8 |
| 06 | 25 | CORROBORADO: 13; DIVERGENTE: 6; ENDEREÇO DESATUALIZADO: 0; INCONCLUSIVO: 6 |
| 07 | 25 | CORROBORADO: 15; DIVERGENTE: 5; ENDEREÇO DESATUALIZADO: 0; INCONCLUSIVO: 5 |
| 08 | 25 | CORROBORADO: 12; DIVERGENTE: 6; ENDEREÇO DESATUALIZADO: 0; INCONCLUSIVO: 7 |
| 09 | 25 | CORROBORADO: 13; DIVERGENTE: 2; ENDEREÇO DESATUALIZADO: 0; INCONCLUSIVO: 10 |
| 10 | 25 | CORROBORADO: 9; DIVERGENTE: 2; ENDEREÇO DESATUALIZADO: 0; INCONCLUSIVO: 14 |
| 11 | 17 | CORROBORADO: 12; DIVERGENTE: 1; ENDEREÇO DESATUALIZADO: 0; INCONCLUSIVO: 4 |

## Divergências, ambiguidades e pendências relevantes

- **Endereço desatualizado:** o registro do 7º Batalhão de Polícia do Exército em Manaus traz o nº 1152 da Av. São Jorge, enquanto documento oficial consultado informa nº 1944. O candidato antigo não deve ser reutilizado como ponto atual.
- **Endereços compartilhados ou pontos repetidos:** foram observados registros com ponto Geoapify idêntico ou mesma sede/endereço declarado, incluindo o Comando da 2ª DE e o Comando da 2ª RM em São Paulo; comandos agrupados na Rua dos Andradas, 562, em Porto Alegre; e pares de OM com coordenadas repetidas em outros lotes. A coincidência pode refletir complexo compartilhado, geocodificação de logradouro ou baixa precisão; não comprova portão compartilhado nem sede individual.
- **Pontos com logradouro apenas:** vários resultados Geoapify não incluem número, entrada ou imóvel e foram mantidos inconclusivos ou divergentes mesmo quando o nome da via coincide.
- **Bairros e logradouros:** as divergências incluem diferenças de bairro, avenida/rua, número e resultado atribuído a ponto compartilhado. Os detalhes, evidências e URLs estão linha a linha no CSV consolidado e nos arquivos de lote.
- **Possível mudança de designação:** a pendência relativa ao 16º Grupo de Mísseis e Foguetes e possível mudança de designação para 6º Grupo não foi tratada como prova de desativação. Não foi confirmada nesta auditoria nenhuma desativação a partir de mera ausência de endereço atual.
- **Lote final MB:** a Marinha publica endereço para as oito OMs. Em um caso, o Geoapify retorna a Rua da Marinha no bairro Mangueirão, enquanto a página oficial da OM informa Marambaia; essa discrepância foi classificada como DIVERGENTE. Nos demais, a correspondência fica no nível do logradouro/bairro e não localiza o acesso.

## Critério e limites da evidência

As fontes oficiais do EB e da MB foram priorizadas; cada linha contém a URL da evidência usada, o endereço publicado, o retorno Geoapify, a data, a análise e o grau de confiança. Quando não se encontrou confirmação oficial individual suficiente, a linha permanece **INCONCLUSIVO** e explicita a pendência. O CSV também registra pontos repetidos, números ausentes e divergências de bairro.

A comparação cartográfica foi limitada à prévia pública OpenStreetMap vinculada às coordenadas do resultado Geoapify e aos campos de tipo/descrição do provedor. **Não foi feita inspeção independente de ortofoto, perímetro, numeração predial, portão ou acesso militar.** Portanto, o relatório não atesta precisão métrica do ponto. Todos os 267 registros conservam `homologacao_militar=NÃO`; nenhum ponto foi homologado e nenhuma coordenada foi publicada no aplicativo.

A classificação CORROBORADO significa concordância documental do endereço no nível descrito na evidência daquela linha. Não significa que a coordenada Geoapify identifique a instalação, confirme o acesso ou tenha sido aprovada pela Força. As páginas oficiais da Marinha consultadas para o lote final, por exemplo, publicam endereço de contato/OM; isso também não homologa os pontos retornados pelo provedor.

## Arquivos de auditoria

- CSV consolidado dos 267 registros: `data/om/evidence/national_location_audit_consolidado.csv`
- Lote 01: `data/om/evidence/national_location_audit_lote_01.csv`
- Lote 02: `data/om/evidence/national_location_audit_lote_02.csv`
- Lote 03: `data/om/evidence/national_location_audit_lote_03.csv`
- Lote 04: `data/om/evidence/national_location_audit_lote_04.csv`
- Lote 05: `data/om/evidence/national_location_audit_lote_05.csv`
- Lote 06: `data/om/evidence/national_location_audit_lote_06.csv`
- Lote 07: `data/om/evidence/national_location_audit_lote_07.csv`
- Lote 08: `data/om/evidence/national_location_audit_lote_08.csv`
- Lote 09: `data/om/evidence/national_location_audit_lote_09.csv`
- Lote 10: `data/om/evidence/national_location_audit_lote_10.csv`
- Lote 11: `data/om/evidence/national_location_audit_lote_11.csv`

Cada CSV contém OM, Força, município/UF, endereço publicado, endereço Geoapify, fonte oficial, link da prévia cartográfica, data da consulta, análise, classificação, confiança e ressalvas de homologação/publicação.
