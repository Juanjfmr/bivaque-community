# Auditoria de pontos públicos de referência de OMs (21/10/2026)

Script executável: `scripts/om-catalog/audit_sites.py`. Entrada: dois CSVs oriundos da normalização da base coletada (1.416 organizações e 739 agrupamentos **textuais**, não 739 instalações confirmadas). Arquivos de origem e resultado da rodada estão em um pacote ZIP entregue ao proprietário no ChatGPT; **não estão nesta branch**. Não confundir a presença do código com uma importação nacional concluída.

```bash
python scripts/om-catalog/audit_sites.py --organizations data/om/military_organizations.csv --sites data/om/military_sites.csv --out data/om/site-audit
python -m unittest discover -s tests/om-catalog -p 'test_audit_sites.py' -v
```

`--localities csv` permite validação estrita opcional contra um catálogo canônico de cidades (colunas `city_name,state_code`). Sem esse arquivo, o campo `ibge_city_match` fica vazio; **não afirmar validação IBGE**.

## Resultado do lote inicial (sem catálogo IBGE)

- 739 candidatos: 542 endereços preparados para **envio a um geocodificador externo**, 183 precisam de revisão textual e 14 estão bloqueados.
- 258 sinalizações, inclusive 32 avisos de possíveis locais compartilhados (não significa agrupamento aprovado).
- 0 coordenadas, 0 acessos públicos certificados, 0 itens liberados para calcular distância.
- O mesmo endereço textual pode esconder entradas distintas; local de quartel nunca é automaticamente a porta pública de acesso.

Saídas: `site_candidates_audited.csv`, `site_review.csv`, `geocoding_queue.csv` e `site_audit.json`. Este script **não** faz requisições de geocodificação. Usar serviço contratado ou autogerenciado para lotes; não usar a instância pública do Nominatim como geocodificador em massa. Ref.: https://operations.osmfoundation.org/policies/nominatim/.

Após obter sugestões de coordenadas, exigir inspeção individual da localização pública, fonte, data, precisão e consentimento de uso. Não persistir lote no perfil do militar nem publicar dados de deslocamento antes da revisão R3 e RLS.

## Reprodutibilidade e fontes

O dataset público heterogêneo está versionado em `data/om/raw_oms_1416.csv` com fonte URL por registro. Executar `normalize.py` primeiro para produzir organizações e sites; só então `audit_sites.py`. As 739 linhas de sites são **agrupamentos textuais provisórios**, não portões. O campo `source_url` identifica a fonte da coleta, não uma confirmação individual de vigência. Dados externos para geocodificação entram exclusivamente por `validate_geocodes.py` e são marcados para inspeção humana, jamais autorizados diretamente no produto.
