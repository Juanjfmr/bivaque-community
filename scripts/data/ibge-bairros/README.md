# ETL dos bairros oficiais — IBGE, Censo 2022 (RUN-028)

Fonte: [BR_bairros_CD2022.zip](https://geoftp.ibge.gov.br/organizacao_do_territorio/malhas_territoriais/malhas_de_setores_censitarios__divisoes_intramunicipais/censo_2022/bairros/shp/BR/BR_bairros_CD2022.zip) — malha de bairros do Censo 2022 (shapefile, SIRGAS2000). Acesso em 07/11/2026.

## Como rodar

```sh
npm ci            # instala as dependências fixas aqui; node_modules nunca entra no git
node gerar-migration.mjs
```

O script baixa e descompacta o zip no diretório temporário do sistema
(`<tmp>/ibge-bairros`), nunca dentro do repositório, e grava a migration nova em
`supabase/migrations/<UTC timestamp>_ibge_bairros_censo_2022.sql`. Não edite a
migration gerada à mão: regere pelo script.

## A cada censo

Atualizar `URL_MALHA`/`NOME_BASE` no `gerar-migration.mjs` e regerar: a carga é
idempotente (`on conflict (locality_id, name_key) do nothing`), então a nova
migration acrescenta só o que falta e nunca sobrescreve o que a operação ou o
protótipo já têm. Municípios ausentes de `localities` geram zero linhas.

## Última geração (07/11/2026)

17.575 polígonos na malha → 17.562 tuplas geradas em 895 municípios (a malha
cobre só os municípios que publicam bairros). Dessas, 31 colidem com os bairros
do protótipo e são puladas pelo `on conflict ... do nothing`: entram ~17.531
linhas novas, e o protótipo fica como está.

Só Brasília (5300108) fica sem bairros do IBGE: o catálogo dela é o do protótipo.
Manaus (1302603) passa de 11 para 65 bairros (54 novos) e Natal (2408102) de 11
para 36 (25 novos). Rio de Janeiro vai de 12 para 163.

544 centros corrigidos de centroide para ponto interior do polígono; 0 nomes
acima de 80 caracteres; 13 duplicados por (município, nome normalizado)
descartados. SQL gerado: 970.825 bytes.

Só nome, cidade (via `ibge_code`) e ponto central público entram na carga.
Nada de CEP, endereço, setor censitário ou população.
