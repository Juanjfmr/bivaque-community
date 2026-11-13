# Auditoria de pontos públicos de referência de OMs (21/10/2026)

Script executável: `scripts/om-catalog/audit_sites.py`. Entrada: dois CSVs oriundos da normalização da base coletada (1.416 organizações e 733 agrupamentos **textuais**, não 739 instalações confirmadas). Arquivos de origem e resultado da rodada estão em um pacote ZIP entregue ao proprietário no ChatGPT; **não estão nesta branch**. Não confundir a presença do código com uma importação nacional concluída.

```bash
python scripts/om-catalog/audit_sites.py --organizations data/om/military_organizations.csv --sites data/om/military_sites.csv --out data/om/site-audit
python -m unittest discover -s tests/om-catalog -p 'test_audit_sites.py' -v
```

`--localities csv` permite validação estrita opcional contra um catálogo canônico de cidades (colunas `city_name,state_code`). Sem esse arquivo, o campo `ibge_city_match` fica vazio; **não afirmar validação IBGE**.

## Resultado do lote inicial (sem catálogo IBGE)

- 733 candidatos: 537 endereços preparados para **envio a um geocodificador externo**, 177 precisam de revisão textual e 19 estão bloqueados.
- 261 sinalizações, inclusive 32 avisos de possíveis locais compartilhados (não significa agrupamento aprovado).
- 0 coordenadas, 0 acessos públicos certificados, 0 itens liberados para calcular distância.
- O mesmo endereço textual pode esconder entradas distintas; local de quartel nunca é automaticamente a porta pública de acesso.

Saídas: `site_candidates_audited.csv`, `site_review.csv`, `geocoding_queue.csv` e `site_audit.json`. Este script **não** faz requisições de geocodificação. Usar serviço contratado ou autogerenciado para lotes; não usar a instância pública do Nominatim como geocodificador em massa. Ref.: https://operations.osmfoundation.org/policies/nominatim/.

Após obter sugestões de coordenadas, exigir inspeção individual da localização pública, fonte, data, precisão e consentimento de uso. Não persistir lote no perfil do militar nem publicar dados de deslocamento antes da revisão R3 e RLS.

## Reprodutibilidade e fontes

O dataset público heterogêneo está versionado em `data/om/raw_oms_1416.csv` com fonte URL por registro. Executar `normalize.py` primeiro para produzir organizações e sites; só então `audit_sites.py`. As 739 linhas de sites são **agrupamentos textuais provisórios**, não portões. O campo `source_url` identifica a fonte da coleta, não uma confirmação individual de vigência. Dados externos para geocodificação entram exclusivamente por `validate_geocodes.py` e são marcados para inspeção humana, jamais autorizados diretamente no produto.

## Auditoria IBGE reproduzida no GitHub Actions

- Arquivo `data/om/ibge_localities.csv`: 5.571 municípios extraídos sem alteração de nomes da migration `supabase/migrations/20260817022707_locality_catalog_data.sql`.
- Execução CI em 21/10/2026: 22 testes aprovados; 13 endereços com `IBGE_CITY_NOT_MATCHED` (incluindo unidades no exterior incorretamente classificadas com UF DF e grafias como `REFICE`, `Brasíliaília`, `Tefé-AM`).
- Resultados: 537 `READY_FOR_EXTERNAL_GEOCODING`, 177 `REVIEW_ADDRESS`, 19 `BLOCKED`, 261 sinalizações. Nenhum ponto geográfico foi validado ou publicado.
- A auditoria não altera nomes e não resolve ambiguidades automaticamente. Alterações precisam preservar a fonte original e registrar a correção como dado derivado.

O workflow `.github/workflows/om-catalog-audit.yml` regenera os artefatos e registra as métricas em cada PR que altera o cadastro ou o pipeline.

**Correção posterior:** o índice do EB classificava seis aditâncias no exterior com UF `DF`; o normalizador agora as preserva como organizações `EXTERIOR_REVIEW`, sem instalar site brasileiro fictício. A CI regenerou **1.416 organizações e 733 endereços domésticos candidatos**; teste verde em 21/10/2026 (23 testes). A fila final é 537/177/19 e 13 divergências IBGE restantes. O inventário continua não homologado.
