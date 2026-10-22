# Auditoria nacional de endereços candidatos de OMs

**Projeto:** Bivaque — `Juanjfmr/bivaque-community`  
**Branch:** `feat/om-catalog-staging-20261021`  
**Execução de referência:** https://github.com/Juanjfmr/bivaque-community/actions/runs/39773256170  
**Consulta:** 22/10/2026

## Progresso consolidado

- Fila: 267 candidatos, 259 EB e 8 MB.
- Lotes concluídos: 01–05 — 125/267 registros (46,8%), todos EB.
- Resultado acumulado: 43 CORROBORADOS (endereço textual); 15 DIVERGENTES; 1 ENDEREÇO DESATUALIZADO; 66 INCONCLUSIVOS.
- Lote 03: 7 CORROBORADOS; 2 DIVERGENTES; 16 INCONCLUSIVOS.
- Lote 04: 12 CORROBORADOS; 5 DIVERGENTES; 8 INCONCLUSIVOS. Divergências registradas: 9º B Sup (endereço oficial nº 219 versus nº 1628 no candidato/Geoapify), HGu Marabá (Folha 26 oficial versus Folha 31 Geoapify), e diferenças de bairro para 8ª Cia Intlg e TG Bragança. O registro agrupado com o Comando da 9ª RM também diverge: fonte oficial de 2024 aponta Rua Gen. Napomuceno Costa, 168; os outros elementos agrupados ainda carecem de confirmação.
- Lote 05: 13 CORROBORADOS; 4 DIVERGENTES; 8 INCONCLUSIVOS. Diferenças cartográficas registradas em bairros/CEP; os casos de 5ª Cia Com Bld (mudança planejada para Ponta Grossa) e registros agrupados sem confirmação individual permanecem pendentes.
- Próximo registro da fila: 126. Restam 142 candidatos, sendo 134 do EB e todos os 8 registros da MB.
- Nenhum ponto militar foi homologado e nenhuma coordenada foi publicada no aplicativo.
- Nenhuma nova chamada Geoapify foi feita; análise usa somente a execução de referência.

## Critério de interpretação

A classificação trata da concordância do endereço declarado com fontes independentes, não da homologação de instalação militar. Uma fonte que confirma nome/logradouro/número não comprova portão, acesso público ou identidade do ponto. Geoapify e a prévia OSM vinculada são sinais cartográficos; tipos `building` e `street` e coincidência do número não demonstram sede/entrada. Pontos repetidos para números distintos, resultados sem número e categorias civis são registrados.

Os inconclusivos permanecem pendentes quando falta fonte oficial individual recente, há somente fonte histórica, o resultado é apenas de rua, ou há possível compartilhamento/ambiguidade. Não foram preenchidas evidências por inferência. O endereço do 16º Grupo de Mísseis e Foguetes fica pendente de esclarecer possível mudança de designação para 6º Grupo; isso não foi tratado como confirmação de desativação.

## Arquivos dos lotes

- `data/om/evidence/national_location_audit_lote_01.csv`
- `data/om/evidence/national_location_audit_lote_02.csv`
- `data/om/evidence/national_location_audit_lote_03.csv`
- `data/om/evidence/national_location_audit_lote_04.csv`
- `data/om/evidence/national_location_audit_lote_05.csv`

Cada linha registra OM, Força, município, endereço declarado, resultado Geoapify, URLs, data, classificação, confiança, evidência, ressalva cartográfica e bloqueios de homologação/publicação.

## Próximos passos

1. Continuar pela ordem do `267_review_queue.csv` a partir do registro 126, sem repetir fontes e pesquisas já registradas.
2. Adicionar um CSV por lote de até 25 registros e atualizar este resumo ao concluir cada lote.
3. Consolidar contagens, divergências e cobertura EB/MB somente após revisar os 267 candidatos.
