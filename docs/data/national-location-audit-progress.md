# Auditoria nacional de endereços candidatos de OMs

**Projeto:** Bivaque — `Juanjfmr/bivaque-community`  
**Branch:** `feat/om-catalog-staging-20261021`  
**Execução de referência:** https://github.com/Juanjfmr/bivaque-community/actions/runs/39773256170  
**Consulta:** 22/10/2026

## Progresso

- Fila original: 267 candidatos, 259 EB e 8 MB.
- Lote 01: 25/267 analisados individualmente; todos EB.
- Resultado do lote 01: 4 CORROBORADOS (endereço textual); 2 DIVERGENTES; 1 ENDEREÇO DESATUALIZADO; 18 INCONCLUSIVOS.
- Próximo registro da fila: 26. Restam 242 candidatos para revisão.
- Nenhum ponto militar foi homologado e nenhuma coordenada foi publicada no aplicativo.
- Nenhuma nova chamada Geoapify foi feita; análise usa somente a execução de referência.

## Critério de interpretação

A classificação trata da concordância do endereço declarado com fontes independentes, não da homologação de instalação militar. Uma fonte que confirma nome/logradouro/número não comprova portão, acesso público ou identidade do ponto. Geoapify e a prévia OSM vinculada são sinais cartográficos; os tipos `building` e `street` e a coincidência do número não demonstram sede/entrada. Pontos repetidos para números distintos, resultados sem número e categorias civis ficam explicitados por registro.

Os inconclusivos permanecem pendentes quando falta fonte oficial individual recente, há somente fonte histórica, o resultado é apenas de rua, ou há possível compartilhamento/ambiguidade. Não foram preenchidas evidências por inferência.

## Arquivo do lote 01

`data/om/evidence/national_location_audit_lote_01.csv` contém OM, Força, município, endereço-fonte, resultado Geoapify, URLs consultadas, data, classificação, confiança, nota de precisão cartográfica e bloqueios de homologação/publicação.

## Próximos passos

1. Continuar pela ordem do `267_review_queue.csv`, sem repetir fontes e pesquisas já registradas.
2. Adicionar um CSV por lote de até 25 registros e atualizar este resumo ao concluir cada lote.
3. Consolidar contagens, divergências e cobertura EB/MB somente após revisar os 267 candidatos.
