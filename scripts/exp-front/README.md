# Carga local do EXP-001

Com o seed local aplicado, rode na raiz do repositório:

```sh
docker exec -i supabase_db_bivaque-community psql -U postgres -d postgres -v ON_ERROR_STOP=1 < scripts/exp-front/carga.sql
```

Uso exclusivo no banco local. A carga é idempotente e cria 2.000 perguntas de Manaus com autores do seed, datas nos últimos 120 dias e 600 resolvidas; respostas variadas; três contas verificadas de teste (sem cidade, no Rio e autora em Manaus); cinco perguntas da autora de teste (duas resolvidas); e uma pergunta de escape HTML. A senha das contas é `bivaque-e2e-local`.
