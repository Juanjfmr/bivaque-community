# Moradia por OM — execução técnica da fase geográfica

**Estado em 21/10/2026:** cadastro bruto de 1.416 organizações, lista de seleção local com 1.368 entradas em municípios IBGE reconhecidos e zero pontos de acesso certificados. Não use este cadastro para afirmar lotação de membro, distância ou trajeto.

## Feito e executado

- `scripts/om-catalog/normalize.py`: identifica organizações e agrupamentos textuais de endereços.
- `scripts/om-catalog/audit_sites.py`: confronta municípios com 5.571 localidades IBGE e separa READY / REVIEW / BLOCKED.
- `scripts/om-catalog/export_browser_catalog.py`: gera `apps/web/lib/om/catalog.json`, sem endereços, coordenadas ou dados pessoais.
- `apps/web/app/(shell)/imoveis/page.tsx`: seleciona OM da cidade atual como **referência institucional**; continua mostrando imóveis da cidade enquanto não houver acesso geoverificado.
- `tests/om-catalog/schema_staging.sql`: duas migrations verificadas em banco PostgreSQL 17 descartável, com RLS fechada e evidência obrigatória para ativar localização.

## Geocodificar quando houver credencial de provedor

A Geoapify fornece uma API de lotes de até 1.000 endereços. As chamadas cobram créditos de API; **não existe chave configurada nesta branch e nenhuma chamada paga foi disparada**.

O GitHub Actions gera os dois arquivos `geocoding_manifest.json` e `geoapify_batch_request.json` a partir dos **537 endereços aptos a busca externa**. Para executar com uma conta própria (não com o Nominatim público):

```bash
# Recriar a fila e o manifesto (sem chamadas externas)
python scripts/om-catalog/normalize.py data/om/raw_oms_1416.csv /tmp/om
python scripts/om-catalog/audit_sites.py --organizations /tmp/om/military_organizations.csv --sites /tmp/om/military_sites.csv --out /tmp/om/audit --localities data/om/ibge_localities.csv
python scripts/om-catalog/geoapify_batch.py --queue /tmp/om/audit/geocoding_queue.csv --out /tmp/om/batch --max-addresses 537

# Somente depois de configurar GEOAPIFY_API_KEY no ambiente seguro:
python scripts/om-catalog/geoapify_batch.py --queue /tmp/om/audit/geocoding_queue.csv --out /tmp/om/batch --operation submit --max-addresses 537
# Substituir JOB_ID pelo código retornado; coletar quando pronto:
python scripts/om-catalog/geoapify_batch.py --queue /tmp/om/audit/geocoding_queue.csv --out /tmp/om/batch --operation collect --job-id JOB_ID --max-addresses 537

# Nenhum resultado vira "validado" automaticamente:
python scripts/om-catalog/parse_geoapify_results.py --manifest /tmp/om/batch/geocoding_manifest.json --results /tmp/om/batch/provider_results_unverified.json --queue /tmp/om/audit/geocoding_queue.csv --out /tmp/om/batch/suggestions.csv
```

O geocodificador fornece posição aproximada do endereço, **não necessariamente o portão público**. A revisão final exige conferência independente, evidência URL, data e revisor; só assim atualizar `geolocation_status='VERIFIED_PUBLIC_ACCESS'`. A tabela `military_site_geocode_suggestions` mantém propostas separadas dos dados publicados.

## Pendências e critérios de aceite

- Verificar `EXTERIOR_REVIEW`, Tiros de Guerra, siglas duplicadas e a vigência das OMs.
- Revisar os 177 endereços deficientes, 19 bloqueados e 13 divergências IBGE.
- Obter endereço das OMs da FAB e da Marinha nas localidades sem dados completos.
- Não importar as 1.416 linhas diretamente em produção antes de revisar identidade durável, concordância com `localities`, RLS e testes de regressão.
- Exibir tempos/distâncias apenas com acessos públicos verificados e rotas produzidas por um serviço de roteamento real.

Fontes: https://apidocs.geoapify.com/docs/geocoding/batch/ · https://operations.osmfoundation.org/policies/nominatim/ .
