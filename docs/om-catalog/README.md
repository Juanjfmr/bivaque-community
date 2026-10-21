# Catálogo nacional de OMs — execução controlada (21/10/2026)

## Fonte e status
- Entrada versionada: `data/om-catalog/source-2026-10-20.csv`; 1.416 linhas institucionais: EB 771, FAB 322, MB 323.
- EB: índice público de quartéis por UF, inclui Tiros de Guerra; não equivale ao efetivo de OMs ativas.
- FAB: catálogo telefônico MHT de outubro de 2026 fornecido pelo proprietário; **não publicar o MHT** (contém ramais/contatos).
- MB: diretório capturado anteriormente; exige reconferência da situação.
- 20 entradas do CSV estão fora da classificação BR ou sem município/UF válida.
- Conferência com 5.571 municípios do Supabase: 456 pares cidade/UF únicos, 426 correspondentes e 30 a revisar. Isso representa 1.365 OMs com IBGE conferido e 51 OMs ainda sem vinculação municipal. Nenhuma destas correspondências valida a situação da OM.
- Coordenadas verificadas: **zero**. Não mostrar distância/tempo até OM.

## Preparação reproduzível
Na raiz do repositório:
```bash
python scripts/om-catalog/prepare_catalog.py --input data/om-catalog/source-2026-10-20.csv --crosswalk data/om-catalog/ibge-crosswalk-2026-10-21.csv --out /tmp/bivaque-oms
python scripts/om-catalog/build_import_sql.py --organizations /tmp/bivaque-oms/organizations.json --out /tmp/bivaque-oms/import-unverified.sql
node tests/om-catalog/om-directory-smoke.cjs
python -m unittest discover -s tests/om-catalog -v
```
O pipeline produz `organizations.json`, `site-candidates.json`, `review.json` e `report.json`. A carga SQL é uma proposta para ambiente de teste; não foi executada. IDs são UUIDv5 determinísticos derivados da fonte; sigla não é chave.

**Instalações candidatas não são pontos mapeados.** Um agrupamento por endereço é uma sugestão de revisão, não prova de que duas OMs compartilham a mesma instalação física. Apenas `sites.status=verified` com coordenadas do acesso público e fonte conferida pode alimentar distâncias.

## Próximas validações
1. Cruzar (município,UF) com `public.localities.ibge_code`, inclusive topônimos submunicipais, sem atribuição aproximada.
2. Confirmar situação e nome vigente em fontes da própria Força.
3. Confirmar ponto público de acesso a cada instalação prioritária; documentar URL e data da conferência.
4. Carregar por usuário técnico, com `status='unverified'`; aprovar nomes/cidades individualmente; **nunca** vincular OM a perfil de pessoa.
5. Testar RLS em ambiente de teste antes de publicar.

## Segurança, decisões e produção
- `docs/om-catalog/PROPOSED_SCHEMA.sql` é **rascunho**, não migração aplicada.
- ADR-20260811-om-declarada está proposto. ADR-20261016-mapa-de-bairros está proposto. A matrícula/lotação individual e proximidade por OM permanecem bloqueadas até decisão R3, testes e revisão independente.
- O banco de produção `bivaque-community` foi somente consultado para identificar tabelas existentes; nenhuma migração ou seed foi aplicado.
- Supabase exige RLS **e grants explícitos** para a Data API: https://supabase.com/docs/guides/database/postgres/row-level-security.

## Critérios de aceite
- Nenhuma entrada fictícia ou inventada.
- Não atribuir coordenada pelo centro do município ou do bairro.
- Duplicidades não são excluídas por sigla.
- Não anunciar cobertura como 'todas as OMs ativas'.
- Não ativar 'Perto da OM' antes de haver coordenadas e regra de privacidade aprovadas.
