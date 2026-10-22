# Auditoria nacional de endereços candidatos de OMs

**Projeto:** Bivaque — `Juanjfmr/bivaque-community`  
**Branch:** `feat/om-catalog-staging-20261021`  
**Execução de referência:** https://github.com/Juanjfmr/bivaque-community/actions/runs/39773256170  
**Consulta:** 22/10/2026

## Progresso consolidado

- Fila: 267 candidatos, 259 EB e 8 MB.
- Lotes concluídos: 01–10 — 250/267 registros (93,6%), todos EB.
- Resultado acumulado: 106 CORROBORADOS (endereço textual); 36 DIVERGENTES; 1 ENDEREÇO DESATUALIZADO; 107 INCONCLUSIVOS.
- Lote 03: 7 CORROBORADOS; 2 DIVERGENTES; 16 INCONCLUSIVOS.
- Lote 04: 12 CORROBORADOS; 5 DIVERGENTES; 8 INCONCLUSIVOS. Divergências registradas: 9º B Sup (endereço oficial nº 219 versus nº 1628 no candidato/Geoapify), HGu Marabá (Folha 26 oficial versus Folha 31 Geoapify), e diferenças de bairro para 8ª Cia Intlg e TG Bragança. O registro agrupado com o Comando da 9ª RM também diverge: fonte oficial de 2024 aponta Rua Gen. Napomuceno Costa, 168; os outros elementos agrupados ainda carecem de confirmação.
- Lote 05: 13 CORROBORADOS; 4 DIVERGENTES; 8 INCONCLUSIVOS. Diferenças cartográficas registradas em bairros/CEP; os casos de 5ª Cia Com Bld (mudança planejada para Ponta Grossa) e registros agrupados sem confirmação individual permanecem pendentes.
- Lote 06: 13 CORROBORADOS; 6 DIVERGENTES; 6 INCONCLUSIVOS. Entre as divergências: endereço do 1º BE Cmb (fonte oficial nº 135 versus candidato nº 35), 25º B Log Es (fonte de 2022 nº 295 versus candidato nº 395) e divergências de bairro/logradouro nos registros do Rio de Janeiro e Niterói.
- Lote 07: 16 CORROBORADOS; 5 DIVERGENTES; 4 INCONCLUSIVOS. Divergências incluem ponto compartilhado entre 17º PE e 5º BEC (Geoapify repetiu coordenadas e retornou apenas avenida), endereço do 17º B Log distinto do endereço oficial de 2025, e resultado da IDQBRN sem número/localidade coerente. CEADEx fica inconclusivo por operar em área compartilhada da EsSLog sem confirmação do nº 325; para o Comando da 17ª Bda há fontes oficiais com endereços de entrega/localização distintos, pendentes de conciliação.
- Lote 08: 12 CORROBORADOS; 6 DIVERGENTES; 7 INCONCLUSIVOS. Divergências incluem resultados Geoapify em bairro incompatível no 3º B Log, 3º GAAAe, EASA e 12º RC Mec; repetição exata de coordenadas para os endereços nº 2390 e nº 3129 (1º RCC/29º BI Bld); e três comandos com sede/endereço compartilhado na Rua dos Andradas, 562, em Porto Alegre.
- Lote 09: 13 CORROBORADOS; 2 DIVERGENTES; 10 INCONCLUSIVOS. Divergências incluem endereço do 19º GAC (fonte oficial nº 1340 versus candidato nº 1460) e bairro do 9º B Log; Geoapify também repete ponto sem número entre 1ª Cia Eng Cmb Mec e 2º RCMec. Há pendências de fonte oficial individual para alguns TGs e unidades com resultados somente de rua.
- Lote 10: 9 CORROBORADOS; 2 DIVERGENTES; 14 INCONCLUSIVOS. Divergências: endereço agregado do 28º BIL/Comando da 11ª Bda em Campinas, pois fonte oficial lista 28º BIL no nº 3628 e o candidato sem número; divergência de bairro da Base Adm Ap Ibirapuera. Muitos TGs permanecem pendentes por ausência de confirmação oficial individual nesta rodada.
- Próximo registro da fila: 251. Restam 17 candidatos: 9 EB e os 8 registros da MB.
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
- `data/om/evidence/national_location_audit_lote_06.csv`
- `data/om/evidence/national_location_audit_lote_07.csv`
- `data/om/evidence/national_location_audit_lote_08.csv`
- `data/om/evidence/national_location_audit_lote_09.csv`
- `data/om/evidence/national_location_audit_lote_10.csv`

Cada linha registra OM, Força, município, endereço declarado, resultado Geoapify, URLs, data, classificação, confiança, evidência, ressalva cartográfica e bloqueios de homologação/publicação.

## Próximos passos

1. Continuar pela ordem do `267_review_queue.csv` a partir do registro 251, sem repetir fontes e pesquisas já registradas.
2. Adicionar um CSV por lote de até 25 registros e atualizar este resumo ao concluir cada lote.
3. Consolidar contagens, divergências e cobertura EB/MB somente após revisar os 267 candidatos.
