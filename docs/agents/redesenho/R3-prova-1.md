# R3 — primeiro replay pela fila, 25/10/2026

**FAIL de replay; pgTAP não iniciou.** Comando exato solicitado pelo dono:

```sh
node scripts/agents/prova-fila.mjs -- node scripts/agents/prova-sequencia.mjs banco
```

Alvo conferido: container `supabase_db_bivaque-community`, porta local 55322,
configuração `project_id=bivaque-community`. Nenhum servidor na porta 3000.
Dois únicos produtores ativos antes da prova: R3 encerrado/congelado, app 1b em
outro worktree e sem conexão com banco. Nenhum reset fora da fila.

HEAD documental `b1362bf1`; migration nova ainda não commitada. SHA256 aplicado:
`5CD18B010992C9D534A5E29578986B5FC28A50438C159037B9DF0CDA871D81D3`.
Log: `.visual/coordenacao/R3-banco-1.log` no worktree R3.

Migrations anteriores aplicaram; a migration nova parou na instrução 58:

```text
ERROR: cannot drop function private.can_read_listing(uuid)
because other objects depend on it (SQLSTATE 2BP01)
```

Dependentes informados pelo Postgres:

- `property_details_select_scoped` em property_details;
- `listing_photos_select_scoped` em listing_photos;
- `listing_saves_insert_reader` em listing_saves;
- `listing_photos_storage_select_scoped` em storage.objects;
- `listings_select_scoped` em listings.

Próximo reparo: preservar função de mesma assinatura por CREATE OR REPLACE quando
possível, ou retirar/recriar dependentes explicitamente. Nunca CASCADE cego.
Depois repetir a sequência integral pela fila; não alegar pgTAP ou db:lint passou.

## Gate/lint da base

Quatro erros reproduzidos no worktree R2 limpo em `66eda09b`, usando o Biome fixado:
formatação de `conferir-matriz.test.mjs`, `conferir-retrato.test.mjs` e `retrato.mjs`;
`noShadowRestrictedNames` pelo nome local `escape` em conferir-retrato.
Evidências: `.visual/coordenacao/R3-biome.json` e `R3-biome-baseline.json`.
Contrato RED-003 ampliado somente para formatação/renomeação local nesses arquivos,
com testes de conferência preservados. Não são defeitos introduzidos pela migration.

## Pendências da entrega intermediária

Não fechar: negativos antigos ainda não adaptados, cobertura integral da matriz
incompleta, golden de subconsultas pendente e teste da presença do organizador
contrário à E3. O coordenador devolveu o reparo; a frente app continua independente.
