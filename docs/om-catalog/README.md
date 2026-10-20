# Catálogo nacional de Organizações Militares — coleta auditável (prévia)

Esta pipeline trabalha sobre **533 registros provisórios** coletados em 20/10/2026.
Não é um censo completo, não valida situação institucional atual, localização
geográfica, endereço de entrada nem disponibilidade de imóveis.

## Execução na raiz do repositório

Requisitos: Python 3.11+, `pip install beautifulsoup4`.

```bash
python scripts/om-catalog/catalog.py --out out/om-catalog
python scripts/om-catalog/catalog.py --online --out out/om-catalog
python -m unittest discover -s tests/unit/om-catalog -p 'test_*.py' -v
```

Modo padrão é **offline**: converte o CSV do repositório sem visitar sites.

O modo `--online` tenta uma requisição em cada endereço oficial, com timeout,
limite de tamanho e intervalo entre requisições; não contorna bloqueios.
Guarda os HTMLs acessíveis em `out/om-catalog/snapshots/`, SHA256,
timestamp UTC, status HTTP e erros no `report.json`. A Marinha tem
um extrator *candidato* de títulos/siglas/cidades; as páginas da FAB
e do Exército são arquivadas, mas não geram registros sem parser
confirmado. Respostas bloqueadas nunca eliminam registros anteriores.

**Arquivos resultantes:**
- `legacy_candidates.csv`: todos os 533 da coleta anterior; nenhum certificado
- `new_candidates.csv`: observações novas na página da Marinha, sem UF inferida
- `review.csv`: correspondências textuais e novos candidatos pendentes
- `report.json`: URL, timestamp, HTTP, SHA256, erros, totais e lacunas

Revisar visualmente snapshots e confrontar amostras antes de confiar no parser
em produção. A variável `source_exhausted=false` significa que **não foi
comprovada cobertura integral** (inclui eventuais paginações, organizações
subordinadas e unidades criadas/extintas).

## Fontes atuais e limites

- Marinha: https://www.marinha.mil.br/organizacoes-militares
  (listagem publicada; quantidade e estrutura podem mudar).
- FAB: https://www.fab.mil.br/organizacoes
  (pode devolver HTTP 403; acesso não garantido).
- Exército: https://www.eb.mil.br/quarteis-por-estado
  (pode bloquear clientes automatizados; sem desvio de bloqueio).

**Identidade separada de geografia:** Organização Militar e instalação física
são entidades distintas. Várias OMs podem ocupar um único quartel. Não há
latitude/longitude confiável neste seed; não exibir distância ou tempo de viagem.

**Privacidade e governança:** este catálogo é só institucional, não liga OM a
usuário, não toca perfis, não altera RLS, não geocodifica imóveis e não publica
dados no Supabase. As decisões propostas
`ADR-20260811-om-declarada` e `ADR-20261016-mapa-de-bairros` exigem
aprovação antes de mudança que envolva usuário/OM ou distância no produto.
Qualquer futura migration do catálogo institucional deve passar revisão R3.

## Próximos gates antes de produção

1. Extrair integralmente fontes acessíveis, identificar páginas e seus totais;
   para Exército/FAB, obter fonte institucional oficialmente disponível.
2. Conciliar siglas/nomenclaturas e normalizar município por código IBGE, com
   revisão humana onde houver ambiguidade.
3. Criar modelo distinto de OM e instalação; validar ponto público de entrada,
   não pontos internos de áreas militares.
4. Só então migrar para Supabase por PR revisada com políticas RLS e testes.
